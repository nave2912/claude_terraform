# Non-secret environment values only. subscription_id is injected via
# CI variable groups / TF_VAR_subscription_id, never committed here.

environment = "prod"

# subscription_id = "TF_VAR_subscription_id (set via env/CI) - AzureLearning subscription"

default_lock_level = "CanNotDelete"
