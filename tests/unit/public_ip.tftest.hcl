# Native `terraform test` (Terraform >= 1.6) unit tests for modules/public_ip.
# AI-scaffolded — sample values are placeholders, review before relying on this test.
# Run with: terraform test tests/unit/public_ip.tftest.hcl

variables {
  name                = "azure-learning-dev"
  location            = "eastus"
  resource_group_name = "azure-learning-dev"
  allocation_method   = "placeholder"
}

run "valid_public_ip_plans_successfully" {
  command = plan

  module {
    source = "../../modules/public_ip"
  }

  assert {
    condition     = azurerm_public_ip.this.name == var.name
    error_message = "Resource name should match the input variable."
  }
}

run "invalid_name_fails_validation" {
  command = plan

  module {
    source = "../../modules/public_ip"
  }

  variables {
    name = "Invalid_Name-123"
  }

  expect_failures = [
    var.name,
  ]
}
