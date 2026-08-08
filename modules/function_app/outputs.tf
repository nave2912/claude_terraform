output "id" {
  description = "Computed id from the created resource."
  value       = azurerm_function_app.this.id
}

output "custom_domain_verification_id" {
  description = "Computed custom_domain_verification_id from the created resource."
  value       = azurerm_function_app.this.custom_domain_verification_id
}

output "default_hostname" {
  description = "Computed default_hostname from the created resource."
  value       = azurerm_function_app.this.default_hostname
}

output "kind" {
  description = "Computed kind from the created resource."
  value       = azurerm_function_app.this.kind
}

output "outbound_ip_addresses" {
  description = "Computed outbound_ip_addresses from the created resource."
  value       = azurerm_function_app.this.outbound_ip_addresses
}

output "possible_outbound_ip_addresses" {
  description = "Computed possible_outbound_ip_addresses from the created resource."
  value       = azurerm_function_app.this.possible_outbound_ip_addresses
}

output "site_credential" {
  description = "Computed site_credential from the created resource."
  value       = azurerm_function_app.this.site_credential
}
