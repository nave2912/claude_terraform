variable "name" {
  description = "Key Vault name. Must be globally unique, 3-24 chars, start with a letter."
  type        = string

  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9-]{1,22}[a-zA-Z0-9]$", var.name))
    error_message = "Key Vault name must be 3-24 chars, start with a letter, alphanumeric and hyphens only."
  }
}

variable "location" {
  description = "Azure region for the Key Vault."
  type        = string
}

variable "resource_group_name" {
  description = "Name of the parent resource group this Key Vault is deployed into."
  type        = string
}

variable "sku_name" {
  description = "Key Vault pricing tier."
  type        = string
  default     = "standard"

  validation {
    condition     = contains(["standard", "premium"], var.sku_name)
    error_message = "sku_name must be \"standard\" or \"premium\"."
  }
}

variable "purge_protection_enabled" {
  description = "Whether purge protection is enabled. Disabling allows the vault name to be reused immediately after destroy — appropriate for dev/platform-tooling vaults, not for anything holding production secrets long-term."
  type        = bool
  default     = false
}

variable "soft_delete_retention_days" {
  description = "Days a deleted vault/secret is recoverable before permanent purge."
  type        = number
  default     = 7

  validation {
    condition     = var.soft_delete_retention_days >= 7 && var.soft_delete_retention_days <= 90
    error_message = "soft_delete_retention_days must be between 7 and 90."
  }
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
