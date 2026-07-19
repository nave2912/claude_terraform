# Module: log_analytics_workspace

Creates a single `azurerm_log_analytics_workspace`. Primarily consumed by
`modules/container_app_environment`, which requires one, but kept
standalone since other resources (App Service, AKS, diagnostic settings)
commonly need one too.

## Usage

```hcl
module "log_analytics_workspace" {
  source = "../../modules/log_analytics_workspace"

  name                 = "chatbot-backend-logs"
  location             = "eastus"
  resource_group_name  = "azure-learning-dev"
  tags = {
    environment        = "dev"
    owner              = "platform-team"
    costCenter         = "CC-LEARN-001"
    application        = "azure-learning"
    dataClassification = "internal"
  }
}
```

## Inputs

| Name | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | yes | Workspace name, 4-63 chars, alphanumeric and hyphens |
| `location` | `string` | yes | Azure region |
| `resource_group_name` | `string` | yes | Parent resource group name |
| `sku` | `string` | no | Default `PerGB2018` |
| `retention_in_days` | `number` | no | 30-730, default 30 (platform minimum, cheapest) |
| `tags` | `map(string)` | yes | Must include `environment`, `owner`, `costCenter`, `application`, `dataClassification` |

## Outputs

| Name | Description |
|---|---|
| `id` | Workspace resource ID |
| `name` | Workspace name |
| `workspace_id` | Workspace (customer) ID GUID |
