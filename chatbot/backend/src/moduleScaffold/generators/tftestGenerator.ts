import type { FieldSpec } from "../fieldExtraction.js";

/**
 * Emits tests/unit/<module_name>.tftest.hcl, following
 * tests/unit/resource_group.tftest.hcl's shape: a plan-only "valid config"
 * run plus (when the resource type supports tags/name) a
 * missing-mandatory-tag / mismatched-name failure run. Sample values are
 * placeholders derived mechanically from each field's type — a reviewer
 * should replace them with realistic values for this specific resource.
 */

const STANDARD_FIELD_ORDER = ["name", "location", "resource_group_name", "tags"];

const STANDARD_TAGS_SAMPLE = `{
    environment        = "dev"
    owner              = "platform-team"
    costCenter         = "CC-LEARN-001"
    application        = "azure-learning"
    dataClassification = "internal"
  }`;

function sampleValueHcl(field: FieldSpec, indent: string): string {
  if (field.nesting) {
    const inner = (field.nestedFields ?? [])
      .map((nf) => `${indent}  ${nf.name} = ${sampleValueHcl(nf, `${indent}  `)}`)
      .join("\n");
    const obj = `{\n${inner}\n${indent}}`;
    return field.nesting === "single" ? obj : `[${obj}]`;
  }
  if (field.hclType === "string") return '"placeholder"';
  if (field.hclType === "number") return "1";
  if (field.hclType === "bool") return "true";
  if (/^(list|set)\(/.test(field.hclType)) return '["placeholder"]';
  if (/^map\(/.test(field.hclType)) return '{ key = "value" }';
  return "{}";
}

export interface GenerateTfTestFileParams {
  moduleName: string;
  resourceType: string;
  mandatoryFields: FieldSpec[];
}

export function generateTfTestFile(params: GenerateTfTestFileParams): string {
  const { moduleName, resourceType, mandatoryFields } = params;
  const byName = new Map(mandatoryFields.map((f) => [f.name, f]));
  const supportsName = byName.has("name");
  const supportsLocation = byName.has("location");
  const supportsResourceGroupName = byName.has("resource_group_name");
  const supportsTags = byName.has("tags");

  const genericMandatory = mandatoryFields.filter((f) => !STANDARD_FIELD_ORDER.includes(f.name));

  const variableLines: string[] = [];
  if (supportsName) variableLines.push(`  name = "azure-learning-dev"`);
  if (supportsLocation) variableLines.push(`  location = "eastus"`);
  if (supportsResourceGroupName) variableLines.push(`  resource_group_name = "azure-learning-dev"`);
  if (supportsTags) variableLines.push(`  tags = ${STANDARD_TAGS_SAMPLE}`);
  for (const field of genericMandatory) {
    variableLines.push(`  ${field.name} = ${sampleValueHcl(field, "  ")}`);
  }

  const validAsserts: string[] = [];
  if (supportsName) {
    validAsserts.push(`  assert {
    condition     = ${resourceType}.this.name == var.name
    error_message = "Resource name should match the input variable."
  }`);
  }

  let content =
    `# Native \`terraform test\` (Terraform >= 1.6) unit tests for modules/${moduleName}.\n` +
    `# AI-scaffolded — sample values are placeholders, review before relying on this test.\n` +
    `# Run with: terraform test tests/unit/${moduleName}.tftest.hcl\n\n` +
    `variables {\n${variableLines.join("\n")}\n}\n\n` +
    `run "valid_${moduleName}_plans_successfully" {\n` +
    `  command = plan\n\n` +
    `  module {\n` +
    `    source = "../../modules/${moduleName}"\n` +
    `  }\n` +
    (validAsserts.length ? `\n${validAsserts.join("\n\n")}\n` : "\n") +
    `}\n`;

  if (supportsTags) {
    content +=
      `\nrun "missing_mandatory_tag_fails_validation" {\n` +
      `  command = plan\n\n` +
      `  module {\n` +
      `    source = "../../modules/${moduleName}"\n` +
      `  }\n\n` +
      `  variables {\n` +
      `    tags = {\n` +
      `      environment = "dev"\n` +
      `      owner       = "platform-team"\n` +
      `      # costCenter, application, dataClassification intentionally omitted\n` +
      `    }\n` +
      `  }\n\n` +
      `  expect_failures = [\n` +
      `    var.tags,\n` +
      `  ]\n` +
      `}\n`;
  }

  if (supportsName) {
    content +=
      `\nrun "invalid_name_fails_validation" {\n` +
      `  command = plan\n\n` +
      `  module {\n` +
      `    source = "../../modules/${moduleName}"\n` +
      `  }\n\n` +
      `  variables {\n` +
      `    name = "Invalid_Name-123"\n` +
      `  }\n\n` +
      `  expect_failures = [\n` +
      `    var.name,\n` +
      `  ]\n` +
      `}\n`;
  }

  return content;
}
