output "resource_group_name" {
  description = "Name of the (existing, shared) resource group hosting the chatbot infra."
  value       = data.azurerm_resource_group.existing.name
}

output "key_vault_name" {
  description = "Name of the Key Vault holding chatbot secrets."
  value       = module.key_vault.name
}

output "container_registry_login_server" {
  description = "Login server for the ACR — used by `docker push` / CI to publish new backend images."
  value       = module.container_registry.login_server
}

output "container_app_fqdn" {
  description = "Public FQDN of the chatbot backend Container App."
  value       = module.container_app.latest_revision_fqdn
}

output "static_web_app_default_host_name" {
  description = "Public hostname of the chatbot frontend Static Web App."
  value       = module.static_web_app.default_host_name
}

output "static_web_app_api_key" {
  description = "Deployment token for the Static Web App — used by the SWA CLI/GitHub Actions to publish frontend builds. Sensitive."
  value       = module.static_web_app.api_key
  sensitive   = true
}

output "backend_api_key" {
  description = "The generated x-api-key the frontend BFF must send as the x-api-key header when calling the backend Container App. This is a Container App secret, not stored in Key Vault. Sensitive."
  value       = random_password.backend_api_key.result
  sensitive   = true
}
