# Module: service_plan

**AI-scaffolded from `azurerm_service_plan`'s own Terraform provider schema — verify against https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/service_plan before use.**

Wraps `azurerm_service_plan`.

## Usage

```hcl
module "service_plan" {
  source = "../../modules/service_plan"

  providers = {
    azurerm = azurerm.<alias>
  }

  name = "<naming-convention-compliant-name>"
  tags = local.mandatory_tags
  # ... remaining fields, see Inputs below
}
```

## Inputs

| name | type | required | description |
|---|---|---|---|
| name | string | yes | Resource name (see naming-convention.md). |
| location | string | yes | Azure region. |
| resource_group_name | string | yes | Parent resource group name. |
| tags | map(string) | yes | Mandatory tag set (environment, owner, costCenter, application, dataClassification). |
| os_type | string | yes | The operating system type for the service plan, either 'Windows' or 'Linux'. |
| sku_name | string | yes | The pricing tier and size for the service plan, such as 'B1' (Basic), 'S1' (Standard), 'P1V2' (Premium V2), or 'Y1' (Dynamic for Functions). |
| app_service_environment_id | string | no | Optional ID of an App Service Environment (isolated, dedicated environment) where this service plan should be created. |
| maximum_elastic_worker_count | number | no | The maximum number of workers that can be elastically scaled out for this service plan when using elastic scale-out SKUs. |
| per_site_scaling_enabled | bool | no | When enabled (true), allows individual apps in this service plan to be scaled independently rather than scaling all apps together. |
| worker_count | number | no | The number of worker instances to allocate to the service plan, controlling how many virtual machines run your applications. |
| zone_balancing_enabled | bool | no | When enabled (true), distributes worker instances across multiple availability zones for improved availability and resilience. |
| timeouts | object({ create = string, delete = string, read = string, update = string }) | no | Optional timeouts for create, read, update, and delete operations, allowing you to customize how long Terraform waits for each operation to complete. |

## Outputs

| name | description |
|---|---|
| id | Computed id. |
| kind | Computed kind. |
| reserved | Computed reserved. |

## Notes

- Add module-specific compliance notes here (encryption, private endpoint
  requirements, diagnostic settings, RBAC).
- Nested/dynamic blocks and optional-field defaults were generated mechanically from the provider schema — double-check they match real usage requirements before merging.
