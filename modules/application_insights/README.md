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
| application_type | string | yes | The type of application being monitored. Common values include 'web' for web applications, 'other' for general purposes, 'java' for Java applications, 'MobileCenter' for mobile apps, and 'Node.JS' for Node.js applications. |
| daily_data_cap_in_gb | number | no | The maximum amount of data in gigabytes that can be ingested per day. This helps control costs by limiting daily data collection. |
| daily_data_cap_notifications_disabled | bool | no | Whether to disable email notifications when the daily data cap is reached. Set to true to suppress these notifications. |
| disable_ip_masking | bool | no | Whether to disable IP address masking in telemetry data. Set to true to store complete IP addresses instead of masking the last octet for privacy. |
| force_customer_storage_for_profiler | bool | no | Whether to require customer-managed storage for the Application Insights Profiler feature. Set to true to force use of your own storage account. |
| internet_ingestion_enabled | bool | no | Whether telemetry data can be ingested from public internet endpoints. Set to false to restrict ingestion to private network connections only. |
| internet_query_enabled | bool | no | Whether queries against Application Insights data can be made from public internet endpoints. Set to false to restrict queries to private network connections only. |
| local_authentication_disabled | bool | no | Whether to disable authentication using API keys. Set to true to require Azure Active Directory authentication only. |
| retention_in_days | number | no | The number of days to retain telemetry data before it is automatically deleted. Common values are 30, 60, 90, 120, 180, 270, 365, 550, or 730 days. |
| sampling_percentage | number | no | The percentage of telemetry data to collect, as a number between 0 and 100. Lower values reduce data volume and costs but may miss some events. |
| workspace_id | string | no | The ID of the Log Analytics workspace to which Application Insights data should be sent. When provided, Application Insights uses workspace-based storage instead of classic storage. |
| timeouts | object({ create = string, delete = string, read = string, update = string }) | no | Optional timeout settings for create, read, update, and delete operations. Each sub-field (create, delete, read, update) accepts a duration string like '30m' or '1h'. |

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
