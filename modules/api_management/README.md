# Module: api_management

**AI-scaffolded from `azurerm_api_management`'s own Terraform provider schema — verify against https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/api_management before use.**

Wraps `azurerm_api_management`.

## Usage

```hcl
module "api_management" {
  source = "../../modules/api_management"

  providers = {
    azurerm = azurerm.<alias>
  }

  name = "<naming-convention-compliant-name>"
  tags = local.mandatory_tags
  # ... remaining fields, see Inputs below
}
```

## Inputs

| name | type | required | description |
|---|---|---|---|
| name | string | yes | Resource name (see naming-convention.md). |
| location | string | yes | Azure region. |
| resource_group_name | string | yes | Parent resource group name. |
| tags | map(string) | yes | Mandatory tag set (environment, owner, costCenter, application, dataClassification). |
| publisher_email | string | yes | The email address of the publisher/administrator, used for system notifications and developer portal communications. |
| publisher_name | string | yes | The name of the publisher/organization that owns the API Management service. |
| sku_name | string | yes | The SKU (pricing tier and capacity) for the API Management service, formatted as tier_units (e.g., Developer_1, Standard_1, Premium_1). |
| client_certificate_enabled | bool | no | Whether client certificate authentication is enforced for requests to the gateway. When enabled, clients must present a valid certificate. |
| gateway_disabled | bool | no | Whether the API gateway should be disabled for this API Management instance. When true, the gateway will not accept API requests. |
| min_api_version | string | no | The minimum API version that clients must use when making management API calls. Setting this enforces a minimum version requirement. |
| notification_sender_email | string | no | The email address used as the sender for notification emails sent from the API Management service. |
| policy | list(object({ xml_content = string, xml_link = string })) | no | A list of global policy configurations applied to all APIs in the service. Each policy can be defined via XML content or an XML link. |
| public_ip_address_id | string | no | The resource ID of an existing Azure public IP address to associate with the API Management service. |
| public_network_access_enabled | bool | no | Whether the API Management service is accessible from the public internet. When false, access is restricted to private networks only. |
| virtual_network_type | string | no | The type of virtual network integration for the service. Accepted values include None, External (internet-facing with VNet backend), or Internal (VNet-only access). |
| zones | set(string) | no | A set of availability zones where the API Management service should be deployed for high availability. |
| additional_location | list(object({ capacity = number, gateway_disabled = bool, location = string, public_ip_address_id = string, zones = set(string), virtual_network_configuration = list(object({ subnet_id = string })) })) | no | A list of additional Azure regions where the API Management service should be deployed for multi-region availability. Each location can specify capacity, gateway settings, public IP, zones, and virtual network configuration. |
| certificate | list(object({ certificate_password = string, encoded_certificate = string, store_name = string })) | no | A list of certificates to install in the API Management service's certificate store, used for backend authentication or other certificate-based operations. Each certificate requires the encoded certificate data, optional password, and the target store name. |
| delegation | list(object({ subscriptions_enabled = bool, url = string, user_registration_enabled = bool, validation_key = string })) | no | Configuration for delegating user authentication and subscription management to an external website instead of using the built-in developer portal. Includes settings for subscriptions, user registration, the delegation URL, and validation key. |
| hostname_configuration | list(object({ developer_portal = list(object({ certificate = string, certificate_password = string, host_name = string, key_vault_id = string, negotiate_client_certificate = bool, ssl_keyvault_identity_client_id = string })), management = list(object({ certificate = string, certificate_password = string, host_name = string, key_vault_id = string, negotiate_client_certificate = bool, ssl_keyvault_identity_client_id = string })), portal = list(object({ certificate = string, certificate_password = string, host_name = string, key_vault_id = string, negotiate_client_certificate = bool, ssl_keyvault_identity_client_id = string })), proxy = list(object({ certificate = string, certificate_password = string, default_ssl_binding = bool, host_name = string, key_vault_id = string, negotiate_client_certificate = bool, ssl_keyvault_identity_client_id = string })), scm = list(object({ certificate = string, certificate_password = string, host_name = string, key_vault_id = string, negotiate_client_certificate = bool, ssl_keyvault_identity_client_id = string })) })) | no | Custom hostname configurations for the different API Management endpoints (proxy, management, developer portal, legacy portal, and SCM). Each endpoint can have custom domain names with associated SSL certificates from files or Key Vault. |
| identity | list(object({ identity_ids = set(string), type = string })) | no | Managed identity configuration for the API Management service. Supports SystemAssigned, UserAssigned, or both (SystemAssigned, UserAssigned). User-assigned identities require a set of identity resource IDs. |
| protocols | list(object({ enable_http2 = bool })) | no | Protocol settings for the API Management service, such as whether HTTP/2 should be enabled for client connections. |
| security | list(object({ enable_backend_ssl30 = bool, enable_backend_tls10 = bool, enable_backend_tls11 = bool, enable_frontend_ssl30 = bool, enable_frontend_tls10 = bool, enable_frontend_tls11 = bool, tls_ecdhe_ecdsa_with_aes128_cbc_sha_ciphers_enabled = bool, tls_ecdhe_ecdsa_with_aes256_cbc_sha_ciphers_enabled = bool, tls_ecdhe_rsa_with_aes128_cbc_sha_ciphers_enabled = bool, tls_ecdhe_rsa_with_aes256_cbc_sha_ciphers_enabled = bool, tls_rsa_with_aes128_cbc_sha256_ciphers_enabled = bool, tls_rsa_with_aes128_cbc_sha_ciphers_enabled = bool, tls_rsa_with_aes128_gcm_sha256_ciphers_enabled = bool, tls_rsa_with_aes256_cbc_sha256_ciphers_enabled = bool, tls_rsa_with_aes256_cbc_sha_ciphers_enabled = bool, tls_rsa_with_aes256_gcm_sha384_ciphers_enabled = bool, triple_des_ciphers_enabled = bool })) | no | Security and cryptography settings controlling which SSL/TLS versions and cipher suites are enabled for both frontend (client-facing) and backend (service-to-API) connections. Includes options to disable weak protocols like SSL 3.0, TLS 1.0, TLS 1.1, and specific cipher suites. |
| sign_in | list(object({ enabled = bool })) | no | Configuration for the developer portal sign-in functionality, controlling whether users can sign in to the developer portal. |
| sign_up | list(object({ enabled = bool, terms_of_service = list(object({ consent_required = bool, enabled = bool, text = string })) })) | no | Configuration for the developer portal sign-up functionality, controlling whether new users can register and whether they must accept terms of service. Includes nested terms of service settings. |
| tenant_access | list(object({ enabled = bool })) | no | Configuration controlling whether the tenant access API endpoint is enabled, which allows programmatic access to the API Management service configuration. |
| timeouts | object({ create = string, delete = string, read = string, update = string }) | no | Custom timeout durations for create, read, update, and delete operations on the API Management resource. |
| virtual_network_configuration | list(object({ subnet_id = string })) | no | Virtual network configuration for the primary location, specifying the subnet ID where the API Management service should be deployed. |

## Outputs

| name | description |
|---|---|
| id | Computed id. |
| developer_portal_url | Computed developer_portal_url. |
| gateway_regional_url | Computed gateway_regional_url. |
| gateway_url | Computed gateway_url. |
| management_api_url | Computed management_api_url. |
| portal_url | Computed portal_url. |
| private_ip_addresses | Computed private_ip_addresses. |
| public_ip_addresses | Computed public_ip_addresses. |
| scm_url | Computed scm_url. |

## Notes

- Add module-specific compliance notes here (encryption, private endpoint
  requirements, diagnostic settings, RBAC).
- Nested/dynamic blocks and optional-field defaults were generated mechanically from the provider schema — double-check they match real usage requirements before merging.
