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

variable "name" {
  description = "Resource name, following the naming convention in docs/naming-convention.md."
  type        = string
}

variable "location" {
  description = "Azure region."
  type        = string
}

variable "resource_group_name" {
  description = "Name of the parent resource group this resource is deployed into."
  type        = string
}

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
