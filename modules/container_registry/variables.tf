variable "name" {
  description = "Container registry name. Must be globally unique, 5-50 alphanumeric characters (no hyphens/underscores)."
  type        = string

  validation {
    condition     = can(regex("^[a-zA-Z0-9]{5,50}$", var.name))
    error_message = "Container registry name must be 5-50 alphanumeric characters only."
  }
}

variable "location" {
  description = "Azure region for the container registry."
  type        = string
}

variable "resource_group_name" {
  description = "Name of the parent resource group this container registry is deployed into."
  type        = string
}

variable "sku" {
  description = "Container registry pricing tier."
  type        = string
  default     = "Basic"

  validation {
    condition     = contains(["Basic", "Standard", "Premium"], var.sku)
    error_message = "sku must be one of Basic, Standard, Premium."
  }
}

variable "admin_enabled" {
  description = "Whether the registry's admin user/password login is enabled. Default false — consumers should authenticate via managed identity + AcrPull role instead."
  type        = bool
  default     = false
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
