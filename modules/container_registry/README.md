# Module: container_registry

Creates a single `azurerm_container_registry`. `admin_enabled` defaults to
`false` — consumers (e.g. a Container App) should pull images via managed
identity + an `AcrPull` role assignment against this module's `id` output,
not registry admin credentials.

## Usage

```hcl
module "container_registry" {
  source = "../../modules/container_registry"

  name                 = "chatbotacrnaveenkumar"
  location             = "eastus"
  resource_group_name  = "azure-learning-dev"
  tags = {
    environment        = "dev"
    owner              = "platform-team"
    costCenter         = "CC-LEARN-001"
    application         = "azure-learning"
    dataClassification = "internal"
  }
}
```

## Inputs

| Name | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | yes | Registry name, 5-50 alphanumeric chars, globally unique |
| `location` | `string` | yes | Azure region |
| `resource_group_name` | `string` | yes | Parent resource group name |
| `sku` | `string` | no | `Basic` (default, cheapest), `Standard`, `Premium` |
| `admin_enabled` | `bool` | no | Default `false` |
| `tags` | `map(string)` | yes | Must include `environment`, `owner`, `costCenter`, `application`, `dataClassification` |

## Outputs

| Name | Description |
|---|---|
| `id` | Registry resource ID — use as the `scope` for an `AcrPull` role assignment |
| `name` | Registry name |
| `login_server` | Login server hostname |
