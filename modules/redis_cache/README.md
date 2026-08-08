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
| capacity | number | yes | The size of the Redis cache to deploy. Valid values depend on the family: for C (Basic/Standard) family, valid values are 0-6; for P (Premium) family, valid values are 1-5. Higher numbers indicate larger cache sizes. |
| family | string | yes | The SKU family to use. Valid values are 'C' for Basic/Standard SKUs or 'P' for Premium SKUs. Must match the chosen sku_name. |
| sku_name | string | yes | The SKU tier of the Redis cache. Valid values are 'Basic', 'Standard', or 'Premium'. Premium offers features like clustering, persistence, and virtual network support. |
| enable_non_ssl_port | bool | no | Deprecated field. Use non_ssl_port_enabled instead. Controls whether the non-SSL port (6379) is enabled for the Redis cache. |
| minimum_tls_version | string | no | The minimum TLS version required for client connections. Valid values are '1.0', '1.1', or '1.2'. Defaults to '1.0' but '1.2' is recommended for security. |
| non_ssl_port_enabled | bool | no | Whether to enable the non-SSL port (6379) for the Redis cache. When false, only SSL connections on port 6380 are allowed. Defaults to false for security. |
| private_static_ip_address | string | no | A static private IP address to assign to the Redis cache when deployed within a virtual network (subnet_id must also be specified). The IP must be available in the subnet range. |
| public_network_access_enabled | bool | no | Whether public network access is allowed to the Redis cache. When false, the cache is only accessible via private endpoints or virtual network integration. Defaults to true. |
| redis_version | string | no | The version of Redis to run. Valid values are typically '4' or '6'. If not specified, Azure will use a default version. |
| replicas_per_master | number | no | Deprecated field. Use replicas_per_primary instead. The number of replicas to create for each primary node in a Premium SKU cache with clustering enabled. |
| replicas_per_primary | number | no | The number of replicas to create for each primary shard. Only available for Premium SKU caches. Valid values are typically 1-3. |
| shard_count | number | no | The number of shards to create on a Premium SKU Redis cache when clustering is enabled. Only available for Premium SKU. Valid values range from 1 to 10. |
| subnet_id | string | no | The ID of the subnet within a virtual network in which to deploy the Redis cache. Only available for Premium SKU. When specified, the cache is accessible only from within the VNet. |
| tenant_settings | map(string) | no | A map of tenant-specific settings for the Redis cache. These are advanced configuration options specific to certain Redis scenarios. |
| zones | set(string) | no | A set of availability zones where the Redis cache should be deployed for high availability. Valid values are '1', '2', and '3' depending on region support. Only available for Premium SKU. |
| identity | list(object({ identity_ids = set(string), type = string })) | no | A list block defining a managed identity for the Redis cache. Used to authenticate to other Azure services without managing credentials. Typically contains one entry specifying the identity type and optional identity IDs for user-assigned identities. |
| patch_schedule | list(object({ day_of_week = string, maintenance_window = string, start_hour_utc = number })) | no | A list block defining one or more maintenance windows when Azure can apply patches to the Redis cache. Each entry specifies a day of the week, start hour in UTC, and optional maintenance window duration. Helps control when updates occur. |
| redis_configuration | list(object({ active_directory_authentication_enabled = bool, aof_backup_enabled = bool, aof_storage_connection_string_0 = string, aof_storage_connection_string_1 = string, authentication_enabled = bool, data_persistence_authentication_method = string, enable_authentication = bool, maxfragmentationmemory_reserved = number, maxmemory_delta = number, maxmemory_policy = string, maxmemory_reserved = number, notify_keyspace_events = string, rdb_backup_enabled = bool, rdb_backup_frequency = number, rdb_backup_max_snapshot_count = number, rdb_storage_connection_string = string, storage_account_subscription_id = string })) | no | A list block (typically with one entry) containing advanced Redis configuration settings such as persistence (RDB/AOF backups), memory policies, authentication settings, and notification options. Controls Redis server behavior and features. |
| timeouts | object({ create = string, delete = string, read = string, update = string }) | no | A single block defining custom timeout durations for create, read, update, and delete operations. Allows you to override the default wait times for long-running operations. |

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
