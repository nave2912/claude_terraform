/**
 * Since there is no git commit/PR to serve as an audit trail for these
 * writes (unlike every other chatbot-authored change), this is the only
 * record of who touched what secret name and when. Never pass the secret
 * value in — this function has no parameter for it.
 */
export function logSecretWrite(entry: {
  requesterId?: string;
  vaultName: string;
  secretName: string;
  action: "set";
}): void {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      event: "keyvault-secret-write",
      requesterId: entry.requesterId ?? "unknown",
      vaultName: entry.vaultName,
      secretName: entry.secretName,
      action: entry.action,
    })
  );
}
