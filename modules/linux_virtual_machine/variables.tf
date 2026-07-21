variable "name" {
  description = "Resource name, following the naming convention in docs/naming-convention.md."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*$", var.name))
    error_message = "Name must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens."
  }
}

variable "location" {
  description = "Azure region."
  type        = string
}

variable "resource_group_name" {
  description = "Name of the parent resource group this resource is deployed into."
  type        = string
}

variable "tags" {
  description = "Mandatory tag set. Must include environment, owner, costCenter, application, dataClassification."
  type        = map(string)

  validation {
    condition = alltrue([
      for key in ["environment", "owner", "costCenter", "application", "dataClassification"] :
      contains(keys(var.tags), key)
    ])
    error_message = "tags must include environment, owner, costCenter, application, and dataClassification."
  }
}

variable "admin_username" {
  description = "The username for the local administrator account on the Linux VM, used for SSH access."
  type        = string
}

variable "network_interface_ids" {
  description = "A list of network interface IDs to attach to the virtual machine. The first ID in the list will be the primary network interface."
  type        = list(string)
}

variable "size" {
  description = "The SKU size of the virtual machine, such as 'Standard_DS1_v2' or 'Standard_B2s', which determines CPU, memory, and performance characteristics."
  type        = string
}

variable "os_disk" {
  description = "Configuration block for the operating system disk attached to the VM, including caching behavior, encryption settings, disk size, storage type, and optional differential disk settings."
  type        = list(object({ caching = string, disk_encryption_set_id = string, disk_size_gb = number, name = string, secure_vm_disk_encryption_set_id = string, security_encryption_type = string, storage_account_type = string, write_accelerator_enabled = bool, diff_disk_settings = list(object({ option = string, placement = string })) }))
}

variable "admin_password" {
  description = "The password for the administrator account. Required when disable_password_authentication is false."
  type        = string
  default     = null
}

variable "allow_extension_operations" {
  description = "Whether to allow extension operations on the virtual machine. Defaults to true."
  type        = bool
  default     = null
}

variable "availability_set_id" {
  description = "The ID of the availability set in which to place the virtual machine for high availability."
  type        = string
  default     = null
}

variable "bypass_platform_safety_checks_on_user_schedule_enabled" {
  description = "Whether to bypass platform safety checks when scheduling user-initiated operations like reboots or updates."
  type        = bool
  default     = null
}

variable "capacity_reservation_group_id" {
  description = "The ID of the capacity reservation group to associate with this virtual machine."
  type        = string
  default     = null
}

variable "computer_name" {
  description = "The hostname to assign to the virtual machine. If not specified, defaults to the VM name."
  type        = string
  default     = null
}

variable "custom_data" {
  description = "Base64-encoded custom data (such as cloud-init scripts) to pass to the virtual machine at provisioning time."
  type        = string
  default     = null
}

variable "dedicated_host_group_id" {
  description = "The ID of a dedicated host group where the virtual machine should be placed."
  type        = string
  default     = null
}

variable "dedicated_host_id" {
  description = "The ID of a specific dedicated host where the virtual machine should be placed."
  type        = string
  default     = null
}

variable "disable_password_authentication" {
  description = "Whether to disable password authentication and require SSH key authentication only. Defaults to true."
  type        = bool
  default     = null
}

variable "disk_controller_type" {
  description = "The type of disk controller to use for the VM, such as 'SCSI' or 'NVMe'."
  type        = string
  default     = null
}

variable "edge_zone" {
  description = "The edge zone within the Azure region where the virtual machine should be created."
  type        = string
  default     = null
}

variable "encryption_at_host_enabled" {
  description = "Whether to enable encryption at host, which encrypts all disks (including temp disks) attached to the VM."
  type        = bool
  default     = null
}

variable "eviction_policy" {
  description = "The eviction policy for spot virtual machines, either 'Deallocate' or 'Delete'."
  type        = string
  default     = null
}

variable "extensions_time_budget" {
  description = "The maximum amount of time (in ISO 8601 duration format) to allow for VM extension provisioning."
  type        = string
  default     = null
}

variable "license_type" {
  description = "The type of license to use for Azure Hybrid Benefit, such as 'RHEL_BYOS' or 'SLES_BYOS'."
  type        = string
  default     = null
}

variable "max_bid_price" {
  description = "The maximum price you're willing to pay per hour for a spot VM instance. Use -1 to pay up to the standard VM price."
  type        = number
  default     = null
}

variable "patch_assessment_mode" {
  description = "The mode for assessing patches on the VM, such as 'ImageDefault' or 'AutomaticByPlatform'."
  type        = string
  default     = null
}

