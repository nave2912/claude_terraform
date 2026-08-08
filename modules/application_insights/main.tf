resource "azurerm_application_insights" "this" {
  name                                  = var.name
  location                              = var.location
  resource_group_name                   = var.resource_group_name
  tags                                  = var.tags
  application_type                      = var.application_type
  daily_data_cap_in_gb                  = var.daily_data_cap_in_gb
  daily_data_cap_notifications_disabled = var.daily_data_cap_notifications_disabled
  disable_ip_masking                    = var.disable_ip_masking
  force_customer_storage_for_profiler   = var.force_customer_storage_for_profiler
  internet_ingestion_enabled            = var.internet_ingestion_enabled
  internet_query_enabled                = var.internet_query_enabled
  local_authentication_disabled         = var.local_authentication_disabled
  retention_in_days                     = var.retention_in_days
  sampling_percentage                   = var.sampling_percentage
  workspace_id                          = var.workspace_id
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
