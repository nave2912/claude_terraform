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
  description = "The size of the Redis cache to deploy. Valid values depend on the SKU family: for C (Basic/Standard) use 0-6, for P (Premium) use 1-5."
  type        = number
}

variable "family" {
  description = "The SKU family to use. Valid values are C (for Basic/Standard SKU) or P (for Premium SKU)."
  type        = string
}

variable "sku_name" {
  description = "The SKU of Redis to use. Possible values are Basic, Standard, and Premium."
  type        = string
}

variable "enable_non_ssl_port" {
  description = "Legacy field for enabling the non-SSL port (6379). Deprecated in favor of non_ssl_port_enabled."
  type        = bool
  default     = false
}

variable "minimum_tls_version" {
  description = "The minimum TLS version required for SSL connections. Valid values are 1.0, 1.1, and 1.2."
  type        = string
  default     = "1.2"
}

variable "non_ssl_port_enabled" {
  description = "Whether to enable the non-SSL port (6379) for the Redis Cache. When false, only SSL connections (port 6380) are allowed."
  type        = bool
  default     = false
}

variable "private_static_ip_address" {
  description = "The static private IP address to assign to the Redis Cache when deployed to a virtual network (requires Premium SKU and subnet_id)."
  type        = string
  default     = null
}

variable "public_network_access_enabled" {
  description = "Whether public network access is allowed for this Redis Cache. When false, only private endpoint connections are permitted."
  type        = bool
  default     = false
}

variable "redis_version" {
  description = "The version of Redis to use. Possible values are 4 and 6. Defaults to 6 if not specified."
  type        = string
  default     = null
}

variable "replicas_per_master" {
  description = "Legacy field for the number of replicas per master node (Premium SKU only). Deprecated in favor of replicas_per_primary."
  type        = number
  default     = null
}

variable "replicas_per_primary" {
  description = "The number of replicas per primary node. Only available for Premium SKU. Valid values depend on cluster configuration."
  type        = number
  default     = null
}

variable "shard_count" {
  description = "The number of shards to create on a Premium Cluster Cache. Only available when using Premium SKU with clustering enabled."
  type        = number
  default     = null
}

variable "subnet_id" {
  description = "The ID of the subnet within a virtual network where the Redis Cache should be deployed. Only supported for Premium SKU."
  type        = string
  default     = null
}

variable "tenant_settings" {
  description = "A map of tenant-specific settings to configure on the Redis Cache instance."
  type        = map(string)
  default     = null
}

variable "zones" {
  description = "A set of availability zones in which the Redis Cache should be created. Supported only in certain regions and SKUs."
  type        = set(string)
  default     = null
}

variable "identity" {
  description = "A list containing a single identity configuration block that assigns a managed identity to the Redis Cache."
  type        = list(object({ identity_ids = set(string), type = string }))
  default     = null
}

variable "patch_schedule" {
  description = "A list of patch schedule blocks defining maintenance windows when Azure can apply updates to the Redis Cache."
  type        = list(object({ day_of_week = string, maintenance_window = string, start_hour_utc = number }))
  default     = null
}

variable "redis_configuration" {
  description = "A list containing a single configuration block for Redis-specific settings like data persistence, backup, memory policies, and authentication."
  type        = list(object({ active_directory_authentication_enabled = bool, aof_backup_enabled = bool, aof_storage_connection_string_0 = string, aof_storage_connection_string_1 = string, authentication_enabled = bool, data_persistence_authentication_method = string, enable_authentication = bool, maxfragmentationmemory_reserved = number, maxmemory_delta = number, maxmemory_policy = string, maxmemory_reserved = number, notify_keyspace_events = string, rdb_backup_enabled = bool, rdb_backup_frequency = number, rdb_backup_max_snapshot_count = number, rdb_storage_connection_string = string, storage_account_subscription_id = string }))
  default     = null
}

variable "timeouts" {
  description = "A single nested block specifying custom timeout durations for create, read, update, and delete operations."
  type        = object({ create = string, delete = string, read = string, update = string })
  default     = null
}
