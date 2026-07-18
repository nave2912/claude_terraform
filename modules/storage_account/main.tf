# ADLS Gen2 storage account: StorageV2 kind + hierarchical namespace enabled.
# Kept minimal — only the settings required for Gen2 and the secure-by-default
# baseline (TLS 1.2, HTTPS-only, no anonymous blob access) are set explicitly.

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

  static_website {
    index_document     = var.index_document
    error_404_document = var.error_404_document
  }

  tags = var.tags
}
