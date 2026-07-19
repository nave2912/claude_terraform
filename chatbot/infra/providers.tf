variable "subscription_id" {
  description = "Azure subscription ID this chatbot hosting infra deploys into."
  type        = string
}

variable "client_id" {
  description = "Service principal (app registration) client ID for SPN authentication. Falls back to ARM_CLIENT_ID env var when null."
  type        = string
  default     = null
}

variable "client_secret" {
  description = "Service principal client secret for SPN authentication. Falls back to ARM_CLIENT_SECRET env var when null. Never hardcode — supply via TF_VAR_client_secret or ARM_CLIENT_SECRET."
  type        = string
  default     = null
  sensitive   = true
}

variable "tenant_id" {
  description = "Azure AD tenant ID for SPN authentication. Falls back to ARM_TENANT_ID env var when null."
  type        = string
  default     = null
}

provider "azurerm" {
  subscription_id = var.subscription_id
  client_id       = var.client_id
  client_secret   = var.client_secret
  tenant_id       = var.tenant_id
  features {}
}
