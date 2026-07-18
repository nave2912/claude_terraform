# Azure Terraform Framework — AzureLearning

JSON-driven Azure Terraform framework for the **AzureLearning** subscription.
Infrastructure intent lives in `models/**.json`; Terraform modules are the
only place that knows how to turn that intent into resources.

> **Scope of this drop:** one empty resource group per environment
> (`azure-learning-dev`, `azure-learning-qa`, `azure-learning-prod`), all in
> the single AzureLearning subscription, plus a storage account module. Every
> other folder (policies, pipelines, tests) still follows landing-zone
> conventions so it scales cleanly if more resource types or subscriptions
> are added later. See [ARCHITECTURE.md](ARCHITECTURE.md) for the full
> design rationale and a list of enterprise practices deliberately deferred
> pending scope decisions.

## Structure

| Folder | Purpose |
|---|---|
| [`models/`](models/) | JSON-driven infrastructure intent + JSON Schema contracts |
| [`modules/`](modules/) | Reusable Terraform modules (`resource_group`, `storage_account` implemented; `_module_template` is the pattern for the next one) |
| [`environments/`](environments/) | Root modules per environment (dev/qa/prod) — provider, backend, `jsondecode()` wiring |
| [`policies/`](policies/) | Naming/tagging standard + Azure Policy definitions and assignments |
| [`pipelines/`](pipelines/) | Azure DevOps and GitHub Actions CI/CD definitions |
| [`tests/`](tests/) | `terraform test` unit tests, JSON model schema validation, integration test scaffold |
| [`scripts/`](scripts/) | Backend bootstrap, local validation, doc generation |
| [`docs/`](docs/) | Module standards, naming convention, JSON model guide |
| [`chatbot/`](chatbot/) | Conversational front-end that proposes model changes via PR — see its own README |

## Quick start

```bash
# One-time, per environment, by a human with subscription Owner:
./scripts/bootstrap-backend.sh dev <AzureLearning-subscription-id> eastus

# Local validation (fmt, JSON schema, validate, tflint, tfsec, checkov, tests):
./scripts/validate.sh dev

# Deploy:
cd environments/dev
terraform init -backend-config=backend.hcl
export TF_VAR_subscription_id=<AzureLearning-subscription-id>
terraform plan  -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars
```

Repeat for `environments/qa` and `environments/prod`.

## Adding a new resource type

See [docs/module-standards.md](docs/module-standards.md) and
[docs/json-model-guide.md](docs/json-model-guide.md), or follow
ARCHITECTURE.md §10.

## Compliance tooling

`terraform validate`, `tflint` (`.tflint.hcl`), `tfsec` (`tfsec.yml`), and
`checkov` (`.checkov.yaml`) are all wired into both pipeline definitions and
`scripts/validate.sh` for local use.
