# TEMPLATE — copy this directory to modules/<resource_name> and fill in.
#
# Conventions to preserve:
#   - Every module accepts `tags` (map(string)) with the mandatory keys
#     enforced via a `validation` block, mirroring models/schema/*.json.
#   - Every module accepts `name` with a naming-convention `validation` block.
#   - Modules never hardcode a provider — the caller supplies it via
#     `providers = { azurerm = azurerm.<alias> }`.
#   - No default values for anything that varies by environment or
#     subscription; only safe, universal defaults (e.g. lock_level = null).

# tflint-ignore: terraform_unused_declarations
# Unused by design — main.tf's resource block is commented out in this
# template. These variables exist to be copied into the real module; they
# become "used" the moment main.tf is filled in. Do not remove.
variable "name" {
  description = "Resource name, following the naming convention in docs/naming-convention.md."
  type        = string
}

# tflint-ignore: terraform_unused_declarations
variable "location" {
  description = "Azure region."
  type        = string
}

# tflint-ignore: terraform_unused_declarations
variable "resource_group_name" {
  description = "Name of the parent resource group this resource is deployed into."
  type        = string
}

# tflint-ignore: terraform_unused_declarations
variable "tags" {
  description = "Mandatory tag set. Must include environment, owner, costCenter, application, dataClassification."
  type        = map(string)

  validation {
    condition = alltrue([
      for key in ["environment", "owner", "costCenter", "application", "dataClassification"] :
      contains(keys(var.tags), key)
    ])
    error_message = "tags must include environment, owner, costCenter, application, and dataClassification."
  }
}
