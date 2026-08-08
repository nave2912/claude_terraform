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
  description = "The resource ID of the Application Insights instance used to monitor the workspace's activities and experiments."
  type        = string
}

variable "key_vault_id" {
  description = "The resource ID of the Azure Key Vault used to store secrets, keys, and certificates for the workspace."
  type        = string
}

variable "storage_account_id" {
  description = "The resource ID of the Azure Storage Account used for storing workspace data, artifacts, and model outputs."
  type        = string
}

variable "identity" {
  description = "A list block defining the managed identity configuration for the workspace. Specifies the identity type (SystemAssigned, UserAssigned, or both) and any user-assigned identity IDs."
  type        = list(object({ identity_ids = set(string), type = string }))
}

variable "container_registry_id" {
  description = "The resource ID of an Azure Container Registry to use for storing Docker images built for training and deployment."
  type        = string
  default     = null
}

variable "description" {
  description = "A free-text description of the workspace for documentation purposes."
  type        = string
  default     = null
}

variable "friendly_name" {
  description = "A user-friendly display name for the workspace shown in the Azure portal and ML Studio."
  type        = string
  default     = null
}

variable "high_business_impact" {
  description = "Whether the workspace handles high business impact data, which enables additional compliance and security features."
  type        = bool
  default     = null
}

variable "image_build_compute_name" {
  description = "The name of the compute target to use for building Docker images when a container registry is attached."
  type        = string
  default     = null
}

variable "kind" {
  description = "The kind of workspace to create, which determines available features and capabilities."
  type        = string
  default     = null
}

variable "primary_user_assigned_identity" {
  description = "The resource ID of the primary user-assigned managed identity for the workspace when using user-assigned identities."
  type        = string
  default     = null
}

variable "public_access_behind_virtual_network_enabled" {
  description = "Whether to allow public network access when the workspace is also behind a virtual network. When false, access is restricted to the virtual network only."
  type        = bool
  default     = false
}

variable "public_network_access_enabled" {
  description = "Whether public network access to the workspace is allowed. When false, the workspace is accessible only through private endpoints."
  type        = bool
  default     = false
}

variable "sku_name" {
  description = "The SKU/pricing tier for the workspace."
  type        = string
  default     = null
}

variable "v1_legacy_mode_enabled" {
  description = "Whether to enable v1 legacy mode for backward compatibility with older Azure ML SDK versions."
  type        = bool
  default     = null
}

variable "encryption" {
  description = "A list block configuring customer-managed key encryption for the workspace. Specifies the key ID, key vault ID, and the user-assigned identity used to access the key."
  type        = list(object({ key_id = string, key_vault_id = string, user_assigned_identity_id = string }))
  default     = null
}

variable "feature_store" {
  description = "A list block configuring the workspace as a feature store. Specifies the Spark runtime version and connection names for offline and online feature retrieval."
  type        = list(object({ computer_spark_runtime_version = string, offline_connection_name = string, online_connection_name = string }))
  default     = null
}

variable "managed_network" {
  description = "A list block defining the managed network isolation mode for the workspace, controlling network security boundaries."
  type        = list(object({ isolation_mode = string }))
  default     = null
}

variable "serverless_compute" {
  description = "A list block configuring serverless compute settings. Specifies whether public IPs are enabled and the subnet ID for serverless compute instances."
  type        = list(object({ public_ip_enabled = bool, subnet_id = string }))
  default     = null
}

variable "timeouts" {
  description = "A single nested block specifying custom timeout durations for create, read, update, and delete operations."
  type        = object({ create = string, delete = string, read = string, update = string })
  default     = null
}
