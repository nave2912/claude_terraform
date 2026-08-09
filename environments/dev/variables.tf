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
# container-app-environment,container-app}.json (both the frontend and
# backend Container Apps are entries in the latter) — these two are the
# only chatbot-hosting inputs left as variables, since real secret
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

# The chatbot backend's src/observability/* routes (Cost + Metrics tabs)
# need their own Azure Resource Manager credential — separate from the
# OIDC-federated identity that runs `terraform apply` itself, and separate
# from the AzureLearning subscription_id above (this is *which identity*
# calls Cost Management/Activity Log at runtime, not *which subscription*
# gets deployed into). Not Key-Vault-backed like anthropic_api_key/
# github_token above: those rely on being set once out-of-band and never
# touched again (ignore_changes = [value]), which needs `az keyvault
# secret set` access this pipeline doesn't assume. These four are plain
# Container App secrets instead, refreshed from CI on every apply — same
# treatment as chatbot_backend_api_key above.
variable "chatbot_azure_tenant_id" {
  description = "Entra ID tenant of the service principal the chatbot backend uses for read-only Azure Cost Management/Resource Manager calls. Supply via TF_VAR_chatbot_azure_tenant_id — never hardcode."
  type        = string
  sensitive   = true
}

variable "chatbot_azure_client_id" {
  description = "App (client) ID of the chatbot backend's Azure Resource Manager service principal. Supply via TF_VAR_chatbot_azure_client_id — never hardcode."
  type        = string
  sensitive   = true
}

variable "chatbot_azure_client_secret" {
  description = "Client secret of the chatbot backend's Azure Resource Manager service principal. Needs at least Reader plus Cost Management Reader on the target subscription. Supply via TF_VAR_chatbot_azure_client_secret — never hardcode."
  type        = string
  sensitive   = true
}

variable "chatbot_azure_subscription_id" {
  description = "Subscription the chatbot backend's Observability tabs report on. Usually the same value as subscription_id above, kept as its own variable since the two are conceptually independent (this is the service principal's target, not the deploy target). Supply via TF_VAR_chatbot_azure_subscription_id — never hardcode."
  type        = string
  sensitive   = true
}

# One shared username/password gating the home page's Infrastructure
# Management / Observability cards (see chatbot/frontend/src/proxy.ts +
# src/app/api/auth/*) — a single fixed credential, not per-user accounts.
variable "chatbot_app_login_username" {
  description = "Username required to unlock the chatbot frontend's workspace cards. Supply via TF_VAR_chatbot_app_login_username — never hardcode."
  type        = string
  sensitive   = true
}

variable "chatbot_app_login_password" {
  description = "Password required to unlock the chatbot frontend's workspace cards. Supply via TF_VAR_chatbot_app_login_password — never hardcode."
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
