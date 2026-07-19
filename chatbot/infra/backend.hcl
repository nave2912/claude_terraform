# Separate state file from environments/*, in the same state storage account.
# Run: terraform init -backend-config=backend.hcl

resource_group_name  = "terraform"
storage_account_name = "devadlsgen20718"
subscription_id       = "ddb1480e-2e58-49d2-9299-ed15ac4d8d88"
container_name        = "tfstate"
key                    = "chatbot-infra/terraform.tfstate"
use_azuread_auth       = true
