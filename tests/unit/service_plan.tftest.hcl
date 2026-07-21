# Native `terraform test` (Terraform >= 1.6) unit tests for modules/service_plan.
# AI-scaffolded — sample values are placeholders, review before relying on this test.
# Run with: terraform test tests/unit/service_plan.tftest.hcl

variables {
  name                = "azure-learning-dev"
  location            = "eastus"
  resource_group_name = "azure-learning-dev"
  os_type             = "placeholder"
  sku_name            = "placeholder"
}

run "valid_service_plan_plans_successfully" {
  command = plan

  module {
    source = "../../modules/service_plan"
  }

  assert {
    condition     = azurerm_service_plan.this.name == var.name
    error_message = "Resource name should match the input variable."
  }
}

run "invalid_name_fails_validation" {
  command = plan

  module {
    source = "../../modules/service_plan"
  }

  variables {
    name = "Invalid_Name-123"
  }

  expect_failures = [
    var.name,
  ]
}
