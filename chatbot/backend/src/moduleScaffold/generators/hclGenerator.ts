import type { FieldSpec } from "../fieldExtraction.js";

/**
 * Emits the 5 Terraform files every module in this repo has
 * (main.tf/variables.tf/outputs.tf/versions.tf/README.md), following the
 * exact conventions in modules/_module_template and
 * modules/resource_group: `name`, `location`, `resource_group_name`, and
 * `tags` are always declared as the module-standard variables (naming
 * regex + 5-key tags validation, matching every hand-written module), never
 * taken as-is from the provider schema's own (unvalidated) attribute
 * definitions for those same names. Every other field is generated
 * generically from the provider schema. Pure function — no file I/O, no
 * git, easy to unit test against a captured provider-schema fixture.
 */

const STANDARD_VARIABLES: Record<string, string> = {
  name: `variable "name" {
  description = "Resource name, following the naming convention in docs/naming-convention.md."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*$", var.name))
    error_message = "Name must start with a lowercase letter and contain only lowercase letters, numbers, and hyphens."
  }
}`,
  location: `variable "location" {
  description = "Azure region."
  type        = string
}`,
  resource_group_name: `variable "resource_group_name" {
  description = "Name of the parent resource group this resource is deployed into."
  type        = string
}`,
  tags: `variable "tags" {
  description = "Mandatory tag set. Must include environment, owner, costCenter, application, dataClassification."
  type        = map(string)

  validation {
    condition = alltrue([
      for key in ["environment", "owner", "costCenter", "application", "dataClassification"] :
      contains(keys(var.tags), key)
    ])
    error_message = "tags must include environment, owner, costCenter, application, and dataClassification."
  }
}`,
};

const STANDARD_FIELD_ORDER = ["name", "location", "resource_group_name", "tags"];

function genericVariableBlock(field: FieldSpec): string {
  const descriptionLine = field.description
    ? `  description = ${JSON.stringify(field.description)}\n`
    : "";
  const defaultLine = field.required ? "" : "  default     = null\n";
  return `variable "${field.name}" {\n${descriptionLine}  type        = ${field.hclType}\n${defaultLine}}`;
}

function resourceArgumentLine(field: FieldSpec, indent: string): string {
  if (!field.nesting) {
    return `${indent}${field.name} = var.${field.name}`;
  }

  const inner = field.nestedFields ?? [];
  const contentLines = inner
    .map((f) => `${indent}    ${f.name} = ${field.name}.value.${f.name}`)
    .join("\n");

  // Uniform pattern for single/list/set nesting: normalize to a list so a
  // "single" nested block (0 or 1 occurrence) and a repeatable one both
  // use the same dynamic-block shape — a null single-block variable
  // simply produces zero blocks.
  const forEach =
    field.nesting === "single" ? `var.${field.name} == null ? [] : [var.${field.name}]` : `var.${field.name}`;

  return (
    `${indent}dynamic "${field.name}" {\n` +
    `${indent}  for_each = ${forEach}\n` +
    `${indent}  content {\n` +
    `${contentLines}\n` +
    `${indent}  }\n` +
    `${indent}}`
  );
}

export interface GeneratedModuleFiles {
  mainTf: string;
  variablesTf: string;
  outputsTf: string;
  versionsTf: string;
  readmeMd: string;
}

export interface GenerateModuleFilesParams {
  resourceType: string;
  moduleName: string;
  mandatoryFields: FieldSpec[];
  optionalFields: FieldSpec[];
  computedAttributes: string[];
  versionConstraint: string;
}

