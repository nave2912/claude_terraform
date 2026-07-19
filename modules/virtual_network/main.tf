# Virtual network with an inline set of subnets. Subnets are created inside
# this module (not as a separate module) since they always belong to exactly
# one vnet and have no independent lifecycle in this framework.
resource "azurerm_virtual_network" "this" {
  name                = var.name
  address_space       = var.address_space
  location            = var.location
  resource_group_name = var.resource_group_name

  tags = var.tags
}

resource "azurerm_subnet" "this" {
  for_each = var.subnets

  name                 = each.value.name
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.this.name
  address_prefixes     = each.value.address_prefixes
}

# Every subnet gets its own NSG, associated below. No custom rules are
# defined — Azure's built-in default rules (deny all inbound from the
# internet, allow VNet-internal and Azure Load Balancer traffic) are the
# secure baseline; callers add rules via a separate resource if a subnet
# ever needs one, rather than this module growing a rules variable nobody
# has needed yet.
resource "azurerm_network_security_group" "this" {
  for_each = var.subnets

  name                = "${each.value.name}-nsg"
  location            = var.location
  resource_group_name = var.resource_group_name

  tags = var.tags
}

resource "azurerm_subnet_network_security_group_association" "this" {
  for_each = var.subnets

  subnet_id                 = azurerm_subnet.this[each.key].id
  network_security_group_id = azurerm_network_security_group.this[each.key].id
}
