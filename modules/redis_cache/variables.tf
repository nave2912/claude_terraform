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

variable "capacity" {
  description = "The size of the Redis cache to deploy. Valid values depend on the family: for C (Basic/Standard) family, valid values are 0-6; for P (Premium) family, valid values are 1-5. Higher numbers indicate larger cache sizes."
  type        = number
}

variable "family" {
  description = "The SKU family to use. Valid values are 'C' for Basic/Standard SKUs or 'P' for Premium SKUs. Must match the chosen sku_name."
  type        = string
}

variable "sku_name" {
  description = "The SKU tier of the Redis cache. Valid values are 'Basic', 'Standard', or 'Premium'. Premium offers features like clustering, persistence, and virtual network support."
  type        = string
}

variable "enable_non_ssl_port" {
  description = "Deprecated field. Use non_ssl_port_enabled instead. Controls whether the non-SSL port (6379) is enabled for the Redis cache."
  type        = bool
  default     = null
}

variable "minimum_tls_version" {
  description = "The minimum TLS version required for client connections. Valid values are '1.0', '1.1', or '1.2'. Defaults to '1.0' but '1.2' is recommended for security."
  type        = string
  default     = null
}

variable "non_ssl_port_enabled" {
  description = "Whether to enable the non-SSL port (6379) for the Redis cache. When false, only SSL connections on port 6380 are allowed. Defaults to false for security."
  type        = bool
  default     = null
}

variable "private_static_ip_address" {
  description = "A static private IP address to assign to the Redis cache when deployed within a virtual network (subnet_id must also be specified). The IP must be available in the subnet range."
  type        = string
  default     = null
}

variable "public_network_access_enabled" {
  description = "Whether public network access is allowed to the Redis cache. When false, the cache is only accessible via private endpoints or virtual network integration. Defaults to true."
  type        = bool
  default     = null
}

variable "redis_version" {
  description = "The version of Redis to run. Valid values are typically '4' or '6'. If not specified, Azure will use a default version."
  type        = string
  default     = null
}

variable "replicas_per_master" {
  description = "Deprecated field. Use replicas_per_primary instead. The number of replicas to create for each primary node in a Premium SKU cache with clustering enabled."
  type        = number
  default     = null
}

variable "replicas_per_primary" {
  description = "The number of replicas to create for each primary shard. Only available for Premium SKU caches. Valid values are typically 1-3."
  type        = number
  default     = null
}

variable "shard_count" {
  description = "The number of shards to create on a Premium SKU Redis cache when clustering is enabled. Only available for Premium SKU. Valid values range from 1 to 10."
  type        = number
  default     = null
}

variable "subnet_id" {
  description = "The ID of the subnet within a virtual network in which to deploy the Redis cache. Only available for Premium SKU. When specified, the cache is accessible only from within the VNet."
  type        = string
  default     = null
}

variable "tenant_settings" {
  description = "A map of tenant-specific settings for the Redis cache. These are advanced configuration options specific to certain Redis scenarios."
  type        = map(string)
  default     = null
}

variable "zones" {
  description = "A set of availability zones where the Redis cache should be deployed for high availability. Valid values are '1', '2', and '3' depending on region support. Only available for Premium SKU."
  type        = set(string)
  default     = null
}

variable "identity" {
  description = "A list block defining a managed identity for the Redis cache. Used to authenticate to other Azure services without managing credentials. Typically contains one entry specifying the identity type and optional identity IDs for user-assigned identities."
  type        = list(object({ identity_ids = set(string), type = string }))
  default     = null
}

variable "patch_schedule" {
  description = "A list block defining one or more maintenance windows when Azure can apply patches to the Redis cache. Each entry specifies a day of the week, start hour in UTC, and optional maintenance window duration. Helps control when updates occur."
  type        = list(object({ day_of_week = string, maintenance_window = string, start_hour_utc = number }))
  default     = null
}

variable "redis_configuration" {
  description = "A list block (typically with one entry) containing advanced Redis configuration settings such as persistence (RDB/AOF backups), memory policies, authentication settings, and notification options. Controls Redis server behavior and features."
  type        = list(object({ active_directory_authentication_enabled = bool, aof_backup_enabled = bool, aof_storage_connection_string_0 = string, aof_storage_connection_string_1 = string, authentication_enabled = bool, data_persistence_authentication_method = string, enable_authentication = bool, maxfragmentationmemory_reserved = number, maxmemory_delta = number, maxmemory_policy = string, maxmemory_reserved = number, notify_keyspace_events = string, rdb_backup_enabled = bool, rdb_backup_frequency = number, rdb_backup_max_snapshot_count = number, rdb_storage_connection_string = string, storage_account_subscription_id = string }))
  default     = null
}

variable "timeouts" {
  description = "A single block defining custom timeout durations for create, read, update, and delete operations. Allows you to override the default wait times for long-running operations."
  type        = object({ create = string, delete = string, read = string, update = string })
  default     = null
}
