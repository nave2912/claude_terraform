output "id" {
  description = "Computed id from the created resource."
  value       = azurerm_api_management.this.id
}

output "developer_portal_url" {
  description = "Computed developer_portal_url from the created resource."
  value       = azurerm_api_management.this.developer_portal_url
}

output "gateway_regional_url" {
  description = "Computed gateway_regional_url from the created resource."
  value       = azurerm_api_management.this.gateway_regional_url
}

output "gateway_url" {
  description = "Computed gateway_url from the created resource."
  value       = azurerm_api_management.this.gateway_url
}

output "management_api_url" {
  description = "Computed management_api_url from the created resource."
  value       = azurerm_api_management.this.management_api_url
}

output "portal_url" {
  description = "Computed portal_url from the created resource."
  value       = azurerm_api_management.this.portal_url
}

output "private_ip_addresses" {
  description = "Computed private_ip_addresses from the created resource."
  value       = azurerm_api_management.this.private_ip_addresses
}

output "public_ip_addresses" {
  description = "Computed public_ip_addresses from the created resource."
  value       = azurerm_api_management.this.public_ip_addresses
}

output "scm_url" {
  description = "Computed scm_url from the created resource."
  value       = azurerm_api_management.this.scm_url
}
