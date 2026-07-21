import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "../config/paths.js";

/**
 * Shells out to the system `git` (and optionally `gh`) against the repo
 * checkout this backend lives in. No GitHub token is ever required for
 * branch/commit/push — those use whatever git credentials are already
 * configured on this machine (same as any normal `git push`). Opening the
 * PR itself uses `gh` if installed and authenticated (`gh auth login` —
 * never a pasted token); otherwise callers get back a one-click "compare"
 * URL instead and open it manually. Either way, this module never
 * force-pushes, never pushes to main, and never merges anything.
 */

function git(args: string[]): string {
  return execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf-8" }).trim();
}

export function ensureCleanWorktree(): void {
  const status = git(["status", "--porcelain"]);
  if (status) {
    throw new Error(
      `Working tree has uncommitted changes:\n${status}\n` +
        `Commit or stash before creating a chatbot branch.`
    );
  }
}

/**
 * Fetches origin/main and branches directly off that fetched ref — never
 * off the locally checked-out `main`, and never via `git pull --ff-only`.
 *
 * Why: this backend's local `main` routinely carries commits that haven't
 * been pushed yet (the operator's own in-progress work, kept local on
 * purpose). A `git checkout main; git pull --ff-only origin main` fails
 * outright the moment local main is even one commit ahead of origin —
 * exactly the state this repo is normally in — with a fatal
 * "not possible to fast-forward" error that used to require a manual fix
 * before the next PR could be opened. Branching from `origin/main`
 * directly sidesteps that class of error entirely (nothing about local
 * main's state matters), and as a side benefit keeps the PR's diff
 * limited to the actual intended change instead of accidentally dragging
 * along whatever unpushed local commits happened to exist at the time.
 */
export function createChangeBranch(branchPrefix: string): string {
  ensureCleanWorktree();
  git(["fetch", "origin", "main"]);
  const branch = `${branchPrefix}-${Date.now()}`;
  git(["checkout", "-B", branch, "origin/main"]);
  return branch;
}

/** Writes file content and commits it on the current branch. */
export function writeAndCommit(filePath: string, content: string, message: string): void {
  fs.writeFileSync(filePath, content);
  git(["add", filePath]);
  git(["commit", "-m", message]);
}

/**
 * Writes several files and commits them together as a single commit.
 * Used by multi-file operations (e.g. module scaffolding, which writes 5
 * module files + a schema file + a test file in one go) so a partial
 * failure never leaves a half-scaffolded branch with several disjoint
 * commits — either every file lands in one commit, or `git commit` fails
 * with nothing left committed. Directories are created as needed.
 */
export function writeMultipleAndCommit(
  files: { filePath: string; content: string }[],
  message: string
): void {
  for (const { filePath, content } of files) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
  }
  git(["add", ...files.map((f) => f.filePath)]);
  git(["commit", "-m", message]);
}

export function pushBranch(branch: string): void {
  git(["push", "-u", "origin", branch]);
}

/** Returns to main so the next invocation starts from a clean base. */
export function returnToMain(): void {
  git(["checkout", "main"]);
}

function originHttpsUrl(): string | null {
  try {
    const url = git(["remote", "get-url", "origin"]);
    // normalize git@github.com:owner/repo.git -> https://github.com/owner/repo
    const sshMatch = url.match(/^git@([^:]+):(.+?)(\.git)?$/);
    if (sshMatch) return `https://${sshMatch[1]}/${sshMatch[2]}`;
    return url.replace(/\.git$/, "");
  } catch {
    return null;
  }
}

/** Best-effort GitHub "create PR" link — no API/token needed, just opens the compare view. */
export function compareUrl(branch: string): string | null {
  const base = originHttpsUrl();
  if (!base) return null;
  return `${base}/compare/main...${branch}?expand=1`;
}

export interface OpenPrResult {
  /** Set when `gh pr create` succeeded — the PR is already open. */
  prUrl: string | null;
  /** Always set — fallback link if prUrl is null (gh unavailable/unauthenticated). */
  compareUrl: string | null;
}

