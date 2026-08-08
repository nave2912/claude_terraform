output "id" {
  description = "Computed id from the created resource."
  value       = azurerm_public_ip.this.id
}

output "fqdn" {
  description = "Computed fqdn from the created resource."
  value       = azurerm_public_ip.this.fqdn
}

output "ip_address" {
  description = "Computed ip_address from the created resource."
  value       = azurerm_public_ip.this.ip_address
}
