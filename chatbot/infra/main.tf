# Terraform for the chatbot's OWN hosting — deliberately separate from
# environments/{dev,qa,prod}, which model AzureLearning workload
# infrastructure through the JSON-model pattern the chatbot itself writes
# to. This file provisions the platform the chatbot runs on, hand-written
# once, not generated per-request.
#
# Deploys into the EXISTING "azure-learning-dev" resource group (managed by
# environments/dev's own Terraform state, models/dev/resource-group.json
# key "primary") rather than creating a new one — referenced via a data
# source, never a resource, so this state file never claims ownership of it.
#
# Every resource below is a thin call into a standalone module under
# modules/ (key_vault, container_registry, log_analytics_workspace,
# container_app_environment, container_app, static_web_app) — the same
# resource_group/storage_account/virtual_network module pattern the rest of
# this repo uses. That's deliberate: those modules are reusable building
# blocks, not chatbot-specific, so they're the natural next candidates for
# their own models/schema/*.schema.json + environments/dev wiring if this
# ever needs to be creatable through the chatbot's own UI.
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

data "azurerm_resource_group" "existing" {
  name = var.resource_group_name
}

# --- Key Vault: holds the Anthropic API key + GitHub token. ---
module "key_vault" {
  source = "../../modules/key_vault"

  name                = var.key_vault_name
  location            = data.azurerm_resource_group.existing.location
  resource_group_name = data.azurerm_resource_group.existing.name
  tags                = var.tags
}

# The identity running `terraform apply` needs Secrets Officer to write the
# two secrets below — granted to whoever/whatever applies this, scoped to
# just this vault.
resource "azurerm_role_assignment" "deployer_kv_secrets_officer" {
  scope                = module.key_vault.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = data.azurerm_client_config.current.object_id
}

resource "azurerm_key_vault_secret" "anthropic_api_key" {
  name         = "anthropic-api-key"
  value        = var.anthropic_api_key
  key_vault_id = module.key_vault.id
  tags         = var.tags

  depends_on = [azurerm_role_assignment.deployer_kv_secrets_officer]
}

resource "azurerm_key_vault_secret" "github_token" {
  name         = "github-token"
  value        = var.github_token
  key_vault_id = module.key_vault.id
  tags         = var.tags

  depends_on = [azurerm_role_assignment.deployer_kv_secrets_officer]
}

# --- Azure Container Registry: Basic SKU, no admin user — the container
# app authenticates via its managed identity + AcrPull role instead. ---
module "container_registry" {
  source = "../../modules/container_registry"

  name                = var.container_registry_name
  location            = data.azurerm_resource_group.existing.location
  resource_group_name = data.azurerm_resource_group.existing.name
  tags                = var.tags
}

# --- Managed identity for the container app. Created (and granted roles)
# before the container app itself, so the container app can pull its image
# and resolve Key Vault secrets on its very first revision instead of
# hitting a chicken-and-egg ordering problem with a system-assigned identity. ---
resource "azurerm_user_assigned_identity" "container_app" {
  name                = "${var.container_app_name}-identity"
  location            = data.azurerm_resource_group.existing.location
  resource_group_name = data.azurerm_resource_group.existing.name
  tags                = var.tags
}

resource "azurerm_role_assignment" "container_app_acr_pull" {
  scope                = module.container_registry.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.container_app.principal_id
}

resource "azurerm_role_assignment" "container_app_kv_secrets_user" {
  scope                = module.key_vault.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.container_app.principal_id
}

# --- Log Analytics workspace: required by Container Apps environments,
# kept at the platform minimum retention/SKU. ---
module "log_analytics_workspace" {
  source = "../../modules/log_analytics_workspace"

  name                = "${var.container_app_name}-logs"
  location            = data.azurerm_resource_group.existing.location
  resource_group_name = data.azurerm_resource_group.existing.name
  tags                = var.tags
}

# --- Container Apps environment: Consumption only, no dedicated workload
# profile, no VNET integration — the cheapest configuration. ---
module "container_app_environment" {
  source = "../../modules/container_app_environment"

  name                       = "${var.container_app_name}-env"
  location                   = data.azurerm_resource_group.existing.location
  resource_group_name        = data.azurerm_resource_group.existing.name
  log_analytics_workspace_id = module.log_analytics_workspace.id
  tags                       = var.tags
}

resource "random_password" "backend_api_key" {
  length  = 32
  special = false
}

# --- Container App running the backend. min_replicas = 0 scales to zero
# when idle; 0.25 vCPU / 0.5Gi is the smallest allowed Consumption-plan
# container size. ---
module "container_app" {
  source = "../../modules/container_app"

  name                         = var.container_app_name
  resource_group_name          = data.azurerm_resource_group.existing.name
  container_app_environment_id = module.container_app_environment.id
  user_assigned_identity_ids   = [azurerm_user_assigned_identity.container_app.id]

  registry_server      = module.container_registry.login_server
  registry_identity_id = azurerm_user_assigned_identity.container_app.id

  secrets = [
    {
      name                = "anthropic-api-key"
      key_vault_secret_id = azurerm_key_vault_secret.anthropic_api_key.id
      identity            = azurerm_user_assigned_identity.container_app.id
    },
    {
      name                = "github-token"
      key_vault_secret_id = azurerm_key_vault_secret.github_token.id
      identity            = azurerm_user_assigned_identity.container_app.id
    },
    # A dedicated secret for the auth header the frontend BFF calls this API
    # with — generated once, not stored in source. Rotate by tainting
    # random_password.backend_api_key or updating it out of band; not
    # surfaced as a variable since it has no reason to be human-chosen.
    {
      name  = "backend-api-key"
      value = random_password.backend_api_key.result
    },
  ]

  container_name = "chatbot-backend"
  image          = "${module.container_registry.login_server}/chatbot-backend:${var.container_image_tag}"
  target_port    = 3000

  env = [
    { name = "ANTHROPIC_API_KEY", secret_name = "anthropic-api-key" },
    { name = "GH_TOKEN", secret_name = "github-token" },
    { name = "API_KEY", secret_name = "backend-api-key" },
    { name = "GITHUB_REPO", value = var.github_repo },
    { name = "PORT", value = "3000" },
  ]

  tags = var.tags

  depends_on = [
    azurerm_role_assignment.container_app_acr_pull,
    azurerm_role_assignment.container_app_kv_secrets_user,
  ]
}

# --- Static Web App: Free tier, hosts the Next.js frontend. Terraform only
# provisions the shell + deployment token here; actually publishing the
# built frontend still needs a build/deploy step (SWA CLI or the GitHub
# Actions workflow SWA can generate) — out of scope for this file. ---
module "static_web_app" {
  source = "../../modules/static_web_app"

  name                = var.static_web_app_name
  location            = var.static_web_app_location
  resource_group_name = data.azurerm_resource_group.existing.name
  tags                = var.tags
}
