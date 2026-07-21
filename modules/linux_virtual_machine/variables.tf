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
  type = string
}

variable "network_interface_ids" {
  type = list(string)
}

variable "size" {
  type = string
}

variable "os_disk" {
  type = list(object({ caching = string, disk_encryption_set_id = string, disk_size_gb = number, name = string, secure_vm_disk_encryption_set_id = string, security_encryption_type = string, storage_account_type = string, write_accelerator_enabled = bool, diff_disk_settings = list(object({ option = string, placement = string })) }))
}

variable "admin_password" {
  type    = string
  default = null
}

variable "allow_extension_operations" {
  type    = bool
  default = null
}

variable "availability_set_id" {
  type    = string
  default = null
}

variable "bypass_platform_safety_checks_on_user_schedule_enabled" {
  type    = bool
  default = null
}

variable "capacity_reservation_group_id" {
  type    = string
  default = null
}

variable "computer_name" {
  type    = string
  default = null
}

variable "custom_data" {
  type    = string
  default = null
}

variable "dedicated_host_group_id" {
  type    = string
  default = null
}

variable "dedicated_host_id" {
  type    = string
  default = null
}

variable "disable_password_authentication" {
  type    = bool
  default = null
}

variable "disk_controller_type" {
  type    = string
  default = null
}

variable "edge_zone" {
  type    = string
  default = null
}

variable "encryption_at_host_enabled" {
  type    = bool
  default = null
}

variable "eviction_policy" {
  type    = string
  default = null
}

variable "extensions_time_budget" {
  type    = string
  default = null
}

variable "license_type" {
  type    = string
  default = null
}

variable "max_bid_price" {
  type    = number
  default = null
}

variable "patch_assessment_mode" {
  type    = string
  default = null
}

variable "patch_mode" {
  type    = string
  default = null
}

variable "platform_fault_domain" {
  type    = number
  default = null
}

variable "priority" {
  type    = string
  default = null
}

variable "provision_vm_agent" {
  type    = bool
  default = null
}

variable "proximity_placement_group_id" {
  type    = string
  default = null
}

variable "reboot_setting" {
  type    = string
  default = null
}

variable "secure_boot_enabled" {
  type    = bool
  default = null
}

variable "source_image_id" {
  type    = string
  default = null
}

variable "user_data" {
  type    = string
  default = null
}

variable "virtual_machine_scale_set_id" {
  type    = string
  default = null
}

variable "vm_agent_platform_updates_enabled" {
  type    = bool
  default = null
}

variable "vtpm_enabled" {
  type    = bool
  default = null
}

variable "zone" {
  type    = string
  default = null
}

variable "additional_capabilities" {
  type    = list(object({ hibernation_enabled = bool, ultra_ssd_enabled = bool }))
  default = null
}

variable "admin_ssh_key" {
  type    = list(object({ public_key = string, username = string }))
  default = null
}

variable "boot_diagnostics" {
  type    = list(object({ storage_account_uri = string }))
  default = null
}

variable "gallery_application" {
  type    = list(object({ automatic_upgrade_enabled = bool, configuration_blob_uri = string, order = number, tag = string, treat_failure_as_deployment_failure_enabled = bool, version_id = string }))
  default = null
}

variable "identity" {
  type    = list(object({ identity_ids = set(string), type = string }))
  default = null
}

variable "os_image_notification" {
  type    = list(object({ timeout = string }))
  default = null
}

variable "plan" {
  type    = list(object({ name = string, product = string, publisher = string }))
  default = null
}

variable "secret" {
  type    = list(object({ key_vault_id = string, certificate = list(object({ url = string })) }))
  default = null
}

variable "source_image_reference" {
  type    = list(object({ offer = string, publisher = string, sku = string, version = string }))
  default = null
}

variable "termination_notification" {
  type    = list(object({ enabled = bool, timeout = string }))
  default = null
}

variable "timeouts" {
  type    = object({ create = string, delete = string, read = string, update = string })
  default = null
}
