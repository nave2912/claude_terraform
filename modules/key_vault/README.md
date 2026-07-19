# Module: key_vault

Creates a single `azurerm_key_vault` with RBAC authorization (not access
policies) — callers grant access via `azurerm_role_assignment` against this
vault's `id` output, the same pattern used for ACR pull access elsewhere in
this framework. Secrets themselves are not managed by this module; create
`azurerm_key_vault_secret` resources against the `id` output from the
calling root, so this module stays a reusable "create a vault" building
block rather than something tied to any one application's secret names.

## Usage

```hcl
module "key_vault" {
  source = "../../modules/key_vault"

  name                 = "kv-chatbot-naveenk"
  location             = "eastus"
  resource_group_name  = "azure-learning-dev"
  tags = {
    environment        = "dev"
    owner              = "platform-team"
    costCenter         = "CC-LEARN-001"
    application        = "azure-learning"
    dataClassification = "confidential"
  }
}
```

## Inputs

| Name | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | yes | Vault name, `^[a-zA-Z][a-zA-Z0-9-]{1,22}[a-zA-Z0-9]$`, globally unique |
| `location` | `string` | yes | Azure region |
| `resource_group_name` | `string` | yes | Parent resource group name |
| `sku_name` | `string` | no | `standard` (default) or `premium` |
| `purge_protection_enabled` | `bool` | no | Default `false` — dev/platform-tooling default, not production-appropriate |
| `soft_delete_retention_days` | `number` | no | 7-90, default 7 |
| `tags` | `map(string)` | yes | Must include `environment`, `owner`, `costCenter`, `application`, `dataClassification` |

## Outputs

| Name | Description |
|---|---|
| `id` | Key Vault resource ID — use as the `scope` for role assignments |
| `name` | Key Vault name |
| `vault_uri` | Vault URI |
| `tenant_id` | Azure AD tenant ID the vault is registered under |
