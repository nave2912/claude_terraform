import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { REPO_ROOT } from "../config/paths.js";

/**
 * Sources the "official" definition of an azurerm resource type by asking
 * Terraform itself for the provider's own machine-readable schema
 * (`terraform providers schema -json`) — not by scraping
 * registry.terraform.io. This is exact (it's the same schema Terraform
 * validates configs against) and needs no new HTML-parsing dependency; it
 * runs entirely against a scratch directory outside this repo checkout, so
 * nothing it does ever touches git state, and it never talks to Azure
 * (no provider `azurerm {}` block, no credentials) — only the provider
 * plugin's own static schema is requested.
 */

const CACHE_DIR = path.join(REPO_ROOT, "chatbot", "backend", ".cache");

interface AttributeSchema {
  type?: unknown;
  description?: string;
  required?: boolean;
  optional?: boolean;
  computed?: boolean;
}

interface BlockTypeSchema {
  nesting_mode: "single" | "list" | "set" | "map";
  block: TerraformBlock;
  min_items?: number;
  max_items?: number;
}

export interface TerraformBlock {
  attributes?: Record<string, AttributeSchema>;
  block_types?: Record<string, BlockTypeSchema>;
}

interface ProviderSchemaJson {
  format_version: string;
  provider_schemas: Record<
    string,
    {
      resource_schemas?: Record<string, { block: TerraformBlock }>;
    }
  >;
}

const AZURERM_PROVIDER_SOURCE = "registry.terraform.io/hashicorp/azurerm";

/**
 * Mirrors modules/_module_template/versions.tf's azurerm version pin so a
 * scaffolded module never uses a provider version other modules haven't
 * been validated against. Read from the template at call time (not just a
 * hardcoded copy) so this stays correct if the template's pin is ever
 * bumped.
 */
export function getAzurermVersionConstraint(): string {
  const templatePath = path.join(REPO_ROOT, "modules", "_module_template", "versions.tf");
  const content = fs.readFileSync(templatePath, "utf-8");
  const match = content.match(/azurerm\s*=\s*\{[^}]*version\s*=\s*"([^"]+)"/s);
  if (!match) {
    throw new Error(
      `Could not find azurerm version constraint in ${templatePath} — expected a ` +
        `required_providers.azurerm.version string to mirror.`
    );
  }
  return match[1];
}

function cacheFilePath(versionConstraint: string): string {
  // Keep only filesystem-safe characters — notably strips '<', '>', ',',
  // which Windows forbids in filenames (a version constraint like
  // ">= 3.90.0, < 4.0.0" would otherwise produce an invalid path).
  const safe = versionConstraint.replace(/[^a-zA-Z0-9._-]/g, "_");
  return path.join(CACHE_DIR, `azurerm-provider-schema-${safe}.json`);
}

/**
 * Runs `terraform init` + `terraform providers schema -json` in a scratch
 * directory under the OS temp dir (never inside REPO_ROOT, so it can never
 * end up `git add`ed by anything in gitprovider/). Result is cached to disk
 * (gitignored, keyed by the pinned version constraint) since init + schema
 * fetch takes real wall-clock time — this should not re-run per chat
 * message.
 */
function loadProviderSchema(): ProviderSchemaJson {
  const versionConstraint = getAzurermVersionConstraint();
  const cachePath = cacheFilePath(versionConstraint);

  if (fs.existsSync(cachePath)) {
    return JSON.parse(fs.readFileSync(cachePath, "utf-8"));
  }

  const scratchDir = fs.mkdtempSync(path.join(os.tmpdir(), "chatbot-provider-schema-"));
  try {
    const versionsTf =
      `terraform {\n` +
      `  required_providers {\n` +
      `    azurerm = {\n` +
      `      source  = "hashicorp/azurerm"\n` +
      `      version = "${versionConstraint}"\n` +
      `    }\n` +
      `  }\n` +
      `}\n`;
    fs.writeFileSync(path.join(scratchDir, "versions.tf"), versionsTf);

    execFileSync("terraform", ["init", "-input=false"], {
      cwd: scratchDir,
      encoding: "utf-8",
      maxBuffer: 200 * 1024 * 1024,
    });

    const output = execFileSync("terraform", ["providers", "schema", "-json"], {
      cwd: scratchDir,
      encoding: "utf-8",
      maxBuffer: 200 * 1024 * 1024,
    });

    const parsed = JSON.parse(output) as ProviderSchemaJson;

    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(cachePath, JSON.stringify(parsed));

    return parsed;
  } finally {
    fs.rmSync(scratchDir, { recursive: true, force: true });
  }
}

let cachedSchema: ProviderSchemaJson | null = null;

export interface AzurermResourceSchema {
  resourceType: string;
  block: TerraformBlock;
}

/**
 * Looks up one resource type's block schema (attributes + nested block
 * types, each flagged required/optional/computed) from the azurerm
 * provider's own schema. Throws a clear error if the resource type doesn't
 * exist in this provider version — callers should surface that as a
 * "not a known azurerm resource" response, not a 500.
 */
export function getProviderSchema(resourceType: string): AzurermResourceSchema {
  if (!cachedSchema) {
    cachedSchema = loadProviderSchema();
  }

  const azurerm = cachedSchema.provider_schemas[AZURERM_PROVIDER_SOURCE];
  if (!azurerm) {
    throw new Error(
      `Provider schema JSON did not contain "${AZURERM_PROVIDER_SOURCE}" — unexpected shape.`
    );
  }

  const resourceSchema = azurerm.resource_schemas?.[resourceType];
  if (!resourceSchema) {
    throw new Error(`Unknown azurerm resource type "${resourceType}".`);
  }

  return { resourceType, block: resourceSchema.block };
}
