# Module: <resource_name>

One-paragraph description of what this module creates and why.

## Usage

```hcl
module "<resource_name>" {
  source = "../../modules/<resource_name>"

  providers = {
    azurerm = azurerm.<alias>
  }

  name                 = "<naming-convention-compliant-name>"
  location             = "eastus"
  resource_group_name  = module.resource_group.name
  tags                 = local.mandatory_tags
}
```

## Inputs

| Name | Type | Required | Description |
|---|---|---|---|

## Outputs

| Name | Description |
|---|---|

## Notes

- Add module-specific compliance notes here (encryption, private endpoint
  requirements, diagnostic settings, RBAC).
