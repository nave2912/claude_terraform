import { describe, expect, it, jest, beforeAll } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Regression fixture for module import (no starter instance): scaffolds
 * "azurerm_resource_group" end-to-end (fully offline — provider schema,
 * the Claude field-description call, `terraform fmt`, and git/gh are all
 * mocked) and checks the generated output against the real, hand-built
 * modules/resource_group + models/schema/resource-group.schema.json,
 * which is this repo's reference "simple resource" pattern.
 *
 * jest.unstable_mockModule + a dynamic import() (rather than the usual
 * `jest.mock`) because this project's jest config runs ESM
 * (ts-jest/presets/default-esm + --experimental-vm-modules — see
 * jest.config.js), where static import hoisting isn't available to rewrite.
 */

const mockGetProviderSchema = jest.fn();
const mockGetAzurermVersionConstraint = jest.fn();
const mockSummarizeFields = jest.fn();
const mockCreateChangeBranch = jest.fn();
const mockWriteMultipleAndCommit = jest.fn();
const mockPushBranch = jest.fn();
const mockOpenPullRequest = jest.fn();
const mockReturnToMain = jest.fn();

jest.unstable_mockModule("../src/moduleScaffold/providerSchema.js", () => ({
  getProviderSchema: mockGetProviderSchema,
  getAzurermVersionConstraint: mockGetAzurermVersionConstraint,
}));

// scaffoldModule() still calls summarizeFields internally (variables.tf
// needs a description on every field or tflint's terraform_documented_
// variables rule fails) even though there's no starter instance anymore —
// mocked here as an identity-ish pass-through so tests don't need real
// network/API-key access.
jest.unstable_mockModule("../src/moduleScaffold/planIntent.js", () => ({
  summarizeFields: mockSummarizeFields,
}));

// Identity — avoids depending on the `terraform` binary being on PATH in
// whatever environment runs `npm test`. Real HCL-formatting correctness is
// already covered by CI's `terraform fmt -check` once an actual PR is open.
jest.unstable_mockModule("../src/moduleScaffold/terraformFmt.js", () => ({
  formatHcl: (content: string) => content,
}));

jest.unstable_mockModule("../src/gitprovider/index.js", () => ({
  createChangeBranch: mockCreateChangeBranch,
  writeMultipleAndCommit: mockWriteMultipleAndCommit,
  pushBranch: mockPushBranch,
  openPullRequest: mockOpenPullRequest,
  returnToMain: mockReturnToMain,
}));

let scaffoldModule: typeof import("../src/pipeline/scaffoldModule.js")["scaffoldModule"];

beforeAll(async () => {
  ({ scaffoldModule } = await import("../src/pipeline/scaffoldModule.js"));
});

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

// A literal fixture matching azurerm_resource_group's real provider-schema
// shape (name/location required strings, tags optional map(string), id
// computed) — not fetched from the actual provider, so this test needs
// neither network access nor a local `terraform` install.
const RESOURCE_GROUP_BLOCK = {
  attributes: {
    id: { type: "string", computed: true },
    name: { type: "string", required: true },
    location: { type: "string", required: true },
    tags: { type: ["map", "string"], optional: true },
  },
};

// summarizeFields's real contract: same FieldSpec objects passed in, with
// a `description` merged on — no exampleValue needed by anything anymore,
// but the mock still accepts/ignores it since the real function returns it.
function echoWithDescriptions(_resourceType: string, mandatoryFields: any[], optionalFields: any[]) {
  const attach = (fields: any[]) => fields.map((f) => ({ ...f, description: `${f.name} description` }));
  return Promise.resolve({
    summary: "A test resource.",
    mandatoryFields: attach(mandatoryFields),
    optionalFields: attach(optionalFields),
  });
}

