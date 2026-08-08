output "id" {
  description = "Computed id from the created resource."
  value       = azurerm_machine_learning_workspace.this.id
}

output "discovery_url" {
  description = "Computed discovery_url from the created resource."
  value       = azurerm_machine_learning_workspace.this.discovery_url
}

output "workspace_id" {
  description = "Computed workspace_id from the created resource."
  value       = azurerm_machine_learning_workspace.this.workspace_id
}
