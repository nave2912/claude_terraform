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
  description = "The type of application being monitored. This determines the default dashboards and metrics displayed in Application Insights."
  type        = string
}

variable "daily_data_cap_in_gb" {
  description = "The daily data volume cap in gigabytes. When this limit is reached, data ingestion stops for the rest of the day."
  type        = number
  default     = null
}

variable "daily_data_cap_notifications_disabled" {
  description = "Whether to disable email notifications when the daily data cap is reached."
  type        = bool
  default     = null
}

variable "disable_ip_masking" {
  description = "Whether to disable IP address masking in telemetry data. When false, the last octet of IP addresses is masked for privacy."
  type        = bool
  default     = null
}

variable "force_customer_storage_for_profiler" {
  description = "Whether to force the use of customer-owned storage accounts for profiler data instead of Microsoft-managed storage."
  type        = bool
  default     = null
}

variable "internet_ingestion_enabled" {
  description = "Whether ingestion (receiving telemetry data) is allowed from public internet endpoints. Set to false to restrict to private endpoints only."
  type        = bool
  default     = null
}

variable "internet_query_enabled" {
  description = "Whether querying the Application Insights data is allowed from public internet endpoints. Set to false to restrict to private endpoints only."
  type        = bool
  default     = null
}

variable "local_authentication_disabled" {
  description = "Whether to disable local authentication methods (instrumentation keys) and require Azure Active Directory authentication only."
  type        = bool
  default     = null
}

variable "retention_in_days" {
  description = "The number of days telemetry data will be retained in Application Insights before being automatically deleted."
  type        = number
  default     = null
}

variable "sampling_percentage" {
  description = "The percentage of telemetry data to collect (0-100). Lower values reduce data volume and costs but may miss some events."
  type        = number
  default     = null
}

variable "workspace_id" {
  description = "The ID of the Log Analytics workspace to which Application Insights data should be sent. Required for workspace-based Application Insights."
  type        = string
  default     = null
}

variable "timeouts" {
  description = "A block that allows you to customize how long Terraform will wait for create, read, update, and delete operations to complete before timing out."
  type        = object({ create = string, delete = string, read = string, update = string })
  default     = null
}
