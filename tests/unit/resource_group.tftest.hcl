# Native `terraform test` (Terraform >= 1.6) unit tests for modules/resource_group.
# Run with: terraform test tests/unit/resource_group.tftest.hcl
# Uses the mock/plan-only command so no real Azure credentials are required.

variables {
  name     = "azure-learning-dev"
  location = "eastus"
  tags = {
    environment        = "dev"
    owner              = "platform-team"
    costCenter         = "CC-LEARN-001"
    application        = "azure-learning"
    dataClassification = "internal"
  }
}

run "valid_resource_group_plans_successfully" {
  command = plan

  module {
    source = "../../modules/resource_group"
  }

  assert {
    condition     = azurerm_resource_group.this.name == var.name
    error_message = "Resource group name should match the input variable."
  }

  assert {
    condition     = length(azurerm_management_lock.this) == 0
    error_message = "No lock should be created when lock_level is null."
  }
}

run "invalid_name_fails_validation" {
  command = plan

  module {
    source = "../../modules/resource_group"
  }

  variables {
    name = "Invalid_Name-123"
  }

  expect_failures = [
    var.name,
  ]
}

run "missing_mandatory_tag_fails_validation" {
  command = plan

  module {
    source = "../../modules/resource_group"
  }

  variables {
    tags = {
      environment = "dev"
      owner       = "network-team"
      # costCenter, application, dataClassification intentionally omitted
    }
  }

  expect_failures = [
    var.tags,
  ]
}

run "lock_level_creates_management_lock" {
  command = plan

  module {
    source = "../../modules/resource_group"
  }

  variables {
    lock_level = "CanNotDelete"
  }

  assert {
    condition     = length(azurerm_management_lock.this) == 1
    error_message = "A management lock should be created when lock_level is set."
  }
}
