import fs from "node:fs";
import path from "node:path";
import { Ajv } from "ajv";
import { REPO_ROOT, MODULES_DIR, schemaFilePath, modelFilePath } from "../config/paths.js";
import { checkDenylist } from "../moduleScaffold/denylist.js";
import { getProviderSchema, getAzurermVersionConstraint } from "../moduleScaffold/providerSchema.js";
import { extractFields, extractComputedAttributes } from "../moduleScaffold/fieldExtraction.js";
import { summarizeFields } from "../moduleScaffold/planIntent.js";
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
  | { status: "schema_generation_failed"; errors: string[] }
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
 * Sanity-checks the generator's OWN output — that the JSON Schema it just
 * produced is itself well-formed and compiles — via a fresh Ajv instance,
 * NOT the shared validators/index.ts `validateEntry` (that reads the
 * schema registry once at process startup and won't know about a schema
 * file that doesn't exist on disk yet). No sample instance is built or
 * validated here: importing a module creates zero resource instances, so
 * there's nothing yet for a real entry to satisfy — that happens later,
 * per-instance, through the normal UI form (preview/propose-structured),
 * which already validates against this exact schema file once it exists.
 */
function selfCheckGeneratedSchema(schemaJson: string, containerKey: string): { valid: boolean; errors: string[] } {
  const schema = JSON.parse(schemaJson);
  const entrySchema = schema.properties?.[containerKey]?.additionalProperties;
  if (!entrySchema) {
    return { valid: false, errors: [`Generated schema is missing properties.${containerKey}.additionalProperties`] };
  }
  try {
    const ajv = new Ajv({ allErrors: true, strict: false });
    ajv.compile(entrySchema);
    return { valid: true, errors: [] };
  } catch (err) {
    return { valid: false, errors: [err instanceof Error ? err.message : String(err)] };
  }
}

/**
 * Imports a brand-new module: generates the module's own .tf files + JSON
 * Schema + a tftest fixture, wires an empty `module "<name>" { for_each =
 * local.<x>_model.<container> ... }` block into environments/<env>/main.tf,
 * and creates models/<env>/<resourceType>.json with an EMPTY container —
 * zero instances, on purpose. This is deliberately NOT "apply-ready": no
 * starter entry means nothing for terraform plan to evaluate beyond "no
 * changes," and no field values need to be reviewed or guessed (real
 * values — including any that reference another Azure resource only the
 * user knows about — are for a human to supply once, later, through the
 * schema-driven UI form when they actually want an instance). Mirrors
 * proposeStructuredChange.ts's branch -> commit -> push -> PR shape.
 */
export async function scaffoldModule(
  providerResourceType: string,
  environment: string,
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

  const allFields = extractFields(block);
  const mandatoryFields = allFields.filter((f) => f.required);
  const optionalFields = allFields.filter((f) => !f.required);
  const computedAttributes = extractComputedAttributes(block);
  const versionConstraint = getAzurermVersionConstraint();

  // Still needed even with no starter entry: every generic field's
  // variables.tf entry needs a description or this repo's tflint
  // terraform_documented_variables rule fails on nearly every field (the
  // provider's own schema rarely supplies one) — see hclGenerator.ts.
  // exampleValue (also returned here) is ignored; there's no instance to
  // populate with it anymore.
  const summarized = await summarizeFields(providerResourceType, mandatoryFields, optionalFields);

  const moduleFiles = generateModuleFiles({
    resourceType: providerResourceType,
    moduleName,
    mandatoryFields: summarized.mandatoryFields,
    optionalFields: summarized.optionalFields,
    computedAttributes,
    versionConstraint,
  });
  const schemaJson = generateSchemaFile({
    moduleName,
    containerKey,
    mandatoryFields: summarized.mandatoryFields,
    optionalFields: summarized.optionalFields,
  });
  const tfTestFile = generateTfTestFile({
    moduleName,
    resourceType: providerResourceType,
    mandatoryFields: summarized.mandatoryFields,
  });

  const selfCheck = selfCheckGeneratedSchema(schemaJson, containerKey);
  if (!selfCheck.valid) {
    return { status: "schema_generation_failed", errors: selfCheck.errors };
  }

  // Everything above this point is pure computation (provider schema,
  // Claude call, file generation) with no dependency on repo state.
  // createChangeBranch runs BEFORE anything below reads environments/
  // <env>/main.tf or models/<env>/*.json from disk — both of those reads
  // must see a freshly-checked-out origin/main, not whatever happened to
  // be on disk a moment earlier. Regression: reading main.tf before this
  // checkout meant a stale on-disk copy (e.g. one still missing a
  // different module's wiring that had just merged moments earlier) got
  // used to compute the "append" snippet, which was then written straight
  // over the freshly-checked-out (correct, complete) file — silently
  // deleting that other module's wiring instead of appending alongside
  // it. First hit live: importing azurerm_function_app deleted the
  // already-merged azurerm_machine_learning_workspace wiring.
  const branch = createChangeBranch(`chatbot/scaffold-${moduleName}`);

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

  // Empty container, deliberately — see this function's doc comment. Real
  // instances get added later, one at a time, through the UI form (which
  // validates each new entry against the schema file committed above).
  const modelPath = modelFilePath(environment, schemaResourceType);
  let container: Record<string, unknown> = {};
  if (fs.existsSync(modelPath)) {
    // Defensive only — shouldn't happen for a genuinely new resource type,
    // since schemaFilePath(schemaResourceType) not existing on disk yet is
    // exactly what makes this "new" in the first place.
    const existing = JSON.parse(fs.readFileSync(modelPath, "utf-8"));
    container = existing[containerKey] ?? {};
  }
  const modelContent = JSON.stringify({ [containerKey]: container }, null, 2) + "\n";
  files.push({ filePath: modelPath, content: modelContent });

  const relativeFiles = files.map((f) => path.relative(REPO_ROOT, f.filePath).replace(/\\/g, "/"));

  const requestedBy = requesterId ? `\nRequested by: ${requesterId}` : "";
  const wiringNote = wiring
    ? `\n\nAlso wires the module into environments/${environment}/main.tf and creates ` +
      `models/${environment}/${schemaResourceType}.json (empty — no instances yet). Create your first ` +
      `instance afterward through the UI form, once this PR is merged.`
    : `\n\nCreates models/${environment}/${schemaResourceType}.json (empty — no instances yet). ` +
      `environments/${environment}/main.tf doesn't exist yet, so wiring the module block in is still a manual step.`;
  const commitMessage =
    `Import module: ${providerResourceType}\n\n` +
    `AI-scaffolded from the azurerm provider's own schema (terraform providers ` +
    `schema -json).${requestedBy}${wiringNote}`;
  writeMultipleAndCommit(files, commitMessage);

  pushBranch(branch);

  const prTitle = `[AI-imported module] Add ${moduleName} (${providerResourceType})`;
  const prBody =
    `**AI-imported Terraform module — requires Terraform-literate review.**\n\n` +
    `Generated from the azurerm provider's own machine-readable schema ` +
    `(\`terraform providers schema -json\`), not hand-written. Verify argument ` +
    `correctness, defaults, and nested/dynamic block handling before merging. Imports the module only — ` +
    `no resource instance is created by this PR, so \`terraform plan\` has nothing new to evaluate.${wiringNote}${requestedBy}\n\n` +
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
