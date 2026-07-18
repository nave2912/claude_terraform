variable "environment" {
  description = "Environment name. Must match the environment folder and the models/<environment> directory."
  type        = string

  validation {
    condition     = var.environment == "qa"
    error_message = "environments/qa must be deployed with environment = \"qa\"."
  }
}

variable "subscription_id" {
  description = "Azure subscription ID (AzureLearning). Supplied via tfvars/CI, never hardcoded."
  type        = string
}

variable "default_lock_level" {
  description = "Default Azure Resource Lock level applied to resource groups in this environment. Null disables locking."
  type        = string
  default     = null
}
