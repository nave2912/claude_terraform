# Naming & Tagging Standard

## Naming Convention

```
<workload>-<environment>
```

| Component | Rule |
|---|---|
| `workload` | Short lowercase workload identifier, no spaces or underscores, e.g. `azure-learning`. |
| `environment` | One of `dev`, `qa`, `prod`. |

Example: `azure-learning-dev`

Enforced by:
- `models/schema/resource-group.schema.json` (`"pattern": "^[a-z][a-z0-9-]*$"`)
- `variable "name"` `validation` block in `modules/resource_group/variables.tf`

## Mandatory Tags

Every resource must carry these tags. No resource is created by this
framework without them — enforced at three layers (defense in depth):

1. JSON Schema (`models/schema/*.schema.json`) — required at model-authoring time.
2. Terraform module `variable` validation — required at plan time.
3. Azure Policy `require-mandatory-tags` — required at ARM-deployment time,
   catching anything created outside this pipeline.

| Tag | Purpose | Example |
|---|---|---|
| `environment` | Environment classification | `dev`, `qa`, `prod` |
| `owner` | Team or individual accountable for the resource | `platform-team` |
| `costCenter` | Chargeback/showback code | `CC-LEARN-001` |
| `application` | Logical application/workload name | `azure-learning` |
| `dataClassification` | Sensitivity classification | `public`, `internal`, `confidential`, `restricted` |

## Subscription

Single subscription (`AzureLearning`) hosts all three environments. Each
environment (`dev`, `qa`, `prod`) gets one resource group:

| Environment | Resource group |
|---|---|
| dev | `azure-learning-dev` |
| qa | `azure-learning-qa` |
| prod | `azure-learning-prod` |
