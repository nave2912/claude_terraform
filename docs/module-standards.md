# Module Standards

Every module under `modules/` must follow this structure (see
`modules/_module_template` and the reference implementation
`modules/resource_group`):

## Required files

| File | Purpose |
|---|---|
| `versions.tf` | Pinned `required_version` and `required_providers` (upper-bounded, e.g. `>= 3.90.0, < 4.0.0`) |
| `variables.tf` | All inputs, typed, with `description` and `validation` blocks where the JSON schema also constrains the value |
| `main.tf` | Resource definitions only — no provider blocks, no backend config |
| `outputs.tf` | All values downstream modules/environments may need |
| `README.md` | Usage example + inputs/outputs tables (generate with `scripts/generate-docs.sh`) |

## Rules

1. **No provider selection inside a module.** Modules receive whichever
   `azurerm` alias the caller passes via `providers = {}`. This is what
   makes a single module reusable across the network/security/application
   subscriptions.
2. **No hardcoded values.** Names, locations, tags, SKUs — all inputs.
3. **Tags are mandatory** and validated the same way in every module
   (`environment`, `owner`, `costCenter`, `application`, `dataClassification`).
4. **Naming validated via regex** matching `docs/naming-convention.md`.
5. **No data sources that assume a specific subscription** — if a module
   needs to look up something by ID, pass the ID in as a variable.
6. **Version pinning** — provider version constraints use a floor and a
   ceiling (`>= x, < y`) so a `terraform init -upgrade` can't silently pull
   in a breaking major version.
7. **One resource concern per module.** Compose modules together in
   `environments/<env>/main.tf` rather than building monolithic modules.
