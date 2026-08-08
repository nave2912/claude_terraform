import { describe, expect, it, jest, beforeAll, beforeEach } from "@jest/globals";

/**
 * Regression/behavior coverage for the errorText enrichment added to
 * getPrStatus/getCommitStatus (chatbot/backend/src/gitprovider/index.ts):
 * before this, a failing check only ever carried a name + pass/fail state,
 * so the chat UI had nothing to show beyond a red X — the user had to open
 * GitHub themselves to read the actual error. execFileSync is mocked so
 * this needs neither a real git checkout nor real GitHub API access.
 */

const mockExecFileSync = jest.fn();

jest.unstable_mockModule("node:child_process", () => ({
  execFileSync: mockExecFileSync,
}));

let getPrStatus: typeof import("../src/gitprovider/index.js")["getPrStatus"];

beforeAll(async () => {
  ({ getPrStatus } = await import("../src/gitprovider/index.js"));
});

beforeEach(() => {
  mockExecFileSync.mockReset();
});

// gh run view <runId> --log-failed's real line shape:
// "<jobName>\t<stepName>\t<ISO timestamp> <log text>"
const FAILED_LOG =
  [
    "validate\tcheckov\t2026-08-08T09:49:19.6592225Z FAILED for resource: module.machine_learning_workspace.azurerm_machine_learning_workspace.this",
    "validate\tcheckov\t2026-08-08T09:49:19.6605260Z Check: CKV2_AZURE_49",
    "plan\tterraform plan\t2026-08-08T10:23:43.3724417Z Error: expected identity.0.type to be one of [...], got placeholder",
  ].join("\n") + "\n";

function mockGhSequence(statusCheckRollup: unknown[]) {
  mockExecFileSync.mockImplementation((cmd: string, args: string[]) => {
    if (cmd === "gh" && args[0] === "pr" && args[1] === "view") {
      return JSON.stringify({ statusCheckRollup });
    }
    if (cmd === "gh" && args[0] === "run" && args[1] === "view" && args.includes("--log-failed")) {
      return FAILED_LOG;
    }
    if (cmd === "gh" && args[0] === "run" && args[1] === "view" && args.includes("--log")) {
      return "No changes. Your infrastructure matches the configuration.\n";
    }
    throw new Error(`Unexpected exec: ${cmd} ${args.join(" ")}`);
  });
}

describe("getPrStatus — errorText enrichment", () => {
  it("attaches a scoped errorText excerpt to a failing check, and none to a passing one", () => {
    mockGhSequence([
      {
        name: "validate",
        status: "COMPLETED",
        conclusion: "FAILURE",
        detailsUrl: "https://github.com/o/r/actions/runs/111/job/222",
      },
      {
        name: "plan",
        status: "COMPLETED",
        conclusion: "SUCCESS",
        detailsUrl: "https://github.com/o/r/actions/runs/111/job/333",
      },
    ]);

    const result = getPrStatus(74);

    expect(result.overall).toBe("failure");
    const validateCheck = result.checks.find((c) => c.name === "validate")!;
    const planCheck = result.checks.find((c) => c.name === "plan")!;

    expect(validateCheck.state).toBe("failure");
    expect(validateCheck.errorText).toContain("CKV2_AZURE_49");
    // Scoped to its own job — must not leak the "plan" job's log line.
    expect(validateCheck.errorText).not.toContain("identity.0.type");

    // A passing check never gets errorText, even though it shares the same run.
    expect(planCheck.state).toBe("success");
    expect(planCheck.errorText).toBeUndefined();
  });

  it("gives each of two failing checks its own non-cross-contaminated excerpt", () => {
    mockGhSequence([
      {
        name: "validate",
        status: "COMPLETED",
        conclusion: "FAILURE",
        detailsUrl: "https://github.com/o/r/actions/runs/111/job/222",
      },
      {
        name: "plan",
        status: "COMPLETED",
        conclusion: "FAILURE",
        detailsUrl: "https://github.com/o/r/actions/runs/111/job/333",
      },
    ]);

    const result = getPrStatus(74);
    const validateCheck = result.checks.find((c) => c.name === "validate")!;
    const planCheck = result.checks.find((c) => c.name === "plan")!;

    expect(validateCheck.errorText).toContain("CKV2_AZURE_49");
    expect(validateCheck.errorText).not.toContain("identity.0.type");
    expect(planCheck.errorText).toContain("identity.0.type");
    expect(planCheck.errorText).not.toContain("CKV2_AZURE_49");

    // Only one --log-failed fetch for the shared run, not one per check.
    const logFetchCalls = mockExecFileSync.mock.calls.filter(
      (call) => call[1]?.[0] === "run" && call[1]?.includes("--log-failed")
    );
    expect(logFetchCalls).toHaveLength(1);
  });

  it("caps errorText length instead of returning an unbounded log", () => {
    const hugeLine = "validate\tcheckov\t2026-08-08T09:49:19Z " + "x".repeat(10_000);
    mockExecFileSync.mockImplementation((cmd: string, args: string[]) => {
      if (cmd === "gh" && args[0] === "pr" && args[1] === "view") {
        return JSON.stringify({
          statusCheckRollup: [
            {
              name: "validate",
              status: "COMPLETED",
              conclusion: "FAILURE",
              detailsUrl: "https://github.com/o/r/actions/runs/111/job/222",
            },
          ],
        });
      }
      if (cmd === "gh" && args.includes("--log-failed")) return hugeLine + "\n";
      if (cmd === "gh" && args.includes("--log")) return "";
      throw new Error("unexpected");
    });

    const result = getPrStatus(74);
    const validateCheck = result.checks.find((c) => c.name === "validate")!;
    expect(validateCheck.errorText!.length).toBeLessThanOrEqual(4000);
  });
});
