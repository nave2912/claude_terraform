import { describe, expect, it, jest, beforeAll } from "@jest/globals";

/**
 * Covers routeTerraformCommand.ts's branching logic offline — mocks
 * planIntent.js's resolveResourceType (the one LLM call involved) so this
 * doesn't need a live ANTHROPIC_API_KEY, exactly like the /tfmodules
 * resolver it reuses. listResourceTypes() itself is real (reads the actual
 * models/schema/*.schema.json on disk), so "existing_type" vs "new_type" is
 * checked against the real registry, not a fixture.
 */

const mockResolveResourceType = jest.fn();

jest.unstable_mockModule("../src/moduleScaffold/planIntent.js", () => ({
  resolveResourceType: mockResolveResourceType,
}));

let routeTerraformCommand: typeof import("../src/pipeline/routeTerraformCommand.js")["routeTerraformCommand"];

beforeAll(async () => {
  ({ routeTerraformCommand } = await import("../src/pipeline/routeTerraformCommand.js"));
});

describe("routeTerraformCommand", () => {
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
    mockResolveResourceType.mockResolvedValue({ kind: "resolved", resourceType: "azurerm_public_ip" });

    const outcome = await routeTerraformCommand("I want a public ip");

    expect(outcome).toEqual({ status: "new_type", providerResourceType: "azurerm_public_ip" });
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
