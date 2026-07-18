# Backend configuration for the qa state storage account.
# storage_account_name and subscription_id are not secrets (no credentials),
# so they're safe to keep here. Authentication to this storage account and
# to the AzureLearning subscription itself still comes from the SPN
# credentials (client_id/client_secret/tenant_id), which are NEVER put in
# this file — supply them via TF_VAR_client_secret / ARM_CLIENT_SECRET env
# vars at init/plan/apply time instead.
#
# Run:
#   terraform init -backend-config=backend.hcl

resource_group_name = "terraform"
storage_account_name = "devadlsgen20718"
subscription_id = "ddb1480e-2e58-49d2-9299-ed15ac4d8d88"
container_name      = "tfstate"
key                  = "qa/terraform.tfstate"
use_azuread_auth     = true
