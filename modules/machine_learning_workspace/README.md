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
| application_insights_id | string | yes | The resource ID of an existing Application Insights instance that will be used to monitor and log activities in the workspace. |
| key_vault_id | string | yes | The resource ID of an existing Key Vault that will store secrets, keys, and certificates for the workspace. |
| storage_account_id | string | yes | The resource ID of an existing Storage Account that will be used as the default datastore for the workspace. |
| identity | list(object({ identity_ids = set(string), type = string })) | yes | A block defining the managed identity configuration for the workspace, including the type of identity (SystemAssigned, UserAssigned, or both) and the IDs of any user-assigned identities. |
| container_registry_id | string | no | The resource ID of an existing Azure Container Registry to use for storing Docker images for custom environments and deployments. |
| description | string | no | A free-text description of the workspace. |
| friendly_name | string | no | A human-friendly display name for the workspace. |
| high_business_impact | bool | no | Whether the workspace is subject to high business impact requirements, enabling additional controls and logging for compliance. |
| image_build_compute_name | string | no | The name of the compute cluster to use for building Docker images when a Container Registry is attached. |
| kind | string | no | The kind or type of workspace to create, such as Default, FeatureStore, or Hub. |
| primary_user_assigned_identity | string | no | The resource ID of the primary user-assigned managed identity to use for the workspace when multiple user-assigned identities are configured. |
| public_access_behind_virtual_network_enabled | bool | no | Whether public network access is allowed when the workspace is behind a virtual network. |
| public_network_access_enabled | bool | no | Whether the workspace allows access from public networks or restricts access to private endpoints only. |
| sku_name | string | no | The SKU/pricing tier of the workspace. |
| v1_legacy_mode_enabled | bool | no | Whether to enable v1 legacy mode for compatibility with older Azure Machine Learning SDK versions. |
| encryption | list(object({ key_id = string, key_vault_id = string, user_assigned_identity_id = string })) | no | A block configuring customer-managed key encryption for the workspace, including the Key Vault key ID and user-assigned identity for accessing the key. |
| feature_store | list(object({ computer_spark_runtime_version = string, offline_connection_name = string, online_connection_name = string })) | no | A block configuring the workspace as a feature store, including Spark runtime version and connection names for offline and online feature storage. |
| managed_network | list(object({ isolation_mode = string })) | no | A block defining the network isolation mode for the workspace's managed virtual network. |
| serverless_compute | list(object({ public_ip_enabled = bool, subnet_id = string })) | no | A block configuring serverless compute settings, including whether to enable public IP addresses and which subnet to use. |
| timeouts | object({ create = string, delete = string, read = string, update = string }) | no | A block allowing you to customize how long Terraform will wait for create, read, update, and delete operations to complete. |

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
