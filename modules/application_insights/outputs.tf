output "id" {
  description = "Computed id from the created resource."
  value       = azurerm_application_insights.this.id
}

output "app_id" {
  description = "Computed app_id from the created resource."
  value       = azurerm_application_insights.this.app_id
}

output "connection_string" {
  description = "Computed connection_string from the created resource."
  value       = azurerm_application_insights.this.connection_string
}

output "instrumentation_key" {
  description = "Computed instrumentation_key from the created resource."
  value       = azurerm_application_insights.this.instrumentation_key
}
