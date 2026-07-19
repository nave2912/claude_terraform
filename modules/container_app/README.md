# Module: container_app

Creates a single `azurerm_container_app` running one container. Generic
enough to host any image — not chatbot-specific — via the `secrets`/`env`
object lists, so it can be reused (and eventually schema-driven) for any
future container workload, not just this repo's chatbot backend.

`min_replicas` defaults to `0` (scale to zero) and `cpu`/`memory` default
to the smallest allowed Consumption-plan size — the cost-effective default,
override only when a real workload needs more.

## Usage

```hcl
module "container_app" {
  source = "../../modules/container_app"

  name                          = "chatbot-backend"
  resource_group_name           = "azure-learning-dev"
  container_app_environment_id  = module.container_app_environment.id
  user_assigned_identity_ids    = [azurerm_user_assigned_identity.this.id]

  registry_server       = module.container_registry.login_server
  registry_identity_id  = azurerm_user_assigned_identity.this.id

  secrets = [
    {
      name                = "anthropic-api-key"
      key_vault_secret_id = azurerm_key_vault_secret.anthropic_api_key.id
      identity            = azurerm_user_assigned_identity.this.id
    },
  ]

  container_name = "chatbot-backend"
  image          = "${module.container_registry.login_server}/chatbot-backend:latest"
  target_port    = 3000

  env = [
    { name = "ANTHROPIC_API_KEY", secret_name = "anthropic-api-key" },
    { name = "PORT", value = "3000" },
  ]

  tags = {
    environment        = "dev"
    owner              = "platform-team"
    costCenter         = "CC-LEARN-001"
    application        = "azure-learning"
    dataClassification = "internal"
  }
}
```

## Inputs

| Name | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | yes | Container App name |
| `resource_group_name` | `string` | yes | Parent resource group name |
| `container_app_environment_id` | `string` | yes | See `modules/container_app_environment` |
| `revision_mode` | `string` | no | `Single` (default) or `Multiple` |
| `user_assigned_identity_ids` | `list(string)` | no | Identities attached for registry pull / Key Vault secret refs |
| `registry_server` | `string` | no | Registry login server; null skips registry auth |
| `registry_identity_id` | `string` | no | Identity used to authenticate to `registry_server` |
| `secrets` | `list(object)` | no | Each entry is a Key Vault reference or a plain value |
| `min_replicas` | `number` | no | Default `0` (scale to zero) |
| `max_replicas` | `number` | no | Default `1` |
| `container_name` | `string` | yes | Name of the container in the template |
| `image` | `string` | yes | Full image reference |
| `cpu` | `number` | no | Default `0.25` (smallest) |
| `memory` | `string` | no | Default `0.5Gi` (smallest, must pair with cpu) |
| `env` | `list(object)` | no | Env vars, plain value or `secret_name` reference |
| `target_port` | `number` | yes | Port the container listens on |
| `external_enabled` | `bool` | no | Default `true` |
| `transport` | `string` | no | Default `auto` |
| `tags` | `map(string)` | yes | Must include `environment`, `owner`, `costCenter`, `application`, `dataClassification` |

## Outputs

| Name | Description |
|---|---|
| `id` | Container App resource ID |
| `name` | Container App name |
| `latest_revision_fqdn` | Public FQDN of the latest revision |

## Notes

- This module never grants RBAC itself (no `AcrPull`/`Key Vault Secrets
  User` role assignments) — the caller creates those against
  `user_assigned_identity_ids`' principal, scoped to whatever registry/vault
  it needs access to, and should `depends_on` them from this module's call
  site so Terraform sequences role propagation before the app's first
  revision tries to use them.
