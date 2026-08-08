import { describe, expect, it } from "@jest/globals";
import { generateModuleFiles } from "../src/moduleScaffold/generators/hclGenerator.js";
import type { FieldSpec } from "../src/moduleScaffold/fieldExtraction.js";

/**
 * Regression coverage for a real live failure: a scaffolded
 * azurerm_machine_learning_workspace's optional, list-nested `encryption`
 * block generated `dynamic "encryption" { for_each = var.encryption ... }`
 * with no null-coalescing. Every optional generic field defaults to `null`
 * in the module's own variables.tf, and a starter entry that doesn't set
 * it (the common case — starter entries only populate required fields)
 * passes that null straight through, so `terraform plan` failed with
 * "Cannot use a null value in for_each" — caught only at real-state plan
 * time, past both terraform validate and tflint.
 */
describe("generateModuleFiles — optional nested-block for_each null safety", () => {
  const REQUIRED_NAME_FIELD: FieldSpec = { name: "name", hclType: "string", required: true };

  it("null-coalesces an optional list-nested block (not just 'single' nesting)", () => {
    const optionalListBlock: FieldSpec = {
      name: "encryption",
      hclType: "list(object({ key_id = string }))",
      required: false,
      nesting: "list",
      nestedFields: [{ name: "key_id", hclType: "string", required: true }],
    };

    const { mainTf } = generateModuleFiles({
      resourceType: "azurerm_machine_learning_workspace",
      moduleName: "machine_learning_workspace",
      mandatoryFields: [REQUIRED_NAME_FIELD],
      optionalFields: [optionalListBlock],
      computedAttributes: [],
      versionConstraint: ">= 3.90.0, < 4.0.0",
    });

    expect(mainTf).toMatch(/for_each\s*=\s*var\.encryption == null \? \[\] : var\.encryption/);
    // The exact bug: a bare reference with no null-coalescing at all.
    expect(mainTf).not.toMatch(/for_each\s*=\s*var\.encryption\s*\n/);
  });

  it("still uses the block unconditionally when a list-nested block is required", () => {
    const requiredListBlock: FieldSpec = {
      name: "identity",
      hclType: "list(object({ type = string }))",
      required: true,
      nesting: "list",
      nestedFields: [{ name: "type", hclType: "string", required: true }],
    };

    const { mainTf } = generateModuleFiles({
      resourceType: "azurerm_machine_learning_workspace",
      moduleName: "machine_learning_workspace",
      mandatoryFields: [REQUIRED_NAME_FIELD, requiredListBlock],
      optionalFields: [],
      computedAttributes: [],
      versionConstraint: ">= 3.90.0, < 4.0.0",
    });

    expect(mainTf).toMatch(/for_each\s*=\s*var\.identity\s*\n/);
  });

  it("keeps the existing null-safe behavior for optional 'single' nesting unchanged", () => {
    const optionalSingleBlock: FieldSpec = {
      name: "timeouts",
      hclType: "object({ create = string })",
      required: false,
      nesting: "single",
      nestedFields: [{ name: "create", hclType: "string", required: false }],
    };

    const { mainTf } = generateModuleFiles({
      resourceType: "azurerm_machine_learning_workspace",
      moduleName: "machine_learning_workspace",
      mandatoryFields: [REQUIRED_NAME_FIELD],
      optionalFields: [optionalSingleBlock],
      computedAttributes: [],
      versionConstraint: ">= 3.90.0, < 4.0.0",
    });

    expect(mainTf).toMatch(/for_each\s*=\s*var\.timeouts == null \? \[\] : \[var\.timeouts\]/);
  });
});

/**
 * Regression coverage for a real live failure: a scaffolded
 * azurerm_redis_cache module (zero instances — checkov still statically
 * analyzes the generated module code) failed CI on import alone, because
 * every optional field's variable defaulted to bare `null`. checkov
 * flagged public network access, TLS version, SSL-only access, and
 * replication as insecure — none of which involve any instance ever
 * existing. secureDefault bakes a secure literal into the variable's own
 * default instead of null, for the small subset of fields that are
 * actually security-relevant.
 */
describe("generateModuleFiles — secureDefault on optional variables", () => {
  const REQUIRED_NAME_FIELD: FieldSpec = { name: "name", hclType: "string", required: true };

  it("uses a secureDefault string as the variable's own default instead of null", () => {
    const tlsField: FieldSpec = {
      name: "minimum_tls_version",
      hclType: "string",
      required: false,
      secureDefault: "1.2",
    };

    const { variablesTf } = generateModuleFiles({
      resourceType: "azurerm_redis_cache",
      moduleName: "redis_cache",
      mandatoryFields: [REQUIRED_NAME_FIELD],
      optionalFields: [tlsField],
      computedAttributes: [],
      versionConstraint: ">= 3.90.0, < 4.0.0",
    });

    expect(variablesTf).toMatch(/variable "minimum_tls_version" \{[^}]*default\s*=\s*"1\.2"/s);
  });

  it("uses a secureDefault bool as a bare true/false, not a quoted string", () => {
    const sslField: FieldSpec = {
      name: "enable_non_ssl_port",
      hclType: "bool",
      required: false,
      secureDefault: "false",
    };

    const { variablesTf } = generateModuleFiles({
      resourceType: "azurerm_redis_cache",
      moduleName: "redis_cache",
      mandatoryFields: [REQUIRED_NAME_FIELD],
      optionalFields: [sslField],
      computedAttributes: [],
      versionConstraint: ">= 3.90.0, < 4.0.0",
    });

    expect(variablesTf).toMatch(/variable "enable_non_ssl_port" \{[^}]*default\s*=\s*false(?!")/s);
  });

  it("still defaults to null when no secureDefault is given (most fields)", () => {
    const ordinaryField: FieldSpec = { name: "capacity", hclType: "number", required: false };

    const { variablesTf } = generateModuleFiles({
      resourceType: "azurerm_redis_cache",
      moduleName: "redis_cache",
      mandatoryFields: [REQUIRED_NAME_FIELD],
      optionalFields: [ordinaryField],
      computedAttributes: [],
      versionConstraint: ">= 3.90.0, < 4.0.0",
    });

    expect(variablesTf).toMatch(/variable "capacity" \{[^}]*default\s*=\s*null/s);
  });
});
