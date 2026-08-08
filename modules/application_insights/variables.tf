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
  description = "The type of application being monitored. Common values include 'web' for web applications, 'other' for general purposes, 'java' for Java applications, 'MobileCenter' for mobile apps, and 'Node.JS' for Node.js applications."
  type        = string
}

variable "daily_data_cap_in_gb" {
  description = "The maximum amount of data (in gigabytes) that can be ingested per day before ingestion is throttled. Helps control costs by limiting daily data volume."
  type        = number
  default     = null
}

variable "daily_data_cap_notifications_disabled" {
  description = "Whether to disable email notifications when the daily data cap is reached. Set to true to suppress these alerts."
  type        = bool
  default     = null
}

variable "disable_ip_masking" {
  description = "Whether to disable automatic masking of IP addresses in telemetry data. Set to true to store full IP addresses instead of masked versions for privacy."
  type        = bool
  default     = null
}

variable "force_customer_storage_for_profiler" {
  description = "Whether to require customer-provided storage accounts for Application Insights Profiler data instead of using Microsoft-managed storage."
  type        = bool
  default     = null
}

variable "internet_ingestion_enabled" {
  description = "Whether telemetry data can be ingested from public internet endpoints. Set to false to restrict ingestion to private network connections only."
  type        = bool
  default     = null
}

variable "internet_query_enabled" {
  description = "Whether queries against Application Insights data can be made from public internet endpoints. Set to false to restrict queries to private network connections only."
  type        = bool
  default     = null
}

variable "local_authentication_disabled" {
  description = "Whether to disable authentication using instrumentation keys or connection strings. When true, only Azure Active Directory authentication is allowed."
  type        = bool
  default     = null
}

variable "retention_in_days" {
  description = "The number of days that telemetry data will be retained in Application Insights before being automatically deleted. Common values are 30, 60, 90, 120, 180, 270, 365, 550, or 730 days."
  type        = number
  default     = null
}

variable "sampling_percentage" {
  description = "The percentage of telemetry data to collect and store, from 0 to 100. Lower values reduce data volume and costs but may miss some telemetry events."
  type        = number
  default     = null
}

variable "workspace_id" {
  description = "The ID of the Log Analytics workspace to use as the backing store for this Application Insights instance. If not specified, a classic Application Insights resource is created instead."
  type        = string
  default     = null
}

variable "timeouts" {
  description = "Optional timeout settings for create, read, update, and delete operations. Each sub-field (create, delete, read, update) accepts a duration string like '30m' or '1h'."
  type        = object({ create = string, delete = string, read = string, update = string })
  default     = null
}
