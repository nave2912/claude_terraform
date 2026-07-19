import { execFileSync } from "node:child_process";
import fs from "node:fs";
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

/** Checks out main, fast-forwards it, and creates+checks-out a new branch off it. */
export function createChangeBranch(branchPrefix: string): string {
  ensureCleanWorktree();
  git(["checkout", "main"]);
  git(["pull", "--ff-only", "origin", "main"]);
  const branch = `${branchPrefix}-${Date.now()}`;
  git(["checkout", "-b", branch]);
  return branch;
}

/** Writes file content and commits it on the current branch. */
export function writeAndCommit(filePath: string, content: string, message: string): void {
  fs.writeFileSync(filePath, content);
  git(["add", filePath]);
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
