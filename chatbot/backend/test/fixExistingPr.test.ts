import { describe, expect, it, jest, beforeAll, beforeEach } from "@jest/globals";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

/**
 * Regression coverage for the "Fix with AI" pipeline (pipeline/fixExistingPr.ts).
 * Uses modules/resource_group + models/dev/resource-group.json as real,
 * already-on-disk fixtures (same reference-module pattern
 * scaffoldModule.resourceGroup.test.ts uses) rather than mocking the
 * filesystem — only gitprovider (git/gh side effects) and the Claude call
 * are mocked, so this needs neither network access nor a real git push.
 */

const mockGetPrInfo = jest.fn();
const mockGetPrStatus = jest.fn();
const mockCheckoutExistingBranch = jest.fn();
const mockWriteMultipleAndCommit = jest.fn();
const mockPushBranch = jest.fn();
const mockReturnToMain = jest.fn();
const mockDiagnosePrFix = jest.fn();

jest.unstable_mockModule("../src/gitprovider/index.js", () => ({
  getPrInfo: mockGetPrInfo,
  getPrStatus: mockGetPrStatus,
  checkoutExistingBranch: mockCheckoutExistingBranch,
  writeMultipleAndCommit: mockWriteMultipleAndCommit,
  pushBranch: mockPushBranch,
  returnToMain: mockReturnToMain,
}));

jest.unstable_mockModule("../src/moduleScaffold/diagnoseFix.js", () => ({
  diagnosePrFix: mockDiagnosePrFix,
}));

jest.unstable_mockModule("../src/moduleScaffold/terraformFmt.js", () => ({
  formatHcl: (content: string) => content,
}));

let diagnosePrFailure: typeof import("../src/pipeline/fixExistingPr.js")["diagnosePrFailure"];
let applyPrFix: typeof import("../src/pipeline/fixExistingPr.js")["applyPrFix"];

beforeAll(async () => {
  ({ diagnosePrFailure, applyPrFix } = await import("../src/pipeline/fixExistingPr.js"));
});

beforeEach(() => {
  jest.clearAllMocks();
});

const PR_FILES = ["modules/resource_group/main.tf", "models/dev/resource-group.json"];

function mockFailingStatus() {
  mockGetPrInfo.mockReturnValue({ branch: "chatbot/scaffold-resource_group-123", files: PR_FILES });
  mockGetPrStatus.mockReturnValue({
    overall: "failure",
    checks: [
      { name: "validate", state: "failure", errorText: "Check: CKV2_AZURE_49\nFAILED for resource: ..." },
      { name: "plan", state: "success" },
    ],
  });
}

