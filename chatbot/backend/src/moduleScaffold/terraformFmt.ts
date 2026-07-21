import { execFileSync } from "node:child_process";

/**
 * Runs `terraform fmt -` (stdin -> stdout) over generated HCL so it matches
 * this repo's canonical formatting before it's ever committed — the
 * existing CI `validate` job runs `terraform fmt -check`, and mechanically
 * generated HCL (fixed-width `=` alignment per block, not per file) doesn't
 * match that convention without this pass.
 */
export function formatHcl(content: string): string {
  return execFileSync("terraform", ["fmt", "-"], {
    input: content,
    encoding: "utf-8",
  });
}
