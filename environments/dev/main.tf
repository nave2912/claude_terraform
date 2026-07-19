# JSON-driven infrastructure model.
# Infrastructure intent lives in models/<environment>/resource-group.json.
# jsondecode() turns intent into data; for_each turns data into resources
# via the reusable module in modules/resource_group. 

data "azurerm_client_config" "current" {}

locals {
  resource_group_model  = jsondecode(file("${path.module}/../../models/${var.environment}/resource-group.json"))
  storage_account_model = jsondecode(file("${path.module}/../../models/${var.environment}/storage-account.json"))
  virtual_network_model = jsondecode(file("${path.module}/../../models/${var.environment}/virtual-network.json"))
}

module "resource_group" {
  source = "../../modules/resource_group"

  for_each = local.resource_group_model.resource_groups

  name       = each.value.name
  location   = each.value.location
  tags       = each.value.tags
  lock_level = var.default_lock_level
}

module "storage_account" {
  source = "../../modules/storage_account"

  for_each = local.storage_account_model.storage_accounts

  name                     = each.value.name
  location                 = module.resource_group[each.value.resource_group_key].location
  resource_group_name      = module.resource_group[each.value.resource_group_key].name
  account_tier             = each.value.account_tier
  account_replication_type = each.value.account_replication_type
  tags                     = each.value.tags
}

module "virtual_network" {
  source = "../../modules/virtual_network"

  for_each = local.virtual_network_model.virtual_networks

  name                = each.value.name
  location            = module.resource_group[each.value.resource_group_key].location
  resource_group_name = module.resource_group[each.value.resource_group_key].name
  address_space       = each.value.address_space
  subnets             = try(each.value.subnets, {})
  tags                = each.value.tags
}

# --- Chatbot hosting infra ---
# Hand-wired (not JSON-model-driven like the resources above): this is the
# platform the chatbot itself runs on, not a workload the chatbot proposes
# through its own PR pipeline, and it needs two real secrets
# (anthropic_api_key/github_token) that have no business living in a
# committed JSON model. Deploys into the same "primary" resource group
# (azure-learning-dev) the rest of this environment uses.

module "key_vault" {
  source = "../../modules/key_vault"

  name                = var.chatbot_key_vault_name
  location            = module.resource_group["primary"].location
  resource_group_name = module.resource_group["primary"].name
  tags                = var.chatbot_tags
}

# The identity running `terraform apply` needs Secrets Officer to write the
# two secrets below — granted to whoever/whatever applies this, scoped to
# just this vault.
resource "azurerm_role_assignment" "chatbot_deployer_kv_secrets_officer" {
  scope                = module.key_vault.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = data.azurerm_client_config.current.object_id
}

resource "azurerm_key_vault_secret" "chatbot_anthropic_api_key" {
  name         = "anthropic-api-key"
  value        = var.chatbot_anthropic_api_key
  key_vault_id = module.key_vault.id
  tags         = var.chatbot_tags

  depends_on = [azurerm_role_assignment.chatbot_deployer_kv_secrets_officer]
}

resource "azurerm_key_vault_secret" "chatbot_github_token" {
  name         = "github-token"
  value        = var.chatbot_github_token
  key_vault_id = module.key_vault.id
  tags         = var.chatbot_tags

  depends_on = [azurerm_role_assignment.chatbot_deployer_kv_secrets_officer]
}

module "container_registry" {
  source = "../../modules/container_registry"

  name                = var.chatbot_container_registry_name
  location            = module.resource_group["primary"].location
  resource_group_name = module.resource_group["primary"].name
  tags                = var.chatbot_tags
}

# Managed identity for the container app, created (and granted roles)
# before the container app itself, so the app can pull its image and
# resolve Key Vault secrets on its very first revision.
resource "azurerm_user_assigned_identity" "chatbot_container_app" {
  name                = "${var.chatbot_container_app_name}-identity"
  location            = module.resource_group["primary"].location
  resource_group_name = module.resource_group["primary"].name
  tags                = var.chatbot_tags
}

resource "azurerm_role_assignment" "chatbot_container_app_acr_pull" {
  scope                = module.container_registry.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.chatbot_container_app.principal_id
}

resource "azurerm_role_assignment" "chatbot_container_app_kv_secrets_user" {
  scope                = module.key_vault.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.chatbot_container_app.principal_id
}

module "log_analytics_workspace" {
  source = "../../modules/log_analytics_workspace"

  name                = "${var.chatbot_container_app_name}-logs"
  location            = module.resource_group["primary"].location
  resource_group_name = module.resource_group["primary"].name
  tags                = var.chatbot_tags
}

module "container_app_environment" {
  source = "../../modules/container_app_environment"

  name                       = "${var.chatbot_container_app_name}-env"
  location                   = module.resource_group["primary"].location
  resource_group_name        = module.resource_group["primary"].name
  log_analytics_workspace_id = module.log_analytics_workspace.id
  tags                       = var.chatbot_tags
}

resource "random_password" "chatbot_backend_api_key" {
  length  = 32
  special = false
}

module "container_app" {
  source = "../../modules/container_app"

  name                         = var.chatbot_container_app_name
  resource_group_name          = module.resource_group["primary"].name
  container_app_environment_id = module.container_app_environment.id
  user_assigned_identity_ids   = [azurerm_user_assigned_identity.chatbot_container_app.id]

  registry_server      = module.container_registry.login_server
  registry_identity_id = azurerm_user_assigned_identity.chatbot_container_app.id

  secrets = [
    {
      name                = "anthropic-api-key"
      key_vault_secret_id = azurerm_key_vault_secret.chatbot_anthropic_api_key.id
      identity            = azurerm_user_assigned_identity.chatbot_container_app.id
    },
    {
      name                = "github-token"
      key_vault_secret_id = azurerm_key_vault_secret.chatbot_github_token.id
      identity            = azurerm_user_assigned_identity.chatbot_container_app.id
    },
    # A dedicated secret for the auth header the frontend BFF calls this API
    # with — generated once, not stored in source. Rotate by tainting
    # random_password.chatbot_backend_api_key or updating it out of band.
    {
      name  = "backend-api-key"
      value = random_password.chatbot_backend_api_key.result
    },
  ]

  container_name = "chatbot-backend"
  image          = "${module.container_registry.login_server}/chatbot-backend:${var.chatbot_container_image_tag}"
  target_port    = 3000

  env = [
    { name = "ANTHROPIC_API_KEY", secret_name = "anthropic-api-key" },
    { name = "GH_TOKEN", secret_name = "github-token" },
    { name = "API_KEY", secret_name = "backend-api-key" },
    { name = "GITHUB_REPO", value = var.chatbot_github_repo },
    { name = "PORT", value = "3000" },
  ]

  tags = var.chatbot_tags

  depends_on = [
    azurerm_role_assignment.chatbot_container_app_acr_pull,
    azurerm_role_assignment.chatbot_container_app_kv_secrets_user,
  ]
}

# Static Web App: Free tier, hosts the Next.js frontend. Terraform only
# provisions the shell + deployment token; publishing the built frontend
# still needs a separate build/deploy step (SWA CLI or GitHub Actions).
module "static_web_app" {
  source = "../../modules/static_web_app"

  name                = var.chatbot_static_web_app_name
  location            = var.chatbot_static_web_app_location
  resource_group_name = module.resource_group["primary"].name
  tags                = var.chatbot_tags
}
