# JSON-driven infrastructure model.
# Infrastructure intent lives in models/<environment>/resource-group.json.
# jsondecode() turns intent into data; for_each turns data into resources
# via the reusable module in modules/resource_group. 

data "azurerm_client_config" "current" {}

locals {
  resource_group_model            = jsondecode(file("${path.module}/../../models/${var.environment}/resource-group.json"))
  storage_account_model           = jsondecode(file("${path.module}/../../models/${var.environment}/storage-account.json"))
  virtual_network_model           = jsondecode(file("${path.module}/../../models/${var.environment}/virtual-network.json"))
  key_vault_model                 = jsondecode(file("${path.module}/../../models/${var.environment}/key-vault.json"))
  container_registry_model        = jsondecode(file("${path.module}/../../models/${var.environment}/container-registry.json"))
  log_analytics_workspace_model   = jsondecode(file("${path.module}/../../models/${var.environment}/log-analytics-workspace.json"))
  container_app_environment_model = jsondecode(file("${path.module}/../../models/${var.environment}/container-app-environment.json"))
  container_app_model             = jsondecode(file("${path.module}/../../models/${var.environment}/container-app.json"))
  static_web_app_model            = jsondecode(file("${path.module}/../../models/${var.environment}/static-web-app.json"))

  # Other models reference a resource group by its real Azure name
  # (resource_group_name), not by resource-group.json's logical key -- this
  # translates name back to key so module.resource_group[...] lookups
  # (which are for_each-keyed by logical id) still work unchanged.
  resource_group_name_to_key = { for k, rg in local.resource_group_model.resource_groups : rg.name => k }
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
  location                 = module.resource_group[local.resource_group_name_to_key[each.value.resource_group_name]].location
  resource_group_name      = module.resource_group[local.resource_group_name_to_key[each.value.resource_group_name]].name
  account_tier             = each.value.account_tier
  account_replication_type = each.value.account_replication_type
  tags                     = each.value.tags
}

module "virtual_network" {
  source = "../../modules/virtual_network"

  for_each = local.virtual_network_model.virtual_networks

  name                = each.value.name
  location            = module.resource_group[local.resource_group_name_to_key[each.value.resource_group_name]].location
  resource_group_name = module.resource_group[local.resource_group_name_to_key[each.value.resource_group_name]].name
  address_space       = each.value.address_space
  subnets             = try(each.value.subnets, {})
  tags                = each.value.tags
}

# --- Chatbot hosting infra ---
# JSON-model-driven like the resources above (models/dev/key-vault.json,
# container-registry.json, log-analytics-workspace.json,
# container-app-environment.json, container-app.json, static-web-app.json),
# EXCEPT for the two real secrets below (anthropic_api_key/github_token),
# which have no business living in a committed JSON model — see
# models/schema/container-app.schema.json's top-level description.

module "key_vault" {
  source = "../../modules/key_vault"

  for_each = local.key_vault_model.key_vaults

  name                       = each.value.name
  location                   = module.resource_group[local.resource_group_name_to_key[each.value.resource_group_name]].location
  resource_group_name        = module.resource_group[local.resource_group_name_to_key[each.value.resource_group_name]].name
  sku_name                   = try(each.value.sku_name, "standard")
  purge_protection_enabled   = try(each.value.purge_protection_enabled, false)
  soft_delete_retention_days = try(each.value.soft_delete_retention_days, 7)
  tags                       = each.value.tags
}

# The identity running `terraform apply` needs Secrets Officer to write the
# two secrets below — granted to whoever/whatever applies this, scoped to
# just the "chatbot" vault.
resource "azurerm_role_assignment" "chatbot_deployer_kv_secrets_officer" {
  scope                = module.key_vault["chatbot"].id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = data.azurerm_client_config.current.object_id
}

resource "azurerm_key_vault_secret" "chatbot_anthropic_api_key" {
  name            = "anthropic-api-key"
  value           = var.chatbot_anthropic_api_key
  key_vault_id    = module.key_vault["chatbot"].id
  content_type    = "text/plain"
  expiration_date = var.chatbot_secret_expiration_date
  tags            = local.key_vault_model.key_vaults["chatbot"].tags

  depends_on = [azurerm_role_assignment.chatbot_deployer_kv_secrets_officer]

  # Terraform only creates this secret; it never overwrites the value on
  # later applies. CI doesn't reliably pass a real value on every run (e.g.
  # workflow_dispatch with no input), and without this a blank -var would
  # silently blank out a real secret rotated by hand. Rotate by changing the
  # value out-of-band (az keyvault secret set / Portal) or in Terraform with
  # a deliberate `terraform apply -replace`.
  lifecycle {
    ignore_changes = [value]
  }
}

