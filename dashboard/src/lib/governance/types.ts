export type Severity = "none" | "low" | "medium" | "high" | "critical";
export type PolicyAction = "ALLOW" | "DENY" | "LOG" | "HUMAN_REVIEW" | "QUARANTINE" | "RATE_LIMIT";
export type ToolClassification = "blocked" | "restricted" | "allowed";
export type AgentTier = "opus" | "sonnet" | "haiku";

export interface Agent {
  id: string;
  name: string;
  department: string;
  role: "leader" | "coordinator" | "member";
  tier: AgentTier;
  reportsTo: string;
  permissions: Permission[];
  status: "active" | "idle" | "blocked" | "terminated";
}

export interface Permission {
  tool: string;
  classification: ToolClassification;
  grantedBy: string;
  expiresAt?: string;
}

export interface GovernanceEvent {
  id: string;
  timestamp: string;
  type: "tool_blocked" | "injection_detected" | "escalation" | "cost_alert" | "permission_denied" | "quarantine" | "audit" | "policy_violation";
  severity: Severity;
  agentId: string;
  agentName: string;
  department: string;
  details: string;
  metadata: Record<string, unknown>;
  policyAction: PolicyAction;
  resolved: boolean;
}

export interface ScanResult {
  clean: boolean;
  flags: string[];
  severity: Severity;
  reason?: string;
}

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  pattern: string;
  action: PolicyAction;
  severity: Severity;
  enabled: boolean;
  hitCount: number;
}

export interface CostGuardrail {
  agentId: string;
  budgetLimit: number;
  currentSpend: number;
  alertThreshold: number;
  circuitBreakerTripped: boolean;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  result: "allowed" | "denied" | "escalated";
  evidence: string;
  policyRef?: string;
}

export interface DashboardStats {
  totalAgents: number;
  activeAgents: number;
  eventsLast24h: number;
  threatsBlocked: number;
  injectionsCaught: number;
  costSaved: number;
  complianceScore: number;
  policyRules: number;
}
