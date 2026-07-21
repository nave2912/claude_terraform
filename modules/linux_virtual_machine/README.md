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
| admin_username | string | yes | The username for the local administrator account on the Linux VM, used for SSH access. |
| network_interface_ids | list(string) | yes | A list of network interface IDs to attach to the virtual machine. The first ID in the list will be the primary network interface. |
| size | string | yes | The SKU size of the virtual machine, such as 'Standard_DS1_v2' or 'Standard_B2s', which determines CPU, memory, and performance characteristics. |
| os_disk | list(object({ caching = string, disk_encryption_set_id = string, disk_size_gb = number, name = string, secure_vm_disk_encryption_set_id = string, security_encryption_type = string, storage_account_type = string, write_accelerator_enabled = bool, diff_disk_settings = list(object({ option = string, placement = string })) })) | yes | Configuration block for the operating system disk attached to the VM, including caching behavior, encryption settings, disk size, storage type, and optional differential disk settings. |
| admin_password | string | no | The password for the administrator account. Required when disable_password_authentication is false. |
| allow_extension_operations | bool | no | Whether to allow extension operations on the virtual machine. Defaults to true. |
| availability_set_id | string | no | The ID of the availability set in which to place the virtual machine for high availability. |
| bypass_platform_safety_checks_on_user_schedule_enabled | bool | no | Whether to bypass platform safety checks when scheduling user-initiated operations like reboots or updates. |
| capacity_reservation_group_id | string | no | The ID of the capacity reservation group to associate with this virtual machine. |
| computer_name | string | no | The hostname to assign to the virtual machine. If not specified, defaults to the VM name. |
| custom_data | string | no | Base64-encoded custom data (such as cloud-init scripts) to pass to the virtual machine at provisioning time. |
| dedicated_host_group_id | string | no | The ID of a dedicated host group where the virtual machine should be placed. |
| dedicated_host_id | string | no | The ID of a specific dedicated host where the virtual machine should be placed. |
| disable_password_authentication | bool | no | Whether to disable password authentication and require SSH key authentication only. Defaults to true. |
| disk_controller_type | string | no | The type of disk controller to use for the VM, such as 'SCSI' or 'NVMe'. |
| edge_zone | string | no | The edge zone within the Azure region where the virtual machine should be created. |
| encryption_at_host_enabled | bool | no | Whether to enable encryption at host, which encrypts all disks (including temp disks) attached to the VM. |
| eviction_policy | string | no | The eviction policy for spot virtual machines, either 'Deallocate' or 'Delete'. |
| extensions_time_budget | string | no | The maximum amount of time (in ISO 8601 duration format) to allow for VM extension provisioning. |
| license_type | string | no | The type of license to use for Azure Hybrid Benefit, such as 'RHEL_BYOS' or 'SLES_BYOS'. |
| max_bid_price | number | no | The maximum price you're willing to pay per hour for a spot VM instance. Use -1 to pay up to the standard VM price. |
| patch_assessment_mode | string | no | The mode for assessing patches on the VM, such as 'ImageDefault' or 'AutomaticByPlatform'. |
| patch_mode | string | no | The mode for patching the VM, such as 'ImageDefault', 'AutomaticByPlatform', or 'Manual'. |
| platform_fault_domain | number | no | The platform fault domain in which to place the virtual machine, used for specific placement requirements. |
| priority | string | no | The priority of the virtual machine: 'Regular' for standard VMs or 'Spot' for spot instances with lower cost but possible eviction. |
| provision_vm_agent | bool | no | Whether to provision the Azure VM Agent on the virtual machine. Defaults to true. |
| proximity_placement_group_id | string | no | The ID of a proximity placement group to co-locate this VM with other resources for lower network latency. |
| reboot_setting | string | no | The reboot behavior after patching operations, such as 'IfRequired', 'Never', or 'Always'. |
| secure_boot_enabled | bool | no | Whether to enable secure boot for the virtual machine (requires Generation 2 VM and trusted launch). |
| source_image_id | string | no | The ID of a custom image or shared image gallery image to use as the source for the VM. |
| user_data | string | no | Base64-encoded user data to pass to the virtual machine, available to the OS after provisioning. |
| virtual_machine_scale_set_id | string | no | The ID of a virtual machine scale set to which this VM should be associated. |
| vm_agent_platform_updates_enabled | bool | no | Whether to enable automatic platform updates for the Azure VM Agent. |
| vtpm_enabled | bool | no | Whether to enable virtual Trusted Platform Module (vTPM) for the virtual machine (requires Generation 2 VM and trusted launch). |
| zone | string | no | The availability zone (e.g., '1', '2', or '3') in which to create the virtual machine for zonal redundancy. |
| additional_capabilities | list(object({ hibernation_enabled = bool, ultra_ssd_enabled = bool })) | no | Configuration block for additional VM capabilities, such as enabling hibernation or ultra SSD support. |
| admin_ssh_key | list(object({ public_key = string, username = string })) | no | One or more SSH public key blocks to configure SSH key authentication for the admin user. |
| boot_diagnostics | list(object({ storage_account_uri = string })) | no | Configuration block for boot diagnostics, optionally specifying a storage account URI for storing diagnostic data. |
| gallery_application | list(object({ automatic_upgrade_enabled = bool, configuration_blob_uri = string, order = number, tag = string, treat_failure_as_deployment_failure_enabled = bool, version_id = string })) | no | One or more blocks defining VM applications from Azure Compute Gallery to install on the virtual machine. |
| identity | list(object({ identity_ids = set(string), type = string })) | no | Configuration block for managed identity, specifying the type (SystemAssigned, UserAssigned, or both) and user-assigned identity IDs. |
| os_image_notification | list(object({ timeout = string })) | no | Configuration block for OS image update notifications, specifying a timeout for how long to wait before applying updates. |
| plan | list(object({ name = string, product = string, publisher = string })) | no | Configuration block for marketplace image plan information, including the plan name, product, and publisher. |
| secret | list(object({ key_vault_id = string, certificate = list(object({ url = string })) })) | no | One or more blocks specifying Key Vault secrets (certificates) to install on the virtual machine, with the Key Vault ID and certificate URLs. |
| source_image_reference | list(object({ offer = string, publisher = string, sku = string, version = string })) | no | Configuration block specifying the marketplace image to use, including publisher, offer, SKU, and version. |
| termination_notification | list(object({ enabled = bool, timeout = string })) | no | Configuration block for scheduled event notifications before VM termination, including whether it's enabled and the timeout duration. |
| timeouts | object({ create = string, delete = string, read = string, update = string }) | no | Configuration block for customizing timeout durations for create, read, update, and delete operations. |

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
