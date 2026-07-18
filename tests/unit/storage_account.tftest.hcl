# Native `terraform test` (Terraform >= 1.6) unit tests for modules/storage_account.
# Run with: terraform test tests/unit/storage_account.tftest.hcl
# Uses the plan-only command so no real Azure credentials are required.

variables {
  name                = "stlearningdevgen2"
  location            = "eastus"
  resource_group_name = "azure-learning-dev"
  tags = {
    environment        = "dev"
    owner              = "platform-team"
    costCenter         = "CC-LEARN-001"
    application        = "azure-learning"
    dataClassification = "internal"
    developer          = "naveenkumar"
    purpose            = "website"
  }
}

run "valid_storage_account_plans_successfully" {
  command = plan

  module {
    source = "../../modules/storage_account"
  }

  assert {
    condition     = azurerm_storage_account.this.name == var.name
    error_message = "Storage account name should match the input variable."
  }

  assert {
    condition     = azurerm_storage_account.this.is_hns_enabled == true
    error_message = "is_hns_enabled must be true for a Gen2 storage account."
  }

  assert {
    condition     = azurerm_storage_account.this.account_kind == "StorageV2"
    error_message = "account_kind must be StorageV2 for a Gen2 storage account."
  }

  assert {
    condition     = length(azurerm_storage_account.this.static_website) == 1
    error_message = "Static website hosting must be enabled."
  }
}

run "invalid_name_fails_validation" {
  command = plan

  module {
    source = "../../modules/storage_account"
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
    source = "../../modules/storage_account"
  }

  variables {
    tags = {
      environment = "dev"
      owner       = "platform-team"
      # costCenter, application, dataClassification intentionally omitted
    }
  }

  expect_failures = [
    var.tags,
  ]
}