/**
 * Tries to open the PR via `gh api ... --input -`, piping a JSON payload
 * over stdin rather than passing title/body as command-line arguments.
 * This deliberately avoids `gh pr create --title ... --body ...`: on
 * Windows, Node's child_process argument quoting for multi-word CLI
 * arguments can get corrupted (observed: literal "^" characters inserted
 * before spaces), silently mangling free-text content. Since none of the
 * free-text here goes through argv, that whole bug class doesn't apply.
 * Falls back to a compare-view link if gh isn't available/authenticated.
 */
export function openPullRequest(branch: string, title: string, body: string): OpenPrResult {
  try {
    const payload = JSON.stringify({
      title,
      head: branch,
      base: "main",
      body,
    });
    const output = execFileSync(
      "gh",
      ["api", "repos/{owner}/{repo}/pulls", "--input", "-"],
      { cwd: REPO_ROOT, encoding: "utf-8", input: payload }
    );
    const parsed = JSON.parse(output) as { html_url: string };
    return { prUrl: parsed.html_url, compareUrl: null };
  } catch {
    return { prUrl: null, compareUrl: compareUrl(branch) };
  }
}

export interface MergePrResult {
  merged: boolean;
  sha?: string;
  error?: string;
}

/**
 * Squash-merges a PR this same pipeline opened, via `gh api ... -X PUT`
 * (same stdin-JSON pattern as openPullRequest, for the same reason: no
 * free text on argv). This is still a human action — it only runs when a
 * person clicks "Merge" in the chat UI after reviewing the preview/PR, the
 * same authority a human already has clicking GitHub's own merge button.
 * It does not touch the environment `apply` approval gate configured on
 * the repo — merging triggers the push->apply workflow exactly as a
 * manual GitHub merge would, still subject to whatever gate is configured
 * there.
 */
