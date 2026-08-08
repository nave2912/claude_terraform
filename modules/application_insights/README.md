# Module: application_insights

**AI-scaffolded from `azurerm_application_insights`'s own Terraform provider schema — verify against https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/application_insights before use.**

Wraps `azurerm_application_insights`.

## Usage

```hcl
module "application_insights" {
  source = "../../modules/application_insights"

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
| application_type | string | yes | The type of application being monitored. This determines the default dashboards and metrics displayed in Application Insights. |
| daily_data_cap_in_gb | number | no | The daily data volume cap in gigabytes. When this limit is reached, data ingestion stops for the rest of the day. |
| daily_data_cap_notifications_disabled | bool | no | Whether to disable email notifications when the daily data cap is reached. |
| disable_ip_masking | bool | no | Whether to disable IP address masking in telemetry data. When false, the last octet of IP addresses is masked for privacy. |
| force_customer_storage_for_profiler | bool | no | Whether to force the use of customer-owned storage accounts for profiler data instead of Microsoft-managed storage. |
| internet_ingestion_enabled | bool | no | Whether ingestion (receiving telemetry data) is allowed from public internet endpoints. Set to false to restrict to private endpoints only. |
| internet_query_enabled | bool | no | Whether querying the Application Insights data is allowed from public internet endpoints. Set to false to restrict to private endpoints only. |
| local_authentication_disabled | bool | no | Whether to disable local authentication methods (instrumentation keys) and require Azure Active Directory authentication only. |
| retention_in_days | number | no | The number of days telemetry data will be retained in Application Insights before being automatically deleted. |
| sampling_percentage | number | no | The percentage of telemetry data to collect (0-100). Lower values reduce data volume and costs but may miss some events. |
| workspace_id | string | no | The ID of the Log Analytics workspace to which Application Insights data should be sent. Required for workspace-based Application Insights. |
| timeouts | object({ create = string, delete = string, read = string, update = string }) | no | A block that allows you to customize how long Terraform will wait for create, read, update, and delete operations to complete before timing out. |

## Outputs

| name | description |
|---|---|
| id | Computed id. |
| app_id | Computed app_id. |
| connection_string | Computed connection_string. |
| instrumentation_key | Computed instrumentation_key. |

## Notes

- Add module-specific compliance notes here (encryption, private endpoint
  requirements, diagnostic settings, RBAC).
- Nested/dynamic blocks and optional-field defaults were generated mechanically from the provider schema — double-check they match real usage requirements before merging.
