variable "name" {
  description = "Log Analytics workspace name."
  type        = string

  validation {
    condition     = can(regex("^[a-zA-Z0-9-]{4,63}$", var.name))
    error_message = "Log Analytics workspace name must be 4-63 chars, alphanumeric and hyphens only."
  }
}

variable "location" {
  description = "Azure region for the workspace."
  type        = string
}

variable "resource_group_name" {
  description = "Name of the parent resource group this workspace is deployed into."
  type        = string
}

variable "sku" {
  description = "Pricing tier."
  type        = string
  default     = "PerGB2018"
}

variable "retention_in_days" {
  description = "Data retention in days. 30 is the platform minimum for PerGB2018 and the cheapest option."
  type        = number
  default     = 30

  validation {
    condition     = var.retention_in_days >= 30 && var.retention_in_days <= 730
    error_message = "retention_in_days must be between 30 and 730."
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
