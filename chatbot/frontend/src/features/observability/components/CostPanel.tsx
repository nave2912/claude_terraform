"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useResourceGroups } from "../hooks/useResourceGroups";
import { useCost, type CostScope } from "../hooks/useCost";
import { useCostSummary } from "../hooks/useCostSummary";
import { ApiError } from "../services/observability.api";
import { CostBarChart, type CostBarChartRow } from "./CostBarChart";
import { CostTrendSection } from "./CostTrendSection";

function formatCost(cost: number, currency: string) {
  return `${cost.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

// Base UI's Select must be controlled from its very first render — passing
// `undefined` until the user picks something (then a real string after)
// trips its "switching from uncontrolled to controlled" warning. A sentinel
// keeps `value` always defined; mirrors MetricsPanel's ALL_RESOURCE_GROUPS.
const UNSELECTED = "__unselected__";

export function CostPanel() {
  const [scope, setScope] = useState<CostScope>("subscription");
  const [resourceGroup, setResourceGroup] = useState<string>(UNSELECTED);
  const { data: rgData } = useResourceGroups();
  const ready = scope === "subscription" || resourceGroup !== UNSELECTED;
  const { data, isLoading, isFetching, error } = useCost(
    scope,
    resourceGroup === UNSELECTED ? undefined : resourceGroup
  );
  const { data: summary, isLoading: summaryLoading, isFetching: summaryFetching, error: summaryError } =
    useCostSummary();

  const breakdownRows: CostBarChartRow[] = !data
    ? []
    : data.scope === "subscription"
      ? data.rows.map((row) => ({ id: row.resourceGroup, label: row.resourceGroup, value: row.cost }))
      : data.rows.map((row) => ({ id: row.resourceId, label: row.resourceName, value: row.cost }));

  const subscriptionRows: CostBarChartRow[] =
    summary?.subscriptions.map((sub) => ({
      id: sub.subscriptionId,
      label: sub.subscriptionName,
      value: sub.cost,
    })) ?? [];

  return (
    <div className="flex flex-col gap-6">
      {/* Always-on headline: month-to-date cost across every subscription
          the backend can see — independent of the resource-group drill-down
          below, so switching scope there never changes what this reads. */}
      <section className="flex flex-col gap-4">
        {summaryLoading && <Skeleton className="h-20 w-56" />}

        {summaryError && (
          <p className="text-sm text-destructive">
            {summaryError instanceof ApiError && summaryError.status === 429
              ? "Azure is rate-limiting cost data right now — this usually clears in a few seconds. Try again shortly."
              : summaryError instanceof Error
                ? summaryError.message
                : "Failed to load subscription cost summary."}
          </p>
        )}

        {summary && (
          <>
            <div className="flex flex-col gap-1 rounded-xl bg-muted/40 px-4 py-3 ring-1 ring-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Month-to-date total — all subscriptions</span>
                {summaryFetching && <span className="text-muted-foreground/70">Refreshing…</span>}
              </div>
              <span className="text-2xl font-semibold text-foreground">
                {formatCost(summary.totalCost, summary.currency)}
              </span>
              {summary.subscriptions.some((s) => s.unavailable) && (
                <span className="text-xs text-muted-foreground">
                  Some subscriptions couldn&apos;t be queried and are excluded from this total.
                </span>
              )}
            </div>

            {/* Only worth its own chart once there's more than one subscription
                to compare — otherwise it just repeats the total above. */}
            {subscriptionRows.length > 1 && (
              <Card>
                <CardContent>
                  <h3 className="mb-3 text-sm font-medium text-foreground">Cost by subscription</h3>
                  <CostBarChart
                    rows={subscriptionRows}
                    formatValue={(value) => formatCost(value, summary.currency)}
                  />
                </CardContent>
              </Card>
            )}
          </>
        )}
      </section>

      {/* Drill-down: resource-group / resource breakdown for the primary
          configured subscription (see AZURE_SUBSCRIPTION_ID). */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-foreground">Breakdown</h3>
          {isFetching && <span className="text-xs text-muted-foreground">Refreshing…</span>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg bg-muted p-1">
            <Button
              type="button"
              size="sm"
              variant={scope === "subscription" ? "default" : "ghost"}
              onClick={() => setScope("subscription")}
            >
              All resources
            </Button>
            <Button
              type="button"
              size="sm"
              variant={scope === "resource-group" ? "default" : "ghost"}
              onClick={() => setScope("resource-group")}
            >
              Resource group
            </Button>
          </div>

          {scope === "resource-group" && (
            <Select value={resourceGroup} onValueChange={(value) => setResourceGroup(value ?? UNSELECTED)}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Choose a resource group" />
              </SelectTrigger>
              <SelectContent>
                {rgData?.resourceGroups.map((rg) => (
                  <SelectItem key={rg} value={rg}>
                    {rg}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {!ready && (
          <p className="text-sm text-muted-foreground">Pick a resource group to see its cost breakdown.</p>
        )}

        {ready && isLoading && (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-48 w-full" />
          </div>
        )}

        {ready && error && (
          <p className="text-sm text-destructive">
            {error instanceof ApiError && error.status === 429
              ? "Azure is rate-limiting cost data right now — this usually clears in a few seconds. Try again shortly."
              : error instanceof Error
                ? error.message
                : "Failed to load cost data."}
          </p>
        )}

        {ready && data && (
          <div className="flex flex-col gap-5">
            {breakdownRows.length > 0 && (
              <Card>
                <CardContent>
                  <h4 className="mb-3 text-sm font-medium text-foreground">
                    {data.scope === "subscription" ? "Cost by resource group" : "Cost by resource"}
                  </h4>
                  <CostBarChart
                    rows={breakdownRows}
                    formatValue={(value) => formatCost(value, data.rows[0]?.currency ?? "")}
                  />
                </CardContent>
              </Card>
            )}

            <Card className="py-0">
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">
                        {data.scope === "subscription" ? "Resource group" : "Resource"}
                      </TableHead>
                      {data.scope === "resource-group" && <TableHead>Type</TableHead>}
                      <TableHead className="pr-4 text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rows.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={data.scope === "resource-group" ? 3 : 2}
                          className="py-8 text-center text-muted-foreground"
                        >
                          No cost recorded for this period.
                        </TableCell>
                      </TableRow>
                    )}
                    {data.scope === "subscription"
                      ? data.rows.map((row) => (
                          <TableRow key={row.resourceGroup}>
                            <TableCell className="pl-4">{row.resourceGroup}</TableCell>
                            <TableCell className="pr-4 text-right tabular-nums">
                              {formatCost(row.cost, row.currency)}
                            </TableCell>
                          </TableRow>
                        ))
                      : data.rows.map((row) => (
                          <TableRow key={row.resourceId}>
                            <TableCell className="pl-4">{row.resourceName}</TableCell>
                            <TableCell className="text-muted-foreground">{row.resourceType}</TableCell>
                            <TableCell className="pr-4 text-right tabular-nums">
                              {formatCost(row.cost, row.currency)}
                            </TableCell>
                          </TableRow>
                        ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      {/* Trend: day-to-day / month-to-month comparison, own date filters. */}
      <section className="flex flex-col gap-4">
        <CostTrendSection />
      </section>
    </div>
  );
}