describe("scaffoldModule — azurerm_resource_group (offline, resource_group as regression fixture)", () => {
  beforeAll(() => {
    mockGetProviderSchema.mockReturnValue({
      resourceType: "azurerm_resource_group",
      block: RESOURCE_GROUP_BLOCK,
    });
    mockGetAzurermVersionConstraint.mockReturnValue(">= 3.90.0, < 4.0.0");
    mockCreateChangeBranch.mockReturnValue("chatbot/scaffold-resource_group-test");
    mockOpenPullRequest.mockReturnValue({
      prUrl: "https://github.com/nave2912/claude_terraform/pull/999",
      compareUrl: null,
    });
    mockSummarizeFields.mockImplementation(echoWithDescriptions);
  });

  it("generates a schema whose required fields match the real hand-authored resource-group.schema.json", async () => {
    await scaffoldModule("azurerm_resource_group", "dev", "test-fixture");

    const files = mockWriteMultipleAndCommit.mock.calls[0][0] as { filePath: string; content: string }[];
    const schemaFile = files.find((f) => f.filePath.endsWith("resource-group.schema.json"))!;
    const generated = JSON.parse(schemaFile.content);

    const realSchema = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, "models", "schema", "resource-group.schema.json"), "utf-8")
    );

    expect(generated.properties.resource_groups.additionalProperties.required.slice().sort()).toEqual(
      realSchema.properties.resource_groups.additionalProperties.required.slice().sort()
    );
    // A freshly-imported module has zero instances at first — unlike the
    // hand-written resource-group.schema.json, the generated schema must
    // not require at least one entry to exist yet.
    expect(generated.properties.resource_groups.minProperties).toBeUndefined();
  });

  it("generates a main.tf resource block structurally consistent with the hand-built module", async () => {
    await scaffoldModule("azurerm_resource_group", "dev", "test-fixture");

    const files = mockWriteMultipleAndCommit.mock.calls[0][0] as { filePath: string; content: string }[];
    const mainTf = files.find((f) => f.filePath.endsWith(path.join("resource_group", "main.tf")))!;

    expect(mainTf.content).toMatch(/resource "azurerm_resource_group" "this" \{/);
    expect(mainTf.content).toMatch(/name\s*=\s*var\.name/);
    expect(mainTf.content).toMatch(/location\s*=\s*var\.location/);
    expect(mainTf.content).toMatch(/tags\s*=\s*var\.tags/);
    // Expected, documented diff: the hand-built module additionally has an
    // azurerm_management_lock resource, which a generator driven purely by
    // azurerm_resource_group's own schema has no way to know to add.
  });

  it("runs the full pipeline end-to-end and imports the module (no starter instance)", async () => {
    const outcome = await scaffoldModule("azurerm_resource_group", "dev", "test-fixture");

    expect(outcome.status).toBe("pr_opened");
    if (outcome.status !== "pr_opened") return;

    expect(outcome.environment).toBe("dev");
    expect(outcome.filesChanged).toContain("models/dev/resource-group.json");
    expect(outcome.filesChanged).toContain("modules/resource_group/main.tf");

    // environments/dev/main.tf is NOT in filesChanged here — resource_group
    // is this repo's already-wired reference module, so ensureEnvironmentWiring
    // correctly reports "already wired" against the real file on disk and
    // skips it. This is the idempotency guarantee: re-scaffolding an
    // existing type never re-wires or duplicates a module block.
    expect(outcome.filesChanged).not.toContain("environments/dev/main.tf");

    expect(mockPushBranch).toHaveBeenCalled();
    expect(mockOpenPullRequest).toHaveBeenCalled();
    expect(mockReturnToMain).toHaveBeenCalled();
  });

  it("creates an EMPTY container for a genuinely new resource type — no starter instance", async () => {
    // azurerm_cosmosdb_account has no models/dev/cosmosdb-account.json on
    // disk yet — this is the "truly new" case, as opposed to resource_group
    // above (already onboarded, already has real entries).
    mockGetProviderSchema.mockReturnValueOnce({
      resourceType: "azurerm_cosmosdb_account",
      block: RESOURCE_GROUP_BLOCK,
    });

    const outcome = await scaffoldModule("azurerm_cosmosdb_account", "dev", "test-fixture");
    expect(outcome.status).toBe("pr_opened");

    const files = mockWriteMultipleAndCommit.mock.calls.at(-1)![0] as { filePath: string; content: string }[];
    const modelFile = files.find((f) => f.filePath.endsWith(path.join("dev", "cosmosdb-account.json")))!;
    const modelJson = JSON.parse(modelFile.content);

    expect(modelJson).toEqual({ cosmosdb_accounts: {} });
  });

  it("preserves existing entries when re-importing an already-onboarded type (idempotent, never wipes real data)", async () => {
    const realModelPath = path.join(REPO_ROOT, "models", "dev", "resource-group.json");
    const realModelBefore = JSON.parse(fs.readFileSync(realModelPath, "utf-8"));
    // Sanity: resource_group is already onboarded in this repo and has real
    // entries — otherwise this test would be vacuously true.
    expect(Object.keys(realModelBefore.resource_groups).length).toBeGreaterThan(0);

    await scaffoldModule("azurerm_resource_group", "dev", "test-fixture");

    const files = mockWriteMultipleAndCommit.mock.calls.at(-1)![0] as { filePath: string; content: string }[];
    const modelFile = files.find((f) => f.filePath.endsWith(path.join("dev", "resource-group.json")))!;
    const modelJson = JSON.parse(modelFile.content);

    expect(modelJson).toEqual(realModelBefore);
  });
});

describe("scaffoldModule — provider schema failures", () => {
  // Regression test: production once had no `terraform` binary in the
  // backend's Docker image, so getProviderSchema() threw a plain
  // "spawn terraform ENOENT" for every scaffold request, and the old
  // bare `catch { return unknown_resource_type }` misreported it as
  // "azurerm_cosmosdb_account isn't a known azurerm resource type" — a
  // real, valid resource type, and nothing to do with the actual failure.
  it("propagates any error that isn't the genuine 'unknown resource type' case", async () => {
    mockGetProviderSchema.mockImplementationOnce(() => {
      throw new Error("spawn terraform ENOENT");
    });

    await expect(scaffoldModule("azurerm_cosmosdb_account", "dev", "test-fixture")).rejects.toThrow(
      "spawn terraform ENOENT"
    );
  });

  it("still reports unknown_resource_type for a genuinely nonexistent type", async () => {
    mockGetProviderSchema.mockImplementationOnce(() => {
      throw new Error('Unknown azurerm resource type "azurerm_not_a_real_thing".');
    });

    const outcome = await scaffoldModule("azurerm_not_a_real_thing", "dev", "test-fixture");
    expect(outcome).toEqual({ status: "unknown_resource_type", resourceType: "azurerm_not_a_real_thing" });
  });
});
