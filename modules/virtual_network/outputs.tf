output "id" {
  description = "Resource ID of the virtual network."
  value       = azurerm_virtual_network.this.id
}

output "name" {
  description = "Name of the virtual network."
  value       = azurerm_virtual_network.this.name
}

output "subnet_ids" {
  description = "Map of logical subnet id to subnet resource ID."
  value       = { for key, subnet in azurerm_subnet.this : key => subnet.id }
}

output "tags" {
  description = "Tags applied to the virtual network."
  value       = azurerm_virtual_network.this.tags
}
