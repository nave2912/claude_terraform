variable "name" {
  description = "Resource name, following the naming convention in docs/naming-convention.md."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*$", var.name))
    error_message = "Name must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens."
  }
}

variable "location" {
  description = "Azure region."
  type        = string
}

variable "resource_group_name" {
  description = "Name of the parent resource group this resource is deployed into."
  type        = string
}

variable "tags" {
  description = "Mandatory tag set. Must include environment, owner, costCenter, application, dataClassification."
  type        = map(string)

  validation {
    condition = alltrue([
      for key in ["environment", "owner", "costCenter", "application", "dataClassification"] :
      contains(keys(var.tags), key)
    ])
    error_message = "tags must include environment, owner, costCenter, application, and dataClassification."
  }
}

variable "application_insights_id" {
  description = "The resource ID of an existing Application Insights instance that will be used to monitor and log activities in the workspace."
  type        = string
}

variable "key_vault_id" {
  description = "The resource ID of an existing Key Vault that will store secrets, keys, and certificates for the workspace."
  type        = string
}

variable "storage_account_id" {
  description = "The resource ID of an existing Storage Account that will be used as the default datastore for the workspace."
  type        = string
}

variable "identity" {
  description = "A block defining the managed identity configuration for the workspace, including the type of identity (SystemAssigned, UserAssigned, or both) and the IDs of any user-assigned identities."
  type        = list(object({ identity_ids = set(string), type = string }))
}

variable "container_registry_id" {
  description = "The resource ID of an existing Azure Container Registry to use for storing Docker images for custom environments and deployments."
  type        = string
  default     = null
}

variable "description" {
  description = "A free-text description of the workspace."
  type        = string
  default     = null
}

variable "friendly_name" {
  description = "A human-friendly display name for the workspace."
  type        = string
  default     = null
}

variable "high_business_impact" {
  description = "Whether the workspace is subject to high business impact requirements, enabling additional controls and logging for compliance."
  type        = bool
  default     = null
}

variable "image_build_compute_name" {
  description = "The name of the compute cluster to use for building Docker images when a Container Registry is attached."
  type        = string
  default     = null
}

variable "kind" {
  description = "The kind or type of workspace to create, such as Default, FeatureStore, or Hub."
  type        = string
  default     = null
}

variable "primary_user_assigned_identity" {
  description = "The resource ID of the primary user-assigned managed identity to use for the workspace when multiple user-assigned identities are configured."
  type        = string
  default     = null
}

variable "public_access_behind_virtual_network_enabled" {
  description = "Whether public network access is allowed when the workspace is behind a virtual network."
  type        = bool
  default     = null
}

variable "public_network_access_enabled" {
  description = "Whether the workspace allows access from public networks or restricts access to private endpoints only."
  type        = bool
  default     = null
}

variable "sku_name" {
  description = "The SKU/pricing tier of the workspace."
  type        = string
  default     = null
}

variable "v1_legacy_mode_enabled" {
  description = "Whether to enable v1 legacy mode for compatibility with older Azure Machine Learning SDK versions."
  type        = bool
  default     = null
}

variable "encryption" {
  description = "A block configuring customer-managed key encryption for the workspace, including the Key Vault key ID and user-assigned identity for accessing the key."
  type        = list(object({ key_id = string, key_vault_id = string, user_assigned_identity_id = string }))
  default     = null
}

variable "feature_store" {
  description = "A block configuring the workspace as a feature store, including Spark runtime version and connection names for offline and online feature storage."
  type        = list(object({ computer_spark_runtime_version = string, offline_connection_name = string, online_connection_name = string }))
  default     = null
}

variable "managed_network" {
  description = "A block defining the network isolation mode for the workspace's managed virtual network."
  type        = list(object({ isolation_mode = string }))
  default     = null
}

variable "serverless_compute" {
  description = "A block configuring serverless compute settings, including whether to enable public IP addresses and which subnet to use."
  type        = list(object({ public_ip_enabled = bool, subnet_id = string }))
  default     = null
}

variable "timeouts" {
  description = "A block allowing you to customize how long Terraform will wait for create, read, update, and delete operations to complete."
  type        = object({ create = string, delete = string, read = string, update = string })
  default     = null
}
