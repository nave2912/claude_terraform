# JSON Model Guide

## Why JSON-driven infrastructure

Infrastructure **intent** (what to create) is kept separate from
**implementation** (how to create it). Platform engineers own
`modules/`; anyone adding a resource group edits a JSON file, not
Terraform.

## File layout

```
models/
├── schema/
│   └── resource-group.schema.json   # JSON Schema — the contract
├── dev/
│   └── resource-group.json
├── qa/
│   └── resource-group.json
└── prod/
    └── resource-group.json
```

One model file per environment, all deployed into the single
`AzureLearning` subscription.

## Anatomy of a model file

```json
{
  "resource_groups": {
    "primary": {
      "name": "azure-learning-dev",
      "location": "eastus",
      "tags": {
        "environment": "dev",
        "owner": "platform-team",
        "costCenter": "CC-LEARN-001",
        "application": "azure-learning",
        "dataClassification": "internal"
      }
    }
  }
}
```

- The key under `resource_groups` (`primary`) is a **stable logical id** —
  it becomes the Terraform `for_each` key. Renaming it forces a
  destroy/recreate of that resource, so treat it like a resource address,
  not a display label.
- `name` must satisfy the naming convention regex enforced both in the JSON
  Schema and in `modules/resource_group/variables.tf`.
- `tags` must include all five mandatory keys.

## How Terraform consumes it

```hcl
locals {
  resource_group_model = jsondecode(file("${path.module}/../../models/${var.environment}/resource-group.json"))
}

module "resource_group" {
  source   = "../../modules/resource_group"
  for_each = local.resource_group_model.resource_groups

  name     = each.value.name
  location = each.value.location
  tags     = each.value.tags
}
```

## Validating a model before it reaches Terraform

```bash
python3 tests/policy/validate_models.py
```

This runs in CI ahead of `terraform validate` so malformed JSON fails fast
with a readable error instead of an opaque Terraform error.

## Extending the model for a new resource type

1. Add a new schema file under `models/schema/` (e.g. `key-vault.schema.json`).
2. Add a top-level key to `models/<env>/resource-group.json` (e.g.
   `"key_vaults": {...}`), or a new model file (`key-vault.json`) if the
   resource type warrants its own file.
3. Add the corresponding `module "key_vault"` block to each
   `environments/<env>/main.tf`, following the `resource_group` pattern.

## Multiple subscriptions later?

This framework currently targets a single subscription (`AzureLearning`).
If a second subscription is added in the future, reintroduce aliased
`azurerm` provider blocks in `environments/<env>/providers.tf` (one per
subscription) and split `models/<env>/` back into one file per subscription,
each carrying a `subscription_alias` key that maps to its provider alias.
