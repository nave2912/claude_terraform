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
