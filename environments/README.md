# Environments

Each subfolder is an independent Terraform root module / state file, one per
environment (`dev`, `qa`, `prod`), all deployed into the single
`AzureLearning` subscription. They are structurally identical; only
`variables.tf` defaults and `terraform.tfvars` differ.

## Usage

```bash
cd environments/dev

terraform init \
  -backend-config=backend.hcl \
  -backend-config="storage_account_name=$TF_BACKEND_SA" \
  -backend-config="subscription_id=$TF_BACKEND_SUBSCRIPTION_ID"

export TF_VAR_subscription_id=<AzureLearning subscription id>

terraform plan  -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars
```

The subscription ID is always supplied at runtime (env var, CI variable
group, or `-var`), never committed in `terraform.tfvars`.

## What each root module does

1. `providers.tf` — declares the `azurerm` provider (single subscription,
   no aliases) plus the `azurerm` remote state backend stanza (completed via
   `backend.hcl`).
2. `main.tf` — `jsondecode()`s `models/<env>/resource-group.json` and
   `for_each`s it into a `module "resource_group"` call.
3. `variables.tf` / `terraform.tfvars` — environment identity and the
   subscription ID; no resource-level values live here, those come from
   the JSON model.
4. `outputs.tf` — re-exposes resource group id/name/location for downstream
   consumption.
