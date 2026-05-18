import type { PolicyRule, PolicyAction, ToolClassification, GovernanceEvent, Severity } from "./types";

const BLOCKED_TOOLS: readonly string[] = [
  "delegate_task",
  "Agent",
  "teams/spawn",
  "teams/create",
  "teams/delete",
  "execute_code_unsafe",
  "shell_exec",
  "eval",
];

const RESTRICTED_TOOLS: readonly string[] = [
  "send_message",
  "execute_code",
  "file_write",
  "file_delete",
  "database_query",
  "http_request",
  "email_send",
];

export function classifyTool(tool: string): ToolClassification {
  if (BLOCKED_TOOLS.includes(tool)) return "blocked";
  if (tool.startsWith("mcp__") && tool.includes("dangerous")) return "blocked";
  if (RESTRICTED_TOOLS.includes(tool)) return "restricted";
  return "allowed";
}

export function isToolAllowed(tool: string, agentTier: string, hasCapability: boolean): boolean {
  const classification = classifyTool(tool);
  if (classification === "blocked") return false;
  if (classification === "restricted") return hasCapability;
  return true;
}

const DEFAULT_POLICIES: PolicyRule[] = [
  {
    id: "pol-001",
    name: "Block Prompt Injection",
    description: "Deny any message containing instruction override patterns",
    pattern: "INSTRUCTION_*",
    action: "DENY",
    severity: "critical",
    enabled: true,
    hitCount: 0,
  },
  {
    id: "pol-002",
    name: "Quarantine Exfiltration Attempts",
    description: "Quarantine messages attempting data exfiltration",
    pattern: "EXFIL_*",
    action: "QUARANTINE",
    severity: "high",
    enabled: true,
    hitCount: 0,
  },
  {
    id: "pol-003",
    name: "PII Detection",
    description: "Flag and review any message containing PII",
    pattern: "PII_*",
    action: "HUMAN_REVIEW",
    severity: "high",
    enabled: true,
    hitCount: 0,
  },
  {
    id: "pol-004",
    name: "Block Destructive Commands",
    description: "Deny destructive system commands",
    pattern: "DESTRUCTIVE_*",
    action: "DENY",
    severity: "high",
    enabled: true,
    hitCount: 0,
  },
  {
    id: "pol-005",
    name: "Rate Limit Agent Spawning",
    description: "Rate limit agent delegation to prevent fork bombs",
    pattern: "SPAWN_RATE_EXCEEDED",
    action: "RATE_LIMIT",
    severity: "medium",
    enabled: true,
    hitCount: 0,
  },
  {
    id: "pol-006",
    name: "Cost Circuit Breaker",
    description: "Deny requests when agent cost exceeds budget threshold",
    pattern: "COST_THRESHOLD_EXCEEDED",
    action: "DENY",
    severity: "high",
    enabled: true,
    hitCount: 0,
  },
  {
    id: "pol-007",
    name: "Log Restricted Tool Use",
    description: "Log all restricted tool invocations for audit trail",
    pattern: "RESTRICTED_TOOL_*",
    action: "LOG",
    severity: "low",
    enabled: true,
    hitCount: 0,
  },
  {
    id: "pol-008",
    name: "Unauthorized Delegation Block",
    description: "Block agents from delegating beyond their permission scope",
    pattern: "UNAUTHORIZED_DELEGATION",
    action: "DENY",
    severity: "high",
    enabled: true,
    hitCount: 0,
  },
];

export function getPolicies(): PolicyRule[] {
  return [...DEFAULT_POLICIES];
}

export function matchPolicy(flags: string[]): { policy: PolicyRule; action: PolicyAction } | null {
  for (const flag of flags) {
    for (const policy of DEFAULT_POLICIES) {
      if (!policy.enabled) continue;
      const policyPattern = policy.pattern.replace("*", "");
      if (flag.startsWith(policyPattern) || flag === policy.pattern) {
        policy.hitCount++;
        return { policy, action: policy.action };
      }
    }
  }
  return null;
}

let eventCounter = 0;

export function createGovernanceEvent(
  type: GovernanceEvent["type"],
  severity: Severity,
  agentId: string,
  agentName: string,
  department: string,
  details: string,
  policyAction: PolicyAction,
  metadata: Record<string, unknown> = {}
): GovernanceEvent {
  return {
    id: `evt-${Date.now()}-${++eventCounter}`,
    timestamp: new Date().toISOString(),
    type,
    severity,
    agentId,
    agentName,
    department,
    details,
    metadata,
    policyAction,
    resolved: false,
  };
}
