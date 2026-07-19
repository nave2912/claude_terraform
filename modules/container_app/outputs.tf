output "id" {
  description = "Resource ID of the Container App."
  value       = azurerm_container_app.this.id
}

output "name" {
  description = "Name of the Container App."
  value       = azurerm_container_app.this.name
}

output "latest_revision_fqdn" {
  description = "Public FQDN of the app's latest revision (empty if ingress is disabled)."
  value       = azurerm_container_app.this.latest_revision_fqdn
}