export function generateModuleFiles(params: GenerateModuleFilesParams): GeneratedModuleFiles {
  const { resourceType, moduleName, mandatoryFields, optionalFields, computedAttributes, versionConstraint } =
    params;

  const combined = [...mandatoryFields, ...optionalFields];
  const byName = new Map(combined.map((f) => [f.name, f]));

  // Every module in this repo declares these 4 variables regardless of
  // whether this particular resource type's own schema happens to expose
  // them (matches modules/_module_template's contract) — but they're only
  // wired into the actual resource block when the provider schema confirms
  // the resource supports that argument, so a resource type that genuinely
  // doesn't take e.g. `tags` never ends up with an invalid, unsupported
  // argument in main.tf.
  const supportedStandardFields = STANDARD_FIELD_ORDER.filter((n) => byName.has(n));
  const genericFields = combined.filter((f) => !STANDARD_FIELD_ORDER.includes(f.name));

  const mainTf =
    `resource "${resourceType}" "this" {\n` +
    [...supportedStandardFields.map((n) => `  ${n} = var.${n}`), ...genericFields.map((f) => resourceArgumentLine(f, "  "))].join(
      "\n"
    ) +
    `\n}\n`;

  const variablesTf =
    [...STANDARD_FIELD_ORDER.map((n) => STANDARD_VARIABLES[n]), ...genericFields.map(genericVariableBlock)].join(
      "\n\n"
    ) + "\n";

  const outputAttrs = ["id", ...computedAttributes.filter((a) => a !== "id")];
  const outputsTf =
    outputAttrs
      .map(
        (attr) =>
          `output "${attr}" {\n  description = "Computed ${attr} from the created resource."\n  value       = ${resourceType}.this.${attr}\n}`
      )
      .join("\n\n") + "\n";

  const versionsTf =
    `terraform {\n` +
    `  required_version = ">= 1.7.0, < 2.0.0"\n\n` +
    `  required_providers {\n` +
    `    azurerm = {\n` +
    `      source  = "hashicorp/azurerm"\n` +
    `      version = "${versionConstraint}"\n` +
    `    }\n` +
    `  }\n` +
    `}\n`;

  const standardInputsTable: Record<string, string> = {
    name: "| name | string | yes | Resource name (see naming-convention.md). |",
    location: "| location | string | yes | Azure region. |",
    resource_group_name: "| resource_group_name | string | yes | Parent resource group name. |",
    tags: "| tags | map(string) | yes | Mandatory tag set (environment, owner, costCenter, application, dataClassification). |",
  };
  const inputsTable = [
    ...STANDARD_FIELD_ORDER.map((n) => standardInputsTable[n]),
    ...genericFields.map(
      (f) => `| ${f.name} | ${f.hclType} | ${f.required ? "yes" : "no"} | ${f.description ?? ""} |`
    ),
  ].join("\n");

  const notSupportedNote = STANDARD_FIELD_ORDER.filter((n) => !supportedStandardFields.includes(n));

  const readmeMd =
    `# Module: ${moduleName}\n\n` +
    `**AI-scaffolded from \`${resourceType}\`'s own Terraform provider schema — ` +
    `verify against https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/${moduleName} ` +
    `before use.**\n\n` +
    `Wraps \`${resourceType}\`.\n\n` +
    `## Usage\n\n` +
    "```hcl\n" +
    `module "${moduleName}" {\n` +
    `  source = "../../modules/${moduleName}"\n\n` +
    `  providers = {\n` +
    `    azurerm = azurerm.<alias>\n` +
    `  }\n\n` +
    `  name = "<naming-convention-compliant-name>"\n` +
    `  tags = local.mandatory_tags\n` +
    `  # ... remaining fields, see Inputs below\n` +
    `}\n` +
    "```\n\n" +
    `## Inputs\n\n` +
    `| name | type | required | description |\n` +
    `|---|---|---|---|\n` +
    `${inputsTable}\n\n` +
    `## Outputs\n\n` +
    `| name | description |\n` +
    `|---|---|\n` +
    `${outputAttrs.map((attr) => `| ${attr} | Computed ${attr}. |`).join("\n")}\n\n` +
    `## Notes\n\n` +
    `- Add module-specific compliance notes here (encryption, private endpoint\n` +
    `  requirements, diagnostic settings, RBAC).\n` +
    `- Nested/dynamic blocks and optional-field defaults were generated ` +
    `mechanically from the provider schema — double-check they match real ` +
    `usage requirements before merging.\n` +
    (notSupportedNote.length
      ? `- \`${notSupportedNote.join("`, `")}\` ${notSupportedNote.length > 1 ? "are" : "is"} declared as ` +
        `module-standard variables but this resource type's own schema doesn't take ` +
        `${notSupportedNote.length > 1 ? "them" : "it"} as an argument, so ${notSupportedNote.length > 1 ? "they're" : "it's"} ` +
        `unused in main.tf (kept for interface consistency across modules).\n`
      : "");

  return { mainTf, variablesTf, outputsTf, versionsTf, readmeMd };
}
