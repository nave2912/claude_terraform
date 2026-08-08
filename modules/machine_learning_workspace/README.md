# Module: machine_learning_workspace

**AI-scaffolded from `azurerm_machine_learning_workspace`'s own Terraform provider schema — verify against https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/machine_learning_workspace before use.**

Wraps `azurerm_machine_learning_workspace`.

## Usage

```hcl
module "machine_learning_workspace" {
  source = "../../modules/machine_learning_workspace"

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
| application_insights_id | string | yes | The resource ID of the Application Insights instance used to monitor the workspace's activities and experiments. |
| key_vault_id | string | yes | The resource ID of the Azure Key Vault used to store secrets, keys, and certificates for the workspace. |
| storage_account_id | string | yes | The resource ID of the Azure Storage Account used for storing workspace data, artifacts, and model outputs. |
| identity | list(object({ identity_ids = set(string), type = string })) | yes | A list block defining the managed identity configuration for the workspace. Specifies the identity type (SystemAssigned, UserAssigned, or both) and any user-assigned identity IDs. |
| container_registry_id | string | no | The resource ID of an Azure Container Registry to use for storing Docker images built for training and deployment. |
| description | string | no | A free-text description of the workspace for documentation purposes. |
| friendly_name | string | no | A user-friendly display name for the workspace shown in the Azure portal and ML Studio. |
| high_business_impact | bool | no | Whether the workspace handles high business impact data, which enables additional compliance and security features. |
| image_build_compute_name | string | no | The name of the compute target to use for building Docker images when a container registry is attached. |
| kind | string | no | The kind of workspace to create, which determines available features and capabilities. |
| primary_user_assigned_identity | string | no | The resource ID of the primary user-assigned managed identity for the workspace when using user-assigned identities. |
| public_access_behind_virtual_network_enabled | bool | no | Whether to allow public network access when the workspace is also behind a virtual network. When false, access is restricted to the virtual network only. |
| public_network_access_enabled | bool | no | Whether public network access to the workspace is allowed. When false, the workspace is accessible only through private endpoints. |
| sku_name | string | no | The SKU/pricing tier for the workspace. |
| v1_legacy_mode_enabled | bool | no | Whether to enable v1 legacy mode for backward compatibility with older Azure ML SDK versions. |
| encryption | list(object({ key_id = string, key_vault_id = string, user_assigned_identity_id = string })) | no | A list block configuring customer-managed key encryption for the workspace. Specifies the key ID, key vault ID, and the user-assigned identity used to access the key. |
| feature_store | list(object({ computer_spark_runtime_version = string, offline_connection_name = string, online_connection_name = string })) | no | A list block configuring the workspace as a feature store. Specifies the Spark runtime version and connection names for offline and online feature retrieval. |
| managed_network | list(object({ isolation_mode = string })) | no | A list block defining the managed network isolation mode for the workspace, controlling network security boundaries. |
| serverless_compute | list(object({ public_ip_enabled = bool, subnet_id = string })) | no | A list block configuring serverless compute settings. Specifies whether public IPs are enabled and the subnet ID for serverless compute instances. |
| timeouts | object({ create = string, delete = string, read = string, update = string }) | no | A single nested block specifying custom timeout durations for create, read, update, and delete operations. |

## Outputs

| name | description |
|---|---|
| id | Computed id. |
| discovery_url | Computed discovery_url. |
| workspace_id | Computed workspace_id. |

## Notes

- Add module-specific compliance notes here (encryption, private endpoint
  requirements, diagnostic settings, RBAC).
- Nested/dynamic blocks and optional-field defaults were generated mechanically from the provider schema — double-check they match real usage requirements before merging.
