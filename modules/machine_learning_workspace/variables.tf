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
  description = "The fully-qualified resource ID of the Application Insights instance used to monitor the workspace and collect telemetry data."
  type        = string
}

variable "key_vault_id" {
  description = "The fully-qualified resource ID of the Key Vault used to store secrets, certificates, and keys for the workspace."
  type        = string
}

variable "storage_account_id" {
  description = "The fully-qualified resource ID of the Storage Account used as the default storage for the workspace."
  type        = string
}

variable "identity" {
  description = "A list block configuring the managed identity for the workspace. Specifies the identity type (SystemAssigned, UserAssigned, or both) and any user-assigned identity IDs."
  type        = list(object({ identity_ids = set(string), type = string }))
}

variable "container_registry_id" {
  description = "The fully-qualified resource ID of an Azure Container Registry to associate with the workspace for storing Docker images used in training and deployment."
  type        = string
  default     = null
}

variable "description" {
  description = "A free-text description of the Machine Learning workspace for documentation purposes."
  type        = string
  default     = null
}

variable "friendly_name" {
  description = "A human-friendly display name for the workspace shown in the Azure Machine Learning studio and portal."
  type        = string
  default     = null
}

variable "high_business_impact" {
  description = "Whether the workspace is subject to high business impact requirements, which enables additional data protection and compliance features."
  type        = bool
  default     = null
}

variable "image_build_compute_name" {
  description = "The name of the compute cluster to use for building Docker images. If not specified, images are built using Azure Container Instances."
  type        = string
  default     = null
}

variable "kind" {
  description = "The kind of Machine Learning workspace to create. Determines the feature set and capabilities available."
  type        = string
  default     = null
}

variable "primary_user_assigned_identity" {
  description = "The fully-qualified resource ID of the user-assigned managed identity to use as the primary identity for the workspace when multiple identities are configured."
  type        = string
  default     = null
}

variable "public_access_behind_virtual_network_enabled" {
  description = "Whether to allow public network access to the workspace when it is configured behind a virtual network. Deprecated in favor of public_network_access_enabled."
  type        = bool
  default     = null
}

variable "public_network_access_enabled" {
  description = "Whether to allow public network access to the workspace. When false, the workspace can only be accessed through private endpoints."
  type        = bool
  default     = null
}

variable "sku_name" {
  description = "The SKU/pricing tier for the workspace. Determines the capabilities and capacity available."
  type        = string
  default     = null
}

variable "v1_legacy_mode_enabled" {
  description = "Whether to enable v1 legacy mode for backward compatibility with older Machine Learning SDK versions and features."
  type        = bool
  default     = null
}

variable "encryption" {
  description = "A list block configuring customer-managed encryption for the workspace. Specifies the Key Vault key ID, Key Vault ID, and user-assigned identity for encryption operations."
  type        = list(object({ key_id = string, key_vault_id = string, user_assigned_identity_id = string }))
  default     = null
}

variable "feature_store" {
  description = "A list block configuring the workspace as a feature store. Specifies the Spark runtime version, offline connection name, and online connection name for feature management."
  type        = list(object({ computer_spark_runtime_version = string, offline_connection_name = string, online_connection_name = string }))
  default     = null
}

variable "managed_network" {
  description = "A list block configuring the managed virtual network isolation for the workspace. Specifies the isolation mode for network security."
  type        = list(object({ isolation_mode = string }))
  default     = null
}

variable "serverless_compute" {
  description = "A list block configuring serverless compute settings for the workspace. Specifies whether public IP is enabled and the subnet ID for serverless compute instances."
  type        = list(object({ public_ip_enabled = bool, subnet_id = string }))
  default     = null
}

variable "timeouts" {
  description = "A single block specifying custom timeout durations for create, read, update, and delete operations on the workspace resource."
  type        = object({ create = string, delete = string, read = string, update = string })
  default     = null
}
