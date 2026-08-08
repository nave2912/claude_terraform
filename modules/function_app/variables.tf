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
  description = "The resource ID of the App Service Plan under which this Function App will run."
  type        = string
}

variable "storage_account_access_key" {
  description = "The access key for the storage account that the Function App will use for internal operations."
  type        = string
}

variable "storage_account_name" {
  description = "The name of the storage account that the Function App will use for internal operations."
  type        = string
}

variable "app_settings" {
  description = "A map of key-value pairs for application settings that will be available to the Function App as environment variables."
  type        = map(string)
  default     = null
}

variable "client_cert_mode" {
  description = "The mode for client certificate authentication. Controls whether client certificates are required or optional."
  type        = string
  default     = null
}

variable "daily_memory_time_quota" {
  description = "The daily memory-time quota for the Function App (in GB-seconds). Zero means no quota."
  type        = number
  default     = null
}

variable "enable_builtin_logging" {
  description = "Whether to enable built-in logging to the associated Application Insights instance."
  type        = bool
  default     = null
}

variable "enabled" {
  description = "Whether the Function App is enabled and can process requests."
  type        = bool
  default     = null
}

variable "https_only" {
  description = "Whether the Function App should only be accessible via HTTPS, rejecting HTTP requests."
  type        = bool
  default     = true
}

variable "key_vault_reference_identity_id" {
  description = "The user-assigned managed identity ID to use for Key Vault secret references in app settings."
  type        = string
  default     = null
}

variable "os_type" {
  description = "The operating system type for the Function App (linux or windows)."
  type        = string
  default     = null
}

variable "version" {
  description = "The runtime version of the Azure Functions host (e.g. ~3, ~4)."
  type        = string
  default     = null
}

variable "auth_settings" {
  description = "A block configuring authentication and authorization (Easy Auth) for the Function App, including identity providers like Azure AD, Facebook, Google, Microsoft, and Twitter."
  type        = list(object({ additional_login_params = map(string), allowed_external_redirect_urls = list(string), default_provider = string, enabled = bool, issuer = string, runtime_version = string, token_refresh_extension_hours = number, token_store_enabled = bool, unauthenticated_client_action = string, active_directory = list(object({ allowed_audiences = list(string), client_id = string, client_secret = string })), facebook = list(object({ app_id = string, app_secret = string, oauth_scopes = list(string) })), google = list(object({ client_id = string, client_secret = string, oauth_scopes = list(string) })), microsoft = list(object({ client_id = string, client_secret = string, oauth_scopes = list(string) })), twitter = list(object({ consumer_key = string, consumer_secret = string })) }))
  default     = null
}

variable "connection_string" {
  description = "A set of connection string blocks, each defining a name, type, and value for database or service connections."
  type        = list(object({ name = string, type = string, value = string }))
  default     = null
}

variable "identity" {
  description = "A block configuring managed identity for the Function App, specifying the type (SystemAssigned, UserAssigned, or both) and optional user-assigned identity IDs."
  type        = list(object({ identity_ids = set(string), type = string }))
  default     = null
}

variable "site_config" {
  description = "A block containing detailed runtime and platform configuration for the Function App, including always-on behavior, framework versions, IP restrictions, CORS, TLS settings, and more."
  type        = list(object({ always_on = bool, app_scale_limit = number, auto_swap_slot_name = string, dotnet_framework_version = string, elastic_instance_minimum = number, ftps_state = string, health_check_path = string, http2_enabled = bool, ip_restriction = list(object({ action = string, headers = string, ip_address = string, name = string, priority = number, service_tag = string, virtual_network_subnet_id = string })), java_version = string, linux_fx_version = string, min_tls_version = string, pre_warmed_instance_count = number, runtime_scale_monitoring_enabled = bool, scm_ip_restriction = list(object({ action = string, headers = string, ip_address = string, name = string, priority = number, service_tag = string, virtual_network_subnet_id = string })), scm_type = string, scm_use_main_ip_restriction = bool, use_32_bit_worker_process = bool, vnet_route_all_enabled = bool, websockets_enabled = bool, cors = list(object({ allowed_origins = set(string), support_credentials = bool })) }))
  default     = null
}

variable "source_control" {
  description = "A block configuring source control integration, specifying the repository URL, branch, and integration settings."
  type        = list(object({ branch = string, manual_integration = bool, repo_url = string, rollback_enabled = bool, use_mercurial = bool }))
  default     = null
}

variable "timeouts" {
  description = "A block allowing customization of timeout durations for create, read, update, and delete operations."
  type        = object({ create = string, delete = string, read = string, update = string })
  default     = null
}
