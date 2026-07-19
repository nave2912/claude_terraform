# Module: container_app_environment

Creates a single `azurerm_container_app_environment` on the Consumption
plan only — no dedicated workload profile and no VNET integration are
configured, which is what keeps this at the cheapest Container Apps tier.
One or more `modules/container_app` instances run inside it.

## Usage

```hcl
module "container_app_environment" {
  source = "../../modules/container_app_environment"

  name                        = "chatbot-backend-env"
  location                    = "eastus"
  resource_group_name         = "azure-learning-dev"
  log_analytics_workspace_id  = module.log_analytics_workspace.id
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
| `name` | `string` | yes | Environment name |
| `location` | `string` | yes | Azure region |
| `resource_group_name` | `string` | yes | Parent resource group name |
| `log_analytics_workspace_id` | `string` | yes | Log Analytics workspace resource ID — see `modules/log_analytics_workspace` |
| `tags` | `map(string)` | yes | Must include `environment`, `owner`, `costCenter`, `application`, `dataClassification` |

## Outputs

| Name | Description |
|---|---|
| `id` | Environment resource ID — passed to `modules/container_app` |
| `name` | Environment name |
| `default_domain` | Default domain suffix for apps in this environment |
