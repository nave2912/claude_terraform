variable "name" {
  description = "Resource group name. Must follow naming convention <workload>-<env>, lowercase with hyphens."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*$", var.name))
    error_message = "Resource group name must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens."
  }
}

variable "location" {
  description = "Azure region for the resource group."
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

variable "lock_level" {
  description = "Optional Azure Resource Lock level to apply (CanNotDelete, ReadOnly). Null disables locking."
  type        = string
  default     = null

  validation {
    condition     = var.lock_level == null || contains(["CanNotDelete", "ReadOnly"], var.lock_level)
    error_message = "lock_level must be null, \"CanNotDelete\", or \"ReadOnly\"."
  }
}
