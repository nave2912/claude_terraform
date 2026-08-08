variable "name" {
  description = "Resource name, following the naming convention in docs/naming-convention.md."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*$", var.name))
    error_message = "Name must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens."
  }
}

variable "location" {
  description = "Azure region."
  type        = string
}

variable "resource_group_name" {
  description = "Name of the parent resource group this resource is deployed into."
  type        = string
}

variable "tags" {
  description = "Mandatory tag set. Must include environment, owner, costCenter, application, dataClassification."
  type        = map(string)

  validation {
    condition = alltrue([
      for key in ["environment", "owner", "costCenter", "application", "dataClassification"] :
      contains(keys(var.tags), key)
    ])
    error_message = "tags must include environment, owner, costCenter, application, and dataClassification."
  }
}

variable "publisher_email" {
  description = "The email address of the publisher/administrator, used for system notifications and developer portal communications."
  type        = string
}

variable "publisher_name" {
  description = "The name of the publisher/organization that owns the API Management service."
  type        = string
}

variable "sku_name" {
  description = "The SKU (pricing tier and capacity) for the API Management service, formatted as tier_units (e.g., Developer_1, Standard_1, Premium_1)."
  type        = string
}

variable "client_certificate_enabled" {
  description = "Whether client certificate authentication is enforced for requests to the gateway. When enabled, clients must present a valid certificate."
  type        = bool
  default     = true
}

variable "gateway_disabled" {
  description = "Whether the API gateway should be disabled for this API Management instance. When true, the gateway will not accept API requests."
  type        = bool
  default     = null
}

variable "min_api_version" {
  description = "The minimum API version that clients must use when making management API calls. Setting this enforces a minimum version requirement."
  type        = string
  default     = null
}

variable "notification_sender_email" {
  description = "The email address used as the sender for notification emails sent from the API Management service."
  type        = string
  default     = null
}

variable "policy" {
  description = "A list of global policy configurations applied to all APIs in the service. Each policy can be defined via XML content or an XML link."
  type        = list(object({ xml_content = string, xml_link = string }))
  default     = null
}

variable "public_ip_address_id" {
  description = "The resource ID of an existing Azure public IP address to associate with the API Management service."
  type        = string
  default     = null
}

variable "public_network_access_enabled" {
  description = "Whether the API Management service is accessible from the public internet. When false, access is restricted to private networks only."
  type        = bool
  default     = false
}

variable "virtual_network_type" {
  description = "The type of virtual network integration for the service. Accepted values include None, External (internet-facing with VNet backend), or Internal (VNet-only access)."
  type        = string
  default     = null
}

variable "zones" {
  description = "A set of availability zones where the API Management service should be deployed for high availability."
  type        = set(string)
  default     = null
}

variable "additional_location" {
  description = "A list of additional Azure regions where the API Management service should be deployed for multi-region availability. Each location can specify capacity, gateway settings, public IP, zones, and virtual network configuration."
  type        = list(object({ capacity = number, gateway_disabled = bool, location = string, public_ip_address_id = string, zones = set(string), virtual_network_configuration = list(object({ subnet_id = string })) }))
  default     = null
}

variable "certificate" {
  description = "A list of certificates to install in the API Management service's certificate store, used for backend authentication or other certificate-based operations. Each certificate requires the encoded certificate data, optional password, and the target store name."
  type        = list(object({ certificate_password = string, encoded_certificate = string, store_name = string }))
  default     = null
}

variable "delegation" {
  description = "Configuration for delegating user authentication and subscription management to an external website instead of using the built-in developer portal. Includes settings for subscriptions, user registration, the delegation URL, and validation key."
  type        = list(object({ subscriptions_enabled = bool, url = string, user_registration_enabled = bool, validation_key = string }))
  default     = null
}

