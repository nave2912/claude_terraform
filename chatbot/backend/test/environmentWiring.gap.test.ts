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
