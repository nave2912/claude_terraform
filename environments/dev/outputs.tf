output "resource_groups" {
  description = "Map of resource group id/name/location keyed by logical id."
  value = {
    for k, m in module.resource_group : k => {
      id       = m.id
      name     = m.name
      location = m.location
    }
  }
}

output "storage_accounts" {
  description = "Map of storage account id/name/dfs endpoint keyed by logical id."
  value = {
    for k, m in module.storage_account : k => {
      id                    = m.id
      name                  = m.name
      primary_dfs_endpoint  = m.primary_dfs_endpoint
      primary_blob_endpoint = m.primary_blob_endpoint
      primary_web_endpoint  = m.primary_web_endpoint
    }
  }
}

output "chatbot_key_vault_name" {
  description = "Name of the Key Vault holding chatbot secrets."
  value       = module.key_vault["chatbot"].name
}

output "chatbot_container_registry_login_server" {
  description = "Login server for the chatbot's ACR — used by `docker push` / CI to publish new backend images."
  value       = module.container_registry["chatbot"].login_server
}

output "chatbot_container_app_fqdn" {
  description = "Public FQDN of the chatbot backend Container App."
  value       = module.container_app["backend"].latest_revision_fqdn
}

output "chatbot_static_web_app_default_host_name" {
  description = "Public hostname of the chatbot frontend Static Web App."
  value       = module.static_web_app["chatbot"].default_host_name
}

output "chatbot_static_web_app_api_key" {
  description = "Deployment token for the Static Web App — used by the SWA CLI/GitHub Actions to publish frontend builds. Sensitive."
  value       = module.static_web_app["chatbot"].api_key
  sensitive   = true
}

output "chatbot_backend_api_key" {
  description = "The generated x-api-key the frontend BFF must send as the x-api-key header when calling the backend Container App. Sensitive."
  value       = random_password.chatbot_backend_api_key.result
  sensitive   = true
}
