output "id" {
  description = "Resource ID of the Key Vault."
  value       = azurerm_key_vault.this.id
}

output "name" {
  description = "Name of the Key Vault."
  value       = azurerm_key_vault.this.name
}

output "vault_uri" {
  description = "URI of the Key Vault, used by SDKs/managed-identity secret references."
  value       = azurerm_key_vault.this.vault_uri
}

output "tenant_id" {
  description = "Azure AD tenant ID the vault is registered under."
  value       = azurerm_key_vault.this.tenant_id
}
