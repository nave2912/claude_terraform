data "azurerm_client_config" "current" {}

resource "azurerm_key_vault" "this" {
  name                = var.name
  location            = var.location
  resource_group_name = var.resource_group_name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = var.sku_name

  enable_rbac_authorization     = true
  purge_protection_enabled      = var.purge_protection_enabled
  soft_delete_retention_days    = var.soft_delete_retention_days
  public_network_access_enabled = true

  # Explicit firewall config (vs. leaving it unset) — still allows all
  # traffic by default since there's no VNET/Private Link/self-hosted CI
  # runner in this framework yet, so a Deny default would block
  # `terraform apply` itself (GitHub-hosted Actions runners have dynamic
  # public IPs, not covered by the AzureServices bypass). See
  # CKV_AZURE_109/189/CKV2_AZURE_32 in .checkov.yaml's skip-check list.
  network_acls {
    default_action = "Allow"
    bypass         = "AzureServices"
  }

  tags = var.tags
}
