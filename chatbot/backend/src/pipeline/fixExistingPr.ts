import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT, MODULES_DIR } from "../config/paths.js";
import { diagnosePrFix } from "../moduleScaffold/diagnoseFix.js";
import { formatHcl } from "../moduleScaffold/terraformFmt.js";
import {
  getPrInfo,
  getPrStatus,
  checkoutExistingBranch,
  writeMultipleAndCommit,
  pushBranch,
  returnToMain,
} from "../gitprovider/index.js";

const CHECKOV_FILE = path.join(REPO_ROOT, ".checkov.yaml");

export type DiagnoseOutcome =
  | { status: "nothing_failing"; message: string }
  | { status: "fix_proposed"; explanation: string; files: { filePath: string; newContent: string }[] }
  | { status: "needs_clarification"; question: string }
  | { status: "escalated"; reason: string };

export type ApplyOutcome =
  | { status: "fix_applied"; branch: string; filesChanged: string[] }
  | { status: "apply_failed"; error: string };

/**
 * Derives which module/model files this PR is even about, from the PR's
 * own changed-file list — same info a human would infer by skimming the
 * diff. `modules/<name>/...` gives the module; the one
 * `models/<env>/<type>.json` (never `models/schema/...`) gives the model
 * entry. A PR touching neither (shouldn't happen for anything this
 * scaffolder opens) just means no module/model file is offered to Claude.
 */
