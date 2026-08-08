# Module: public_ip

**AI-scaffolded from `azurerm_public_ip`'s own Terraform provider schema — verify against https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/public_ip before use.**

Wraps `azurerm_public_ip`.

## Usage

```hcl
module "public_ip" {
  source = "../../modules/public_ip"

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
| allocation_method | string | yes | Defines how the public IP address is assigned. Use 'Static' for a permanent IP address that doesn't change, or 'Dynamic' for an IP address that is assigned when the resource is started and may change when stopped. |
| ddos_protection_mode | string | no | The DDoS protection mode for the public IP. Controls the level of distributed denial-of-service attack protection applied to this IP address. |
| ddos_protection_plan_id | string | no | The resource ID of an Azure DDoS Protection Plan to associate with this public IP address for enhanced DDoS protection. |
| domain_name_label | string | no | An optional DNS label that creates a fully qualified domain name (FQDN) for the public IP in the format: label.region.cloudapp.azure.com. |
| edge_zone | string | no | Specifies the Edge Zone within the Azure region where this public IP should be created, for scenarios requiring edge computing capabilities. |
| idle_timeout_in_minutes | number | no | The timeout in minutes for idle TCP connections. Determines how long a TCP connection can remain idle before being closed. |
| ip_tags | map(string) | no | A map of IP tags to associate with the public IP address, used for routing or categorization purposes (e.g., routing preferences or service tags). |
| ip_version | string | no | The IP version to use for the public IP address. Typically 'IPv4' or 'IPv6'. |
| public_ip_prefix_id | string | no | The resource ID of a public IP prefix from which to allocate this public IP address, useful for allocating IPs from a predefined range. |
| reverse_fqdn | string | no | The reverse fully qualified domain name (reverse DNS) associated with this public IP address for reverse DNS lookup scenarios. |
| sku | string | no | The SKU (pricing/performance tier) of the public IP address, such as 'Basic' or 'Standard', which affects features and availability guarantees. |
| sku_tier | string | no | The SKU tier for the public IP, such as 'Regional' or 'Global', which determines the scope and routing capabilities of the IP address. |
| zones | set(string) | no | A set of availability zones where the public IP address should be deployed for high availability (e.g., ['1', '2', '3']). |
| timeouts | object({ create = string, delete = string, read = string, update = string }) | no | Optional timeout configuration block that allows you to customize how long Terraform will wait for create, read, update, and delete operations to complete. |

## Outputs

| name | description |
|---|---|
| id | Computed id. |
| fqdn | Computed fqdn. |
| ip_address | Computed ip_address. |

## Notes

- Add module-specific compliance notes here (encryption, private endpoint
  requirements, diagnostic settings, RBAC).
- Nested/dynamic blocks and optional-field defaults were generated mechanically from the provider schema — double-check they match real usage requirements before merging.
