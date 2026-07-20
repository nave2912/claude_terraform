# Module: static_web_app

Creates a single `azurerm_static_web_app` on the Free tier by default. Only
provisions the app shell + its deployment token (`api_key` output) —
publishing an actual build still needs a separate deploy step (SWA CLI or
a GitHub Actions workflow using that token), which is outside this
module's scope.

## Usage

```hcl
module "static_web_app" {
  source = "../../modules/static_web_app"

  name                 = "naveenkumar"
  location             = "eastus2" # must be an SWA-supported region
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
| `name` | `string` | yes | Static Web App name |
| `location` | `string` | yes | Must be one of `eastus2`, `centralus`, `westus2`, `westeurope`, `eastasia` |
| `resource_group_name` | `string` | yes | Parent resource group name |
| `sku_tier` | `string` | no | `Free` (default) or `Standard` |
| `sku_size` | `string` | no | Must match `sku_tier` |
| `app_settings` | `map(string)` | no | Server-side env vars for the app's Route Handlers / managed Functions (e.g. `BACKEND_BASE_URL`, `BACKEND_API_KEY`). Sensitive. |
| `tags` | `map(string)` | yes | Must include `environment`, `owner`, `costCenter`, `application`, `dataClassification` |

## Outputs

| Name | Description |
|---|---|
| `id` | Resource ID |
| `name` | App name |
| `default_host_name` | Public hostname |
| `api_key` | Deployment token (sensitive) |
