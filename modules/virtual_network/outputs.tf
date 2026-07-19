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

output "subnet_nsg_ids" {
  description = "Map of logical subnet id to its associated network security group resource ID."
  value       = { for key, nsg in azurerm_network_security_group.this : key => nsg.id }
}

output "tags" {
  description = "Tags applied to the virtual network."
  value       = azurerm_virtual_network.this.tags
}
