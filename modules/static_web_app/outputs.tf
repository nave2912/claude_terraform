output "id" {
  description = "Resource ID of the Static Web App."
  value       = azurerm_static_web_app.this.id
}

output "name" {
  description = "Name of the Static Web App."
  value       = azurerm_static_web_app.this.name
}

output "default_host_name" {
  description = "Public hostname the app is served from."
  value       = azurerm_static_web_app.this.default_host_name
}

output "api_key" {
  description = "Deployment token — used by the SWA CLI or a GitHub Actions workflow to publish builds. Sensitive."
  value       = azurerm_static_web_app.this.api_key
  sensitive   = true
}
