# Integration Tests

Placeholder for tests that run `terraform apply` against a real (throwaway)
subscription/resource group and assert on actual Azure state, then
`terraform destroy`. Not implemented in this scope (resource-group only,
low risk) — recommended tooling: [Terratest](https://terratest.gruntwork.io/)
(Go) driving `environments/dev` with a dedicated sandbox subscription.

Suggested layout when implemented:

```
tests/integration/
├── go.mod
├── resource_group_test.go   # terraform.InitAndApply against a temp copy
│                             # of environments/dev, assert via azure-sdk-for-go,
│                             # then terraform.Destroy in a defer.
```

Do not point integration tests at `dev`/`test`/`prod` state directly — use a
disposable resource group/subscription scoped to CI only.
