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

variable "app_service_plan_id" {
  description = "The ID of the App Service Plan that will host this Function App. The plan defines the compute resources (CPU, memory, scaling) available to the function."
  type        = string
}

variable "storage_account_access_key" {
  description = "The access key for the storage account. Azure Functions requires a storage account for internal operations like managing triggers and logging function executions."
  type        = string
}

variable "storage_account_name" {
  description = "The name of the storage account that the Function App will use for its internal state, triggers, and runtime artifacts."
  type        = string
}

variable "app_settings" {
  description = "A map of key-value pairs for application settings (environment variables) that will be available to the function code at runtime."
  type        = map(string)
  default     = null
}

variable "client_cert_mode" {
  description = "The mode for client certificate authentication. Controls whether client certificates are required, optional, or not used."
  type        = string
  default     = "Required"
}

variable "daily_memory_time_quota" {
  description = "The daily memory-time quota for the Function App in GB-seconds. When exceeded, the function app is stopped until the next day. Zero means no quota."
  type        = number
  default     = null
}

variable "enable_builtin_logging" {
  description = "Whether to enable built-in logging to the associated storage account. When true, function execution logs are written to Azure Storage."
  type        = bool
  default     = null
}

variable "enabled" {
  description = "Whether the Function App is enabled and can process requests. When false, the app is stopped and will not execute functions."
  type        = bool
  default     = null
}

variable "https_only" {
  description = "Whether to allow only HTTPS requests to the Function App. When true, HTTP requests are automatically redirected to HTTPS."
  type        = bool
  default     = true
}

variable "key_vault_reference_identity_id" {
  description = "The user-assigned managed identity ID to use when accessing Key Vault references in app settings. If not specified, the system-assigned identity is used."
  type        = string
  default     = null
}

variable "os_type" {
  description = "The operating system type for the Function App runtime. Determines whether the app runs on Windows or Linux infrastructure."
  type        = string
  default     = null
}

variable "version" {
  description = "The runtime version of the Azure Functions host. Typically a value like ~3 or ~4 indicating the major version of the Functions runtime."
  type        = string
  default     = null
}

variable "auth_settings" {
  description = "Configuration block for App Service Authentication/Authorization (Easy Auth). Controls authentication providers and behavior for securing the Function App."
  type        = list(object({ additional_login_params = map(string), allowed_external_redirect_urls = list(string), default_provider = string, enabled = bool, issuer = string, runtime_version = string, token_refresh_extension_hours = number, token_store_enabled = bool, unauthenticated_client_action = string, active_directory = list(object({ allowed_audiences = list(string), client_id = string, client_secret = string })), facebook = list(object({ app_id = string, app_secret = string, oauth_scopes = list(string) })), google = list(object({ client_id = string, client_secret = string, oauth_scopes = list(string) })), microsoft = list(object({ client_id = string, client_secret = string, oauth_scopes = list(string) })), twitter = list(object({ consumer_key = string, consumer_secret = string })) }))
  default     = null
}

variable "connection_string" {
  description = "A set of connection strings to make available to the Function App. Each entry has a name, type (e.g., SQLAzure, Custom), and the connection string value."
  type        = list(object({ name = string, type = string, value = string }))
  default     = null
}

variable "identity" {
  description = "Configuration block for managed identity. Defines whether the Function App uses a system-assigned identity, user-assigned identities, or both."
  type        = list(object({ identity_ids = set(string), type = string }))
  default     = null
}

variable "site_config" {
  description = "Detailed configuration block for the Function App's runtime behavior, including networking, language versions, scaling, CORS, IP restrictions, and TLS settings."
  type        = list(object({ always_on = bool, app_scale_limit = number, auto_swap_slot_name = string, dotnet_framework_version = string, elastic_instance_minimum = number, ftps_state = string, health_check_path = string, http2_enabled = bool, ip_restriction = list(object({ action = string, headers = string, ip_address = string, name = string, priority = number, service_tag = string, virtual_network_subnet_id = string })), java_version = string, linux_fx_version = string, min_tls_version = string, pre_warmed_instance_count = number, runtime_scale_monitoring_enabled = bool, scm_ip_restriction = list(object({ action = string, headers = string, ip_address = string, name = string, priority = number, service_tag = string, virtual_network_subnet_id = string })), scm_type = string, scm_use_main_ip_restriction = bool, use_32_bit_worker_process = bool, vnet_route_all_enabled = bool, websockets_enabled = bool, cors = list(object({ allowed_origins = set(string), support_credentials = bool })) }))
  default     = null
}

variable "source_control" {
  description = "Configuration block for continuous deployment from a source control repository. Defines the Git or Mercurial repository URL, branch, and integration settings."
  type        = list(object({ branch = string, manual_integration = bool, repo_url = string, rollback_enabled = bool, use_mercurial = bool }))
  default     = null
}

variable "timeouts" {
  description = "Configurable timeout durations for create, read, update, and delete operations on this Function App resource."
  type        = object({ create = string, delete = string, read = string, update = string })
  default     = null
}
