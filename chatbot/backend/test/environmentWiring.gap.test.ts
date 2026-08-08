import { describe, expect, it } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "../src/config/paths.js";
import { ensureEnvironmentWiring, isModuleWired } from "../src/moduleScaffold/generators/environmentWiringGenerator.js";

/**
 * Regression test for the scaffold-apply-ready gap this repo actually shipped
 * with: modules/linux_virtual_machine/ and
 * models/schema/linux-virtual-machine.schema.json exist from a prior
 * /tfmodules run, but environments/dev/main.tf was never wired for it and no
 * models/dev/linux-virtual-machine.json exists — so the module was
 * un-deployable. Read-only against the real repo checkout; no writes.
 */
describe("environments/dev/main.tf wiring gap (linux_virtual_machine fixture)", () => {
  const mainTfPath = path.join(REPO_ROOT, "environments", "dev", "main.tf");
  const mainTf = fs.readFileSync(mainTfPath, "utf-8");

  it("linux_virtual_machine is not wired into environments/dev/main.tf today", () => {
    expect(isModuleWired(mainTf, "linux_virtual_machine")).toBe(false);
  });

  it("ensureEnvironmentWiring can generate a valid module block for it", () => {
    const result = ensureEnvironmentWiring("linux-virtual-machine", "dev");
    expect(result).not.toBeNull();
    expect(result!.filePath).toBe(mainTfPath);
    expect(result!.content).toMatch(/module "linux_virtual_machine" \{/);
    expect(result!.content).toMatch(/for_each = local\.linux_virtual_machine_model\.linux_virtual_machines/);
  });

  it("returns null once a module is already wired (idempotent — resource_group is wired today)", () => {
    expect(ensureEnvironmentWiring("resource-group", "dev")).toBeNull();
  });
});

/**
 * Regression test for a real live failure: a scaffolded azurerm_redis_cache
 * still failed checkov (public network access, TLS version, SSL-only) on
 * import alone — zero instances — even after its module's own variables.tf
 * defaults were fixed to be secure. checkov statically analyzes THIS call
 * site's expression (environments/dev/main.tf), not the module's own
 * variable default several files away, so `try(each.value.field, null)`
 * still reads as unresolved/insecure to it regardless of what the module
 * itself would default to. The fix: fall back to the field's own
 * JSON-Schema `default` (persisted by jsonSchemaGenerator.ts's
 * jsonSchemaDefault) instead of a bare null.
 */
describe("environments/dev/main.tf wiring — secure-default call-site fallback", () => {
  it("uses the field's JSON-Schema default as the try() fallback instead of a bare null", () => {
    const result = ensureEnvironmentWiring("fake-checkov-regression-fixture", "dev", {
      resourceType: "fake-checkov-regression-fixture",
      containerKey: "fake_checkov_regression_fixtures",
      schema: {
        properties: {
          fake_checkov_regression_fixtures: {
            additionalProperties: {
              required: ["name"],
              properties: {
                name: { type: "string" },
                public_network_access_enabled: { type: "boolean", default: false },
                minimum_tls_version: { type: "string", default: "1.2" },
                shard_count: { type: "number" }, // no default — ordinary optional field
              },
            },
          },
        },
      },
    });

    expect(result).not.toBeNull();
    expect(result!.content).toMatch(
      /public_network_access_enabled\s*=\s*try\(each\.value\.public_network_access_enabled, false\)/
    );
    expect(result!.content).toMatch(
      /minimum_tls_version\s*=\s*try\(each\.value\.minimum_tls_version, "1\.2"\)/
    );
    // No secure default on this one — falls back to null, unchanged.
    expect(result!.content).toMatch(/shard_count\s*=\s*try\(each\.value\.shard_count, null\)/);
  });
});
