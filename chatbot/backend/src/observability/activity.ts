import { azureCredential, azureSubscriptionId } from "../azure/credential.js";
import { withRetry } from "../azure/withRetry.js";
import { listResources } from "./inventory.js";

/**
 * Azure Activity Log only records management-plane operations (create,
 * update, delete, list-keys, role assignment, etc.) — not data-plane
 * traffic. So "lastActivityAt" below means "last time this resource was
 * touched via the Azure control plane", not "last time an application
 * actually used it". Good enough for "who changed this and when", not a
 * usage/traffic metric.
 */
const ACTIVITY_LOOKBACK_DAYS = 90;
const MAX_PAGES = 5;

interface ActivityLogEvent {
  resourceId?: string;
  caller?: string;
  eventTimestamp?: string;
  operationName?: { localizedValue?: string };
}

async function fetchActivityLog(resourceGroup?: string): Promise<ActivityLogEvent[]> {
  const credential = azureCredential();
  const token = await credential.getToken("https://management.azure.com/.default");
  const subscriptionId = azureSubscriptionId();

  const end = new Date();
  const start = new Date(end.getTime() - ACTIVITY_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  let filter = `eventTimestamp ge '${start.toISOString()}' and eventTimestamp le '${end.toISOString()}'`;
  if (resourceGroup) filter += ` and resourceGroupName eq '${resourceGroup}'`;

  let url =
    `https://management.azure.com/subscriptions/${subscriptionId}/providers/Microsoft.Insights/eventtypes/management/values` +
    `?api-version=2015-04-01&$select=resourceId,caller,eventTimestamp,operationName&$filter=${encodeURIComponent(filter)}`;

  const events: ActivityLogEvent[] = [];
  for (let page = 0; page < MAX_PAGES && url; page++) {
    const pageUrl = url;
    const body = await withRetry(async () => {
      const res = await fetch(pageUrl, { headers: { Authorization: `Bearer ${token?.token}` } });
      if (!res.ok) {
        const err = new Error(`Activity Log query failed (${res.status}): ${await res.text()}`) as Error & {
          statusCode?: number;
        };
        err.statusCode = res.status;
        throw err;
      }
      return (await res.json()) as { value?: ActivityLogEvent[]; nextLink?: string };
    });
    events.push(...(body.value ?? []));
    url = body.nextLink ?? "";
  }
  return events;
}

export interface ResourceActivitySummary {
  resourceId: string;
  name: string;
  type: string;
  resourceGroup: string;
  lastActivityAt: string | null;
  lastModifiedBy: string | null;
  lastOperation: string | null;
}

/**
 * Live resource inventory joined with each resource's most recent Activity
 * Log entry (last 90 days) — so a resource nobody has touched still shows
 * up, just with null activity fields, instead of silently disappearing.
 */
export async function resourceActivity(resourceGroup?: string): Promise<ResourceActivitySummary[]> {
  const [events, resources] = await Promise.all([
    fetchActivityLog(resourceGroup),
    listResources(resourceGroup),
  ]);

  // Different ARM APIs case resource IDs differently (e.g. Cost Management
  // lowercases "resourceGroups"/"providers"); key everything by lowercase
  // so the join isn't order-of-magnitude sensitive to that.
  const latestByResource = new Map<string, ActivityLogEvent>();
  for (const event of events) {
    if (!event.resourceId || !event.eventTimestamp) continue;
    const key = event.resourceId.toLowerCase();
    const current = latestByResource.get(key);
    if (!current || !current.eventTimestamp || event.eventTimestamp > current.eventTimestamp) {
      latestByResource.set(key, event);
    }
  }

  return resources
    .map((resource) => {
      const event = latestByResource.get(resource.resourceId.toLowerCase());
      return {
        resourceId: resource.resourceId,
        name: resource.name,
        type: resource.type,
        resourceGroup: resource.resourceGroup,
        lastActivityAt: event?.eventTimestamp ?? null,
        lastModifiedBy: event?.caller ?? null,
        lastOperation: event?.operationName?.localizedValue ?? null,
      };
    })
    .sort((a, b) => (b.lastActivityAt ?? "").localeCompare(a.lastActivityAt ?? ""));
}
