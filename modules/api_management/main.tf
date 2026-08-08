resource "azurerm_api_management" "this" {
  name                          = var.name
  location                      = var.location
  resource_group_name           = var.resource_group_name
  tags                          = var.tags
  publisher_email               = var.publisher_email
  publisher_name                = var.publisher_name
  sku_name                      = var.sku_name
  client_certificate_enabled    = var.client_certificate_enabled
  gateway_disabled              = var.gateway_disabled
  min_api_version               = var.min_api_version
  notification_sender_email     = var.notification_sender_email
  policy                        = var.policy
  public_ip_address_id          = var.public_ip_address_id
  public_network_access_enabled = var.public_network_access_enabled
  virtual_network_type          = var.virtual_network_type
  zones                         = var.zones
  dynamic "additional_location" {
    for_each = var.additional_location == null ? [] : var.additional_location
    content {
      capacity             = additional_location.value.capacity
      gateway_disabled     = additional_location.value.gateway_disabled
      location             = additional_location.value.location
      public_ip_address_id = additional_location.value.public_ip_address_id
      zones                = additional_location.value.zones
      dynamic "virtual_network_configuration" {
        for_each = additional_location.value.virtual_network_configuration == null ? [] : additional_location.value.virtual_network_configuration
        content {
          subnet_id = virtual_network_configuration.value.subnet_id
        }
      }
    }
  }
  dynamic "certificate" {
    for_each = var.certificate == null ? [] : var.certificate
    content {
      certificate_password = certificate.value.certificate_password
      encoded_certificate  = certificate.value.encoded_certificate
      store_name           = certificate.value.store_name
    }
  }
  dynamic "delegation" {
    for_each = var.delegation == null ? [] : var.delegation
    content {
      subscriptions_enabled     = delegation.value.subscriptions_enabled
      url                       = delegation.value.url
      user_registration_enabled = delegation.value.user_registration_enabled
      validation_key            = delegation.value.validation_key
    }
  }
  dynamic "hostname_configuration" {
    for_each = var.hostname_configuration == null ? [] : var.hostname_configuration
    content {
      dynamic "developer_portal" {
        for_each = hostname_configuration.value.developer_portal == null ? [] : hostname_configuration.value.developer_portal
        content {
          certificate                     = developer_portal.value.certificate
          certificate_password            = developer_portal.value.certificate_password
          host_name                       = developer_portal.value.host_name
          key_vault_id                    = developer_portal.value.key_vault_id
          negotiate_client_certificate    = developer_portal.value.negotiate_client_certificate
          ssl_keyvault_identity_client_id = developer_portal.value.ssl_keyvault_identity_client_id
        }
      }
      dynamic "management" {
        for_each = hostname_configuration.value.management == null ? [] : hostname_configuration.value.management
        content {
          certificate                     = management.value.certificate
          certificate_password            = management.value.certificate_password
          host_name                       = management.value.host_name
          key_vault_id                    = management.value.key_vault_id
          negotiate_client_certificate    = management.value.negotiate_client_certificate
          ssl_keyvault_identity_client_id = management.value.ssl_keyvault_identity_client_id
        }
      }
      dynamic "portal" {
        for_each = hostname_configuration.value.portal == null ? [] : hostname_configuration.value.portal
        content {
          certificate                     = portal.value.certificate
          certificate_password            = portal.value.certificate_password
          host_name                       = portal.value.host_name
          key_vault_id                    = portal.value.key_vault_id
          negotiate_client_certificate    = portal.value.negotiate_client_certificate
          ssl_keyvault_identity_client_id = portal.value.ssl_keyvault_identity_client_id
        }
      }
      dynamic "proxy" {
        for_each = hostname_configuration.value.proxy == null ? [] : hostname_configuration.value.proxy
        content {
          certificate                     = proxy.value.certificate
          certificate_password            = proxy.value.certificate_password
          default_ssl_binding             = proxy.value.default_ssl_binding
          host_name                       = proxy.value.host_name
          key_vault_id                    = proxy.value.key_vault_id
          negotiate_client_certificate    = proxy.value.negotiate_client_certificate
          ssl_keyvault_identity_client_id = proxy.value.ssl_keyvault_identity_client_id
        }
      }
      dynamic "scm" {
        for_each = hostname_configuration.value.scm == null ? [] : hostname_configuration.value.scm
        content {
          certificate                     = scm.value.certificate
          certificate_password            = scm.value.certificate_password
          host_name                       = scm.value.host_name
          key_vault_id                    = scm.value.key_vault_id
          negotiate_client_certificate    = scm.value.negotiate_client_certificate
          ssl_keyvault_identity_client_id = scm.value.ssl_keyvault_identity_client_id
        }
      }
    }
  }
  dynamic "identity" {
    for_each = var.identity == null ? [] : var.identity
    content {
      identity_ids = identity.value.identity_ids
      type         = identity.value.type
    }
  }
  dynamic "protocols" {
    for_each = var.protocols == null ? [] : var.protocols
    content {
      enable_http2 = protocols.value.enable_http2
    }
  }
  dynamic "security" {
    for_each = var.security == null ? [] : var.security
    content {
      enable_backend_ssl30                                = security.value.enable_backend_ssl30
      enable_backend_tls10                                = security.value.enable_backend_tls10
      enable_backend_tls11                                = security.value.enable_backend_tls11
      enable_frontend_ssl30                               = security.value.enable_frontend_ssl30
      enable_frontend_tls10                               = security.value.enable_frontend_tls10
      enable_frontend_tls11                               = security.value.enable_frontend_tls11
      tls_ecdhe_ecdsa_with_aes128_cbc_sha_ciphers_enabled = security.value.tls_ecdhe_ecdsa_with_aes128_cbc_sha_ciphers_enabled
      tls_ecdhe_ecdsa_with_aes256_cbc_sha_ciphers_enabled = security.value.tls_ecdhe_ecdsa_with_aes256_cbc_sha_ciphers_enabled
      tls_ecdhe_rsa_with_aes128_cbc_sha_ciphers_enabled   = security.value.tls_ecdhe_rsa_with_aes128_cbc_sha_ciphers_enabled
      tls_ecdhe_rsa_with_aes256_cbc_sha_ciphers_enabled   = security.value.tls_ecdhe_rsa_with_aes256_cbc_sha_ciphers_enabled
      tls_rsa_with_aes128_cbc_sha256_ciphers_enabled      = security.value.tls_rsa_with_aes128_cbc_sha256_ciphers_enabled
      tls_rsa_with_aes128_cbc_sha_ciphers_enabled         = security.value.tls_rsa_with_aes128_cbc_sha_ciphers_enabled
      tls_rsa_with_aes128_gcm_sha256_ciphers_enabled      = security.value.tls_rsa_with_aes128_gcm_sha256_ciphers_enabled
      tls_rsa_with_aes256_cbc_sha256_ciphers_enabled      = security.value.tls_rsa_with_aes256_cbc_sha256_ciphers_enabled
      tls_rsa_with_aes256_cbc_sha_ciphers_enabled         = security.value.tls_rsa_with_aes256_cbc_sha_ciphers_enabled
      tls_rsa_with_aes256_gcm_sha384_ciphers_enabled      = security.value.tls_rsa_with_aes256_gcm_sha384_ciphers_enabled
      triple_des_ciphers_enabled                          = security.value.triple_des_ciphers_enabled
    }
  }
  dynamic "sign_in" {
    for_each = var.sign_in == null ? [] : var.sign_in
    content {
      enabled = sign_in.value.enabled
    }
  }
  dynamic "sign_up" {
    for_each = var.sign_up == null ? [] : var.sign_up
    content {
      enabled = sign_up.value.enabled
      dynamic "terms_of_service" {
        for_each = sign_up.value.terms_of_service
        content {
          consent_required = terms_of_service.value.consent_required
          enabled          = terms_of_service.value.enabled
          text             = terms_of_service.value.text
        }
      }
    }
  }
  dynamic "tenant_access" {
    for_each = var.tenant_access == null ? [] : var.tenant_access
    content {
      enabled = tenant_access.value.enabled
    }
  }
  dynamic "timeouts" {
    for_each = var.timeouts == null ? [] : [var.timeouts]
    content {
      create = timeouts.value.create
      delete = timeouts.value.delete
      read   = timeouts.value.read
      update = timeouts.value.update
    }
  }
  dynamic "virtual_network_configuration" {
    for_each = var.virtual_network_configuration == null ? [] : var.virtual_network_configuration
    content {
      subnet_id = virtual_network_configuration.value.subnet_id
    }
  }
}
