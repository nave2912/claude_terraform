variable "name" {
  description = "Resource name, following the naming convention in docs/naming-convention.md."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*$", var.name))
    error_message = "Name must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens."
  }
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

variable "os_type" {
  description = "The operating system type for the service plan, either 'Windows' or 'Linux'."
  type        = string
}

variable "sku_name" {
  description = "The pricing tier and size for the service plan, such as 'B1' (Basic), 'S1' (Standard), 'P1V2' (Premium V2), or 'Y1' (Dynamic for Functions)."
  type        = string
}

variable "app_service_environment_id" {
  description = "Optional ID of an App Service Environment (isolated, dedicated environment) where this service plan should be created."
  type        = string
  default     = null
}

variable "maximum_elastic_worker_count" {
  description = "The maximum number of workers that can be elastically scaled out for this service plan when using elastic scale-out SKUs."
  type        = number
  default     = null
}

variable "per_site_scaling_enabled" {
  description = "When enabled (true), allows individual apps in this service plan to be scaled independently rather than scaling all apps together."
  type        = bool
  default     = null
}

variable "worker_count" {
  description = "The number of worker instances to allocate to the service plan, controlling how many virtual machines run your applications."
  type        = number
  default     = null
}

variable "zone_balancing_enabled" {
  description = "When enabled (true), distributes worker instances across multiple availability zones for improved availability and resilience."
  type        = bool
  default     = null
}

variable "timeouts" {
  description = "Optional timeouts for create, read, update, and delete operations, allowing you to customize how long Terraform waits for each operation to complete."
  type        = object({ create = string, delete = string, read = string, update = string })
  default     = null
}
