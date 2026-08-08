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
  description = "The ID of the Application Insights instance associated with this workspace for monitoring and logging ML experiments and deployments."
  type        = string
}

variable "key_vault_id" {
  description = "The ID of the Azure Key Vault used to store secrets, keys, and certificates for the Machine Learning workspace."
  type        = string
}

variable "storage_account_id" {
  description = "The ID of the Azure Storage Account used for storing workspace data, datasets, and outputs."
  type        = string
}

variable "identity" {
  description = "A list block configuring the managed identity for the workspace. Specifies the identity type (e.g., 'SystemAssigned', 'UserAssigned') and, if using user-assigned identities, the set of identity IDs."
  type        = list(object({ identity_ids = set(string), type = string }))
}

variable "container_registry_id" {
  description = "The ID of an Azure Container Registry to associate with the workspace for storing Docker images used in ML training and deployment."
  type        = string
  default     = null
}

variable "description" {
  description = "A human-readable description providing additional context about the purpose or usage of this workspace."
  type        = string
  default     = null
}

variable "friendly_name" {
  description = "A user-friendly display name for the workspace that is easier to read than the resource name."
  type        = string
  default     = null
}

variable "high_business_impact" {
  description = "A boolean flag indicating whether this workspace contains high business impact data, which may enable additional compliance and security features."
  type        = bool
  default     = null
}

variable "image_build_compute_name" {
  description = "The name of the compute cluster to use for building Docker images for the workspace."
  type        = string
  default     = null
}

variable "kind" {
  description = "The kind or type of Machine Learning workspace to create, which determines the feature set available."
  type        = string
  default     = null
}

variable "primary_user_assigned_identity" {
  description = "The ID of the primary user-assigned managed identity to use for workspace operations when multiple user-assigned identities are configured."
  type        = string
  default     = null
}

variable "public_access_behind_virtual_network_enabled" {
  description = "A boolean flag that controls whether public network access is allowed when the workspace is behind a virtual network."
  type        = bool
  default     = null
}

variable "public_network_access_enabled" {
  description = "A boolean flag indicating whether the workspace is accessible from public networks or restricted to private networks only."
  type        = bool
  default     = null
}

variable "sku_name" {
  description = "The SKU (pricing tier) for the workspace, which determines the capabilities and cost structure."
  type        = string
  default     = null
}

variable "v1_legacy_mode_enabled" {
  description = "A boolean flag that enables v1 legacy mode for backward compatibility with older Machine Learning workspace features."
  type        = bool
  default     = null
}

variable "encryption" {
  description = "A list block configuring customer-managed encryption at rest. Specifies the encryption key ID, Key Vault ID, and user-assigned identity for accessing the encryption key."
  type        = list(object({ key_id = string, key_vault_id = string, user_assigned_identity_id = string }))
  default     = null
}

variable "feature_store" {
  description = "A list block configuring the feature store settings, including Spark runtime version and connection names for offline and online feature stores."
  type        = list(object({ computer_spark_runtime_version = string, offline_connection_name = string, online_connection_name = string }))
  default     = null
}

variable "managed_network" {
  description = "A list block configuring the managed virtual network for the workspace. Specifies the isolation mode for network security."
  type        = list(object({ isolation_mode = string }))
  default     = null
}

variable "serverless_compute" {
  description = "A list block configuring serverless compute options, including whether public IP is enabled and the subnet ID for compute resources."
  type        = list(object({ public_ip_enabled = bool, subnet_id = string }))
  default     = null
}

variable "timeouts" {
  description = "A single block specifying custom timeout durations for create, read, update, and delete operations on this resource."
  type        = object({ create = string, delete = string, read = string, update = string })
  default     = null
}
