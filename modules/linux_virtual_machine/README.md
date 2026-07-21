# Module: linux_virtual_machine

**AI-scaffolded from `azurerm_linux_virtual_machine`'s own Terraform provider schema — verify against https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine before use.**

Wraps `azurerm_linux_virtual_machine`.

## Usage

```hcl
module "linux_virtual_machine" {
  source = "../../modules/linux_virtual_machine"

  providers = {
    azurerm = azurerm.<alias>
  }

  name = "<naming-convention-compliant-name>"
  tags = local.mandatory_tags
  # ... remaining fields, see Inputs below
}
```

## Inputs

| name | type | required | description |
|---|---|---|---|
| name | string | yes | Resource name (see naming-convention.md). |
| location | string | yes | Azure region. |
| resource_group_name | string | yes | Parent resource group name. |
| tags | map(string) | yes | Mandatory tag set (environment, owner, costCenter, application, dataClassification). |
| admin_username | string | yes |  |
| network_interface_ids | list(string) | yes |  |
| size | string | yes |  |
| os_disk | list(object({ caching = string, disk_encryption_set_id = string, disk_size_gb = number, name = string, secure_vm_disk_encryption_set_id = string, security_encryption_type = string, storage_account_type = string, write_accelerator_enabled = bool, diff_disk_settings = list(object({ option = string, placement = string })) })) | yes |  |
| admin_password | string | no |  |
| allow_extension_operations | bool | no |  |
| availability_set_id | string | no |  |
| bypass_platform_safety_checks_on_user_schedule_enabled | bool | no |  |
| capacity_reservation_group_id | string | no |  |
| computer_name | string | no |  |
| custom_data | string | no |  |
| dedicated_host_group_id | string | no |  |
| dedicated_host_id | string | no |  |
| disable_password_authentication | bool | no |  |
| disk_controller_type | string | no |  |
| edge_zone | string | no |  |
| encryption_at_host_enabled | bool | no |  |
| eviction_policy | string | no |  |
| extensions_time_budget | string | no |  |
| license_type | string | no |  |
| max_bid_price | number | no |  |
| patch_assessment_mode | string | no |  |
| patch_mode | string | no |  |
| platform_fault_domain | number | no |  |
| priority | string | no |  |
| provision_vm_agent | bool | no |  |
| proximity_placement_group_id | string | no |  |
| reboot_setting | string | no |  |
| secure_boot_enabled | bool | no |  |
| source_image_id | string | no |  |
| user_data | string | no |  |
| virtual_machine_scale_set_id | string | no |  |
| vm_agent_platform_updates_enabled | bool | no |  |
| vtpm_enabled | bool | no |  |
| zone | string | no |  |
| additional_capabilities | list(object({ hibernation_enabled = bool, ultra_ssd_enabled = bool })) | no |  |
| admin_ssh_key | list(object({ public_key = string, username = string })) | no |  |
| boot_diagnostics | list(object({ storage_account_uri = string })) | no |  |
| gallery_application | list(object({ automatic_upgrade_enabled = bool, configuration_blob_uri = string, order = number, tag = string, treat_failure_as_deployment_failure_enabled = bool, version_id = string })) | no |  |
| identity | list(object({ identity_ids = set(string), type = string })) | no |  |
| os_image_notification | list(object({ timeout = string })) | no |  |
| plan | list(object({ name = string, product = string, publisher = string })) | no |  |
| secret | list(object({ key_vault_id = string, certificate = list(object({ url = string })) })) | no |  |
| source_image_reference | list(object({ offer = string, publisher = string, sku = string, version = string })) | no |  |
| termination_notification | list(object({ enabled = bool, timeout = string })) | no |  |
| timeouts | object({ create = string, delete = string, read = string, update = string }) | no |  |

## Outputs

| name | description |
|---|---|
| id | Computed id. |
| private_ip_address | Computed private_ip_address. |
| private_ip_addresses | Computed private_ip_addresses. |
| public_ip_address | Computed public_ip_address. |
| public_ip_addresses | Computed public_ip_addresses. |
| virtual_machine_id | Computed virtual_machine_id. |

## Notes

- Add module-specific compliance notes here (encryption, private endpoint
  requirements, diagnostic settings, RBAC).
- Nested/dynamic blocks and optional-field defaults were generated mechanically from the provider schema — double-check they match real usage requirements before merging.
