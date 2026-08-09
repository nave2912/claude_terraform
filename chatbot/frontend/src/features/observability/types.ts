export interface ResourceGroupsResponse {
  resourceGroups: string[];
}

export interface SubscriptionCostRow {
  resourceGroup: string;
  cost: number;
  currency: string;
}

export interface ResourceCostRow {
  resourceId: string;
  resourceName: string;
  resourceType: string;
  cost: number;
  currency: string;
}

export type CostResponse =
  | { scope: "subscription"; rows: SubscriptionCostRow[] }
  | { scope: "resource-group"; resourceGroup: string; rows: ResourceCostRow[] };

export interface SubscriptionCostSummaryRow {
  subscriptionId: string;
  subscriptionName: string;
  cost: number;
  currency: string;
  unavailable?: boolean;
}

export interface CostSummaryResponse {
  totalCost: number;
  currency: string;
  subscriptions: SubscriptionCostSummaryRow[];
}

export type CostTrendGranularity = "Daily" | "Monthly";

export interface CostTrendPoint {
  date: string;
  cost: number;
}

export interface CostTrendResponse {
  granularity: CostTrendGranularity;
  currency: string;
  points: CostTrendPoint[];
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

export interface MetricsResponse {
  resourceGroup: string | null;
  resources: ResourceActivitySummary[];
}
