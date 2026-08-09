import type {
  CostResponse,
  CostSummaryResponse,
  CostTrendGranularity,
  CostTrendResponse,
  MetricsResponse,
  ResourceGroupsResponse,
} from "../types";

/** Carries the HTTP status so callers can special-case things like a 429 (rate limit). */
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Every call here hits this Next.js app's own /api/backend/observability/*
 * Route Handlers (never the Express backend directly from the browser) —
 * same pattern as infra-request's api client.
 */
async function requestJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { "Content-Type": "application/json" } });
  const body = await res.json();
  if (!res.ok) {
    throw new ApiError(body?.error ?? `Request to ${path} failed with ${res.status}`, res.status);
  }
  return body as T;
}

export const observabilityApi = {
  getResourceGroups: () =>
    requestJson<ResourceGroupsResponse>("/api/backend/observability/resource-groups"),

  getSubscriptionCost: () =>
    requestJson<CostResponse>("/api/backend/observability/cost?scope=subscription"),

  getResourceGroupCost: (resourceGroup: string) =>
    requestJson<CostResponse>(
      `/api/backend/observability/cost?scope=resource-group&resourceGroup=${encodeURIComponent(resourceGroup)}`
    ),

  getMetrics: (resourceGroup?: string) =>
    requestJson<MetricsResponse>(
      `/api/backend/observability/metrics${resourceGroup ? `?resourceGroup=${encodeURIComponent(resourceGroup)}` : ""}`
    ),

  /** Month-to-date total summed across every subscription the backend's service principal can see. */
  getCostSummary: () => requestJson<CostSummaryResponse>("/api/backend/observability/cost/summary"),

  getCostTrend: (granularity: CostTrendGranularity, days: number) =>
    requestJson<CostTrendResponse>(
      `/api/backend/observability/cost/trend?granularity=${granularity}&days=${days}`
    ),
};
