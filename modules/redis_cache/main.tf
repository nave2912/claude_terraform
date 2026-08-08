resource "azurerm_redis_cache" "this" {
  name                          = var.name
  location                      = var.location
  resource_group_name           = var.resource_group_name
  tags                          = var.tags
  capacity                      = var.capacity
  family                        = var.family
  sku_name                      = var.sku_name
  enable_non_ssl_port           = var.enable_non_ssl_port
  minimum_tls_version           = var.minimum_tls_version
  non_ssl_port_enabled          = var.non_ssl_port_enabled
  private_static_ip_address     = var.private_static_ip_address
  public_network_access_enabled = var.public_network_access_enabled
  redis_version                 = var.redis_version
  replicas_per_master           = var.replicas_per_master
  replicas_per_primary          = var.replicas_per_primary
  shard_count                   = var.shard_count
  subnet_id                     = var.subnet_id
  tenant_settings               = var.tenant_settings
  zones                         = var.zones
  dynamic "identity" {
    for_each = var.identity == null ? [] : var.identity
    content {
      identity_ids = identity.value.identity_ids
      type         = identity.value.type
    }
  }
  dynamic "patch_schedule" {
    for_each = var.patch_schedule == null ? [] : var.patch_schedule
    content {
      day_of_week        = patch_schedule.value.day_of_week
      maintenance_window = patch_schedule.value.maintenance_window
      start_hour_utc     = patch_schedule.value.start_hour_utc
    }
  }
  dynamic "redis_configuration" {
    for_each = var.redis_configuration == null ? [] : var.redis_configuration
    content {
      active_directory_authentication_enabled = redis_configuration.value.active_directory_authentication_enabled
      aof_backup_enabled                      = redis_configuration.value.aof_backup_enabled
      aof_storage_connection_string_0         = redis_configuration.value.aof_storage_connection_string_0
      aof_storage_connection_string_1         = redis_configuration.value.aof_storage_connection_string_1
      authentication_enabled                  = redis_configuration.value.authentication_enabled
      data_persistence_authentication_method  = redis_configuration.value.data_persistence_authentication_method
      enable_authentication                   = redis_configuration.value.enable_authentication
      maxfragmentationmemory_reserved         = redis_configuration.value.maxfragmentationmemory_reserved
      maxmemory_delta                         = redis_configuration.value.maxmemory_delta
      maxmemory_policy                        = redis_configuration.value.maxmemory_policy
      maxmemory_reserved                      = redis_configuration.value.maxmemory_reserved
      notify_keyspace_events                  = redis_configuration.value.notify_keyspace_events
      rdb_backup_enabled                      = redis_configuration.value.rdb_backup_enabled
      rdb_backup_frequency                    = redis_configuration.value.rdb_backup_frequency
      rdb_backup_max_snapshot_count           = redis_configuration.value.rdb_backup_max_snapshot_count
      rdb_storage_connection_string           = redis_configuration.value.rdb_storage_connection_string
      storage_account_subscription_id         = redis_configuration.value.storage_account_subscription_id
    }
  }
  dynamic "timeouts" {
    for_each = var.timeouts == null ? [] : [var.timeouts]
    content {
      create = timeouts.value.create
      delete = timeouts.value.delete
      read   = timeouts.value.read
      update = timeouts.value.update
    }
  }
}
