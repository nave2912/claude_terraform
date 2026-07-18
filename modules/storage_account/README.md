# Module: storage_account

Creates a single `azurerm_storage_account` configured as Azure Data Lake
Storage Gen2 (`account_kind = "StorageV2"`, `is_hns_enabled = true`) with
static website hosting enabled (`$web` container served via
`primary_web_endpoint`). No other optional Gen2 features (lifecycle rules,
private endpoints, CMK, replication beyond LRS) are wired in — add them as
new variables only when a concrete requirement shows up.

## Usage

```hcl
module "storage_account" {
  source = "../../modules/storage_account"

  name                     = "stlearningdevgen2"
  location                 = module.resource_group["primary"].location
  resource_group_name      = module.resource_group["primary"].name
  account_tier             = "Standard"
  account_replication_type = "LRS"
  tags = {
    environment        = "dev"
    owner              = "platform-team"
    costCenter         = "CC-LEARN-001"
    application        = "azure-learning"
    dataClassification = "internal"
    developer          = "naveenkumar"
    purpose            = "website"
  }
}
```

Consumers should not hardcode module inputs — in this framework, values are
sourced from `models/<env>/storage-account.json` via `jsondecode()` in the
environment root, with `location`/`resource_group_name` derived from the
`resource_group` module output so the storage account always lands in the
same resource group and region as the rest of the environment.

## Inputs

| Name | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | yes | Storage account name, must match `^[a-z0-9]{3,24}$`, globally unique |
| `location` | `string` | yes | Azure region |
| `resource_group_name` | `string` | yes | Parent resource group name |
| `account_tier` | `string` | no | `Standard` (default) or `Premium` |
| `account_replication_type` | `string` | no | `LRS` (default), `GRS`, `RAGRS`, `ZRS`, `GZRS`, `RAGZRS` |
| `index_document` | `string` | no | Static website root document, default `index.html` |
| `error_404_document` | `string` | no | Static website 404 document, default `error.html` |
| `tags` | `map(string)` | yes | Must include `environment`, `owner`, `costCenter`, `application`, `dataClassification` |

## Outputs

| Name | Description |
|---|---|
| `id` | Storage account resource ID |
| `name` | Storage account name |
| `primary_dfs_endpoint` | Primary Gen2 (dfs) endpoint |
| `primary_blob_endpoint` | Primary blob endpoint |
| `primary_web_endpoint` | Primary static website endpoint |
| `tags` | Applied tags |

## Notes

- `is_hns_enabled` is hardcoded to `true` and not exposed as a variable —
  this module exists specifically to provision Gen2 accounts. A flat
  (non-Gen2) storage account is a different concern and belongs in its own
  module if/when needed.
- Secure defaults (`min_tls_version = TLS1_2`, HTTPS-only,
  `allow_nested_items_to_be_public = false`) are set unconditionally rather
  than exposed as variables, per the "minimal, no unused knobs" rule in
  `docs/module-standards.md`.
