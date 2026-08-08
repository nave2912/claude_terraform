resource "azurerm_function_app" "this" {
  name                            = var.name
  location                        = var.location
  resource_group_name             = var.resource_group_name
  tags                            = var.tags
  app_service_plan_id             = var.app_service_plan_id
  storage_account_access_key      = var.storage_account_access_key
  storage_account_name            = var.storage_account_name
  app_settings                    = var.app_settings
  client_cert_mode                = var.client_cert_mode
  daily_memory_time_quota         = var.daily_memory_time_quota
  enable_builtin_logging          = var.enable_builtin_logging
  enabled                         = var.enabled
  https_only                      = var.https_only
  key_vault_reference_identity_id = var.key_vault_reference_identity_id
  os_type                         = var.os_type
  version                         = var.version
  dynamic "auth_settings" {
    for_each = var.auth_settings == null ? [] : var.auth_settings
    content {
      additional_login_params        = auth_settings.value.additional_login_params
      allowed_external_redirect_urls = auth_settings.value.allowed_external_redirect_urls
      default_provider               = auth_settings.value.default_provider
      enabled                        = auth_settings.value.enabled
      issuer                         = auth_settings.value.issuer
      runtime_version                = auth_settings.value.runtime_version
      token_refresh_extension_hours  = auth_settings.value.token_refresh_extension_hours
      token_store_enabled            = auth_settings.value.token_store_enabled
      unauthenticated_client_action  = auth_settings.value.unauthenticated_client_action
      dynamic "active_directory" {
        for_each = auth_settings.value.active_directory == null ? [] : auth_settings.value.active_directory
        content {
          allowed_audiences = active_directory.value.allowed_audiences
          client_id         = active_directory.value.client_id
          client_secret     = active_directory.value.client_secret
        }
      }
      dynamic "facebook" {
        for_each = auth_settings.value.facebook == null ? [] : auth_settings.value.facebook
        content {
          app_id       = facebook.value.app_id
          app_secret   = facebook.value.app_secret
          oauth_scopes = facebook.value.oauth_scopes
        }
      }
      dynamic "google" {
        for_each = auth_settings.value.google == null ? [] : auth_settings.value.google
        content {
          client_id     = google.value.client_id
          client_secret = google.value.client_secret
          oauth_scopes  = google.value.oauth_scopes
        }
      }
      dynamic "microsoft" {
        for_each = auth_settings.value.microsoft == null ? [] : auth_settings.value.microsoft
        content {
          client_id     = microsoft.value.client_id
          client_secret = microsoft.value.client_secret
          oauth_scopes  = microsoft.value.oauth_scopes
        }
      }
      dynamic "twitter" {
        for_each = auth_settings.value.twitter == null ? [] : auth_settings.value.twitter
        content {
          consumer_key    = twitter.value.consumer_key
          consumer_secret = twitter.value.consumer_secret
        }
      }
    }
  }
  dynamic "connection_string" {
    for_each = var.connection_string == null ? [] : var.connection_string
    content {
      name  = connection_string.value.name
      type  = connection_string.value.type
      value = connection_string.value.value
    }
  }
  dynamic "identity" {
    for_each = var.identity == null ? [] : var.identity
    content {
      identity_ids = identity.value.identity_ids
      type         = identity.value.type
    }
  }
  dynamic "site_config" {
    for_each = var.site_config == null ? [] : var.site_config
    content {
      always_on                        = site_config.value.always_on
      app_scale_limit                  = site_config.value.app_scale_limit
      auto_swap_slot_name              = site_config.value.auto_swap_slot_name
      dotnet_framework_version         = site_config.value.dotnet_framework_version
      elastic_instance_minimum         = site_config.value.elastic_instance_minimum
      ftps_state                       = site_config.value.ftps_state
      health_check_path                = site_config.value.health_check_path
      http2_enabled                    = site_config.value.http2_enabled
      ip_restriction                   = site_config.value.ip_restriction
      java_version                     = site_config.value.java_version
      linux_fx_version                 = site_config.value.linux_fx_version
      min_tls_version                  = site_config.value.min_tls_version
      pre_warmed_instance_count        = site_config.value.pre_warmed_instance_count
      runtime_scale_monitoring_enabled = site_config.value.runtime_scale_monitoring_enabled
      scm_ip_restriction               = site_config.value.scm_ip_restriction
      scm_type                         = site_config.value.scm_type
      scm_use_main_ip_restriction      = site_config.value.scm_use_main_ip_restriction
      use_32_bit_worker_process        = site_config.value.use_32_bit_worker_process
      vnet_route_all_enabled           = site_config.value.vnet_route_all_enabled
      websockets_enabled               = site_config.value.websockets_enabled
      dynamic "cors" {
        for_each = site_config.value.cors == null ? [] : site_config.value.cors
        content {
          allowed_origins     = cors.value.allowed_origins
          support_credentials = cors.value.support_credentials
        }
      }
    }
  }
  dynamic "source_control" {
    for_each = var.source_control == null ? [] : var.source_control
    content {
      branch             = source_control.value.branch
      manual_integration = source_control.value.manual_integration
      repo_url           = source_control.value.repo_url
      rollback_enabled   = source_control.value.rollback_enabled
      use_mercurial      = source_control.value.use_mercurial
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
}
