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
| capacity | number | yes | The size of the Redis cache to deploy. Valid values depend on the family: for C (Basic/Standard) family, use 0-6; for P (Premium) family, use 1-5. |
| family | string | yes | The SKU family to use. Valid values are C (for Basic/Standard SKUs) or P (for Premium SKUs). |
| sku_name | string | yes | The SKU (pricing tier) of the Redis cache. Valid values are Basic, Standard, or Premium. |
| enable_non_ssl_port | bool | no | Whether to enable the non-SSL port (6379). This field is deprecated; use non_ssl_port_enabled instead. |
| minimum_tls_version | string | no | The minimum TLS version required for client connections. Valid values are 1.0, 1.1, or 1.2. |
| non_ssl_port_enabled | bool | no | Whether to enable the non-SSL port (6379) for unencrypted connections to the cache. |
| private_static_ip_address | string | no | The static private IP address to assign to the Redis cache when deployed in a virtual network. Only available for Premium SKU. |
| public_network_access_enabled | bool | no | Whether public network access is allowed to the Redis cache. Set to false to restrict access to private endpoints only. |
| redis_version | string | no | The version of Redis to use. Valid values are 4 or 6. Defaults to 6 if not specified. |
| replicas_per_master | number | no | The number of replicas per master node. This field is deprecated; use replicas_per_primary instead. Only available for Premium SKU. |
| replicas_per_primary | number | no | The number of replicas per primary node for high availability. Only available for Premium SKU. |
| shard_count | number | no | The number of shards to create on a Premium Cluster cache. Only available for Premium SKU when clustering is enabled. |
| subnet_id | string | no | The ID of the subnet within a virtual network where the Redis cache should be deployed. Only available for Premium SKU. |
| tenant_settings | map(string) | no | A map of tenant-specific settings to configure for the Redis cache. |
| zones | set(string) | no | A set of availability zones where the Redis cache should be deployed for high availability. Only available for Premium SKU in supported regions. |
| identity | list(object({ identity_ids = set(string), type = string })) | no | A nested block to configure managed identity for the Redis cache. Contains the identity type (SystemAssigned, UserAssigned, or both) and optionally a set of user-assigned identity IDs. |
| patch_schedule | list(object({ day_of_week = string, maintenance_window = string, start_hour_utc = number })) | no | A nested block defining maintenance windows when Azure can apply patches and updates to the Redis cache. Includes the day of week, start hour in UTC, and optional maintenance window duration. |
| redis_configuration | list(object({ active_directory_authentication_enabled = bool, aof_backup_enabled = bool, aof_storage_connection_string_0 = string, aof_storage_connection_string_1 = string, authentication_enabled = bool, data_persistence_authentication_method = string, enable_authentication = bool, maxfragmentationmemory_reserved = number, maxmemory_delta = number, maxmemory_policy = string, maxmemory_reserved = number, notify_keyspace_events = string, rdb_backup_enabled = bool, rdb_backup_frequency = number, rdb_backup_max_snapshot_count = number, rdb_storage_connection_string = string, storage_account_subscription_id = string })) | no | A nested block containing advanced Redis configuration settings, including authentication options, data persistence (AOF/RDB backups), memory management policies, Active Directory authentication, and storage connection strings for backups. |
| timeouts | object({ create = string, delete = string, read = string, update = string }) | no | A nested block to customize timeout durations for create, read, update, and delete operations on the Redis cache resource. |

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
