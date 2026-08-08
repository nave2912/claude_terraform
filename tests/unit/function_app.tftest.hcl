# Native `terraform test` (Terraform >= 1.6) unit tests for modules/function_app.
# AI-scaffolded — sample values are placeholders, review before relying on this test.
# Run with: terraform test tests/unit/function_app.tftest.hcl

variables {
  name                       = "azure-learning-dev"
  location                   = "eastus"
  resource_group_name        = "azure-learning-dev"
  app_service_plan_id        = "placeholder"
  storage_account_access_key = "placeholder"
  storage_account_name       = "placeholder"
}

run "valid_function_app_plans_successfully" {
  command = plan

  module {
    source = "../../modules/function_app"
  }

  assert {
    condition     = azurerm_function_app.this.name == var.name
    error_message = "Resource name should match the input variable."
  }
}

run "invalid_name_fails_validation" {
  command = plan

  module {
    source = "../../modules/function_app"
  }

  variables {
    name = "Invalid_Name-123"
  }

  expect_failures = [
    var.name,
  ]
}