variable "patch_mode" {
  description = "The mode for patching the VM, such as 'ImageDefault', 'AutomaticByPlatform', or 'Manual'."
  type        = string
  default     = null
}

variable "platform_fault_domain" {
  description = "The platform fault domain in which to place the virtual machine, used for specific placement requirements."
  type        = number
  default     = null
}

variable "priority" {
  description = "The priority of the virtual machine: 'Regular' for standard VMs or 'Spot' for spot instances with lower cost but possible eviction."
  type        = string
  default     = null
}

variable "provision_vm_agent" {
  description = "Whether to provision the Azure VM Agent on the virtual machine. Defaults to true."
  type        = bool
  default     = null
}

variable "proximity_placement_group_id" {
  description = "The ID of a proximity placement group to co-locate this VM with other resources for lower network latency."
  type        = string
  default     = null
}

variable "reboot_setting" {
  description = "The reboot behavior after patching operations, such as 'IfRequired', 'Never', or 'Always'."
  type        = string
  default     = null
}

variable "secure_boot_enabled" {
  description = "Whether to enable secure boot for the virtual machine (requires Generation 2 VM and trusted launch)."
  type        = bool
  default     = null
}

variable "source_image_id" {
  description = "The ID of a custom image or shared image gallery image to use as the source for the VM."
  type        = string
  default     = null
}

variable "user_data" {
  description = "Base64-encoded user data to pass to the virtual machine, available to the OS after provisioning."
  type        = string
  default     = null
}

variable "virtual_machine_scale_set_id" {
  description = "The ID of a virtual machine scale set to which this VM should be associated."
  type        = string
  default     = null
}

variable "vm_agent_platform_updates_enabled" {
  description = "Whether to enable automatic platform updates for the Azure VM Agent."
  type        = bool
  default     = null
}

variable "vtpm_enabled" {
  description = "Whether to enable virtual Trusted Platform Module (vTPM) for the virtual machine (requires Generation 2 VM and trusted launch)."
  type        = bool
  default     = null
}

variable "zone" {
  description = "The availability zone (e.g., '1', '2', or '3') in which to create the virtual machine for zonal redundancy."
  type        = string
  default     = null
}

variable "additional_capabilities" {
  description = "Configuration block for additional VM capabilities, such as enabling hibernation or ultra SSD support."
  type        = list(object({ hibernation_enabled = bool, ultra_ssd_enabled = bool }))
  default     = null
}

variable "admin_ssh_key" {
  description = "One or more SSH public key blocks to configure SSH key authentication for the admin user."
  type        = list(object({ public_key = string, username = string }))
  default     = null
}

variable "boot_diagnostics" {
  description = "Configuration block for boot diagnostics, optionally specifying a storage account URI for storing diagnostic data."
  type        = list(object({ storage_account_uri = string }))
  default     = null
}

variable "gallery_application" {
  description = "One or more blocks defining VM applications from Azure Compute Gallery to install on the virtual machine."
  type        = list(object({ automatic_upgrade_enabled = bool, configuration_blob_uri = string, order = number, tag = string, treat_failure_as_deployment_failure_enabled = bool, version_id = string }))
  default     = null
}

variable "identity" {
  description = "Configuration block for managed identity, specifying the type (SystemAssigned, UserAssigned, or both) and user-assigned identity IDs."
  type        = list(object({ identity_ids = set(string), type = string }))
  default     = null
}

variable "os_image_notification" {
  description = "Configuration block for OS image update notifications, specifying a timeout for how long to wait before applying updates."
  type        = list(object({ timeout = string }))
  default     = null
}

variable "plan" {
  description = "Configuration block for marketplace image plan information, including the plan name, product, and publisher."
  type        = list(object({ name = string, product = string, publisher = string }))
  default     = null
}

variable "secret" {
  description = "One or more blocks specifying Key Vault secrets (certificates) to install on the virtual machine, with the Key Vault ID and certificate URLs."
  type        = list(object({ key_vault_id = string, certificate = list(object({ url = string })) }))
  default     = null
}

variable "source_image_reference" {
  description = "Configuration block specifying the marketplace image to use, including publisher, offer, SKU, and version."
  type        = list(object({ offer = string, publisher = string, sku = string, version = string }))
  default     = null
}

variable "termination_notification" {
  description = "Configuration block for scheduled event notifications before VM termination, including whether it's enabled and the timeout duration."
  type        = list(object({ enabled = bool, timeout = string }))
  default     = null
}

variable "timeouts" {
  description = "Configuration block for customizing timeout durations for create, read, update, and delete operations."
  type        = object({ create = string, delete = string, read = string, update = string })
  default     = null
}
