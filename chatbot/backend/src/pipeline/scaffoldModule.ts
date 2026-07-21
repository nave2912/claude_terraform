import path from "node:path";
import { Ajv } from "ajv";
import { REPO_ROOT, MODULES_DIR, schemaFilePath } from "../config/paths.js";
import { checkDenylist } from "../moduleScaffold/denylist.js";
import { getProviderSchema, getAzurermVersionConstraint } from "../moduleScaffold/providerSchema.js";
import { extractFields, extractComputedAttributes, type FieldSpec } from "../moduleScaffold/fieldExtraction.js";
import { generateModuleFiles } from "../moduleScaffold/generators/hclGenerator.js";
import { generateSchemaFile } from "../moduleScaffold/generators/jsonSchemaGenerator.js";
import { generateTfTestFile } from "../moduleScaffold/generators/tftestGenerator.js";
import { formatHcl } from "../moduleScaffold/terraformFmt.js";
import { deriveModuleName, pluralize, toHyphenated } from "../moduleScaffold/naming.js";
import {
  createChangeBranch,
  writeMultipleAndCommit,
  pushBranch,
  openPullRequest,
  returnToMain,
} from "../gitprovider/index.js";

export type ScaffoldOutcome =
  | { status: "denied"; resourceType: string; reason: string }
  | { status: "unknown_resource_type"; resourceType: string }
  | { status: "self_check_failed"; errors: string[] }
  | {
      status: "pr_opened";
      providerResourceType: string;
      moduleName: string;
      branch: string;
      prUrl: string;
      filesChanged: string[];
    }
  | {
      status: "pushed_no_pr";
      providerResourceType: string;
      moduleName: string;
      branch: string;
      compareUrl: string | null;
      filesChanged: string[];
    };

/**
 * Sanity-checks the generator's OWN output: builds a synthetic example
 * entry from the field list and validates it against the schema we just
 * generated, via a fresh Ajv instance — NOT the shared validators/index.ts
 * `validateEntry`, since that reads the schema registry once at process
 * startup and won't know about a schema file that doesn't exist on disk
 * yet. This still validates the same thing (does the generated schema
 * accept a plausible generated entry?) before anything is committed.
 */
function selfCheckSchema(
  schemaJson: string,
  containerKey: string,
  allFields: FieldSpec[]
): { valid: boolean; errors: string[] } {
  const schema = JSON.parse(schemaJson);
  const entrySchema = schema.properties[containerKey].additionalProperties;

  // The generated schema's own `required` list is NOT the same set as
  // `mandatoryFields` (provider-required): module-standard fields
  // (name/location/resource_group_name/tags) are always forced required by
  // this repo's convention regardless of whether the azurerm provider
  // itself treats them as optional (tags almost always is). Build the
  // sample entry from whatever the schema actually requires, looking up
  // each field's real type/nesting from the full extracted field list so
  // sampleValue still produces a well-typed value for it.
  const byName = new Map(allFields.map((f) => [f.name, f]));
  const requiredNames: string[] = entrySchema.required ?? [];

  const sampleEntry: Record<string, unknown> = {};
  for (const name of requiredNames) {
    const field = byName.get(name);
    if (field) sampleEntry[name] = sampleValue(field);
  }

  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(entrySchema);
  const valid = validate(sampleEntry) as boolean;
  return {
    valid,
    errors: valid ? [] : (validate.errors ?? []).map((e) => `${e.instancePath || "<root>"}: ${e.message}`),
  };
}

