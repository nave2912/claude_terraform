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
  description = "Public FQDN of the chatbot frontend Container App — this is the chatbot's public URL. The backend Container App is internal-only (external_enabled = false), reachable only from within the Container Apps Environment, so it has no public FQDN."
  value       = module.container_app["frontend"].latest_revision_fqdn
}

output "chatbot_backend_api_key" {
  description = "The x-api-key the frontend BFF must send as the x-api-key header when calling the backend Container App. Sensitive."
  value       = var.chatbot_backend_api_key
  sensitive   = true
}
