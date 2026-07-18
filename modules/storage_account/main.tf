# ADLS Gen2 storage account: StorageV2 kind + hierarchical namespace enabled.
# Kept minimal — only the settings required for Gen2 and the secure-by-default
# baseline (TLS 1.2, HTTPS-only, no anonymous blob access) are set explicitly.
#
# checkov:skip=CKV_AZURE_206: LRS default is intentional for this learning/dev
#   subscription (cost); callers can opt into ZRS/GRS via account_replication_type.
# checkov:skip=CKV_AZURE_33: Queue service is not used by this module (Gen2 +
#   static website only) — queue logging has nothing to log.
# checkov:skip=CKV_AZURE_244: SFTP (sftp_enabled) is never enabled here, so no
#   local users are ever created by this module.
# checkov:skip=CKV_AZURE_59: Disabling public network access requires a private
#   endpoint, which is an explicitly deferred item — see ARCHITECTURE.md §9
#   ("No private DNS / hub-spoke networking module"). Revisit when that lands.
# checkov:skip=CKV2_AZURE_33: Same private-endpoint gap as above.
# checkov:skip=CKV2_AZURE_1: Customer-managed-key encryption needs a Key Vault,
#   which doesn't exist yet in this framework — also deferred in ARCHITECTURE.md §9.
resource "azurerm_storage_account" "this" {
  name                = var.name
  resource_group_name = var.resource_group_name
  location            = var.location

  account_kind             = "StorageV2"
  account_tier             = var.account_tier
  account_replication_type = var.account_replication_type
  is_hns_enabled           = true

  min_tls_version                 = "TLS1_2"
  https_traffic_only_enabled      = true
  allow_nested_items_to_be_public = false
  shared_access_key_enabled       = false

  sas_policy {
    expiration_period = "07.00:00:00"
    expiration_action = "Log"
  }

  blob_properties {
    delete_retention_policy {
      days = 7
    }
    container_delete_retention_policy {
      days = 7
    }
  }

  static_website {
    index_document     = var.index_document
    error_404_document = var.error_404_document
  }

  tags = var.tags
}
