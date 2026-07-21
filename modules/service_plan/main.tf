resource "azurerm_service_plan" "this" {
  name                         = var.name
  location                     = var.location
  resource_group_name          = var.resource_group_name
  tags                         = var.tags
  os_type                      = var.os_type
  sku_name                     = var.sku_name
  app_service_environment_id   = var.app_service_environment_id
  maximum_elastic_worker_count = var.maximum_elastic_worker_count
  per_site_scaling_enabled     = var.per_site_scaling_enabled
  worker_count                 = var.worker_count
  zone_balancing_enabled       = var.zone_balancing_enabled
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