function deriveScope(files: string[]): { moduleName: string | null; modelFile: string | null } {
  let moduleName: string | null = null;
  let modelFile: string | null = null;
  for (const f of files) {
    const moduleMatch = f.match(/^modules\/([^/]+)\//);
    if (moduleMatch && !moduleName) moduleName = moduleMatch[1];
    const modelMatch = f.match(/^models\/([^/]+)\/([^/]+\.json)$/);
    if (modelMatch && modelMatch[1] !== "schema" && !modelFile) modelFile = f;
  }
  return { moduleName, modelFile };
}

/** Every file this PR is allowed to have a fix proposed/applied for —
 * computed once and used both to build Claude's context and, separately,
 * to reject anything it proposes outside this set. Absolute paths. */
function allowedFiles(moduleName: string | null, modelFile: string | null): string[] {
  const files: string[] = [];
  if (moduleName) {
    const moduleDir = path.join(MODULES_DIR, moduleName);
    if (fs.existsSync(moduleDir)) {
      for (const entry of fs.readdirSync(moduleDir)) {
        if (entry.endsWith(".tf")) files.push(path.join(moduleDir, entry));
      }
    }
  }
  if (modelFile) {
    const abs = path.join(REPO_ROOT, modelFile);
    if (fs.existsSync(abs)) files.push(abs);
  }
  if (fs.existsSync(CHECKOV_FILE)) files.push(CHECKOV_FILE);
  return files;
}

function toRepoRelative(absPath: string): string {
  return path.relative(REPO_ROOT, absPath).replace(/\\/g, "/");
}

/**
 * Read-only diagnosis: figures out what's failing, reads the current
 * content of whatever this PR is allowed to touch, and asks Claude for a
 * fix / a clarifying question / an escalation. Never commits or pushes —
 * mirrors scaffoldModulePlan.ts's read-only "plan" step. Branch-checkout
 * happens only to read files off that branch's own working tree; always
 * returns to main before returning, same discipline as every other
 * pipeline entry point in this backend.
 */
export async function diagnosePrFailure(prNumber: number, userReply?: string): Promise<DiagnoseOutcome> {
  const prInfo = getPrInfo(prNumber);
  const status = getPrStatus(prNumber);
  const failingChecks = status.checks.filter((c) => c.state === "failure" && c.errorText);

  if (failingChecks.length === 0) {
    return { status: "nothing_failing", message: "No failing check with error text was found on this PR." };
  }

  const { moduleName, modelFile } = deriveScope(prInfo.files);
  const allowed = allowedFiles(moduleName, modelFile);

  checkoutExistingBranch(prInfo.branch);
  const fileContexts = allowed.map((absPath) => ({
    filePath: toRepoRelative(absPath),
    content: fs.readFileSync(absPath, "utf-8"),
  }));
  const checkovFileContent = fs.existsSync(CHECKOV_FILE) ? fs.readFileSync(CHECKOV_FILE, "utf-8") : "";
  returnToMain();

  const result = await diagnosePrFix({
    providerResourceType: moduleName ?? "unknown",
    moduleName: moduleName ?? "unknown",
    failingChecks: failingChecks.map((c) => ({ name: c.name, errorText: c.errorText! })),
    files: fileContexts,
    checkovFileContent,
    userReply,
  });

  if (result.kind === "needs_clarification") {
    return { status: "needs_clarification", question: result.question };
  }
  if (result.kind === "escalated") {
    return { status: "escalated", reason: result.reason };
  }

  // Hard-enforced allowlist — even though the prompt already tells Claude
  // not to, a proposed edit to anything outside the exact set of files it
  // was shown gets dropped here, not applied. This is the real safety
  // boundary; the prompt instruction is just the first line of defense.
  const allowedRelative = new Set(allowed.map(toRepoRelative));
  const inScope = result.files.filter((f) => allowedRelative.has(f.filePath));
  const droppedCount = result.files.length - inScope.length;

  if (inScope.length === 0) {
    return {
      status: "escalated",
      reason:
        droppedCount > 0
          ? "The model only proposed changes outside the files this PR is allowed to touch — dropped, nothing left to apply."
          : "The model proposed no file changes.",
    };
  }

  const explanation =
    droppedCount > 0
      ? `${result.explanation}\n\n(${droppedCount} additional proposed change(s) outside the allowed files were dropped.)`
      : result.explanation;

  return { status: "fix_proposed", explanation, files: inScope };
}

/**
 * Writes exactly the files the user already saw and approved in the
 * diagnose preview — never re-runs Claude, so what gets applied is
 * guaranteed to be what was shown, not a fresh (possibly different)
 * answer. Re-validates each file by content type before writing (the
 * same formatHcl pass scaffoldModule.ts already runs for .tf files, a
 * JSON.parse check for the model file) so a malformed proposal fails here
 * instead of landing as a broken commit.
 */
export async function applyPrFix(
  prNumber: number,
  files: { filePath: string; newContent: string }[]
): Promise<ApplyOutcome> {
  if (files.length === 0) {
    return { status: "apply_failed", error: "No files to apply." };
  }

  const prInfo = getPrInfo(prNumber);
  const { moduleName, modelFile } = deriveScope(prInfo.files);
  const allowedRelative = new Set(allowedFiles(moduleName, modelFile).map(toRepoRelative));

  for (const f of files) {
    if (!allowedRelative.has(f.filePath)) {
      return { status: "apply_failed", error: `Refusing to write out-of-scope file: ${f.filePath}` };
    }
  }

  const prepared: { filePath: string; content: string }[] = [];
  try {
    for (const f of files) {
      let content = f.newContent;
      if (f.filePath.endsWith(".tf")) {
        content = formatHcl(content);
      } else if (f.filePath.endsWith(".json")) {
        JSON.parse(content); // throws on malformed JSON — caught below
      }
      // .checkov.yaml: no YAML parser dependency exists in this backend;
      // validated by CI's own checkov run on the resulting commit instead.
      prepared.push({ filePath: path.join(REPO_ROOT, f.filePath), content });
    }
  } catch (err) {
    return {
      status: "apply_failed",
      error: `Proposed content failed validation: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  checkoutExistingBranch(prInfo.branch);
  try {
    writeMultipleAndCommit(
      prepared,
      `Fix with AI: PR #${prNumber}\n\nApplied via the chatbot's "Fix with AI" flow.`
    );
    pushBranch(prInfo.branch);
  } finally {
    returnToMain();
  }

  return { status: "fix_applied", branch: prInfo.branch, filesChanged: files.map((f) => f.filePath) };
}
