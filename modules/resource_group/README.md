# Module: resource_group

Creates a single `azurerm_resource_group`, optionally with a management lock.
This is the reference implementation for module structure — copy this
pattern (see `modules/_module_template`) for every new module added to the
framework.

## Usage

```hcl
module "resource_group" {
  source = "../../modules/resource_group"

  name       = "azure-learning-dev"
  location   = "eastus"
  lock_level = null
  tags = {
    environment        = "dev"
    owner              = "platform-team"
    costCenter         = "CC-LEARN-001"
    application        = "azure-learning"
    dataClassification = "internal"
  }
}
```

Consumers should not hardcode module inputs — in this framework, values are
sourced from `models/<env>/resource-group.json` via `jsondecode()` in the
environment root.

## Inputs

| Name | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | yes | Resource group name, must match `^[a-z][a-z0-9-]*$` |
| `location` | `string` | yes | Azure region |
| `tags` | `map(string)` | yes | Must include `environment`, `owner`, `costCenter`, `application`, `dataClassification` |
| `lock_level` | `string` | no | `CanNotDelete`, `ReadOnly`, or `null` (default) |

## Outputs

| Name | Description |
|---|---|
| `id` | Resource group resource ID |
| `name` | Resource group name |
| `location` | Resource group location |
| `tags` | Applied tags |

## Notes

- The module does **not** select which subscription/provider to deploy into.
  Today there's a single `azurerm` provider (AzureLearning subscription); if
  a second subscription is added later, pass the desired alias in via the
  caller's `providers = {}` meta-argument — no module change required.
- Tag and name validation happens both here (`variable` blocks) and upstream
  in `models/schema/resource-group.schema.json` — fail fast at the JSON
  layer where possible, Terraform validation is the backstop.
