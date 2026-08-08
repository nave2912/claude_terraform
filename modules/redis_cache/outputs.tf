output "id" {
  description = "Computed id from the created resource."
  value       = azurerm_redis_cache.this.id
}

output "hostname" {
  description = "Computed hostname from the created resource."
  value       = azurerm_redis_cache.this.hostname
}

output "port" {
  description = "Computed port from the created resource."
  value       = azurerm_redis_cache.this.port
}

output "primary_access_key" {
  description = "Computed primary_access_key from the created resource."
  value       = azurerm_redis_cache.this.primary_access_key
}

output "primary_connection_string" {
  description = "Computed primary_connection_string from the created resource."
  value       = azurerm_redis_cache.this.primary_connection_string
}

output "secondary_access_key" {
  description = "Computed secondary_access_key from the created resource."
  value       = azurerm_redis_cache.this.secondary_access_key
}

output "secondary_connection_string" {
  description = "Computed secondary_connection_string from the created resource."
  value       = azurerm_redis_cache.this.secondary_connection_string
}

output "ssl_port" {
  description = "Computed ssl_port from the created resource."
  value       = azurerm_redis_cache.this.ssl_port
}
