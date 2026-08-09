import { CostManagementClient } from "@azure/arm-costmanagement";
import { azureCredential, azureSubscriptionId } from "../azure/credential.js";
import { withRetry } from "../azure/withRetry.js";
import { listAccessibleSubscriptions } from "./subscriptions.js";

interface RawCostRow {
  label: string;
  cost: number;
  currency: string;
}

async function queryCost(
  scope: string,
  groupBy: "ResourceGroupName" | "ResourceId"
): Promise<RawCostRow[]> {
  const client = new CostManagementClient(azureCredential());
  const result = await withRetry(() =>
    client.query.usage(scope, {
      type: "ActualCost",
      timeframe: "MonthToDate",
      dataset: {
        granularity: "None",
        aggregation: { totalCost: { name: "Cost", function: "Sum" } },
        grouping: [{ type: "Dimension", name: groupBy }],
      },
    })
  );

  const columns = result?.columns ?? [];
  const costIdx = columns.findIndex((c) => c.name === "Cost");
  const labelIdx = columns.findIndex((c) => c.name === groupBy);
  const currencyIdx = columns.findIndex((c) => c.name === "Currency");

  return (result?.rows ?? [])
    .map((row) => ({
      label: labelIdx >= 0 ? String(row[labelIdx]) : "Unknown",
      cost: costIdx >= 0 ? Number(row[costIdx]) : 0,
      currency: currencyIdx >= 0 ? String(row[currencyIdx]) : "",
    }))
    .sort((a, b) => b.cost - a.cost);
}

/** /providers/... ARM resource ID -> short name + type, for display. */
function parseResourceId(resourceId: string): { name: string; type: string } {
  const parts = resourceId.split("/").filter(Boolean);
  const providersIdx = parts.findIndex((p) => p.toLowerCase() === "providers");
  if (providersIdx === -1 || parts.length < providersIdx + 3) {
    return { name: resourceId, type: "Unknown" };
  }
  const namespace = parts[providersIdx + 1];
  const typeParts = parts.slice(providersIdx + 2, -1);
  const name = parts[parts.length - 1];
  return { name, type: [namespace, ...typeParts].join("/") };
}

export interface SubscriptionCostRow {
  resourceGroup: string;
  cost: number;
  currency: string;
}

/** Month-to-date actual cost for the whole subscription, one row per resource group. */
export async function costBySubscription(): Promise<SubscriptionCostRow[]> {
  const scope = `/subscriptions/${azureSubscriptionId()}`;
  const rows = await queryCost(scope, "ResourceGroupName");
  return rows.map((r) => ({ resourceGroup: r.label, cost: r.cost, currency: r.currency }));
}

export interface ResourceCostRow {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  cost: number;
  currency: string;
}

/** Month-to-date actual cost for one resource group, one row per resource. */
export async function costByResourceGroup(resourceGroup: string): Promise<ResourceCostRow[]> {
  const scope = `/subscriptions/${azureSubscriptionId()}/resourceGroups/${resourceGroup}`;
  const rows = await queryCost(scope, "ResourceId");
  return rows.map((r) => {
    const { name, type } = parseResourceId(r.label);
    return { resourceId: r.label, resourceName: name, resourceType: type, cost: r.cost, currency: r.currency };
  });
}

/** Month-to-date total cost for one subscription — a single unaggregated row, no grouping. */
async function queryTotalCost(scope: string): Promise<{ cost: number; currency: string }> {
  const client = new CostManagementClient(azureCredential());
  const result = await withRetry(() =>
    client.query.usage(scope, {
      type: "ActualCost",
      timeframe: "MonthToDate",
      dataset: {
        granularity: "None",
        aggregation: { totalCost: { name: "Cost", function: "Sum" } },
      },
    })
  );
  const columns = result?.columns ?? [];
  const costIdx = columns.findIndex((c) => c.name === "Cost");
  const currencyIdx = columns.findIndex((c) => c.name === "Currency");
  const row = (result?.rows ?? [])[0];
  return {
    cost: row && costIdx >= 0 ? Number(row[costIdx]) : 0,
    currency: row && currencyIdx >= 0 ? String(row[currencyIdx]) : "",
  };
}

export interface SubscriptionCostSummaryRow {
  subscriptionId: string;
  subscriptionName: string;
  cost: number;
  currency: string;
  /** Set when this subscription's cost couldn't be queried (e.g. the
   * configured service principal has Reader on it but not Cost Management
   * Reader) — its cost is excluded from totalCost, not silently reported
   * as zero. */
  unavailable?: boolean;
}

export interface CostSummary {
  totalCost: number;
  currency: string;
  subscriptions: SubscriptionCostSummaryRow[];
}

/**
 * Month-to-date cost summed across every subscription the configured
 * service principal can see (see subscriptions.ts) — the Cost tab's
 * always-visible headline figure, however many subscriptions the org
 * actually has. Queried sequentially, not in parallel: Cost Management
 * throttles hard (see withRetry.ts), and firing concurrent per-subscription
 * queries only multiplies the odds of a 429 storm.
 */
