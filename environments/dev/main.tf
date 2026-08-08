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
# container-app-environment.json, container-app.json — both the backend
# and the frontend are entries in the latter; the frontend is the sole
# public entry point, the backend is internal-only),
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
  # "backend" and "frontend" both read the chatbot_anthropic_api_key Key
  # Vault secret (see the secrets block below) — scoped by key so this
  # doesn't grant vault access to a future container app that has no
  # secrets at all.
  for_each = { for k, v in local.container_app_model.container_apps : k => v if contains(["backend", "frontend"], k) }

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
  # description) — the "backend" and "frontend" entries' secrets are
  # hand-wired here by key, same pattern as the role assignment above.
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
    ] : each.key == "frontend" ? [
    {
      # Same underlying Key Vault secret the backend reads — the frontend
      # authenticates to it via its own managed identity (granted above),
      # not by sharing the backend's identity.
      name                = "anthropic-api-key"
      key_vault_secret_id = azurerm_key_vault_secret.chatbot_anthropic_api_key.versionless_id
      identity            = azurerm_user_assigned_identity.container_app[each.key].id
    },
    {
      # Same value the backend's requireApiKey middleware checks against —
      # this is the shared secret that lets the frontend call the backend.
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
  # Backend is internal-only: reachable from other apps in this Container
  # Apps Environment (i.e. the frontend, below) via internal DNS, never
  # from the public internet — not just an app-layer x-api-key check.
  external_enabled = try(each.value.external_enabled, true)

  env = concat(
    [for e in try(each.value.env, []) : { name = e.name, value = e.value }],
    each.key == "backend" ? [
      { name = "ANTHROPIC_API_KEY", secret_name = "anthropic-api-key" },
      { name = "GH_TOKEN", secret_name = "github-token" },
      { name = "API_KEY", secret_name = "backend-api-key" },
      ] : each.key == "frontend" ? [
      { name = "ANTHROPIC_API_KEY", secret_name = "anthropic-api-key" },
      { name = "BACKEND_API_KEY", secret_name = "backend-api-key" },
      # Internal hostname, not the (now nonexistent) public FQDN — backend
      # is external_enabled = false, only reachable from within this
      # environment via <app-name>.internal.<environment-default-domain>.
      # Reads the raw model value (not module.container_app["backend"].name)
      # deliberately -- referencing another for_each instance of THIS SAME
      # module block from within its own body is a self-reference Terraform
      # rejects; local.container_app_model.container_apps["backend"].name is
      # the identical string (the module's own name output is exactly
      # var.name passed through), without the cycle.
      { name = "BACKEND_BASE_URL", value = "https://${local.container_app_model.container_apps["backend"].name}.internal.${module.container_app_environment[each.value.container_app_environment_key].default_domain}" },
    ] : []
  )

  tags = each.value.tags

  depends_on = [
    time_sleep.wait_for_container_app_rbac,
  ]
}

locals {
  application_insights_model = jsondecode(file("${path.module}/../../models/${var.environment}/application-insights.json"))
}

module "application_insights" {
  source = "../../modules/application_insights"

  for_each = local.application_insights_model.application_insights

  name                                  = each.value.name
  location                              = module.resource_group[local.resource_group_name_to_key[each.value.resource_group_name]].location
  resource_group_name                   = module.resource_group[local.resource_group_name_to_key[each.value.resource_group_name]].name
  application_type                      = each.value.application_type
  daily_data_cap_in_gb                  = try(each.value.daily_data_cap_in_gb, null)
  daily_data_cap_notifications_disabled = try(each.value.daily_data_cap_notifications_disabled, null)
  disable_ip_masking                    = try(each.value.disable_ip_masking, null)
  force_customer_storage_for_profiler   = try(each.value.force_customer_storage_for_profiler, null)
  internet_ingestion_enabled            = try(each.value.internet_ingestion_enabled, null)
  internet_query_enabled                = try(each.value.internet_query_enabled, null)
  local_authentication_disabled         = try(each.value.local_authentication_disabled, null)
  retention_in_days                     = try(each.value.retention_in_days, null)
  sampling_percentage                   = try(each.value.sampling_percentage, null)
  workspace_id                          = try(each.value.workspace_id, null)
  timeouts                              = try(each.value.timeouts, null)
  tags                                  = each.value.tags
}

locals {
  machine_learning_workspace_model = jsondecode(file("${path.module}/../../models/${var.environment}/machine-learning-workspace.json"))
}

module "machine_learning_workspace" {
  source = "../../modules/machine_learning_workspace"

  for_each = local.machine_learning_workspace_model.machine_learning_workspaces

  name                           = each.value.name
  location                       = module.resource_group[local.resource_group_name_to_key[each.value.resource_group_name]].location
  resource_group_name            = module.resource_group[local.resource_group_name_to_key[each.value.resource_group_name]].name
  application_insights_id        = each.value.application_insights_id
  key_vault_id                   = each.value.key_vault_id
  storage_account_id             = each.value.storage_account_id
  identity                       = each.value.identity
  container_registry_id          = try(each.value.container_registry_id, null)
  description                    = try(each.value.description, null)
  friendly_name                  = try(each.value.friendly_name, null)
  high_business_impact           = try(each.value.high_business_impact, null)
  image_build_compute_name       = try(each.value.image_build_compute_name, null)
  kind                           = try(each.value.kind, null)
  primary_user_assigned_identity = try(each.value.primary_user_assigned_identity, null)
  sku_name                       = try(each.value.sku_name, null)
  v1_legacy_mode_enabled         = try(each.value.v1_legacy_mode_enabled, null)
  encryption                     = try(each.value.encryption, null)
  feature_store                  = try(each.value.feature_store, null)
  managed_network                = try(each.value.managed_network, null)
  serverless_compute             = try(each.value.serverless_compute, null)
  timeouts                       = try(each.value.timeouts, null)
  tags                           = each.value.tags
}
