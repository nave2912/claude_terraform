variable "name" {
  description = "Static Web App name."
  type        = string
}

variable "location" {
  description = "Azure region. Static Web Apps is only offered in a handful of regions (eastus2, centralus, westus2, westeurope, eastasia) — pass one of those, not necessarily the same region as the rest of the resource group."
  type        = string

  validation {
    condition     = contains(["eastus2", "centralus", "westus2", "westeurope", "eastasia"], var.location)
    error_message = "location must be a region Azure Static Web Apps actually supports."
  }
}

variable "resource_group_name" {
  description = "Name of the parent resource group this Static Web App is deployed into."
  type        = string
}

variable "sku_tier" {
  description = "Pricing tier."
  type        = string
  default     = "Free"

  validation {
    condition     = contains(["Free", "Standard"], var.sku_tier)
    error_message = "sku_tier must be \"Free\" or \"Standard\"."
  }
}

variable "sku_size" {
  description = "Must match sku_tier."
  type        = string
  default     = "Free"
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
