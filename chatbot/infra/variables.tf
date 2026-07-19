variable "location" {
  description = "Azure region for the resource group, Key Vault, ACR, and Container Apps environment."
  type        = string
  default     = "eastus"
}

# Azure Static Web Apps is only offered in a handful of regions — "eastus"
# is not one of them, so this is deliberately separate from `location`
# rather than a mistake.
variable "static_web_app_location" {
  description = "Azure region for the Static Web App. Must be one of the regions SWA is actually offered in (eastus2, centralus, westus2, westeurope, eastasia)."
  type        = string
  default     = "eastus2"

  validation {
    condition     = contains(["eastus2", "centralus", "westus2", "westeurope", "eastasia"], var.static_web_app_location)
    error_message = "static_web_app_location must be a region Azure Static Web Apps actually supports."
  }
}

variable "resource_group_name" {
  description = "Name of the resource group holding the chatbot's own hosting infra. Deliberately separate from any AzureLearning workload resource group modeled via models/<env>/resource-group.json."
  type        = string
  default     = "chatbot-platform-rg"
}

variable "static_web_app_name" {
  description = "Name of the Azure Static Web App hosting the chatbot frontend."
  type        = string
  default     = "naveenkumar"
}

variable "container_registry_name" {
  description = "Name of the Azure Container Registry. Must be globally unique, alphanumeric only, 5-50 chars."
  type        = string
  default     = "chatbotacrnaveenkumar"

  validation {
    condition     = can(regex("^[a-zA-Z0-9]{5,50}$", var.container_registry_name))
    error_message = "container_registry_name must be 5-50 alphanumeric characters (no hyphens/underscores)."
  }
}

variable "key_vault_name" {
  description = "Name of the Key Vault holding the chatbot's secrets (Anthropic API key, GitHub token). Must be globally unique, 3-24 chars."
  type        = string
  default     = "kv-chatbot-naveenk"

  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9-]{1,22}[a-zA-Z0-9]$", var.key_vault_name))
    error_message = "key_vault_name must be 3-24 chars, start with a letter, alphanumeric and hyphens only."
  }
}

variable "container_app_name" {
  description = "Name of the Container App running the chatbot backend."
  type        = string
  default     = "chatbot-backend"
}

variable "container_image_tag" {
  description = "Tag of the chatbot-backend image in ACR to deploy. Update this (via CI) after pushing a new image; Terraform does not build or push images itself."
  type        = string
  default     = "latest"
}

variable "anthropic_api_key" {
  description = "Claude API key, written into Key Vault. Supply via TF_VAR_anthropic_api_key — never hardcode."
  type        = string
  sensitive   = true
}

variable "github_token" {
  description = "GitHub token (fine-grained PAT or GitHub App installation token) the backend uses to open/merge PRs. Needs contents:write + pull_requests:write on this repo only. Supply via TF_VAR_github_token — never hardcode."
  type        = string
  sensitive   = true
}

variable "github_repo" {
  description = "owner/repo of this GitHub repository, used by the container's entrypoint to clone it at startup."
  type        = string
  default     = "nave2912/claude_terraform"
}

variable "tags" {
  description = "Tags applied to all resources in this platform-tooling deployment."
  type        = map(string)
  default = {
    environment = "platform"
    owner       = "platform-team"
    application = "terraform-chatbot"
  }
}
