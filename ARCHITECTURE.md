# Architecture Design Document

## 1. Purpose

This repository is an Azure Terraform framework for the **AzureLearning**
subscription. It is **configuration-driven**: infrastructure intent lives in
JSON models, and Terraform modules are the only place that knows how to turn
that intent into Azure resources. The scope of actual resource
implementation in this drop is deliberately narrow — **one empty Resource
Group per environment (dev/qa/prod), all in a single subscription** — but
the surrounding structure (modules, environments, policies, pipelines,
tests) still follows landing-zone conventions so it scales cleanly if a
second subscription or more resource types are added later.

## 2. Design Principles

| Principle | How it's applied |
|---|---|
| Intent vs. implementation | `models/**/*.json` = intent (data only). `modules/**` = implementation (HCL only). Root `environments/**` glue the two together with `jsondecode()`. |
| No hardcoding | Subscription ID and environment values are never literals in `.tf` files. They come from `terraform.tfvars`, `backend.hcl`, or CI variable groups / pipeline secrets. |
| Reusability | Every resource type is a self-contained module with `variables.tf` / `main.tf` / `outputs.tf` / `versions.tf` / `README.md`. Modules never reference environment or subscription concepts directly — they receive everything as inputs. |
| Single subscription today, multi-subscription ready | `environments/<env>/providers.tf` declares one `azurerm` provider today. If a second subscription is added later, this becomes aliased `azurerm` provider blocks (see §5) without touching module code. |
| Environment isolation | `environments/dev|qa|prod` each have their own state, backend config, and tfvars. No shared mutable state between environments. |
| Compliance-first | Mandatory tag schema enforced at the JSON-schema level and via Azure Policy assignment. Pipelines run `terraform validate`, `tflint`, `tfsec`, and `checkov` as required gates before any plan/apply. |
| Testability | `tests/unit` uses native `terraform test` (`.tftest.hcl`) against modules in isolation. `tests/policy` validates JSON models against JSON Schema before they're ever fed to Terraform. |

## 3. Repository Structure

```
.
├── models/                  # JSON-driven infrastructure intent (source of truth for "what")
│   ├── schema/               # JSON Schema — validates every model file
│   └── <env>/                 # one JSON file per environment (dev/qa/prod)
├── modules/                 # Reusable Terraform modules (source of truth for "how")
│   ├── resource_group/       # implemented
│   └── _module_template/     # pattern to copy for the next module
├── environments/            # Root modules — one per environment (dev/qa/prod)
│   └── <env>/
│       ├── backend.hcl        # partial remote-state backend config (no secrets)
│       ├── providers.tf       # single azurerm provider (AzureLearning subscription)
│       ├── main.tf            # jsondecode() -> for_each -> module calls
│       ├── variables.tf
│       ├── terraform.tfvars   # non-secret environment values
│       └── outputs.tf
├── policies/                # Azure Policy definitions/assignments + naming & tagging standard
├── pipelines/                # CI/CD: Azure DevOps + GitHub Actions
├── tests/                    # terraform test, policy/schema tests, integration tests
├── scripts/                  # bootstrap + local validation helpers
└── docs/                     # module standards, naming convention, JSON model guide
```

## 4. Data Flow

```
models/dev/resource-group.json
        │  (jsondecode)
        ▼
environments/dev/main.tf
        │  for_each over decoded map, keyed by resource id
        ▼
module "resource_group" { }
        │
        ▼
azurerm_resource_group  (only resource actually created in this scope)
```

## 5. Provider Pattern (single subscription today)

```hcl
provider "azurerm" {
  subscription_id = var.subscription_id
  features {}
}
```

All three environments (dev/qa/prod) deploy into the same `AzureLearning`
subscription; only `var.subscription_id` and the model/tfvars differ per
environment. If a second subscription is introduced later, add aliased
`azurerm` provider blocks here (one per subscription) and pass the matching
alias into each module call via `providers = { azurerm = azurerm.<alias> }`
— the module itself never selects a provider, so no module code changes.

## 6. Naming & Tagging

Enforced two ways:
1. **Shape** — `models/schema/resource-group.schema.json` requires `name`,
   `location`, and a `tags` object containing the mandatory keys
   (`environment`, `owner`, `costCenter`, `application`, `dataClassification`).
2. **Policy** — `policies/azure-policy/definitions/require-mandatory-tags.json`
   denies resource-group creation if mandatory tags are missing, as a backstop
   for anything created outside this pipeline.

Naming convention is documented in `docs/naming-convention.md` and mirrored
by `local.naming` computed conventions in each environment root.

## 7. State & Backend

One Storage Account + container, one blob key per environment
(`dev/terraform.tfstate`, `qa/terraform.tfstate`, `prod/terraform.tfstate`).
Backend config is **partial** in code (`backend.hcl`) and completed at
`terraform init -backend-config=backend.hcl` time, sourced from a CI secure
variable group so no account keys or subscription IDs sit in git.

## 8. Compliance Gates (pipeline-enforced)

1. `terraform fmt -check`
2. `terraform validate`
3. `tflint` (`.tflint.hcl` — azurerm ruleset enabled)
4. `tfsec` (fails build on HIGH/CRITICAL)
5. `checkov` (`.checkov.yaml` — framework: terraform)
6. `terraform plan` (reviewed) → manual approval gate → `terraform apply`

## 9. Missing Enterprise Practices — Flagged Before Implementation

These are intentionally **not** built in this pass because they need an
explicit decision or are out of the stated scope (resource-group only).
Listed so they're not silently forgotten:

1. **CI authentication model undecided** — OIDC workload identity federation
   (recommended, no stored secrets) vs. long-lived service principal secret.
   Pipelines are stubbed for OIDC but need tenant/app registration details.
2. **No Key Vault module yet** for secrets referenced by future modules
   (only resource-group is implemented today).
3. **Policy assignment resources not wired** — `azurerm_policy_definition` /
   `azurerm_policy_assignment` HCL is left as a TODO module; only the JSON
   policy definitions themselves are included under `policies/`.
4. **No budget/cost-management module.**
5. **Single subscription assumed** — the moment a second subscription (or a
   real network/security/application split) is needed, revisit §5 to
   reintroduce aliased providers; module code needs no changes, only
   `providers.tf` and the model layout.

## 10. Adding a New Module (pattern)

1. Copy `modules/_module_template` to `modules/<resource_name>`.
2. Implement `main.tf` / `variables.tf` / `outputs.tf`, pin provider version
   in `versions.tf`.
3. Add the resource's shape to a new JSON Schema under `models/schema/`.
4. Add example entries to `models/<env>/*.json`.
5. Add a `module` block (with `for_each`) in each `environments/<env>/main.tf`.
6. Add a `.tftest.hcl` under `tests/unit/`.
