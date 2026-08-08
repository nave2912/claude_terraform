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
  description = "The maximum amount of data in gigabytes that can be ingested per day. This helps control costs by limiting daily data collection."
  type        = number
  default     = null
}

variable "daily_data_cap_notifications_disabled" {
  description = "Whether to disable email notifications when the daily data cap is reached. Set to true to suppress these notifications."
  type        = bool
  default     = null
}

variable "disable_ip_masking" {
  description = "Whether to disable IP address masking in telemetry data. Set to true to store complete IP addresses instead of masking the last octet for privacy."
  type        = bool
  default     = null
}

variable "force_customer_storage_for_profiler" {
  description = "Whether to require customer-managed storage for the Application Insights Profiler feature. Set to true to force use of your own storage account."
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
  description = "Whether to disable authentication using API keys. Set to true to require Azure Active Directory authentication only."
  type        = bool
  default     = null
}

variable "retention_in_days" {
  description = "The number of days to retain telemetry data before it is automatically deleted. Common values are 30, 60, 90, 120, 180, 270, 365, 550, or 730 days."
  type        = number
  default     = null
}

variable "sampling_percentage" {
  description = "The percentage of telemetry data to collect, as a number between 0 and 100. Lower values reduce data volume and costs but may miss some events."
  type        = number
  default     = null
}

variable "workspace_id" {
  description = "The ID of the Log Analytics workspace to which Application Insights data should be sent. When provided, Application Insights uses workspace-based storage instead of classic storage."
  type        = string
  default     = null
}

variable "timeouts" {
  description = "Optional timeout settings for create, read, update, and delete operations. Each sub-field (create, delete, read, update) accepts a duration string like '30m' or '1h'."
  type        = object({ create = string, delete = string, read = string, update = string })
  default     = null
}
