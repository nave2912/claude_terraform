import { ResourceManagementClient } from "@azure/arm-resources";
import { azureCredential, azureSubscriptionId } from "../azure/credential.js";

/** Every resource group in the configured subscription — powers the Cost/Metrics scope pickers. */
export async function listResourceGroups(): Promise<string[]> {
  const client = new ResourceManagementClient(azureCredential(), azureSubscriptionId());
  const names: string[] = [];
  for await (const rg of client.resourceGroups.list()) {
    if (rg.name) names.push(rg.name);
  }
  return names.sort();
}

export interface ResourceSummary {
  resourceId: string;
  name: string;
  type: string;
  resourceGroup: string;
}

/** Live resource inventory (subscription-wide, or scoped to one resource group). */
export async function listResources(resourceGroup?: string): Promise<ResourceSummary[]> {
  const client = new ResourceManagementClient(azureCredential(), azureSubscriptionId());
  const iterator = resourceGroup
    ? client.resources.listByResourceGroup(resourceGroup)
    : client.resources.list();

  const resources: ResourceSummary[] = [];
  for await (const r of iterator) {
    if (!r.id || !r.name || !r.type) continue;
    resources.push({
      resourceId: r.id,
      name: r.name,
      type: r.type,
      // ARM resource IDs are always /subscriptions/{id}/resourceGroups/{rg}/... — index 4 is the RG segment.
      resourceGroup: resourceGroup ?? r.id.split("/")[4] ?? "",
    });
  }
  return resources;
}
