# Native `terraform test` (Terraform >= 1.6) unit tests for modules/api_management.
# AI-scaffolded — sample values are placeholders, review before relying on this test.
# Run with: terraform test tests/unit/api_management.tftest.hcl

variables {
  name                = "azure-learning-dev"
  location            = "eastus"
  resource_group_name = "azure-learning-dev"
  publisher_email     = "placeholder"
  publisher_name      = "placeholder"
  sku_name            = "placeholder"
}

run "valid_api_management_plans_successfully" {
  command = plan

  module {
    source = "../../modules/api_management"
  }

  assert {
    condition     = azurerm_api_management.this.name == var.name
    error_message = "Resource name should match the input variable."
  }
}

run "invalid_name_fails_validation" {
  command = plan

  module {
    source = "../../modules/api_management"
  }

  variables {
    name = "Invalid_Name-123"
  }

  expect_failures = [
    var.name,
  ]
}
