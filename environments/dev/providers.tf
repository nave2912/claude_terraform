terraform {
  required_version = ">= 1.7.0, < 2.0.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = ">= 3.90.0, < 4.0.0"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.5.0, < 4.0.0"
    }
    time = {
      source  = "hashicorp/time"
      version = ">= 0.11.0, < 1.0.0"
    }
  }

  backend "azurerm" {
    # Completed via -backend-config=environments/dev/backend.hcl at init time.
  }
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

  # Required so data-plane operations (e.g. modules/storage_account's
  # static_website block) authenticate via Azure AD instead of a storage
  # account key — matches shared_access_key_enabled = false on that resource.
  storage_use_azuread = true
}
