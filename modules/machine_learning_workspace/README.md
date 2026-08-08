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
| application_insights_id | string | yes | The fully-qualified resource ID of the Application Insights instance used to monitor the workspace and collect telemetry data. |
| key_vault_id | string | yes | The fully-qualified resource ID of the Key Vault used to store secrets, certificates, and keys for the workspace. |
| storage_account_id | string | yes | The fully-qualified resource ID of the Storage Account used as the default storage for the workspace. |
| identity | list(object({ identity_ids = set(string), type = string })) | yes | A list block configuring the managed identity for the workspace. Specifies the identity type (SystemAssigned, UserAssigned, or both) and any user-assigned identity IDs. |
| container_registry_id | string | no | The fully-qualified resource ID of an Azure Container Registry to associate with the workspace for storing Docker images used in training and deployment. |
| description | string | no | A free-text description of the Machine Learning workspace for documentation purposes. |
| friendly_name | string | no | A human-friendly display name for the workspace shown in the Azure Machine Learning studio and portal. |
| high_business_impact | bool | no | Whether the workspace is subject to high business impact requirements, which enables additional data protection and compliance features. |
| image_build_compute_name | string | no | The name of the compute cluster to use for building Docker images. If not specified, images are built using Azure Container Instances. |
| kind | string | no | The kind of Machine Learning workspace to create. Determines the feature set and capabilities available. |
| primary_user_assigned_identity | string | no | The fully-qualified resource ID of the user-assigned managed identity to use as the primary identity for the workspace when multiple identities are configured. |
| public_access_behind_virtual_network_enabled | bool | no | Whether to allow public network access to the workspace when it is configured behind a virtual network. Deprecated in favor of public_network_access_enabled. |
| public_network_access_enabled | bool | no | Whether to allow public network access to the workspace. When false, the workspace can only be accessed through private endpoints. |
| sku_name | string | no | The SKU/pricing tier for the workspace. Determines the capabilities and capacity available. |
| v1_legacy_mode_enabled | bool | no | Whether to enable v1 legacy mode for backward compatibility with older Machine Learning SDK versions and features. |
| encryption | list(object({ key_id = string, key_vault_id = string, user_assigned_identity_id = string })) | no | A list block configuring customer-managed encryption for the workspace. Specifies the Key Vault key ID, Key Vault ID, and user-assigned identity for encryption operations. |
| feature_store | list(object({ computer_spark_runtime_version = string, offline_connection_name = string, online_connection_name = string })) | no | A list block configuring the workspace as a feature store. Specifies the Spark runtime version, offline connection name, and online connection name for feature management. |
| managed_network | list(object({ isolation_mode = string })) | no | A list block configuring the managed virtual network isolation for the workspace. Specifies the isolation mode for network security. |
| serverless_compute | list(object({ public_ip_enabled = bool, subnet_id = string })) | no | A list block configuring serverless compute settings for the workspace. Specifies whether public IP is enabled and the subnet ID for serverless compute instances. |
| timeouts | object({ create = string, delete = string, read = string, update = string }) | no | A single block specifying custom timeout durations for create, read, update, and delete operations on the workspace resource. |

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
