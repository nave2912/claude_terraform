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
| application_insights_id | string | yes | The ID of the Application Insights instance associated with this workspace for monitoring and logging ML experiments and deployments. |
| key_vault_id | string | yes | The ID of the Azure Key Vault used to store secrets, keys, and certificates for the Machine Learning workspace. |
| storage_account_id | string | yes | The ID of the Azure Storage Account used for storing workspace data, datasets, and outputs. |
| identity | list(object({ identity_ids = set(string), type = string })) | yes | A list block configuring the managed identity for the workspace. Specifies the identity type (e.g., 'SystemAssigned', 'UserAssigned') and, if using user-assigned identities, the set of identity IDs. |
| container_registry_id | string | no | The ID of an Azure Container Registry to associate with the workspace for storing Docker images used in ML training and deployment. |
| description | string | no | A human-readable description providing additional context about the purpose or usage of this workspace. |
| friendly_name | string | no | A user-friendly display name for the workspace that is easier to read than the resource name. |
| high_business_impact | bool | no | A boolean flag indicating whether this workspace contains high business impact data, which may enable additional compliance and security features. |
| image_build_compute_name | string | no | The name of the compute cluster to use for building Docker images for the workspace. |
| kind | string | no | The kind or type of Machine Learning workspace to create, which determines the feature set available. |
| primary_user_assigned_identity | string | no | The ID of the primary user-assigned managed identity to use for workspace operations when multiple user-assigned identities are configured. |
| public_access_behind_virtual_network_enabled | bool | no | A boolean flag that controls whether public network access is allowed when the workspace is behind a virtual network. |
| public_network_access_enabled | bool | no | A boolean flag indicating whether the workspace is accessible from public networks or restricted to private networks only. |
| sku_name | string | no | The SKU (pricing tier) for the workspace, which determines the capabilities and cost structure. |
| v1_legacy_mode_enabled | bool | no | A boolean flag that enables v1 legacy mode for backward compatibility with older Machine Learning workspace features. |
| encryption | list(object({ key_id = string, key_vault_id = string, user_assigned_identity_id = string })) | no | A list block configuring customer-managed encryption at rest. Specifies the encryption key ID, Key Vault ID, and user-assigned identity for accessing the encryption key. |
| feature_store | list(object({ computer_spark_runtime_version = string, offline_connection_name = string, online_connection_name = string })) | no | A list block configuring the feature store settings, including Spark runtime version and connection names for offline and online feature stores. |
| managed_network | list(object({ isolation_mode = string })) | no | A list block configuring the managed virtual network for the workspace. Specifies the isolation mode for network security. |
| serverless_compute | list(object({ public_ip_enabled = bool, subnet_id = string })) | no | A list block configuring serverless compute options, including whether public IP is enabled and the subnet ID for compute resources. |
| timeouts | object({ create = string, delete = string, read = string, update = string }) | no | A single block specifying custom timeout durations for create, read, update, and delete operations on this resource. |

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
