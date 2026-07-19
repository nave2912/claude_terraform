# JSON-driven infrastructure model.
# Infrastructure intent lives in models/<environment>/resource-group.json.
# jsondecode() turns intent into data; for_each turns data into resources
# via the reusable module in modules/resource_group. 

locals {
  resource_group_model  = jsondecode(file("${path.module}/../../models/${var.environment}/resource-group.json"))
  storage_account_model = jsondecode(file("${path.module}/../../models/${var.environment}/storage-account.json"))
  virtual_network_model = jsondecode(file("${path.module}/../../models/${var.environment}/virtual-network.json"))
}

module "resource_group" {
  source = "../../modules/resource_group"

  for_each = local.resource_group_model.resource_groups

  name       = each.value.name
  location   = each.value.location
  tags       = each.value.tags
  lock_level = var.default_lock_level
}

module "storage_account" {
  source = "../../modules/storage_account"

  for_each = local.storage_account_model.storage_accounts

  name                     = each.value.name
  location                 = module.resource_group[each.value.resource_group_key].location
  resource_group_name      = module.resource_group[each.value.resource_group_key].name
  account_tier             = each.value.account_tier
  account_replication_type = each.value.account_replication_type
  tags                     = each.value.tags
}

module "virtual_network" {
  source = "../../modules/virtual_network"

  for_each = local.virtual_network_model.virtual_networks

  name                = each.value.name
  location            = module.resource_group[each.value.resource_group_key].location
  resource_group_name = module.resource_group[each.value.resource_group_key].name
  address_space       = each.value.address_space
  subnets             = try(each.value.subnets, {})
  tags                = each.value.tags
}
