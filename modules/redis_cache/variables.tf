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
  description = "The size of the Redis cache to deploy. Valid values depend on the SKU: for Basic/Standard (C family) use 0-6, for Premium (P family) use 1-5."
  type        = number
}

variable "family" {
  description = "The SKU family to use. Valid values are C (for Basic/Standard SKUs) or P (for Premium SKU)."
  type        = string
}

variable "sku_name" {
  description = "The SKU pricing tier for the Redis cache. Valid values are Basic, Standard, or Premium."
  type        = string
}

variable "enable_non_ssl_port" {
  description = "Legacy field (deprecated) that enables the non-SSL port (6379). Use non_ssl_port_enabled instead."
  type        = bool
  default     = false
}

variable "minimum_tls_version" {
  description = "The minimum TLS version required for client connections. Valid values are 1.0, 1.1, or 1.2."
  type        = string
  default     = "1.2"
}

variable "non_ssl_port_enabled" {
  description = "Whether to enable the non-SSL port (6379) for unencrypted connections to Redis."
  type        = bool
  default     = false
}

variable "private_static_ip_address" {
  description = "The static private IP address to assign to the Redis cache when deployed in a virtual network (requires subnet_id)."
  type        = string
  default     = null
}

variable "public_network_access_enabled" {
  description = "Whether public network access is allowed to the Redis cache. Set to false to restrict access to private endpoints only."
  type        = bool
  default     = false
}

variable "redis_version" {
  description = "The version of Redis to run. Valid values are 4 or 6. Defaults to 6 if not specified."
  type        = string
  default     = null
}

variable "replicas_per_master" {
  description = "Legacy field (deprecated) that specifies the number of replicas per master node in a Premium SKU cluster. Use replicas_per_primary instead."
  type        = number
  default     = null
}

variable "replicas_per_primary" {
  description = "The number of replicas per primary node in a Premium SKU cluster. Only applicable when using Premium tier."
  type        = number
  default     = null
}

variable "shard_count" {
  description = "The number of shards to create on a Premium tier Redis cache for clustering. Only available for Premium SKU."
  type        = number
  default     = null
}

variable "subnet_id" {
  description = "The ID of the subnet within a virtual network in which the Redis cache should be deployed. Only supported for Premium SKU."
  type        = string
  default     = null
}

variable "tenant_settings" {
  description = "A map of tenant-specific settings to configure for the Redis cache."
  type        = map(string)
  default     = null
}

variable "zones" {
  description = "A set of availability zones in which the Redis cache should be created for high availability. Valid values are 1, 2, or 3."
  type        = set(string)
  default     = null
}

variable "identity" {
  description = "A list block configuring a managed identity for the Redis cache. Contains the identity type (SystemAssigned, UserAssigned, or both) and optionally a set of user-assigned identity IDs."
  type        = list(object({ identity_ids = set(string), type = string }))
  default     = null
}

variable "patch_schedule" {
  description = "A list block defining one or more maintenance windows during which Azure can apply patches. Each entry specifies the day of week, start hour (UTC), and optional maintenance window duration."
  type        = list(object({ day_of_week = string, maintenance_window = string, start_hour_utc = number }))
  default     = null
}

variable "redis_configuration" {
  description = "A list block (max one entry) containing advanced Redis configuration settings such as data persistence, backup, memory policies, authentication options, and Active Directory integration."
  type        = list(object({ active_directory_authentication_enabled = bool, aof_backup_enabled = bool, aof_storage_connection_string_0 = string, aof_storage_connection_string_1 = string, authentication_enabled = bool, data_persistence_authentication_method = string, enable_authentication = bool, maxfragmentationmemory_reserved = number, maxmemory_delta = number, maxmemory_policy = string, maxmemory_reserved = number, notify_keyspace_events = string, rdb_backup_enabled = bool, rdb_backup_frequency = number, rdb_backup_max_snapshot_count = number, rdb_storage_connection_string = string, storage_account_subscription_id = string }))
  default     = null
}

variable "timeouts" {
  description = "A nested block specifying custom timeout durations for create, read, update, and delete operations."
  type        = object({ create = string, delete = string, read = string, update = string })
  default     = null
}
