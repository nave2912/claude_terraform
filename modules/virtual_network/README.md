# Module: virtual_network

Creates a single `azurerm_virtual_network` plus zero or more `azurerm_subnet`
resources declared inline via the `subnets` map. Subnets have no independent
lifecycle in this framework, so they live in this module rather than a
separate one.

## Usage

```hcl
module "virtual_network" {
  source = "../../modules/virtual_network"

  name                 = "vnet-demo"
  location             = module.resource_group["primary"].location
  resource_group_name  = module.resource_group["primary"].name
  address_space        = ["10.0.0.0/16"]
  subnets = {
    subnet1 = {
      name              = "subnet1"
      address_prefixes  = ["10.0.1.0/24"]
    }
  }
  tags = {
    environment        = "dev"
    owner              = "platform-team"
    costCenter         = "CC-LEARN-001"
    application        = "azure-learning"
    dataClassification = "internal"
  }
}
```

Consumers should not hardcode module inputs — in this framework, values are
sourced from `models/<env>/virtual-network.json` via `jsondecode()` in the
environment root, with `location`/`resource_group_name` derived from the
`resource_group` module output.

## Inputs

| Name | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | yes | Virtual network name |
| `location` | `string` | yes | Azure region |
| `resource_group_name` | `string` | yes | Parent resource group name |
| `address_space` | `list(string)` | yes | CIDR blocks for the vnet |
| `subnets` | `map(object({name, address_prefixes}))` | no | Logical-id-keyed subnet definitions, default `{}` |
| `tags` | `map(string)` | yes | Must include `environment`, `owner`, `costCenter`, `application`, `dataClassification` |

## Outputs

| Name | Description |
|---|---|
| `id` | Virtual network resource ID |
| `name` | Virtual network name |
| `subnet_ids` | Map of logical subnet id to subnet resource ID |
| `tags` | Applied tags |
