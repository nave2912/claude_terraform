import { describe, expect, it } from "@jest/globals";
import { listAvailableEnvironments } from "../src/config/paths.js";

/**
 * Read-only against the real repo — models/dev, models/qa, models/prod
 * exist today; models/schema must never be treated as an environment.
 */
describe("listAvailableEnvironments", () => {
  it("returns every models/<env>/ directory except schema", () => {
    expect(listAvailableEnvironments()).toEqual(["dev", "prod", "qa"]);
  });

  it("never includes schema", () => {
    expect(listAvailableEnvironments()).not.toContain("schema");
  });
});
