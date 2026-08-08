# Native `terraform test` (Terraform >= 1.6) unit tests for modules/redis_cache.
# AI-scaffolded — sample values are placeholders, review before relying on this test.
# Run with: terraform test tests/unit/redis_cache.tftest.hcl

variables {
  name                = "azure-learning-dev"
  location            = "eastus"
  resource_group_name = "azure-learning-dev"
  capacity            = 1
  family              = "placeholder"
  sku_name            = "placeholder"
}

run "valid_redis_cache_plans_successfully" {
  command = plan

  module {
    source = "../../modules/redis_cache"
  }

  assert {
    condition     = azurerm_redis_cache.this.name == var.name
    error_message = "Resource name should match the input variable."
  }
}

run "invalid_name_fails_validation" {
  command = plan

  module {
    source = "../../modules/redis_cache"
  }

  variables {
    name = "Invalid_Name-123"
  }

  expect_failures = [
    var.name,
  ]
}
