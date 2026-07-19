variable "environment" {
  description = "Environment name. Must match the environment folder and the models/<environment> directory."
  type        = string

  validation {
    condition     = var.environment == "dev"
    error_message = "environments/dev must be deployed with environment = \"dev\"."
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

# --- Chatbot hosting infra ---

variable "chatbot_anthropic_api_key" {
  description = "Claude API key, written into the chatbot's Key Vault. Supply via TF_VAR_chatbot_anthropic_api_key — never hardcode."
  type        = string
  sensitive   = true
}

variable "chatbot_github_token" {
  description = "GitHub token (fine-grained PAT or GitHub App installation token) the chatbot backend uses to open/merge PRs. Needs contents:write + pull_requests:write on this repo only. Supply via TF_VAR_chatbot_github_token — never hardcode."
  type        = string
  sensitive   = true
}

variable "chatbot_github_repo" {
  description = "owner/repo of this GitHub repository, used by the chatbot backend container's entrypoint to clone it at startup."
  type        = string
  default     = "nave2912/claude_terraform"
}

variable "chatbot_key_vault_name" {
  description = "Name of the Key Vault holding the chatbot's secrets. Must be globally unique, 3-24 chars."
  type        = string
  default     = "kv-chatbot-naveenk"
}

variable "chatbot_container_registry_name" {
  description = "Name of the Azure Container Registry for the chatbot backend image. Must be globally unique, alphanumeric only, 5-50 chars."
  type        = string
  default     = "chatbotacrnaveenkumar"
}

variable "chatbot_container_app_name" {
  description = "Name of the Container App running the chatbot backend."
  type        = string
  default     = "chatbot-backend"
}

variable "chatbot_container_image_tag" {
  description = "Tag of the chatbot-backend image in ACR to deploy. Update this (via CI) after pushing a new image; Terraform does not build or push images itself."
  type        = string
  default     = "latest"
}

variable "chatbot_static_web_app_name" {
  description = "Name of the Azure Static Web App hosting the chatbot frontend."
  type        = string
  default     = "naveenkumar"
}

# Azure Static Web Apps is only offered in a handful of regions — the
# "primary" resource group's region (eastus) is not one of them, so this is
# deliberately separate rather than a mistake.
variable "chatbot_static_web_app_location" {
  description = "Azure region for the Static Web App. Must be one of the regions SWA is actually offered in (eastus2, centralus, westus2, westeurope, eastasia)."
  type        = string
  default     = "eastus2"

  validation {
    condition     = contains(["eastus2", "centralus", "westus2", "westeurope", "eastasia"], var.chatbot_static_web_app_location)
    error_message = "chatbot_static_web_app_location must be a region Azure Static Web Apps actually supports."
  }
}

variable "chatbot_tags" {
  description = "Tags applied to the chatbot's own hosting resources."
  type        = map(string)
  default = {
    environment        = "dev"
    owner              = "platform-team"
    costCenter         = "CC-LEARN-001"
    application        = "terraform-chatbot"
    dataClassification = "confidential"
  }
}