variable "hostname_configuration" {
  description = "Custom hostname configurations for the different API Management endpoints (proxy, management, developer portal, legacy portal, and SCM). Each endpoint can have custom domain names with associated SSL certificates from files or Key Vault."
  type        = list(object({ developer_portal = list(object({ certificate = string, certificate_password = string, host_name = string, key_vault_id = string, negotiate_client_certificate = bool, ssl_keyvault_identity_client_id = string })), management = list(object({ certificate = string, certificate_password = string, host_name = string, key_vault_id = string, negotiate_client_certificate = bool, ssl_keyvault_identity_client_id = string })), portal = list(object({ certificate = string, certificate_password = string, host_name = string, key_vault_id = string, negotiate_client_certificate = bool, ssl_keyvault_identity_client_id = string })), proxy = list(object({ certificate = string, certificate_password = string, default_ssl_binding = bool, host_name = string, key_vault_id = string, negotiate_client_certificate = bool, ssl_keyvault_identity_client_id = string })), scm = list(object({ certificate = string, certificate_password = string, host_name = string, key_vault_id = string, negotiate_client_certificate = bool, ssl_keyvault_identity_client_id = string })) }))
  default     = null
}

variable "identity" {
  description = "Managed identity configuration for the API Management service. Supports SystemAssigned, UserAssigned, or both (SystemAssigned, UserAssigned). User-assigned identities require a set of identity resource IDs."
  type        = list(object({ identity_ids = set(string), type = string }))
  default     = null
}

variable "protocols" {
  description = "Protocol settings for the API Management service, such as whether HTTP/2 should be enabled for client connections."
  type        = list(object({ enable_http2 = bool }))
  default     = null
}

variable "security" {
  description = "Security and cryptography settings controlling which SSL/TLS versions and cipher suites are enabled for both frontend (client-facing) and backend (service-to-API) connections. Includes options to disable weak protocols like SSL 3.0, TLS 1.0, TLS 1.1, and specific cipher suites."
  type        = list(object({ enable_backend_ssl30 = bool, enable_backend_tls10 = bool, enable_backend_tls11 = bool, enable_frontend_ssl30 = bool, enable_frontend_tls10 = bool, enable_frontend_tls11 = bool, tls_ecdhe_ecdsa_with_aes128_cbc_sha_ciphers_enabled = bool, tls_ecdhe_ecdsa_with_aes256_cbc_sha_ciphers_enabled = bool, tls_ecdhe_rsa_with_aes128_cbc_sha_ciphers_enabled = bool, tls_ecdhe_rsa_with_aes256_cbc_sha_ciphers_enabled = bool, tls_rsa_with_aes128_cbc_sha256_ciphers_enabled = bool, tls_rsa_with_aes128_cbc_sha_ciphers_enabled = bool, tls_rsa_with_aes128_gcm_sha256_ciphers_enabled = bool, tls_rsa_with_aes256_cbc_sha256_ciphers_enabled = bool, tls_rsa_with_aes256_cbc_sha_ciphers_enabled = bool, tls_rsa_with_aes256_gcm_sha384_ciphers_enabled = bool, triple_des_ciphers_enabled = bool }))
  default     = null
}

variable "sign_in" {
  description = "Configuration for the developer portal sign-in functionality, controlling whether users can sign in to the developer portal."
  type        = list(object({ enabled = bool }))
  default     = null
}

variable "sign_up" {
  description = "Configuration for the developer portal sign-up functionality, controlling whether new users can register and whether they must accept terms of service. Includes nested terms of service settings."
  type        = list(object({ enabled = bool, terms_of_service = list(object({ consent_required = bool, enabled = bool, text = string })) }))
  default     = null
}

variable "tenant_access" {
  description = "Configuration controlling whether the tenant access API endpoint is enabled, which allows programmatic access to the API Management service configuration."
  type        = list(object({ enabled = bool }))
  default     = null
}

variable "timeouts" {
  description = "Custom timeout durations for create, read, update, and delete operations on the API Management resource."
  type        = object({ create = string, delete = string, read = string, update = string })
  default     = null
}

variable "virtual_network_configuration" {
  description = "Virtual network configuration for the primary location, specifying the subnet ID where the API Management service should be deployed."
  type        = list(object({ subnet_id = string }))
  default     = null
}
