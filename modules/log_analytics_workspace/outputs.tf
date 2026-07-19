output "id" {
  description = "Resource ID of the Log Analytics workspace."
  value       = azurerm_log_analytics_workspace.this.id
}

output "name" {
  description = "Name of the workspace."
  value       = azurerm_log_analytics_workspace.this.name
}

output "workspace_id" {
  description = "Workspace (customer) ID GUID, distinct from the resource ID — needed by some diagnostic-setting/agent configs."
  value       = azurerm_log_analytics_workspace.this.workspace_id
}
