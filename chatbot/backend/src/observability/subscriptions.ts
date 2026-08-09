import { SubscriptionClient } from "@azure/arm-subscriptions";
import { azureCredential, azureSubscriptionId } from "../azure/credential.js";

export interface AccessibleSubscription {
  id: string;
  displayName: string;
}

let cached: AccessibleSubscription[] | undefined;

/**
 * Every enabled subscription the configured service principal can see —
 * not just the single AZURE_SUBSCRIPTION_ID this repo deploys into (see
 * ARCHITECTURE.md §5, single-subscription today). The Observability > Cost
 * tab's grand total sums across all of these, so it stays correct however
 * many subscriptions the org actually has, without per-subscription config.
 * Falls back to the one configured subscription if discovery fails or
 * returns nothing (e.g. the SP lacks a tenant-root role assignment) — the
 * dashboard should always work for at least the subscription this framework
 * actually manages. Cached for the process lifetime: the subscription list
 * changes rarely, and re-discovering on every dashboard refresh would just
 * add another Azure call on top of an API that already throttles hard.
 */
export async function listAccessibleSubscriptions(): Promise<AccessibleSubscription[]> {
  if (cached) return cached;
  const fallback: AccessibleSubscription[] = [{ id: azureSubscriptionId(), displayName: azureSubscriptionId() }];
  try {
    const client = new SubscriptionClient(azureCredential());
    const found: AccessibleSubscription[] = [];
    for await (const sub of client.subscriptions.list()) {
      if (sub.subscriptionId && sub.state === "Enabled") {
        found.push({ id: sub.subscriptionId, displayName: sub.displayName ?? sub.subscriptionId });
      }
    }
    cached = found.length > 0 ? found : fallback;
  } catch (err) {
    console.error("Subscription discovery failed, falling back to AZURE_SUBSCRIPTION_ID:", err);
    cached = fallback;
  }
  return cached;
}
