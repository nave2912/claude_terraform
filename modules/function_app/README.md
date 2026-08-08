# Module: function_app

**AI-scaffolded from `azurerm_function_app`'s own Terraform provider schema — verify against https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/function_app before use.**

Wraps `azurerm_function_app`.

## Usage

```hcl
module "function_app" {
  source = "../../modules/function_app"

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
| app_service_plan_id | string | yes | The ID of the App Service Plan that will host this Function App. The plan defines the compute resources (CPU, memory, scaling) available to the function. |
| storage_account_access_key | string | yes | The access key for the storage account. Azure Functions requires a storage account for internal operations like managing triggers and logging function executions. |
| storage_account_name | string | yes | The name of the storage account that the Function App will use for its internal state, triggers, and runtime artifacts. |
| app_settings | map(string) | no | A map of key-value pairs for application settings (environment variables) that will be available to the function code at runtime. |
| client_cert_mode | string | no | The mode for client certificate authentication. Controls whether client certificates are required, optional, or not used. |
| daily_memory_time_quota | number | no | The daily memory-time quota for the Function App in GB-seconds. When exceeded, the function app is stopped until the next day. Zero means no quota. |
| enable_builtin_logging | bool | no | Whether to enable built-in logging to the associated storage account. When true, function execution logs are written to Azure Storage. |
| enabled | bool | no | Whether the Function App is enabled and can process requests. When false, the app is stopped and will not execute functions. |
| https_only | bool | no | Whether to allow only HTTPS requests to the Function App. When true, HTTP requests are automatically redirected to HTTPS. |
| key_vault_reference_identity_id | string | no | The user-assigned managed identity ID to use when accessing Key Vault references in app settings. If not specified, the system-assigned identity is used. |
| os_type | string | no | The operating system type for the Function App runtime. Determines whether the app runs on Windows or Linux infrastructure. |
| version | string | no | The runtime version of the Azure Functions host. Typically a value like ~3 or ~4 indicating the major version of the Functions runtime. |
| auth_settings | list(object({ additional_login_params = map(string), allowed_external_redirect_urls = list(string), default_provider = string, enabled = bool, issuer = string, runtime_version = string, token_refresh_extension_hours = number, token_store_enabled = bool, unauthenticated_client_action = string, active_directory = list(object({ allowed_audiences = list(string), client_id = string, client_secret = string })), facebook = list(object({ app_id = string, app_secret = string, oauth_scopes = list(string) })), google = list(object({ client_id = string, client_secret = string, oauth_scopes = list(string) })), microsoft = list(object({ client_id = string, client_secret = string, oauth_scopes = list(string) })), twitter = list(object({ consumer_key = string, consumer_secret = string })) })) | no | Configuration block for App Service Authentication/Authorization (Easy Auth). Controls authentication providers and behavior for securing the Function App. |
| connection_string | list(object({ name = string, type = string, value = string })) | no | A set of connection strings to make available to the Function App. Each entry has a name, type (e.g., SQLAzure, Custom), and the connection string value. |
| identity | list(object({ identity_ids = set(string), type = string })) | no | Configuration block for managed identity. Defines whether the Function App uses a system-assigned identity, user-assigned identities, or both. |
| site_config | list(object({ always_on = bool, app_scale_limit = number, auto_swap_slot_name = string, dotnet_framework_version = string, elastic_instance_minimum = number, ftps_state = string, health_check_path = string, http2_enabled = bool, ip_restriction = list(object({ action = string, headers = string, ip_address = string, name = string, priority = number, service_tag = string, virtual_network_subnet_id = string })), java_version = string, linux_fx_version = string, min_tls_version = string, pre_warmed_instance_count = number, runtime_scale_monitoring_enabled = bool, scm_ip_restriction = list(object({ action = string, headers = string, ip_address = string, name = string, priority = number, service_tag = string, virtual_network_subnet_id = string })), scm_type = string, scm_use_main_ip_restriction = bool, use_32_bit_worker_process = bool, vnet_route_all_enabled = bool, websockets_enabled = bool, cors = list(object({ allowed_origins = set(string), support_credentials = bool })) })) | no | Detailed configuration block for the Function App's runtime behavior, including networking, language versions, scaling, CORS, IP restrictions, and TLS settings. |
| source_control | list(object({ branch = string, manual_integration = bool, repo_url = string, rollback_enabled = bool, use_mercurial = bool })) | no | Configuration block for continuous deployment from a source control repository. Defines the Git or Mercurial repository URL, branch, and integration settings. |
| timeouts | object({ create = string, delete = string, read = string, update = string }) | no | Configurable timeout durations for create, read, update, and delete operations on this Function App resource. |

## Outputs

| name | description |
|---|---|
| id | Computed id. |
| custom_domain_verification_id | Computed custom_domain_verification_id. |
| default_hostname | Computed default_hostname. |
| kind | Computed kind. |
| outbound_ip_addresses | Computed outbound_ip_addresses. |
| possible_outbound_ip_addresses | Computed possible_outbound_ip_addresses. |
| site_credential | Computed site_credential. |

## Notes

- Add module-specific compliance notes here (encryption, private endpoint
  requirements, diagnostic settings, RBAC).
- Nested/dynamic blocks and optional-field defaults were generated mechanically from the provider schema — double-check they match real usage requirements before merging.
