# Native `terraform test` (Terraform >= 1.6) unit tests for modules/application_insights.
# AI-scaffolded — sample values are placeholders, review before relying on this test.
# Run with: terraform test tests/unit/application_insights.tftest.hcl

variables {
  name                = "azure-learning-dev"
  location            = "eastus"
  resource_group_name = "azure-learning-dev"
  application_type    = "placeholder"
}

run "valid_application_insights_plans_successfully" {
  command = plan

  module {
    source = "../../modules/application_insights"
  }

  assert {
    condition     = azurerm_application_insights.this.name == var.name
    error_message = "Resource name should match the input variable."
  }
}

run "invalid_name_fails_validation" {
  command = plan

  module {
    source = "../../modules/application_insights"
  }

  variables {
    name = "Invalid_Name-123"
  }

  expect_failures = [
    var.name,
  ]
}
