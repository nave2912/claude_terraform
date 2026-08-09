"use client";

import { useState } from "react";
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
import { useMetrics } from "../hooks/useMetrics";

const ALL_RESOURCE_GROUPS = "__all__";
const ALL_RESOURCE_GROUPS_LABEL = "All resource groups";

function formatTimestamp(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export function MetricsPanel() {
  const [resourceGroup, setResourceGroup] = useState<string>(ALL_RESOURCE_GROUPS);
  const { data: rgData } = useResourceGroups();
  const { data, isLoading, isFetching, error } = useMetrics(
    resourceGroup === ALL_RESOURCE_GROUPS ? undefined : resourceGroup
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={resourceGroup}
          onValueChange={(value) => setResourceGroup(value ?? ALL_RESOURCE_GROUPS)}
        >
          <SelectTrigger className="w-64">
            {/* Base UI's SelectValue only resolves an item's label once that
                item has actually mounted in the popup (e.g. after the user
                opens it) — for a value that's already selected on first
                render (our __all__ default) it falls back to the raw value.
                A resolver function sidesteps that instead of relying on
                mount order. */}
            <SelectValue placeholder={ALL_RESOURCE_GROUPS_LABEL}>
              {(value: string | null) =>
                !value || value === ALL_RESOURCE_GROUPS ? ALL_RESOURCE_GROUPS_LABEL : value
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_RESOURCE_GROUPS}>{ALL_RESOURCE_GROUPS_LABEL}</SelectItem>
            {rgData?.resourceGroups.map((rg) => (
              <SelectItem key={rg} value={rg}>
                {rg}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isFetching && !isLoading && (
          <span className="text-xs text-muted-foreground">Refreshing…</span>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Last 90 days of Azure activity log entries — management operations only (create, update,
        delete, list-keys, etc.), not application traffic.
      </p>

      {isLoading && (
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load activity data."}
        </p>
      )}

      {!isLoading && !error && data && (
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <div className="flex flex-col gap-1 rounded-xl bg-muted/40 px-4 py-3 ring-1 ring-border">
            <span className="text-xs text-muted-foreground">Resources tracked</span>
            <span className="text-2xl font-semibold text-foreground">{data.resources.length}</span>
          </div>
          <div className="flex flex-col gap-1 rounded-xl bg-muted/40 px-4 py-3 ring-1 ring-border">
            <span className="text-xs text-muted-foreground">Active in last 90 days</span>
            <span className="text-2xl font-semibold text-foreground">
              {data.resources.filter((r) => r.lastActivityAt !== null).length}
            </span>
          </div>
        </div>
      )}

      {!isLoading && !error && (
        <Card className="py-0">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Resource</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Resource group</TableHead>
                  <TableHead>Last activity</TableHead>
                  <TableHead className="pr-4">Last modified by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.resources.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No resources found.
                    </TableCell>
                  </TableRow>
                )}
                {data?.resources.map((resource) => (
                  <TableRow key={resource.resourceId}>
                    <TableCell className="pl-4 font-medium">{resource.name}</TableCell>
                    <TableCell className="text-muted-foreground">{resource.type}</TableCell>
                    <TableCell className="text-muted-foreground">{resource.resourceGroup}</TableCell>
                    <TableCell className="tabular-nums">{formatTimestamp(resource.lastActivityAt)}</TableCell>
                    <TableCell className="pr-4">{resource.lastModifiedBy ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