function sampleValue(field: FieldSpec): unknown {
  if (field.name === "tags") {
    return {
      environment: "dev",
      owner: "platform-team",
      costCenter: "CC-LEARN-001",
      application: "azure-learning",
      dataClassification: "internal",
    };
  }
  if (field.name === "name") return "azure-learning-dev";
  if (field.nesting) {
    const obj: Record<string, unknown> = {};
    for (const nf of field.nestedFields ?? []) obj[nf.name] = sampleValue(nf);
    return field.nesting === "single" ? obj : [obj];
  }
  if (field.hclType === "number") return 1;
  if (field.hclType === "bool") return true;
  if (/^(list|set)\(/.test(field.hclType)) return ["placeholder"];
  if (/^map\(/.test(field.hclType)) return { key: "value" };
  return "placeholder";
}

/**
 * Scaffolds a brand-new module + schema (never model entries, never
 * environments/<env>/main.tf — those are explicitly out of scope, see the
 * chat-driven-module-scaffolding plan) and opens it as a PR. Mirrors
 * proposeStructuredChange.ts's branch -> commit -> push -> PR shape, but
 * writes many files in one atomic commit via writeMultipleAndCommit
 * instead of one.
 */
export async function scaffoldModule(
  providerResourceType: string,
  requesterId?: string
): Promise<ScaffoldOutcome> {
  const denylistCheck = checkDenylist(providerResourceType);
  if (denylistCheck.denied) {
    return { status: "denied", resourceType: providerResourceType, reason: denylistCheck.reason! };
  }

  let block;
  try {
    ({ block } = getProviderSchema(providerResourceType));
  } catch {
    return { status: "unknown_resource_type", resourceType: providerResourceType };
  }

  const moduleName = deriveModuleName(providerResourceType);
  const containerKey = pluralize(moduleName);
  const schemaResourceType = toHyphenated(moduleName);

  const allFields = extractFields(block);
  const mandatoryFields = allFields.filter((f) => f.required);
  const optionalFields = allFields.filter((f) => !f.required);
  const computedAttributes = extractComputedAttributes(block);
  const versionConstraint = getAzurermVersionConstraint();

  const moduleFiles = generateModuleFiles({
    resourceType: providerResourceType,
    moduleName,
    mandatoryFields,
    optionalFields,
    computedAttributes,
    versionConstraint,
  });
  const schemaJson = generateSchemaFile({ moduleName, containerKey, mandatoryFields, optionalFields });
  const tfTestFile = generateTfTestFile({ moduleName, resourceType: providerResourceType, mandatoryFields });

  const selfCheck = selfCheckSchema(schemaJson, containerKey, allFields);
  if (!selfCheck.valid) {
    return { status: "self_check_failed", errors: selfCheck.errors };
  }

  const moduleDir = path.join(MODULES_DIR, moduleName);
  const files = [
    { filePath: path.join(moduleDir, "main.tf"), content: formatHcl(moduleFiles.mainTf) },
    { filePath: path.join(moduleDir, "variables.tf"), content: formatHcl(moduleFiles.variablesTf) },
    { filePath: path.join(moduleDir, "outputs.tf"), content: formatHcl(moduleFiles.outputsTf) },
    { filePath: path.join(moduleDir, "versions.tf"), content: formatHcl(moduleFiles.versionsTf) },
    { filePath: path.join(moduleDir, "README.md"), content: moduleFiles.readmeMd },
    { filePath: schemaFilePath(schemaResourceType), content: schemaJson },
    { filePath: path.join(REPO_ROOT, "tests", "unit", `${moduleName}.tftest.hcl`), content: formatHcl(tfTestFile) },
  ];
  const relativeFiles = files.map((f) => path.relative(REPO_ROOT, f.filePath).replace(/\\/g, "/"));

  const branch = createChangeBranch(`chatbot/scaffold-${moduleName}`);

  const requestedBy = requesterId ? `\nRequested by: ${requesterId}` : "";
  const commitMessage =
    `Scaffold module: ${providerResourceType}\n\n` +
    `AI-scaffolded from the azurerm provider's own schema (terraform providers ` +
    `schema -json).${requestedBy}\n\n` +
    `Adds a new module + schema only — no model entries, no environments/*/main.tf changes.`;
  writeMultipleAndCommit(files, commitMessage);

  pushBranch(branch);

  const prTitle = `[AI-scaffolded module] Add ${moduleName} (${providerResourceType})`;
  const prBody =
    `**AI-scaffolded Terraform module — requires Terraform-literate review.**\n\n` +
    `Generated from the azurerm provider's own machine-readable schema ` +
    `(\`terraform providers schema -json\`), not hand-written. Verify argument ` +
    `correctness, defaults, and nested/dynamic block handling before merging.\n\n` +
    `**This PR only adds a new module + schema — it does not create any resource ` +
    `instance or modify any environment's \`main.tf\`.** Wiring a ` +
    `\`module "${moduleName}" { ... }\` block into ` +
    `\`environments/<env>/main.tf\` and adding example entries to ` +
    `\`models/<env>/${schemaResourceType}.json\` are separate, manual follow-ups ` +
    `(see ARCHITECTURE.md §10 steps 4-5).${requestedBy}\n\n` +
    `Provider resource type: \`${providerResourceType}\`\n` +
    `Module: \`modules/${moduleName}\`\n` +
    `Schema: \`models/schema/${schemaResourceType}.schema.json\`\n\n` +
    `Files changed:\n` +
    relativeFiles.map((f) => `- \`${f}\``).join("\n");

  const pr = openPullRequest(branch, prTitle, prBody);

  returnToMain();

  if (pr.prUrl) {
    return {
      status: "pr_opened",
      providerResourceType,
      moduleName,
      branch,
      prUrl: pr.prUrl,
      filesChanged: relativeFiles,
    };
  }
  return {
    status: "pushed_no_pr",
    providerResourceType,
    moduleName,
    branch,
    compareUrl: pr.compareUrl,
    filesChanged: relativeFiles,
  };
}
