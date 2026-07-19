# Consumption-only environment: no workload profile / VNET integration is
# configured, which is what keeps this at the cheapest Container Apps tier
# (no dedicated infrastructure charge, only per-app Consumption billing).
resource "azurerm_container_app_environment" "this" {
  name                       = var.name
  location                   = var.location
  resource_group_name        = var.resource_group_name
  log_analytics_workspace_id = var.log_analytics_workspace_id

  tags = var.tags
}
