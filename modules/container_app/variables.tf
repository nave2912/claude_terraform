variable "name" {
  description = "Container App name."
  type        = string
}

variable "resource_group_name" {
  description = "Name of the parent resource group this Container App is deployed into."
  type        = string
}

variable "container_app_environment_id" {
  description = "Resource ID of the Container Apps environment this app runs in — see modules/container_app_environment."
  type        = string
}

variable "revision_mode" {
  description = "Single (one active revision at a time) or Multiple (manual traffic splitting)."
  type        = string
  default     = "Single"

  validation {
    condition     = contains(["Single", "Multiple"], var.revision_mode)
    error_message = "revision_mode must be \"Single\" or \"Multiple\"."
  }
}

variable "user_assigned_identity_ids" {
  description = "User-assigned managed identity resource IDs attached to this app — used to pull from a private registry and/or resolve Key Vault secret references. Empty list disables identity."
  type        = list(string)
  default     = []
}

variable "registry_server" {
  description = "Login server of the container registry to pull the image from (e.g. myregistry.azurecr.io). Null skips registry auth (e.g. a public image)."
  type        = string
  default     = null
}

variable "registry_identity_id" {
  description = "User-assigned identity resource ID used to authenticate to registry_server. Required if registry_server is set."
  type        = string
  default     = null
}

variable "secrets" {
  description = "Container App secrets. Each entry is either a Key Vault reference (key_vault_secret_id + identity) or a plain value — never hardcode real secret material here, pass it through a Key Vault reference instead."
  type = list(object({
    name                = string
    value               = optional(string)
    key_vault_secret_id = optional(string)
    identity            = optional(string)
  }))
  default = []
}

variable "min_replicas" {
  description = "Minimum replica count. 0 scales to zero when idle — no charge while idle, at the cost of a cold start on the next request."
  type        = number
  default     = 0
}

variable "max_replicas" {
  description = "Maximum replica count."
  type        = number
  default     = 1
}

variable "container_name" {
  description = "Name of the single container in this app's template."
  type        = string
}

variable "image" {
  description = "Full container image reference, e.g. myregistry.azurecr.io/myapp:latest."
  type        = string
}

variable "cpu" {
  description = "vCPU allocation. 0.25 is the smallest allowed Consumption-plan size."
  type        = number
  default     = 0.25
}

variable "memory" {
  description = "Memory allocation. Must pair with cpu per Azure's allowed combinations (0.25 vCPU -> 0.5Gi is the smallest)."
  type        = string
  default     = "0.5Gi"
}

variable "env" {
  description = "Container environment variables. Each entry sets either a plain value or references one of the secrets above via secret_name."
  type = list(object({
    name        = string
    value       = optional(string)
    secret_name = optional(string)
  }))
  default = []
}

variable "target_port" {
  description = "Port the container listens on."
  type        = number
}

variable "external_enabled" {
  description = "Whether ingress is reachable from the public internet."
  type        = bool
  default     = true
}

variable "transport" {
  description = "Ingress transport protocol."
  type        = string
  default     = "auto"
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
