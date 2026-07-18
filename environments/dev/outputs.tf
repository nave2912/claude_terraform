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