# The resource above only ever reads back the version *it* created -- an
# out-of-band rotation (az keyvault secret set / Portal) creates a new
# version the resource's own Read never notices. This data source has no
# such pinning: it looks up "name" fresh on every plan/apply and always
# resolves to whatever is currently the latest version in the vault.
data "azurerm_key_vault_secret" "chatbot_anthropic_api_key_current" {
  name         = azurerm_key_vault_secret.chatbot_anthropic_api_key.name
  key_vault_id = module.key_vault["chatbot"].id
}

resource "azurerm_key_vault_secret" "chatbot_github_token" {
  name            = "github-token"
  value           = var.chatbot_github_token
  key_vault_id    = module.key_vault["chatbot"].id
  content_type    = "text/plain"
  expiration_date = var.chatbot_secret_expiration_date
  tags            = local.key_vault_model.key_vaults["chatbot"].tags

  depends_on = [azurerm_role_assignment.chatbot_deployer_kv_secrets_officer]

  # See chatbot_anthropic_api_key above: create-once, never overwritten by
  # later applies.
  lifecycle {
    ignore_changes = [value]
  }
}

module "container_registry" {
  source = "../../modules/container_registry"

  for_each = local.container_registry_model.container_registries

  name                = each.value.name
  location            = module.resource_group[local.resource_group_name_to_key[each.value.resource_group_name]].location
  resource_group_name = module.resource_group[local.resource_group_name_to_key[each.value.resource_group_name]].name
  sku                 = try(each.value.sku, "Basic")
  admin_enabled       = try(each.value.admin_enabled, false)
  tags                = each.value.tags
}

module "log_analytics_workspace" {
  source = "../../modules/log_analytics_workspace"

  for_each = local.log_analytics_workspace_model.log_analytics_workspaces

  name                = each.value.name
  location            = module.resource_group[local.resource_group_name_to_key[each.value.resource_group_name]].location
  resource_group_name = module.resource_group[local.resource_group_name_to_key[each.value.resource_group_name]].name
  sku                 = try(each.value.sku, "PerGB2018")
  retention_in_days   = try(each.value.retention_in_days, 30)
  tags                = each.value.tags
}

module "container_app_environment" {
  source = "../../modules/container_app_environment"

  for_each = local.container_app_environment_model.container_app_environments

  name                       = each.value.name
  location                   = module.resource_group[local.resource_group_name_to_key[each.value.resource_group_name]].location
  resource_group_name        = module.resource_group[local.resource_group_name_to_key[each.value.resource_group_name]].name
  log_analytics_workspace_id = module.log_analytics_workspace[each.value.log_analytics_workspace_key].id
  tags                       = each.value.tags
}

# Managed identity per container app, created (and granted roles) before
# the container app itself, so each app can pull its image and resolve Key
# Vault secrets on its very first revision.
resource "azurerm_user_assigned_identity" "container_app" {
  for_each = local.container_app_model.container_apps

  name                = "${each.value.name}-identity"
  location            = module.resource_group[local.resource_group_name_to_key[each.value.resource_group_name]].location
  resource_group_name = module.resource_group[local.resource_group_name_to_key[each.value.resource_group_name]].name
  tags                = each.value.tags
}

resource "azurerm_role_assignment" "container_app_acr_pull" {
  for_each = local.container_app_model.container_apps

  scope                = module.container_registry[each.value.container_registry_key].id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_user_assigned_identity.container_app[each.key].principal_id
}

resource "azurerm_role_assignment" "container_app_kv_secrets_user" {
  # Only the "backend" entry needs Key Vault access today (it's the only
  # one with Key-Vault-backed secrets, wired in below) — scoped by key so
  # this doesn't grant vault access to a future container app that has no
  # secrets at all.
  for_each = { for k, v in local.container_app_model.container_apps : k => v if k == "backend" }

  scope                = module.key_vault["chatbot"].id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.container_app[each.key].principal_id
}

# Azure RBAC role assignments are eventually consistent — a brand-new
# managed identity plus a brand-new role assignment together can take
# several minutes to replicate, even though the azurerm_role_assignment
# resource itself reports "complete" as soon as the write is accepted.
# Without this, the Container App's first revision can fail with "Unable
# to get value using Managed identity ... for secret X" even though the
# role assignment is genuinely correct — observed directly in CI (RBAC
# confirmed correct on inspection, ~9 minutes after assignment, after the
# container app had already failed once).
resource "time_sleep" "wait_for_container_app_rbac" {
  create_duration = "90s"

  depends_on = [
    azurerm_role_assignment.container_app_acr_pull,
    azurerm_role_assignment.container_app_kv_secrets_user,
  ]
}

