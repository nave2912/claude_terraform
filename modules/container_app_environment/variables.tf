variable "name" {
  description = "Container Apps environment name."
  type        = string
}

variable "location" {
  description = "Azure region for the environment."
  type        = string
}

variable "resource_group_name" {
  description = "Name of the parent resource group this environment is deployed into."
  type        = string
}

variable "log_analytics_workspace_id" {
  description = "Resource ID of the Log Analytics workspace this environment sends logs to — see modules/log_analytics_workspace."
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
