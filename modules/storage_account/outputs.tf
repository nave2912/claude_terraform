output "id" {
  description = "Resource ID of the storage account."
  value       = azurerm_storage_account.this.id
}

output "name" {
  description = "Name of the storage account."
  value       = azurerm_storage_account.this.name
}

output "primary_dfs_endpoint" {
  description = "Primary Data Lake Storage Gen2 (dfs) endpoint."
  value       = azurerm_storage_account.this.primary_dfs_endpoint
}

output "primary_blob_endpoint" {
  description = "Primary Blob endpoint."
  value       = azurerm_storage_account.this.primary_blob_endpoint
}

output "primary_web_endpoint" {
  description = "Primary static website endpoint."
  value       = azurerm_storage_account.this.primary_web_endpoint
}

output "tags" {
  description = "Tags applied to the storage account."
  value       = azurerm_storage_account.this.tags
}
