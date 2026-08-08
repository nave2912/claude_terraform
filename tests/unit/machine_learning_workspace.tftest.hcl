# Native `terraform test` (Terraform >= 1.6) unit tests for modules/machine_learning_workspace.
# AI-scaffolded — sample values are placeholders, review before relying on this test.
# Run with: terraform test tests/unit/machine_learning_workspace.tftest.hcl

variables {
  name                    = "azure-learning-dev"
  location                = "eastus"
  resource_group_name     = "azure-learning-dev"
  application_insights_id = "placeholder"
  key_vault_id            = "placeholder"
  storage_account_id      = "placeholder"
  identity = [{
    identity_ids = ["placeholder"]
    type         = "placeholder"
  }]
}

run "valid_machine_learning_workspace_plans_successfully" {
  command = plan

  module {
    source = "../../modules/machine_learning_workspace"
  }

  assert {
    condition     = azurerm_machine_learning_workspace.this.name == var.name
    error_message = "Resource name should match the input variable."
  }
}

run "invalid_name_fails_validation" {
  command = plan

  module {
    source = "../../modules/machine_learning_workspace"
  }

  variables {
    name = "Invalid_Name-123"
  }

  expect_failures = [
    var.name,
  ]
}
