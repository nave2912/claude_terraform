# Terraform for the chatbot's OWN hosting — deliberately separate from
# environments/{dev,qa,prod}, which model AzureLearning workload
# infrastructure through the JSON-model pattern the chatbot itself writes
# to. This file provisions the platform the chatbot runs on, hand-written
# once, not generated per-request.
#
# Cost-effectiveness choices made throughout, called out where non-obvious:
# - Container Apps Consumption plan, min_replicas = 0 (scale to zero — no
#   charge while idle, a few seconds of cold start on the first request
#   after idle).
# - ACR Basic SKU (cheapest tier; no geo-replication/private endpoints).
# - Static Web App Free tier.
# - Log Analytics minimum retention (30 days, the platform minimum for
#   PerGB2018) — required by Container Apps, unavoidable, kept minimal.

data "azurerm_client_config" "current" {}

resource "azurerm_resource_group" "chatbot" {
  name     = var.resource_group_name
  location = var.location
  tags     = var.tags
}

# --- Key Vault: holds the Anthropic API key + GitHub token. RBAC
# authorization (not access policies) so permissions are just role
# assignments below, consistent with how the container app gets ACR pull
# access. ---
resource "azurerm_key_vault" "chatbot" {
  name                = var.key_vault_name
  location            = azurerm_resource_group.chatbot.location
  resource_group_name = azurerm_resource_group.chatbot.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"

  enable_rbac_authorization     = true
  purge_protection_enabled      = false # dev/platform-tooling: allow reuse of the name on destroy/recreate
  soft_delete_retention_days    = 7
  public_network_access_enabled = true

  tags = var.tags
}

# The identity running `terraform apply` needs Secrets Officer to write the
# two secrets below — granted to whoever/whatever applies this, scoped to
# just this vault.
resource "azurerm_role_assignment" "deployer_kv_secrets_officer" {
  scope                = azurerm_key_vault.chatbot.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = data.azurerm_client_config.current.object_id
}

resource "azurerm_key_vault_secret" "anthropic_api_key" {
  name         = "anthropic-api-key"
  value        = var.anthropic_api_key
  key_vault_id = azurerm_key_vault.chatbot.id
  tags         = var.tags

  depends_on = [azurerm_role_assignment.deployer_kv_secrets_officer]
}

resource "azurerm_key_vault_secret" "github_token" {
  name         = "github-token"
  value        = var.github_token
  key_vault_id = azurerm_key_vault.chatbot.id
  tags         = var.tags

  depends_on = [azurerm_role_assignment.deployer_kv_secrets_officer]
}

# --- Azure Container Registry: Basic SKU, no admin user — the container
# app authenticates via its managed identity + AcrPull role instead. ---
resource "azurerm_container_registry" "chatbot" {
  name                = var.container_registry_name
  location            = azurerm_resource_group.chatbot.location
  resource_group_name = azurerm_resource_group.chatbot.name
  sku                 = "Basic"
  admin_enabled       = false

  tags = var.tags
}

# --- Managed identity for the container app. Created (and granted roles)
# before the container app itself, so the container app can pull its image
# and resolve Key Vault secrets on its very first revision instead of
# hitting a chicken-and-egg ordering problem with a system-assigned identity. ---
resource "azurerm_user_assigned_identity" "container_app" {
  name                = "${var.container_app_name}-identity"
  location            = azurerm_resource_group.chatbot.location
  resource_group_name = azurerm_resource_group.chatbot.name
  tags                = var.tags
}

resource "azurerm_role_assignment" "container_app_acr_pull" {
  scope                = azurerm_container_registry.chatbot.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.container_app.principal_id
}

resource "azurerm_role_assignment" "container_app_kv_secrets_user" {
  scope                = azurerm_key_vault.chatbot.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.container_app.principal_id
}

# --- Log Analytics workspace: required by Container Apps environments,
# kept at the platform minimum retention/SKU. ---
resource "azurerm_log_analytics_workspace" "chatbot" {
  name                = "${var.container_app_name}-logs"
  location            = azurerm_resource_group.chatbot.location
  resource_group_name = azurerm_resource_group.chatbot.name
  sku                 = "PerGB2018"
  retention_in_days   = 30

  tags = var.tags
}

# --- Container Apps environment: Consumption only, no dedicated workload
# profile, no VNET integration — the cheapest configuration. ---
resource "azurerm_container_app_environment" "chatbot" {
  name                       = "${var.container_app_name}-env"
  location                   = azurerm_resource_group.chatbot.location
  resource_group_name        = azurerm_resource_group.chatbot.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.chatbot.id

  tags = var.tags
}

# --- Container App running the backend. min_replicas = 0 scales to zero
# when idle; 0.25 vCPU / 0.5Gi is the smallest allowed Consumption-plan
# container size. ---
resource "azurerm_container_app" "backend" {
  name                         = var.container_app_name
  resource_group_name          = azurerm_resource_group.chatbot.name
  container_app_environment_id = azurerm_container_app_environment.chatbot.id
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.container_app.id]
  }

  registry {
    server   = azurerm_container_registry.chatbot.login_server
    identity = azurerm_user_assigned_identity.container_app.id
  }

  secret {
    name                = "anthropic-api-key"
    key_vault_secret_id = azurerm_key_vault_secret.anthropic_api_key.id
    identity            = azurerm_user_assigned_identity.container_app.id
  }

  secret {
    name                = "github-token"
    key_vault_secret_id = azurerm_key_vault_secret.github_token.id
    identity            = azurerm_user_assigned_identity.container_app.id
  }

  # A dedicated secret for the auth header the frontend BFF calls this API
  # with — generated once, not stored in source. Rotate by tainting this
  # resource or updating it out of band; not surfaced as a variable since
  # it has no reason to be human-chosen.
  secret {
    name  = "backend-api-key"
    value = random_password.backend_api_key.result
  }

  template {
    min_replicas = 0
    max_replicas = 1

    container {
      name   = "chatbot-backend"
      image  = "${azurerm_container_registry.chatbot.login_server}/chatbot-backend:${var.container_image_tag}"
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name        = "ANTHROPIC_API_KEY"
        secret_name = "anthropic-api-key"
      }
      env {
        name        = "GH_TOKEN"
        secret_name = "github-token"
      }
      env {
        name        = "API_KEY"
        secret_name = "backend-api-key"
      }
      env {
        name  = "GITHUB_REPO"
        value = var.github_repo
      }
      env {
        name  = "PORT"
        value = "3000"
      }
    }
  }

  ingress {
    external_enabled = true
    target_port      = 3000
    transport        = "auto"

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  tags = var.tags

  depends_on = [
    azurerm_role_assignment.container_app_acr_pull,
    azurerm_role_assignment.container_app_kv_secrets_user,
  ]
}

resource "random_password" "backend_api_key" {
  length  = 32
  special = false
}

# --- Static Web App: Free tier, hosts the Next.js frontend. Terraform only
# provisions the shell + deployment token here; actually publishing the
# built frontend still needs a build/deploy step (SWA CLI or the GitHub
# Actions workflow SWA can generate) — out of scope for this file. ---
resource "azurerm_static_web_app" "frontend" {
  name                = var.static_web_app_name
  resource_group_name = azurerm_resource_group.chatbot.name
  location            = var.static_web_app_location
  sku_tier            = "Free"
  sku_size            = "Free"

  tags = var.tags
}
