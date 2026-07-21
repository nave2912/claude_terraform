output "id" {
  description = "Computed id from the created resource."
  value       = azurerm_service_plan.this.id
}

output "kind" {
  description = "Computed kind from the created resource."
  value       = azurerm_service_plan.this.kind
}

output "reserved" {
  description = "Computed reserved from the created resource."
  value       = azurerm_service_plan.this.reserved
}
