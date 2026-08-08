import { describe, expect, it, jest, beforeAll } from "@jest/globals";

/**
 * Covers routeTerraformCommand.ts's branching logic fully offline — mocks
 * both planIntent.js's resolveResourceType (the one LLM call involved, so
 * this doesn't need a live ANTHROPIC_API_KEY) and validators/index.js's
 * listResourceTypes (so "existing_type" vs "new_type" is checked against a
 * fixed fixture, not whatever happens to be in models/schema/*.schema.json
 * on disk right now — real modules get scaffolded into that directory over
 * time, e.g. by /tfmodules, and this suite must not start failing just
 * because some resource type it uses as a "doesn't exist yet" example
 * becomes real).
 */

const mockResolveResourceType = jest.fn();
const mockListResourceTypes = jest.fn();

jest.unstable_mockModule("../src/moduleScaffold/planIntent.js", () => ({
  resolveResourceType: mockResolveResourceType,
}));

jest.unstable_mockModule("../src/validators/index.js", () => ({
  listResourceTypes: mockListResourceTypes,
}));

let routeTerraformCommand: typeof import("../src/pipeline/routeTerraformCommand.js")["routeTerraformCommand"];

beforeAll(async () => {
  ({ routeTerraformCommand } = await import("../src/pipeline/routeTerraformCommand.js"));
});

const FIXTURE_REGISTRY = [
  { resourceType: "resource-group", containerKey: "resource_groups", schema: {} },
  { resourceType: "storage-account", containerKey: "storage_accounts", schema: {} },
];

describe("routeTerraformCommand", () => {
  beforeAll(() => {
    mockListResourceTypes.mockReturnValue(FIXTURE_REGISTRY);
  });

  it("routes a resolved type that already has a module to existing_type", async () => {
    mockResolveResourceType.mockResolvedValue({ kind: "resolved", resourceType: "azurerm_resource_group" });

    const outcome = await routeTerraformCommand("give me a resource group");

    expect(outcome).toEqual({
      status: "existing_type",
      resourceType: "resource-group",
      providerResourceType: "azurerm_resource_group",
    });
  });

  it("routes a resolved type with no module yet to new_type", async () => {
    // A type deliberately absent from FIXTURE_REGISTRY above — this test's
    // "doesn't exist yet" case must stay true by construction, not by
    // coincidentally matching whatever's actually in models/schema/ today.
    mockResolveResourceType.mockResolvedValue({ kind: "resolved", resourceType: "azurerm_cdn_frontdoor_profile" });

    const outcome = await routeTerraformCommand("I want a CDN front door profile");

    expect(outcome).toEqual({ status: "new_type", providerResourceType: "azurerm_cdn_frontdoor_profile" });
  });

  it("passes through a clarification request unchanged", async () => {
    mockResolveResourceType.mockResolvedValue({ kind: "clarification", question: "Which kind of network resource?" });

    const outcome = await routeTerraformCommand("make me a network thing");

    expect(outcome).toEqual({ status: "clarification_needed", question: "Which kind of network resource?" });
  });

  it("passes through a no_action response unchanged", async () => {
    mockResolveResourceType.mockResolvedValue({ kind: "no_action", message: "That's not an infrastructure request." });

    const outcome = await routeTerraformCommand("what's the weather");

    expect(outcome).toEqual({ status: "no_action", message: "That's not an infrastructure request." });
  });
});
