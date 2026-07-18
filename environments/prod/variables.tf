variable "environment" {
  description = "Environment name. Must match the environment folder and the models/<environment> directory."
  type        = string

  validation {
    condition     = var.environment == "prod"
    error_message = "environments/prod must be deployed with environment = \"prod\"."
  }
}

variable "subscription_id" {
  description = "Azure subscription ID (AzureLearning). Supplied via tfvars/CI, never hardcoded."
  type        = string
}

variable "default_lock_level" {
  description = "Default Azure Resource Lock level applied to resource groups in this environment. Prod defaults to CanNotDelete for drift/deletion protection; override only with change approval."
  type        = string
  default     = "CanNotDelete"
}
