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

variable "application_type" {
  description = "The type of application being monitored (for example, 'web', 'ios', 'java', 'Node.JS', 'other'). This determines how Application Insights collects and displays telemetry data."
  type        = string
}

variable "daily_data_cap_in_gb" {
  description = "The maximum amount of data in gigabytes that can be ingested per day. When this limit is reached, data collection stops until the next day."
  type        = number
  default     = null
}

variable "daily_data_cap_notifications_disabled" {
  description = "Whether to disable email notifications when the daily data cap is reached. Set to true to turn off notifications, false to receive them."
  type        = bool
  default     = null
}

variable "disable_ip_masking" {
  description = "Whether to disable IP address masking in telemetry data. Set to true to store full IP addresses, false to mask the last octet for privacy."
  type        = bool
  default     = null
}

variable "force_customer_storage_for_profiler" {
  description = "Whether to require customer-managed storage for the Application Insights Profiler feature. Set to true to use your own storage account."
  type        = bool
  default     = null
}

variable "internet_ingestion_enabled" {
  description = "Whether data can be ingested into Application Insights from the public internet. Set to false to restrict ingestion to private networks only."
  type        = bool
  default     = null
}

variable "internet_query_enabled" {
  description = "Whether Application Insights data can be queried from the public internet. Set to false to restrict queries to private networks only."
  type        = bool
  default     = null
}

variable "local_authentication_disabled" {
  description = "Whether to disable local authentication methods (like API keys). Set to true to require Azure Active Directory authentication only."
  type        = bool
  default     = null
}

variable "retention_in_days" {
  description = "The number of days to retain telemetry data before it is automatically deleted. Common values are 30, 60, 90, 120, 180, 270, 365, 550, or 730 days."
  type        = number
  default     = null
}

variable "sampling_percentage" {
  description = "The percentage of telemetry data to collect (0-100). For example, 50 means only half of the telemetry will be stored, reducing costs while maintaining statistical validity."
  type        = number
  default     = null
}

variable "workspace_id" {
  description = "The ID of the Log Analytics workspace to which Application Insights data should be sent. If not specified, a classic Application Insights resource is created instead."
  type        = string
  default     = null
}

variable "timeouts" {
  description = "An optional block that allows you to customize how long Terraform will wait for create, read, update, and delete operations to complete before timing out."
  type        = object({ create = string, delete = string, read = string, update = string })
  default     = null
}
