/**
 * Resource types that must never be chat-scaffolded, even though the
 * general capability covers "any azurerm_* resource." These are
 * subscription/tenant-scoped or IAM/governance resources where a wrong
 * default has a much larger and harder-to-reverse blast radius than a
 * single misconfigured workload resource — they require manual authoring
 * and review, full stop. Checked before any provider-schema lookup or
 * branch/commit happens.
 */
const DENY_PATTERNS: { pattern: RegExp; reason: string }[] = [
  {
    pattern: /^azurerm_management_group/,
    reason: "management-group-scoped resources affect tenant-wide governance and must be authored manually.",
  },
  {
    pattern: /^azurerm_subscription($|_)/,
    reason: "subscription-scoped resources (creation, aliasing, policy) are out of scope for chat-scaffolding.",
  },
  {
    pattern: /^azurerm_policy_/,
    reason: "Azure Policy resources can broadly restrict or deny operations tenant-wide and must be authored manually.",
  },
  {
    pattern: /^azurerm_blueprint/,
    reason: "Blueprint resources are tenant/subscription-scoped and must be authored manually.",
  },
  {
    pattern: /^azurerm_lighthouse/,
    reason: "Lighthouse delegations grant cross-tenant access and must be authored manually.",
  },
  {
    pattern: /^azurerm_role_assignment$/,
    reason: "IAM role assignments must be authored and reviewed manually, not chat-scaffolded.",
  },
  {
    pattern: /^azurerm_role_definition$/,
    reason: "Custom IAM role definitions must be authored manually.",
  },
];

export interface DenylistCheck {
  denied: boolean;
  reason?: string;
}

export function checkDenylist(resourceType: string): DenylistCheck {
  for (const { pattern, reason } of DENY_PATTERNS) {
    if (pattern.test(resourceType)) {
      return { denied: true, reason };
    }
  }
  return { denied: false };
}
