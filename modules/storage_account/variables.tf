variable "name" {
  description = "Storage account name. Globally unique, lowercase letters/numbers only, 3-24 chars."
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9]{3,24}$", var.name))
    error_message = "Storage account name must be 3-24 characters, lowercase letters and numbers only."
  }
}

variable "location" {
  description = "Azure region for the storage account."
  type        = string
}

variable "resource_group_name" {
  description = "Name of the parent resource group this storage account is deployed into."
  type        = string
}

variable "account_tier" {
  description = "Performance tier of the storage account."
  type        = string
  default     = "Standard"

  validation {
    condition     = contains(["Standard", "Premium"], var.account_tier)
    error_message = "account_tier must be \"Standard\" or \"Premium\"."
  }
}

variable "account_replication_type" {
  description = "Replication strategy for the storage account."
  type        = string
  default     = "LRS"

  validation {
    condition     = contains(["LRS", "GRS", "RAGRS", "ZRS", "GZRS", "RAGZRS"], var.account_replication_type)
    error_message = "account_replication_type must be one of LRS, GRS, RAGRS, ZRS, GZRS, RAGZRS."
  }
}

variable "index_document" {
  description = "Default document served for requests to the static website root or a folder path."
  type        = string
  default     = "index.html"
}

variable "error_404_document" {
  description = "Document served for requests that return a 404 on the static website."
  type        = string
  default     = "error.html"
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
