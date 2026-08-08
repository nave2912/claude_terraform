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
  description = "The type of application being monitored. This determines the default dashboards and features available in Application Insights."
  type        = string
}

variable "daily_data_cap_in_gb" {
  description = "The daily volume cap in gigabytes for ingestion. When the cap is reached, data ingestion stops until the next day."
  type        = number
  default     = null
}

variable "daily_data_cap_notifications_disabled" {
  description = "Whether to disable email notifications when the daily data cap is reached."
  type        = bool
  default     = null
}

variable "disable_ip_masking" {
  description = "Whether to disable IP address masking in telemetry. When false (default), the last octet of IP addresses is masked for privacy."
  type        = bool
  default     = null
}

variable "force_customer_storage_for_profiler" {
  description = "Whether to force the use of customer-provided storage for profiler data instead of Microsoft-managed storage."
  type        = bool
  default     = null
}

variable "internet_ingestion_enabled" {
  description = "Whether to allow data ingestion from public internet endpoints. When false, only private link connections can send telemetry."
  type        = bool
  default     = null
}

variable "internet_query_enabled" {
  description = "Whether to allow queries from public internet endpoints. When false, only private link connections can query data."
  type        = bool
  default     = null
}

variable "local_authentication_disabled" {
  description = "Whether to disable authentication using instrumentation keys. When true, only Azure AD authentication is allowed."
  type        = bool
  default     = null
}

variable "retention_in_days" {
  description = "The number of days telemetry data is retained. Must be one of the allowed values (30, 60, 90, 120, 180, 270, 365, 550, or 730)."
  type        = number
  default     = null
}

variable "sampling_percentage" {
  description = "The percentage of telemetry to sample and ingest (0-100). Lower values reduce data volume and costs but may miss events."
  type        = number
  default     = null
}

variable "workspace_id" {
  description = "The ID of the Log Analytics workspace to which Application Insights data should be sent. Required for workspace-based Application Insights."
  type        = string
  default     = null
}

variable "timeouts" {
  description = "A nested block that allows you to customize how long certain operations are allowed to take before timing out."
  type        = object({ create = string, delete = string, read = string, update = string })
  default     = null
}