module "container_app" {
  source = "../../modules/container_app"

  for_each = local.container_app_model.container_apps

  name                         = each.value.name
  resource_group_name          = module.resource_group[local.resource_group_name_to_key[each.value.resource_group_name]].name
  container_app_environment_id = module.container_app_environment[each.value.container_app_environment_key].id
  user_assigned_identity_ids   = [azurerm_user_assigned_identity.container_app[each.key].id]

  registry_server      = module.container_registry[each.value.container_registry_key].login_server
  registry_identity_id = azurerm_user_assigned_identity.container_app[each.key].id

  # Key-Vault-backed secrets aren't part of the model (see schema
  # description) — the "backend" entry's three secrets are hand-wired here
  # by key, same pattern as the role assignment above.
  # versionless_id, not id — pinning a specific secret version here means
  # any future secret rotation (a new azurerm_key_vault_secret version)
  # would require a container app config change too, and worse, produces
  # an azurerm provider "inconsistent final plan" error whenever the
  # secret is modified in the same apply that creates/updates this
  # container app (the versioned id changes between plan and apply).
  secrets = each.key == "backend" ? [
    {
      name                = "anthropic-api-key"
      key_vault_secret_id = azurerm_key_vault_secret.chatbot_anthropic_api_key.versionless_id
      identity            = azurerm_user_assigned_identity.container_app[each.key].id
    },
    {
      name                = "github-token"
      key_vault_secret_id = azurerm_key_vault_secret.chatbot_github_token.versionless_id
      identity            = azurerm_user_assigned_identity.container_app[each.key].id
    },
    {
      name  = "backend-api-key"
      value = var.chatbot_backend_api_key
    },
  ] : []

  container_name = each.value.container_name
  image          = "${module.container_registry[each.value.container_registry_key].login_server}/${each.value.image_name}:${try(each.value.image_tag, "latest")}"
  cpu            = try(each.value.cpu, 0.25)
  memory         = try(each.value.memory, "0.5Gi")
  target_port    = each.value.target_port
  min_replicas   = try(each.value.min_replicas, 0)
  max_replicas   = try(each.value.max_replicas, 1)

  env = concat(
    [for e in try(each.value.env, []) : { name = e.name, value = e.value }],
    each.key == "backend" ? [
      { name = "ANTHROPIC_API_KEY", secret_name = "anthropic-api-key" },
      { name = "GH_TOKEN", secret_name = "github-token" },
      { name = "API_KEY", secret_name = "backend-api-key" },
    ] : []
  )

  tags = each.value.tags

  depends_on = [
    time_sleep.wait_for_container_app_rbac,
  ]
}

# Static Web App: Free tier, hosts the Next.js frontend. Terraform only
# provisions the shell + deployment token; publishing the built frontend
# still needs a separate build/deploy step (SWA CLI or GitHub Actions).
module "static_web_app" {
  source = "../../modules/static_web_app"

  for_each = local.static_web_app_model.static_web_apps

  name                = each.value.name
  location            = each.value.location
  resource_group_name = module.resource_group[local.resource_group_name_to_key[each.value.resource_group_name]].name
  sku_tier            = try(each.value.sku_tier, "Free")
  sku_size            = try(each.value.sku_size, "Free")
  tags                = each.value.tags

  # Server-side env vars for the frontend's Route Handlers -- not part of
  # the model (same reasoning as container_app's Key-Vault-backed secrets):
  # only the "chatbot" entry has a backend to talk to.
  #
  # ANTHROPIC_API_KEY reads the *current* Key Vault secret value via the
  # data source above, not var.chatbot_anthropic_api_key directly -- that
  # variable is allowed to be blank on CI runs that don't resolve the real
  # secret (the KV secret resource itself is protected by
  # lifecycle.ignore_changes for exactly this reason). Sourcing from var.*
  # here bypassed that protection and
  # blanked this app setting the moment a blank-var apply ran.
  app_settings = each.key == "chatbot" ? {
    BACKEND_BASE_URL  = "https://${module.container_app["backend"].latest_revision_fqdn}"
    BACKEND_API_KEY   = var.chatbot_backend_api_key
    ANTHROPIC_API_KEY = data.azurerm_key_vault_secret.chatbot_anthropic_api_key_current.value
  } : {}
}
