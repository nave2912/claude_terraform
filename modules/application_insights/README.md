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
| application_type | string | yes | The type of application being monitored, such as 'web' for web applications, 'ios' for iOS apps, 'java' for Java applications, or 'other' for general use cases. |
| daily_data_cap_in_gb | number | no | The maximum amount of telemetry data (in gigabytes) that can be ingested per day before throttling occurs. |
| daily_data_cap_notifications_disabled | bool | no | Whether to disable email notifications when the daily data cap is reached. Set to true to suppress these alerts. |
| disable_ip_masking | bool | no | Whether to disable the automatic masking of IP addresses in telemetry data. Set to true to store full IP addresses for compliance or debugging needs. |
| force_customer_storage_for_profiler | bool | no | Whether to require customer-managed storage for the Application Insights Profiler feature instead of using Microsoft-managed storage. |
| internet_ingestion_enabled | bool | no | Whether telemetry data can be ingested from public internet endpoints. Set to false to restrict ingestion to private networks only. |
| internet_query_enabled | bool | no | Whether queries against Application Insights data can be made from public internet endpoints. Set to false to restrict queries to private networks only. |
| local_authentication_disabled | bool | no | Whether to disable local authentication methods (such as API keys) and require Azure Active Directory authentication only. |
| retention_in_days | number | no | The number of days that telemetry data will be retained before automatic deletion, typically ranging from 30 to 730 days. |
| sampling_percentage | number | no | The percentage of telemetry data to retain (0-100), where lower values reduce costs by sampling and discarding some data. |
| workspace_id | string | no | The ID of the Log Analytics workspace to which Application Insights data should be sent. If not specified, a classic Application Insights resource is created. |
| timeouts | object({ create = string, delete = string, read = string, update = string }) | no | Optional timeout configurations for create, read, update, and delete operations, specified as duration strings like '30m' or '1h'. |

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
