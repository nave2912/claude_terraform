import fs from "node:fs";

/**
 * Defense-in-depth for shells that corrupt argv before this process even
 * starts (observed on Windows: a literal "^" inserted before every space
 * and at the string boundary — cmd.exe's own escape character, leaking
 * through some npm.cmd/shell invocation paths when a multi-word quoted
 * argument is passed through). --file avoids this entirely by never
 * passing the message through shell argument parsing; this is a safety
 * net for anyone still passing the message inline on an affected shell.
 */
export function stripStrayCarets(message: string): string {
  return message.replace(/\^(?=\s|$)/g, "").replace(/^\^/, "");
}

/**
 * Reads the natural-language message either from a --file <path> argument
 * or by joining the remaining CLI args. Recognizes and strips --mock so
 * callers that support it can still detect it via includesMock.
 */
export function readMessage(rawArgs: string[]): { message: string; mock: boolean } {
  const mock = rawArgs.includes("--mock");
  const args = rawArgs.filter((a) => a !== "--mock");

  const fileFlagIndex = args.indexOf("--file");
  if (fileFlagIndex !== -1) {
    const filePath = args[fileFlagIndex + 1];
    if (!filePath) {
      console.error("--file requires a path argument");
      process.exit(1);
    }
    return { message: fs.readFileSync(filePath, "utf-8").trim(), mock };
  }

  return { message: stripStrayCarets(args.join(" ")), mock };
}
