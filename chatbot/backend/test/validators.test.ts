import { describe, expect, it } from "@jest/globals";
import { listResourceTypes, validateEntry, validateModelFile } from "../src/validators/index.js";

describe("schema registry", () => {
  it("discovers resource types from models/schema/*.schema.json with zero hardcoding", () => {
    const types = listResourceTypes().map((r) => r.resourceType).sort();
    // Not an exhaustive list: new schema files (hand-authored or
    // /tfmodules-scaffolded) land here over time. Assert the registry picks
    // up its known-stable baseline rather than pinning the full set, which
    // would go stale every time a module is added.
    expect(types).toEqual(expect.arrayContaining(["resource-group", "storage-account"]));
    expect(types.length).toBeGreaterThanOrEqual(2);
  });
});

describe("validateEntry — resource-group", () => {
  const validEntry = {
    name: "azure-learning-dev",
    location: "eastus",
    tags: {
      environment: "dev",
      owner: "platform-team",
      costCenter: "CC-LEARN-001",
      application: "azure-learning",
      dataClassification: "internal",
    },
  };

  it("accepts a valid entry", () => {
    const result = validateEntry("resource-group", validEntry);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects an entry missing a mandatory tag", () => {
    const { tags, ...rest } = validEntry;
    const { costCenter, ...tagsMissingCostCenter } = tags;
    const result = validateEntry("resource-group", { ...rest, tags: tagsMissingCostCenter });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects a name that doesn't match the naming pattern", () => {
    const result = validateEntry("resource-group", { ...validEntry, name: "Invalid_Name!" });
    expect(result.valid).toBe(false);
  });

  it("rejects an invalid dataClassification enum value", () => {
    const result = validateEntry("resource-group", {
      ...validEntry,
      tags: { ...validEntry.tags, dataClassification: "top-secret" },
    });
    expect(result.valid).toBe(false);
  });
});

describe("validateModelFile — resource-group", () => {
  it("accepts a full model file matching the container-key convention", () => {
    const result = validateModelFile("resource-group", {
      resource_groups: {
        primary: {
          name: "azure-learning-dev",
          location: "eastus",
          tags: {
            environment: "dev",
            owner: "platform-team",
            costCenter: "CC-LEARN-001",
            application: "azure-learning",
            dataClassification: "internal",
          },
        },
      },
    });
    expect(result.valid).toBe(true);
  });

  it("rejects a payload with an unexpected top-level key", () => {
    const result = validateModelFile("resource-group", { not_resource_groups: {} });
    expect(result.valid).toBe(false);
  });
});
