output "id" {
  description = "Computed id from the created resource."
  value       = azurerm_linux_virtual_machine.this.id
}

output "private_ip_address" {
  description = "Computed private_ip_address from the created resource."
  value       = azurerm_linux_virtual_machine.this.private_ip_address
}

output "private_ip_addresses" {
  description = "Computed private_ip_addresses from the created resource."
  value       = azurerm_linux_virtual_machine.this.private_ip_addresses
}

output "public_ip_address" {
  description = "Computed public_ip_address from the created resource."
  value       = azurerm_linux_virtual_machine.this.public_ip_address
}

output "public_ip_addresses" {
  description = "Computed public_ip_addresses from the created resource."
  value       = azurerm_linux_virtual_machine.this.public_ip_addresses
}

output "virtual_machine_id" {
  description = "Computed virtual_machine_id from the created resource."
  value       = azurerm_linux_virtual_machine.this.virtual_machine_id
}
