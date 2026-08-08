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

variable "allocation_method" {
  description = "Defines how the public IP address is assigned. Use 'Static' for a permanent IP address that doesn't change, or 'Dynamic' for an IP address that is assigned when the resource is started and may change when stopped."
  type        = string
}

variable "ddos_protection_mode" {
  description = "The DDoS protection mode for the public IP. Controls the level of distributed denial-of-service attack protection applied to this IP address."
  type        = string
  default     = null
}

variable "ddos_protection_plan_id" {
  description = "The resource ID of an Azure DDoS Protection Plan to associate with this public IP address for enhanced DDoS protection."
  type        = string
  default     = null
}

variable "domain_name_label" {
  description = "An optional DNS label that creates a fully qualified domain name (FQDN) for the public IP in the format: label.region.cloudapp.azure.com."
  type        = string
  default     = null
}

variable "edge_zone" {
  description = "Specifies the Edge Zone within the Azure region where this public IP should be created, for scenarios requiring edge computing capabilities."
  type        = string
  default     = null
}

variable "idle_timeout_in_minutes" {
  description = "The timeout in minutes for idle TCP connections. Determines how long a TCP connection can remain idle before being closed."
  type        = number
  default     = null
}

variable "ip_tags" {
  description = "A map of IP tags to associate with the public IP address, used for routing or categorization purposes (e.g., routing preferences or service tags)."
  type        = map(string)
  default     = null
}

variable "ip_version" {
  description = "The IP version to use for the public IP address. Typically 'IPv4' or 'IPv6'."
  type        = string
  default     = null
}

variable "public_ip_prefix_id" {
  description = "The resource ID of a public IP prefix from which to allocate this public IP address, useful for allocating IPs from a predefined range."
  type        = string
  default     = null
}

variable "reverse_fqdn" {
  description = "The reverse fully qualified domain name (reverse DNS) associated with this public IP address for reverse DNS lookup scenarios."
  type        = string
  default     = null
}

variable "sku" {
  description = "The SKU (pricing/performance tier) of the public IP address, such as 'Basic' or 'Standard', which affects features and availability guarantees."
  type        = string
  default     = null
}

variable "sku_tier" {
  description = "The SKU tier for the public IP, such as 'Regional' or 'Global', which determines the scope and routing capabilities of the IP address."
  type        = string
  default     = null
}

variable "zones" {
  description = "A set of availability zones where the public IP address should be deployed for high availability (e.g., ['1', '2', '3'])."
  type        = set(string)
  default     = null
}

variable "timeouts" {
  description = "Optional timeout configuration block that allows you to customize how long Terraform will wait for create, read, update, and delete operations to complete."
  type        = object({ create = string, delete = string, read = string, update = string })
  default     = null
}