describe("diagnosePrFailure", () => {
  it("returns nothing_failing when no check has errorText", async () => {
    mockGetPrInfo.mockReturnValue({ branch: "some-branch", files: PR_FILES });
    mockGetPrStatus.mockReturnValue({ overall: "success", checks: [{ name: "validate", state: "success" }] });

    const outcome = await diagnosePrFailure(74);
    expect(outcome.status).toBe("nothing_failing");
    expect(mockDiagnosePrFix).not.toHaveBeenCalled();
  });

  it("passes through a fix_proposed result whose files are all in scope", async () => {
    mockFailingStatus();
    mockDiagnosePrFix.mockResolvedValue({
      kind: "fix_proposed",
      explanation: "Fixed the tags block.",
      files: [{ filePath: "models/dev/resource-group.json", newContent: "{}" }],
    });

    const outcome = await diagnosePrFailure(74);
    expect(outcome.status).toBe("fix_proposed");
    if (outcome.status !== "fix_proposed") return;
    expect(outcome.files).toEqual([{ filePath: "models/dev/resource-group.json", newContent: "{}" }]);
    expect(outcome.explanation).toBe("Fixed the tags block.");

    // Read-only: checked out to read files, but never wrote/committed/pushed.
    expect(mockCheckoutExistingBranch).toHaveBeenCalledWith("chatbot/scaffold-resource_group-123");
    expect(mockReturnToMain).toHaveBeenCalled();
    expect(mockWriteMultipleAndCommit).not.toHaveBeenCalled();
    expect(mockPushBranch).not.toHaveBeenCalled();
  });

  it("drops an out-of-scope file but keeps in-scope ones, noting the drop", async () => {
    mockFailingStatus();
    mockDiagnosePrFix.mockResolvedValue({
      kind: "fix_proposed",
      explanation: "Fixed it.",
      files: [
        { filePath: "models/dev/resource-group.json", newContent: "{}" },
        { filePath: "environments/dev/main.tf", newContent: "malicious" },
      ],
    });

    const outcome = await diagnosePrFailure(74);
    expect(outcome.status).toBe("fix_proposed");
    if (outcome.status !== "fix_proposed") return;
    expect(outcome.files).toEqual([{ filePath: "models/dev/resource-group.json", newContent: "{}" }]);
    expect(outcome.explanation).toMatch(/dropped/i);
  });

  it("escalates when every proposed file is out of scope", async () => {
    mockFailingStatus();
    mockDiagnosePrFix.mockResolvedValue({
      kind: "fix_proposed",
      explanation: "Fixed it.",
      files: [{ filePath: "environments/dev/main.tf", newContent: "malicious" }],
    });

    const outcome = await diagnosePrFailure(74);
    expect(outcome.status).toBe("escalated");
  });

  it("passes through needs_clarification and escalated unchanged", async () => {
    mockFailingStatus();
    mockDiagnosePrFix.mockResolvedValue({ kind: "needs_clarification", question: "What's your Key Vault ID?" });
    let outcome = await diagnosePrFailure(74);
    expect(outcome).toEqual({ status: "needs_clarification", question: "What's your Key Vault ID?" });

    mockDiagnosePrFix.mockResolvedValue({ kind: "escalated", reason: "Needs new VNET wiring." });
    outcome = await diagnosePrFailure(74);
    expect(outcome).toEqual({ status: "escalated", reason: "Needs new VNET wiring." });
  });

  it("forwards userReply through to the Claude call for a clarification round-trip", async () => {
    mockFailingStatus();
    mockDiagnosePrFix.mockResolvedValue({ kind: "escalated", reason: "still stuck" });

    await diagnosePrFailure(74, "use kv-existing-vault");
    expect(mockDiagnosePrFix).toHaveBeenCalledWith(expect.objectContaining({ userReply: "use kv-existing-vault" }));
  });
});

describe("applyPrFix", () => {
  const VALID_FILES = [{ filePath: "models/dev/resource-group.json", newContent: '{"resource_groups":{}}' }];

  beforeEach(() => {
    mockGetPrInfo.mockReturnValue({ branch: "chatbot/scaffold-resource_group-123", files: PR_FILES });
  });

  it("commits and pushes valid in-scope files to the same branch", async () => {
    const outcome = await applyPrFix(74, VALID_FILES);
    expect(outcome).toEqual({
      status: "fix_applied",
      branch: "chatbot/scaffold-resource_group-123",
      filesChanged: ["models/dev/resource-group.json"],
    });
    expect(mockCheckoutExistingBranch).toHaveBeenCalledWith("chatbot/scaffold-resource_group-123");
    expect(mockWriteMultipleAndCommit).toHaveBeenCalledTimes(1);
    const [writtenFiles] = mockWriteMultipleAndCommit.mock.calls[0] as [{ filePath: string; content: string }[], string];
    expect(writtenFiles[0].filePath).toBe(path.join(REPO_ROOT, "models", "dev", "resource-group.json"));
    expect(mockPushBranch).toHaveBeenCalledWith("chatbot/scaffold-resource_group-123");
    expect(mockReturnToMain).toHaveBeenCalled();
  });

  it("refuses an out-of-scope file without touching git at all", async () => {
    const outcome = await applyPrFix(74, [{ filePath: "environments/dev/main.tf", newContent: "malicious" }]);
    expect(outcome.status).toBe("apply_failed");
    expect(mockCheckoutExistingBranch).not.toHaveBeenCalled();
    expect(mockWriteMultipleAndCommit).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON content before ever checking out the branch", async () => {
    const outcome = await applyPrFix(74, [{ filePath: "models/dev/resource-group.json", newContent: "{not valid json" }]);
    expect(outcome.status).toBe("apply_failed");
    if (outcome.status !== "apply_failed") return;
    expect(outcome.error).toMatch(/validation/i);
    expect(mockCheckoutExistingBranch).not.toHaveBeenCalled();
    expect(mockWriteMultipleAndCommit).not.toHaveBeenCalled();
  });

  it("rejects an empty files array", async () => {
    const outcome = await applyPrFix(74, []);
    expect(outcome.status).toBe("apply_failed");
    expect(mockCheckoutExistingBranch).not.toHaveBeenCalled();
  });
});