export async function costGrandTotal(): Promise<CostSummary> {
  const subscriptions = await listAccessibleSubscriptions();
  const rows: SubscriptionCostSummaryRow[] = [];
  for (const sub of subscriptions) {
    try {
      const { cost, currency } = await queryTotalCost(`/subscriptions/${sub.id}`);
      rows.push({ subscriptionId: sub.id, subscriptionName: sub.displayName, cost, currency });
    } catch (err) {
      console.error(`Cost query failed for subscription ${sub.id}:`, err);
      rows.push({
        subscriptionId: sub.id,
        subscriptionName: sub.displayName,
        cost: 0,
        currency: "",
        unavailable: true,
      });
    }
  }
  const currency = rows.find((r) => r.currency)?.currency ?? "";
  const totalCost = rows.filter((r) => !r.unavailable).reduce((sum, r) => sum + r.cost, 0);
  return { totalCost, currency, subscriptions: rows.sort((a, b) => b.cost - a.cost) };
}

export type CostTrendGranularity = "Daily" | "Monthly";

export interface CostTrendPoint {
  /** ISO date (yyyy-mm-dd) — the day (Daily) or the 1st of the month (Monthly) this point covers. */
  date: string;
  cost: number;
}

export interface CostTrendResult {
  granularity: CostTrendGranularity;
  currency: string;
  points: CostTrendPoint[];
}

function normalizeTrendDate(raw: unknown, granularity: CostTrendGranularity): string {
  if (granularity === "Daily") {
    // Azure returns UsageDate as an integer in yyyyMMdd form.
    const digits = String(raw);
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }
  // Monthly: BillingMonth comes back as an offset-less ISO string, e.g.
  // "2026-07-01T00:00:00" — sliced directly rather than round-tripped
  // through `new Date(...).getUTC*()`, which would parse it as *local*
  // time and could shift the month depending on the server's timezone.
  return String(raw).slice(0, 10);
}

async function queryTrend(
  scope: string,
  granularity: CostTrendGranularity,
  from: Date,
  to: Date
): Promise<{ points: CostTrendPoint[]; currency: string }> {
  const client = new CostManagementClient(azureCredential());
  const result = await withRetry(() =>
    client.query.usage(scope, {
      type: "ActualCost",
      timeframe: "Custom",
      timePeriod: { from, to },
      dataset: {
        granularity,
        aggregation: { totalCost: { name: "Cost", function: "Sum" } },
      },
    })
  );

  const columns = result?.columns ?? [];
  const costIdx = columns.findIndex((c) => c.name === "Cost");
  const currencyIdx = columns.findIndex((c) => c.name === "Currency");
  const dateIdx = columns.findIndex((c) => c.name === "UsageDate" || c.name === "BillingMonth");

  let currency = "";
  const points = (result?.rows ?? []).map((row) => {
    const rowCurrency = currencyIdx >= 0 ? String(row[currencyIdx]) : "";
    if (rowCurrency) currency = rowCurrency;
    return {
      date: dateIdx >= 0 ? normalizeTrendDate(row[dateIdx], granularity) : "",
      cost: costIdx >= 0 ? Number(row[costIdx]) : 0,
    };
  });
  return { points, currency };
}

/**
 * Every day (or every 1st-of-month) between from and to, inclusive.
 * Azure's cost query omits a bucket entirely when its cost is exactly
 * zero — enumerating the full range and filling gaps with 0 keeps the
 * chart's x-axis evenly spaced instead of silently compressing over a
 * zero-cost stretch.
 */
function enumerateDates(granularity: CostTrendGranularity, from: Date, to: Date): string[] {
  const dates: string[] = [];
  if (granularity === "Daily") {
    const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
    const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
    while (cursor <= end) {
      dates.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  } else {
    const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
    const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
    while (cursor <= end) {
      dates.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
  }
  return dates;
}

/**
 * Day-by-day or month-by-month cost trend, summed across every accessible
 * subscription over [from, to] — powers the Cost tab's trend charts. One
 * subscription's query failing (e.g. no Cost Management Reader there)
 * doesn't blank the whole chart; its contribution is just left out of the
 * sum for the affected dates rather than failing the request.
 */
export async function costTrend(granularity: CostTrendGranularity, from: Date, to: Date): Promise<CostTrendResult> {
  const subscriptions = await listAccessibleSubscriptions();
  const totalsByDate = new Map<string, number>();
  let currency = "";

  for (const sub of subscriptions) {
    try {
      const { points, currency: subCurrency } = await queryTrend(`/subscriptions/${sub.id}`, granularity, from, to);
      if (subCurrency) currency = subCurrency;
      for (const point of points) {
        if (!point.date) continue;
        totalsByDate.set(point.date, (totalsByDate.get(point.date) ?? 0) + point.cost);
      }
    } catch (err) {
      console.error(`Cost trend query failed for subscription ${sub.id}:`, err);
    }
  }

  const points = enumerateDates(granularity, from, to).map((date) => ({
    date,
    cost: totalsByDate.get(date) ?? 0,
  }));

  return { granularity, currency, points };
}
