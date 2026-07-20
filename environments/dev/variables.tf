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
# Everything else (names, SKUs, sizes, tags) now comes from
# models/dev/{key-vault,container-registry,log-analytics-workspace,
# container-app-environment,container-app,static-web-app}.json — these two
# are the only chatbot-hosting inputs left as variables, since real secret
# material can't live in a committed JSON file.

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

variable "chatbot_backend_api_key" {
  description = "The x-api-key the chatbot backend requires on every authenticated request, and the frontend must send back. A fixed, caller-supplied value (not Terraform-generated) so it can be set once and rotated deliberately. Supply via TF_VAR_chatbot_backend_api_key — never hardcode."
  type        = string
  sensitive   = true
}

# A fixed date, not timestamp() — timestamp() re-evaluates on every plan and
# would perpetually show these two secrets as changed. Bump this (and
# rotate the actual secret values) roughly annually.
variable "chatbot_secret_expiration_date" {
  description = "Expiration date (RFC3339) set on the chatbot's Key Vault secrets. Update when rotating."
  type        = string
  default     = "2027-07-19T00:00:00Z"
}
