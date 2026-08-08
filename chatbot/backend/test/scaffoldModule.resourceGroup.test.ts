import { describe, expect, it, jest, beforeAll } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Regression fixture for the apply-ready scaffold fix: scaffolds
 * "azurerm_resource_group" end-to-end (fully offline — provider schema,
 * `terraform fmt`, and git/gh are all mocked) and checks the generated
 * output against the real, hand-built modules/resource_group +
 * models/schema/resource-group.schema.json, which is this repo's reference
 * "simple resource" pattern.
 *
 * jest.unstable_mockModule + a dynamic import() (rather than the usual
 * `jest.mock`) because this project's jest config runs ESM
 * (ts-jest/presets/default-esm + --experimental-vm-modules — see
 * jest.config.js), where static import hoisting isn't available to rewrite.
 */

const mockGetProviderSchema = jest.fn();
const mockGetAzurermVersionConstraint = jest.fn();
const mockCreateChangeBranch = jest.fn();
const mockWriteMultipleAndCommit = jest.fn();
const mockPushBranch = jest.fn();
const mockOpenPullRequest = jest.fn();
const mockReturnToMain = jest.fn();

jest.unstable_mockModule("../src/moduleScaffold/providerSchema.js", () => ({
  getProviderSchema: mockGetProviderSchema,
  getAzurermVersionConstraint: mockGetAzurermVersionConstraint,
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
  });

  it("generates a schema whose required fields match the real hand-authored resource-group.schema.json", async () => {
    await scaffoldModule("azurerm_resource_group", "dev", {}, "test-fixture");

    const files = mockWriteMultipleAndCommit.mock.calls[0][0] as { filePath: string; content: string }[];
    const schemaFile = files.find((f) => f.filePath.endsWith("resource-group.schema.json"))!;
    const generated = JSON.parse(schemaFile.content);

    const realSchema = JSON.parse(
      fs.readFileSync(path.join(REPO_ROOT, "models", "schema", "resource-group.schema.json"), "utf-8")
    );

    expect(generated.properties.resource_groups.additionalProperties.required.slice().sort()).toEqual(
      realSchema.properties.resource_groups.additionalProperties.required.slice().sort()
    );
  });

  it("generates a main.tf resource block structurally consistent with the hand-built module", async () => {
    await scaffoldModule("azurerm_resource_group", "dev", {}, "test-fixture");

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

  it("runs the full pipeline end-to-end and produces an apply-ready PR (module + schema + starter entry)", async () => {
    const outcome = await scaffoldModule("azurerm_resource_group", "dev", {}, "test-fixture");

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

    const files = mockWriteMultipleAndCommit.mock.calls.at(-1)![0] as { filePath: string; content: string }[];
    const modelFile = files.find((f) => f.filePath.endsWith(path.join("dev", "resource-group.json")))!;
    const modelJson = JSON.parse(modelFile.content);
    expect(modelJson.resource_groups.example).toMatchObject({
      name: expect.any(String),
      location: expect.any(String),
      tags: expect.objectContaining({ environment: "dev" }),
    });

    expect(mockPushBranch).toHaveBeenCalled();
    expect(mockOpenPullRequest).toHaveBeenCalled();
    expect(mockReturnToMain).toHaveBeenCalled();
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

    await expect(scaffoldModule("azurerm_cosmosdb_account", "dev", {}, "test-fixture")).rejects.toThrow(
      "spawn terraform ENOENT"
    );
  });

  it("still reports unknown_resource_type for a genuinely nonexistent type", async () => {
    mockGetProviderSchema.mockImplementationOnce(() => {
      throw new Error('Unknown azurerm resource type "azurerm_not_a_real_thing".');
    });

    const outcome = await scaffoldModule("azurerm_not_a_real_thing", "dev", {}, "test-fixture");
    expect(outcome).toEqual({ status: "unknown_resource_type", resourceType: "azurerm_not_a_real_thing" });
  });
});
