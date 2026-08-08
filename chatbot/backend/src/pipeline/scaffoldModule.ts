import fs from "node:fs";
import path from "node:path";
import { Ajv } from "ajv";
import { REPO_ROOT, MODULES_DIR, schemaFilePath, modelFilePath } from "../config/paths.js";
import { checkDenylist } from "../moduleScaffold/denylist.js";
import { getProviderSchema, getAzurermVersionConstraint } from "../moduleScaffold/providerSchema.js";
import { extractFields, extractComputedAttributes, type FieldSpec } from "../moduleScaffold/fieldExtraction.js";
import { generateModuleFiles } from "../moduleScaffold/generators/hclGenerator.js";
import { generateSchemaFile } from "../moduleScaffold/generators/jsonSchemaGenerator.js";
import { generateTfTestFile } from "../moduleScaffold/generators/tftestGenerator.js";
import { ensureEnvironmentWiring } from "../moduleScaffold/generators/environmentWiringGenerator.js";
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
  | { status: "environment_blocked"; environment: string; allowed: string[] }
  | { status: "self_check_failed"; errors: string[] }
  | {
      status: "pr_opened";
      providerResourceType: string;
      moduleName: string;
      environment: string;
      branch: string;
      prUrl: string;
      filesChanged: string[];
    }
  | {
      status: "pushed_no_pr";
      providerResourceType: string;
      moduleName: string;
      environment: string;
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
): { valid: boolean; errors: string[]; sampleEntry: Record<string, unknown> } {
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
    sampleEntry,
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
 * Scaffolds a brand-new module + schema AND makes it apply-ready in the same
 * commit: wires a `module "<name>" { ... }` block into
 * environments/<env>/main.tf (via ensureEnvironmentWiring, same helper
 * proposeStructuredChange.ts uses for existing types) and adds one
 * self-check-validated example entry to models/<env>/<resourceType>.json.
 * Mirrors proposeStructuredChange.ts's branch -> commit -> push -> PR shape,
 * but writes many files in one atomic commit via writeMultipleAndCommit
 * instead of one.
 */
export async function scaffoldModule(
  providerResourceType: string,
  environment: string,
  // Top-level field name -> the human-readable description the user
  // already reviewed in the chat plan (planIntent.ts's summarizeFields).
  // Without this, generated variables only get a description when the
  // azurerm provider's own schema happens to supply one for that
  // attribute — true for very few attributes in practice — which trips
  // this repo's tflint terraform_documented_variables rule on nearly
  // every generic field. Only used to enrich prose; required/optional/
  // type always come from the provider schema itself, never from here.
  fieldDescriptions: Record<string, string> = {},
  requesterId?: string
): Promise<ScaffoldOutcome> {
  const denylistCheck = checkDenylist(providerResourceType);
  if (denylistCheck.denied) {
    return { status: "denied", resourceType: providerResourceType, reason: denylistCheck.reason! };
  }

  const allowedEnvironments = (process.env.ALLOWED_ENVIRONMENTS ?? "dev")
    .split(",")
    .map((e) => e.trim());
  if (!allowedEnvironments.includes(environment)) {
    return { status: "environment_blocked", environment, allowed: allowedEnvironments };
  }

  let block;
  try {
    ({ block } = getProviderSchema(providerResourceType));
  } catch (err) {
    // See scaffoldModulePlan.ts's identical check for why: only the
    // provider schema genuinely not containing this resource type means
    // "unknown resource type" — anything else is a real infra problem that
    // must surface, not get misreported as an invalid resource type.
    if (err instanceof Error && err.message.startsWith("Unknown azurerm resource type")) {
      return { status: "unknown_resource_type", resourceType: providerResourceType };
    }
    throw err;
  }

  const moduleName = deriveModuleName(providerResourceType);
  const containerKey = pluralize(moduleName);
  const schemaResourceType = toHyphenated(moduleName);

  const withDescriptions = extractFields(block).map((f) => ({
    ...f,
    description: fieldDescriptions[f.name] ?? f.description,
  }));
  const mandatoryFields = withDescriptions.filter((f) => f.required);
  const optionalFields = withDescriptions.filter((f) => !f.required);
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

  const selfCheck = selfCheckSchema(schemaJson, containerKey, withDescriptions);
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

  // Brand-new resource type: environments/<env>/main.tf has no `module
  // "<name>"` block for it yet, and the schema file we just generated isn't
  // on disk yet either, so pass it in-memory via registryEntryOverride
  // instead of the usual disk-registry lookup (see
  // environmentWiringGenerator.ts's doc comment).
  const wiring = ensureEnvironmentWiring(schemaResourceType, environment, {
    resourceType: schemaResourceType,
    containerKey,
    schema: JSON.parse(schemaJson),
  });
  if (wiring) files.push(wiring);

  // A minimal, self-check-validated starter entry so this PR is apply-ready
  // end to end, not just a scaffolded module. Built directly from
  // selfCheck's sampleEntry (already proven to satisfy the generated
  // schema) rather than via modelwriter's mergeEntry -> validators'
  // getResourceType, since that registry is a snapshot taken once at
  // process startup and won't recognize a resource type scaffolded during
  // this same server's lifetime.
  const exampleKey = "example";
  const exampleModelPath = modelFilePath(environment, schemaResourceType);
  let exampleContainer: Record<string, unknown> = { [exampleKey]: selfCheck.sampleEntry };
  if (fs.existsSync(exampleModelPath)) {
    // Defensive only — shouldn't happen for a genuinely new resource type,
    // since schemaFilePath(schemaResourceType) not existing on disk yet is
    // exactly what makes this "new" in the first place.
    const existing = JSON.parse(fs.readFileSync(exampleModelPath, "utf-8"));
    exampleContainer = { ...(existing[containerKey] ?? {}), ...exampleContainer };
  }
  const exampleModelContent = JSON.stringify({ [containerKey]: exampleContainer }, null, 2) + "\n";
  files.push({ filePath: exampleModelPath, content: exampleModelContent });

  const relativeFiles = files.map((f) => path.relative(REPO_ROOT, f.filePath).replace(/\\/g, "/"));

  const branch = createChangeBranch(`chatbot/scaffold-${moduleName}`);

  const requestedBy = requesterId ? `\nRequested by: ${requesterId}` : "";
  const wiringNote = wiring
    ? `\n\nAlso wires the module into environments/${environment}/main.tf and adds a starter ` +
      `example entry ("${exampleKey}") to models/${environment}/${schemaResourceType}.json, so this ` +
      `PR is apply-ready end-to-end.`
    : `\n\nAdds a starter example entry ("${exampleKey}") to models/${environment}/${schemaResourceType}.json. ` +
      `environments/${environment}/main.tf doesn't exist yet, so wiring the module block in is still a manual step.`;
  const commitMessage =
    `Scaffold module: ${providerResourceType}\n\n` +
    `AI-scaffolded from the azurerm provider's own schema (terraform providers ` +
    `schema -json).${requestedBy}${wiringNote}`;
  writeMultipleAndCommit(files, commitMessage);

  pushBranch(branch);

  const prTitle = `[AI-scaffolded module] Add ${moduleName} (${providerResourceType})`;
  const prBody =
    `**AI-scaffolded Terraform module — requires Terraform-literate review.**\n\n` +
    `Generated from the azurerm provider's own machine-readable schema ` +
    `(\`terraform providers schema -json\`), not hand-written. Verify argument ` +
    `correctness, defaults, and nested/dynamic block handling before merging.${wiringNote}${requestedBy}\n\n` +
    `Provider resource type: \`${providerResourceType}\`\n` +
    `Environment: \`${environment}\`\n` +
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
      environment,
      branch,
      prUrl: pr.prUrl,
      filesChanged: relativeFiles,
    };
  }
  return {
    status: "pushed_no_pr",
    providerResourceType,
    moduleName,
    environment,
    branch,
    compareUrl: pr.compareUrl,
    filesChanged: relativeFiles,
  };
}
