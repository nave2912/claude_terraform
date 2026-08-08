# Module: redis_cache

**AI-scaffolded from `azurerm_redis_cache`'s own Terraform provider schema — verify against https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/redis_cache before use.**

Wraps `azurerm_redis_cache`.

## Usage

```hcl
module "redis_cache" {
  source = "../../modules/redis_cache"

  providers = {
    azurerm = azurerm.<alias>
  }

  name = "<naming-convention-compliant-name>"
  tags = local.mandatory_tags
  # ... remaining fields, see Inputs below
}
```

## Inputs

| name | type | required | description |
|---|---|---|---|
| name | string | yes | Resource name (see naming-convention.md). |
| location | string | yes | Azure region. |
| resource_group_name | string | yes | Parent resource group name. |
| tags | map(string) | yes | Mandatory tag set (environment, owner, costCenter, application, dataClassification). |
| capacity | number | yes | The size of the Redis cache to deploy. Valid values depend on the SKU family: for C (Basic/Standard) use 0-6, for P (Premium) use 1-5. |
| family | string | yes | The SKU family to use. Valid values are C (for Basic/Standard SKU) or P (for Premium SKU). |
| sku_name | string | yes | The SKU of Redis to use. Possible values are Basic, Standard, and Premium. |
| enable_non_ssl_port | bool | no | Legacy field for enabling the non-SSL port (6379). Deprecated in favor of non_ssl_port_enabled. |
| minimum_tls_version | string | no | The minimum TLS version required for SSL connections. Valid values are 1.0, 1.1, and 1.2. |
| non_ssl_port_enabled | bool | no | Whether to enable the non-SSL port (6379) for the Redis Cache. When false, only SSL connections (port 6380) are allowed. |
| private_static_ip_address | string | no | The static private IP address to assign to the Redis Cache when deployed to a virtual network (requires Premium SKU and subnet_id). |
| public_network_access_enabled | bool | no | Whether public network access is allowed for this Redis Cache. When false, only private endpoint connections are permitted. |
| redis_version | string | no | The version of Redis to use. Possible values are 4 and 6. Defaults to 6 if not specified. |
| replicas_per_master | number | no | Legacy field for the number of replicas per master node (Premium SKU only). Deprecated in favor of replicas_per_primary. |
| replicas_per_primary | number | no | The number of replicas per primary node. Only available for Premium SKU. Valid values depend on cluster configuration. |
| shard_count | number | no | The number of shards to create on a Premium Cluster Cache. Only available when using Premium SKU with clustering enabled. |
| subnet_id | string | no | The ID of the subnet within a virtual network where the Redis Cache should be deployed. Only supported for Premium SKU. |
| tenant_settings | map(string) | no | A map of tenant-specific settings to configure on the Redis Cache instance. |
| zones | set(string) | no | A set of availability zones in which the Redis Cache should be created. Supported only in certain regions and SKUs. |
| identity | list(object({ identity_ids = set(string), type = string })) | no | A list containing a single identity configuration block that assigns a managed identity to the Redis Cache. |
| patch_schedule | list(object({ day_of_week = string, maintenance_window = string, start_hour_utc = number })) | no | A list of patch schedule blocks defining maintenance windows when Azure can apply updates to the Redis Cache. |
| redis_configuration | list(object({ active_directory_authentication_enabled = bool, aof_backup_enabled = bool, aof_storage_connection_string_0 = string, aof_storage_connection_string_1 = string, authentication_enabled = bool, data_persistence_authentication_method = string, enable_authentication = bool, maxfragmentationmemory_reserved = number, maxmemory_delta = number, maxmemory_policy = string, maxmemory_reserved = number, notify_keyspace_events = string, rdb_backup_enabled = bool, rdb_backup_frequency = number, rdb_backup_max_snapshot_count = number, rdb_storage_connection_string = string, storage_account_subscription_id = string })) | no | A list containing a single configuration block for Redis-specific settings like data persistence, backup, memory policies, and authentication. |
| timeouts | object({ create = string, delete = string, read = string, update = string }) | no | A single nested block specifying custom timeout durations for create, read, update, and delete operations. |

## Outputs

| name | description |
|---|---|
| id | Computed id. |
| hostname | Computed hostname. |
| port | Computed port. |
| primary_access_key | Computed primary_access_key. |
| primary_connection_string | Computed primary_connection_string. |
| secondary_access_key | Computed secondary_access_key. |
| secondary_connection_string | Computed secondary_connection_string. |
| ssl_port | Computed ssl_port. |

## Notes

- Add module-specific compliance notes here (encryption, private endpoint
  requirements, diagnostic settings, RBAC).
- Nested/dynamic blocks and optional-field defaults were generated mechanically from the provider schema — double-check they match real usage requirements before merging.
