# JSON-driven infrastructure model.
# Infrastructure intent lives in models/<environment>/resource-group.json.
# jsondecode() turns intent into data; for_each turns data into resources
# via the reusable module in modules/resource_group.

locals {
  resource_group_model = jsondecode(file("${path.module}/../../models/${var.environment}/resource-group.json"))
}

module "resource_group" {
  source = "../../modules/resource_group"

  for_each = local.resource_group_model.resource_groups

  name       = each.value.name
  location   = each.value.location
  tags       = each.value.tags
  lock_level = var.default_lock_level
}