export function mergePullRequest(prNumber: number): MergePrResult {
  try {
    const output = execFileSync(
      "gh",
      ["api", `repos/{owner}/{repo}/pulls/${prNumber}/merge`, "-X", "PUT", "--input", "-"],
      {
        cwd: REPO_ROOT,
        encoding: "utf-8",
        input: JSON.stringify({ merge_method: "squash" }),
      }
    );
    const parsed = JSON.parse(output) as { merged: boolean; sha: string; message?: string };
    return parsed.merged ? { merged: true, sha: parsed.sha } : { merged: false, error: parsed.message };
  } catch (err) {
    return { merged: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Deletes the remote branch after a successful merge — best-effort, never
 * throws, since a leftover branch after a real merge isn't worth failing
 * the whole request over. */
export function deleteRemoteBranch(branch: string): void {
  try {
    git(["push", "origin", "--delete", branch]);
  } catch {
    // best-effort cleanup only
  }
}

export interface PrCheck {
  name: string;
  state: "success" | "failure" | "pending";
  detailsUrl?: string;
}

export interface PrStatusResult {
  /** "none" = no CI checks configured/reported yet at all — distinct from
   * "pending" (checks exist and are still running). */
  overall: "success" | "failure" | "pending" | "none";
  checks: PrCheck[];
  /** Only populated once overall has settled (success/failure) and a
   * "plan" check ran — extracted from the workflow run's own log via
   * `gh run view --log`, not re-fetched on every poll. */
  planSummary?: string | null;
  error?: string;
}

type RawCheck = {
  name?: string;
  context?: string;
  status?: string;
  conclusion?: string | null;
  state?: string;
  detailsUrl?: string;
  html_url?: string;
};

/**
 * Normalizes one check-run/status-context entry (case varies: GraphQL's
 * statusCheckRollup uses upper-case SUCCESS/COMPLETED, the REST
 * check-runs API uses lower-case success/completed) into a three-state
 * result, or null for a check that was skipped entirely (e.g. this repo's
 * `apply` job, which is `if: github.event_name == 'push'` and so always
 * reports SKIPPED on a pull_request-triggered run — not relevant pre-merge
 * and would be misleading to show as passing).
 */
function normalizeCheck(c: RawCheck): PrCheck | null {
  const name = c.name ?? c.context ?? "check";
  const detailsUrl = c.detailsUrl ?? c.html_url;
  const conclusion = c.conclusion?.toUpperCase();
  const status = c.status?.toUpperCase();

  if (conclusion) {
    if (conclusion === "SKIPPED") return null;
    const success = conclusion === "SUCCESS" || conclusion === "NEUTRAL";
    return { name, state: success ? "success" : "failure", detailsUrl };
  }
  if (status && status !== "COMPLETED") {
    return { name, state: "pending", detailsUrl };
  }
  if (c.state) {
    const state = c.state.toUpperCase();
    if (state === "SUCCESS") return { name, state: "success", detailsUrl };
    if (state === "PENDING") return { name, state: "pending", detailsUrl };
    return { name, state: "failure", detailsUrl };
  }
  return { name, state: "pending", detailsUrl };
}

function overallFrom(checks: PrCheck[]): PrStatusResult["overall"] {
  if (checks.length === 0) return "none";
  if (checks.some((c) => c.state === "failure")) return "failure";
  if (checks.some((c) => c.state === "pending")) return "pending";
  return "success";
}

/**
 * Extracts the `terraform plan` summary line ("Plan: N to add, N to
 * change, N to destroy." or "No changes...") from the plan check's own
 * workflow run log, via `gh run view --log` — the checks API only reports
 * pass/fail, not what would actually change, and that's the piece a human
 * needs to make a real merge decision from chat instead of clicking
 * through to GitHub.
 */
function extractPlanSummary(planCheck: PrCheck | undefined): string | null {
  if (!planCheck?.detailsUrl) return null;
  const runIdMatch = planCheck.detailsUrl.match(/\/runs\/(\d+)\//);
  if (!runIdMatch) return null;
  try {
    const log = execFileSync("gh", ["run", "view", runIdMatch[1], "--log"], {
      cwd: REPO_ROOT,
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
    })
      // `gh run view --log` emits ANSI color codes as a literal caret +
      // bracket pair ("^[[1m") rather than the real ESC control byte —
      // observed empirically, strip both forms defensively.
      // eslint-disable-next-line no-control-regex
      .replace(/\x1b\[[0-9;]*m/g, "")
      .replace(/\^\[\[[0-9;]*m/g, "");
    const match = log.match(
      /Plan: \d+ to add, \d+ to change, \d+ to destroy\.|No changes\. Your infrastructure matches the configuration\./
    );
    return match?.[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Reads the PR's own CI status (the pull_request-triggered validate/plan
 * workflow) via `gh pr view --json statusCheckRollup` — this is what
 * gates whether the chat UI is allowed to offer a merge button at all.
 */
export function getPrStatus(prNumber: number): PrStatusResult {
  try {
    const output = execFileSync(
      "gh",
      ["pr", "view", String(prNumber), "--json", "statusCheckRollup"],
      { cwd: REPO_ROOT, encoding: "utf-8" }
    );
    const parsed = JSON.parse(output) as { statusCheckRollup: RawCheck[] };
    const checks = (parsed.statusCheckRollup ?? [])
      .map(normalizeCheck)
      .filter((c): c is PrCheck => c !== null);
    const overall = overallFrom(checks);

    let planSummary: string | null | undefined;
    if (overall === "success" || overall === "failure") {
      planSummary = extractPlanSummary(checks.find((c) => c.name === "plan"));
    }

    return { overall, checks, planSummary };
  } catch (err) {
    return { overall: "none", checks: [], error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Same shape as getPrStatus, but for a single commit (used after a merge
 * to track the resulting push->apply workflow run, which the PR's own
 * pull_request-triggered checks never included since `apply` only runs on
 * push). Uses the REST check-runs endpoint since there's no PR to view.
 */
export function getCommitStatus(sha: string): PrStatusResult {
  try {
    const output = execFileSync(
      "gh",
      ["api", `repos/{owner}/{repo}/commits/${sha}/check-runs`],
      { cwd: REPO_ROOT, encoding: "utf-8" }
    );
    const parsed = JSON.parse(output) as { check_runs: RawCheck[] };
    const checks = (parsed.check_runs ?? [])
      .map(normalizeCheck)
      .filter((c): c is PrCheck => c !== null);
    return { overall: overallFrom(checks), checks };
  } catch (err) {
    return { overall: "none", checks: [], error: err instanceof Error ? err.message : String(err) };
  }
}
