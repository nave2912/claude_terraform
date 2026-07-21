# Native `terraform test` (Terraform >= 1.6) unit tests for modules/linux_virtual_machine.
# AI-scaffolded — sample values are placeholders, review before relying on this test.
# Run with: terraform test tests/unit/linux_virtual_machine.tftest.hcl

variables {
  name                  = "azure-learning-dev"
  location              = "eastus"
  resource_group_name   = "azure-learning-dev"
  admin_username        = "placeholder"
  network_interface_ids = ["placeholder"]
  size                  = "placeholder"
  os_disk = [{
    caching                          = "placeholder"
    disk_encryption_set_id           = "placeholder"
    disk_size_gb                     = 1
    name                             = "placeholder"
    secure_vm_disk_encryption_set_id = "placeholder"
    security_encryption_type         = "placeholder"
    storage_account_type             = "placeholder"
    write_accelerator_enabled        = true
    diff_disk_settings = [{
      option    = "placeholder"
      placement = "placeholder"
    }]
  }]
}

run "valid_linux_virtual_machine_plans_successfully" {
  command = plan

  module {
    source = "../../modules/linux_virtual_machine"
  }

  assert {
    condition     = azurerm_linux_virtual_machine.this.name == var.name
    error_message = "Resource name should match the input variable."
  }
}

run "invalid_name_fails_validation" {
  command = plan

  module {
    source = "../../modules/linux_virtual_machine"
  }

  variables {
    name = "Invalid_Name-123"
  }

  expect_failures = [
    var.name,
  ]
}
