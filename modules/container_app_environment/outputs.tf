output "id" {
  description = "Resource ID of the Container Apps environment — passed to modules/container_app."
  value       = azurerm_container_app_environment.this.id
}

output "name" {
  description = "Name of the Container Apps environment."
  value       = azurerm_container_app_environment.this.name
}

output "default_domain" {
  description = "Default domain suffix apps in this environment are exposed under."
  value       = azurerm_container_app_environment.this.default_domain
}
