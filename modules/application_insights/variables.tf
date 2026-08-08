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
  description = "The type of application being monitored, such as 'web' for web applications, 'ios' for iOS apps, 'java' for Java applications, or 'other' for general use cases."
  type        = string
}

variable "daily_data_cap_in_gb" {
  description = "The maximum amount of telemetry data (in gigabytes) that can be ingested per day before throttling occurs."
  type        = number
  default     = null
}

variable "daily_data_cap_notifications_disabled" {
  description = "Whether to disable email notifications when the daily data cap is reached. Set to true to suppress these alerts."
  type        = bool
  default     = null
}

variable "disable_ip_masking" {
  description = "Whether to disable the automatic masking of IP addresses in telemetry data. Set to true to store full IP addresses for compliance or debugging needs."
  type        = bool
  default     = null
}

variable "force_customer_storage_for_profiler" {
  description = "Whether to require customer-managed storage for the Application Insights Profiler feature instead of using Microsoft-managed storage."
  type        = bool
  default     = null
}

variable "internet_ingestion_enabled" {
  description = "Whether telemetry data can be ingested from public internet endpoints. Set to false to restrict ingestion to private networks only."
  type        = bool
  default     = null
}

variable "internet_query_enabled" {
  description = "Whether queries against Application Insights data can be made from public internet endpoints. Set to false to restrict queries to private networks only."
  type        = bool
  default     = null
}

variable "local_authentication_disabled" {
  description = "Whether to disable local authentication methods (such as API keys) and require Azure Active Directory authentication only."
  type        = bool
  default     = null
}

variable "retention_in_days" {
  description = "The number of days that telemetry data will be retained before automatic deletion, typically ranging from 30 to 730 days."
  type        = number
  default     = null
}

variable "sampling_percentage" {
  description = "The percentage of telemetry data to retain (0-100), where lower values reduce costs by sampling and discarding some data."
  type        = number
  default     = null
}

variable "workspace_id" {
  description = "The ID of the Log Analytics workspace to which Application Insights data should be sent. If not specified, a classic Application Insights resource is created."
  type        = string
  default     = null
}

variable "timeouts" {
  description = "Optional timeout configurations for create, read, update, and delete operations, specified as duration strings like '30m' or '1h'."
  type        = object({ create = string, delete = string, read = string, update = string })
  default     = null
}
