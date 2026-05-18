import type { GovernanceEvent, Agent, AgentTier } from "./types";
import { createGovernanceEvent } from "./policy-engine";

// ─── Agent Registry ───────────────────────────────────────────────────────────

export const SIMULATED_AGENTS: Agent[] = [
  // Engineering
  { id: "ag-001", name: "engineering-lead", department: "Engineering", role: "leader", tier: "opus", reportsTo: "root", permissions: [], status: "active" },
  { id: "ag-002", name: "backend-coordinator", department: "Engineering", role: "coordinator", tier: "sonnet", reportsTo: "ag-001", permissions: [], status: "active" },
  { id: "ag-003", name: "api-builder", department: "Engineering", role: "member", tier: "haiku", reportsTo: "ag-002", permissions: [], status: "active" },
  { id: "ag-004", name: "db-migrator", department: "Engineering", role: "member", tier: "haiku", reportsTo: "ag-002", permissions: [], status: "active" },
  // Security
  { id: "ag-005", name: "security-lead", department: "Security", role: "leader", tier: "opus", reportsTo: "root", permissions: [], status: "active" },
  { id: "ag-006", name: "threat-analyst", department: "Security", role: "coordinator", tier: "sonnet", reportsTo: "ag-005", permissions: [], status: "active" },
  { id: "ag-007", name: "vuln-scanner", department: "Security", role: "member", tier: "haiku", reportsTo: "ag-006", permissions: [], status: "active" },
  // Finance
  { id: "ag-008", name: "finance-lead", department: "Finance", role: "leader", tier: "opus", reportsTo: "root", permissions: [], status: "active" },
  { id: "ag-009", name: "budget-monitor", department: "Finance", role: "coordinator", tier: "sonnet", reportsTo: "ag-008", permissions: [], status: "active" },
  { id: "ag-010", name: "invoice-processor", department: "Finance", role: "member", tier: "haiku", reportsTo: "ag-009", permissions: [], status: "active" },
  // Marketing
  { id: "ag-011", name: "marketing-lead", department: "Marketing", role: "leader", tier: "opus", reportsTo: "root", permissions: [], status: "active" },
  { id: "ag-012", name: "content-coordinator", department: "Marketing", role: "coordinator", tier: "sonnet", reportsTo: "ag-011", permissions: [], status: "active" },
  { id: "ag-013", name: "social-writer", department: "Marketing", role: "member", tier: "haiku", reportsTo: "ag-012", permissions: [], status: "active" },
  // Compliance
  { id: "ag-014", name: "compliance-lead", department: "Compliance", role: "leader", tier: "opus", reportsTo: "root", permissions: [], status: "active" },
  { id: "ag-015", name: "audit-coordinator", department: "Compliance", role: "coordinator", tier: "sonnet", reportsTo: "ag-014", permissions: [], status: "active" },
  // HR
  { id: "ag-016", name: "hr-lead", department: "HR", role: "leader", tier: "sonnet", reportsTo: "root", permissions: [], status: "active" },
  { id: "ag-017", name: "onboarding-agent", department: "HR", role: "member", tier: "haiku", reportsTo: "ag-016", permissions: [], status: "active" },
  // Legal
  { id: "ag-018", name: "legal-lead", department: "Legal", role: "leader", tier: "opus", reportsTo: "root", permissions: [], status: "active" },
  { id: "ag-019", name: "contract-reviewer", department: "Legal", role: "member", tier: "sonnet", reportsTo: "ag-018", permissions: [], status: "active" },
  // Data
  { id: "ag-020", name: "data-lead", department: "Data", role: "leader", tier: "sonnet", reportsTo: "root", permissions: [], status: "active" },
  { id: "ag-021", name: "pipeline-builder", department: "Data", role: "member", tier: "haiku", reportsTo: "ag-020", permissions: [], status: "active" },
  { id: "ag-022", name: "analytics-agent", department: "Data", role: "member", tier: "haiku", reportsTo: "ag-020", permissions: [], status: "active" },
  // DevOps
  { id: "ag-023", name: "devops-lead", department: "DevOps", role: "leader", tier: "sonnet", reportsTo: "root", permissions: [], status: "active" },
  { id: "ag-024", name: "deploy-agent", department: "DevOps", role: "member", tier: "haiku", reportsTo: "ag-023", permissions: [], status: "active" },
  // Support
  { id: "ag-025", name: "support-lead", department: "Support", role: "leader", tier: "sonnet", reportsTo: "root", permissions: [], status: "active" },
  { id: "ag-026", name: "ticket-resolver", department: "Support", role: "member", tier: "haiku", reportsTo: "ag-025", permissions: [], status: "active" },
  // Research
  { id: "ag-027", name: "research-lead", department: "Research", role: "leader", tier: "opus", reportsTo: "root", permissions: [], status: "active" },
  { id: "ag-028", name: "web-researcher", department: "Research", role: "member", tier: "haiku", reportsTo: "ag-027", permissions: [], status: "active" },
  // Product
  { id: "ag-029", name: "product-lead", department: "Product", role: "leader", tier: "opus", reportsTo: "root", permissions: [], status: "active" },
  { id: "ag-030", name: "requirements-agent", department: "Product", role: "member", tier: "sonnet", reportsTo: "ag-029", permissions: [], status: "active" },
];

// ─── Event Templates ──────────────────────────────────────────────────────────

type EventSource = "Agency Shield" | "Lobster Trap DPI";

interface EventTemplate {
  type: GovernanceEvent["type"];
  severity: GovernanceEvent["severity"];
  source: EventSource;
  detailsFn: (agent: Agent) => string;
  policyAction: GovernanceEvent["policyAction"];
  metaFn?: (agent: Agent) => Record<string, unknown>;
}

const EVENT_TEMPLATES: EventTemplate[] = [
  // --- Agency Shield events ---
  {
    type: "tool_blocked",
    severity: "high",
    source: "Agency Shield",
    detailsFn: (a) => `${a.name} attempted to call delegate_task without authorization`,
    policyAction: "DENY",
    metaFn: (a) => ({ tool: "delegate_task", agentTier: a.tier, policy: "pol-008" }),
  },
  {
    type: "tool_blocked",
    severity: "medium",
    source: "Agency Shield",
    detailsFn: (a) => `${a.name} called execute_code without required capability flag`,
    policyAction: "DENY",
    metaFn: () => ({ tool: "execute_code", reason: "missing capability flag" }),
  },
  {
    type: "permission_denied",
    severity: "medium",
    source: "Agency Shield",
    detailsFn: (a) => `${a.name} attempted to spawn sub-agent beyond depth limit (3)`,
    policyAction: "DENY",
    metaFn: () => ({ depth: 4, maxDepth: 3, policy: "pol-005" }),
  },
  {
    type: "cost_alert",
    severity: "high",
    source: "Agency Shield",
    detailsFn: (a) => `${a.name} exceeded budget threshold — circuit breaker ARMED`,
    policyAction: "DENY",
    metaFn: (a) => ({ spend: (Math.random() * 50 + 10).toFixed(2), limit: "50.00", agent: a.id }),
  },
  {
    type: "escalation",
    severity: "critical",
    source: "Agency Shield",
    detailsFn: (a) => `${a.name} triggered escalation: unauthorized delegation chain detected`,
    policyAction: "HUMAN_REVIEW",
    metaFn: () => ({ chainDepth: 5, policy: "pol-008", escalatedTo: "security-lead" }),
  },
  {
    type: "quarantine",
    severity: "critical",
    source: "Agency Shield",
    detailsFn: (a) => `${a.name} quarantined after repeated policy violations`,
    policyAction: "QUARANTINE",
    metaFn: (a) => ({ violations: 3, agent: a.id }),
  },
  {
    type: "policy_violation",
    severity: "medium",
    source: "Agency Shield",
    detailsFn: (a) => `${a.name} sent cross-department message without clearance`,
    policyAction: "LOG",
    metaFn: () => ({ policy: "pol-007", tool: "send_message" }),
  },
  {
    type: "audit",
    severity: "low",
    source: "Agency Shield",
    detailsFn: (a) => `${a.name} accessed restricted database — logged for compliance`,
    policyAction: "LOG",
    metaFn: () => ({ tool: "database_query", policy: "pol-007" }),
  },
  // --- Lobster Trap DPI events ---
  {
    type: "injection_detected",
    severity: "critical",
    source: "Lobster Trap DPI",
    detailsFn: (a) => `LLM prompt injection detected in ${a.name} outbound request: INSTRUCTION_IGNORE_PREVIOUS`,
    policyAction: "DENY",
    metaFn: () => ({ flag: "INSTRUCTION_IGNORE_PREVIOUS", layer: "LLM", intercepted: true }),
  },
  {
    type: "injection_detected",
    severity: "high",
    source: "Lobster Trap DPI",
    detailsFn: (a) => `Invisible unicode payload stripped from ${a.name} message (U+200B x3)`,
    policyAction: "DENY",
    metaFn: () => ({ flag: "INVISIBLE_UNICODE_U200B", layer: "LLM", stripped: true }),
  },
  {
    type: "injection_detected",
    severity: "high",
    source: "Lobster Trap DPI",
    detailsFn: (a) => `Base64 exfiltration payload blocked in ${a.name} API call`,
    policyAction: "QUARANTINE",
    metaFn: () => ({ flag: "BASE64_PAYLOAD", layer: "LLM", bytes: 248 }),
  },
  {
    type: "injection_detected",
    severity: "critical",
    source: "Lobster Trap DPI",
    detailsFn: (a) => `PII detected in ${a.name} outbound message: SSN pattern matched`,
    policyAction: "HUMAN_REVIEW",
    metaFn: () => ({ flag: "PII_SSN", layer: "LLM", redacted: true }),
  },
  {
    type: "injection_detected",
    severity: "high",
    source: "Lobster Trap DPI",
    detailsFn: (a) => `Exfiltration attempt blocked: ${a.name} tried to POST data to external webhook`,
    policyAction: "DENY",
    metaFn: () => ({ flag: "EXFIL_WEBHOOK", layer: "LLM", destination: "https://evil.example.com/collect" }),
  },
  {
    type: "injection_detected",
    severity: "medium",
    source: "Lobster Trap DPI",
    detailsFn: (a) => `Declared intent mismatch for ${a.name}: claimed summarize, detected exfiltrate`,
    policyAction: "LOG",
    metaFn: () => ({ declared: "summarize", detected: "exfiltrate", confidence: 0.89, layer: "LLM" }),
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function weightedRandom(templates: EventTemplate[]): EventTemplate {
  // Bias toward interesting (non-audit) events
  const weighted = templates.flatMap((t) =>
    t.severity === "critical" ? [t, t, t]
    : t.severity === "high" ? [t, t]
    : [t]
  );
  return randomItem(weighted);
}

// ─── Simulator ────────────────────────────────────────────────────────────────

export interface SimulatedEvent extends GovernanceEvent {
  source: EventSource;
}

type EventHandler = (event: SimulatedEvent) => void;

let _timer: ReturnType<typeof setInterval> | null = null;
let _handlers: EventHandler[] = [];

export function generateEvent(): SimulatedEvent {
  const agent = randomItem(SIMULATED_AGENTS);
  const template = weightedRandom(EVENT_TEMPLATES);

  const base = createGovernanceEvent(
    template.type,
    template.severity,
    agent.id,
    agent.name,
    agent.department,
    template.detailsFn(agent),
    template.policyAction,
    template.metaFn ? template.metaFn(agent) : {}
  );

  return { ...base, source: template.source };
}

export function onEvent(handler: EventHandler): () => void {
  _handlers.push(handler);
  return () => {
    _handlers = _handlers.filter((h) => h !== handler);
  };
}

export function startSimulation(): void {
  if (_timer !== null) return;

  const emit = () => {
    const event = generateEvent();
    for (const h of _handlers) h(event);
    // Schedule next event: 1–5 seconds
    _timer = setTimeout(() => { _timer = null; emit(); }, randomInt(1000, 5000));
  };

  // Fire first event after short delay
  _timer = setTimeout(() => { _timer = null; emit(); }, randomInt(500, 1500));
}

export function stopSimulation(): void {
  if (_timer !== null) {
    clearTimeout(_timer);
    _timer = null;
  }
}

// ─── Seed data (initial burst for demo) ──────────────────────────────────────

export function generateSeedEvents(count = 40): SimulatedEvent[] {
  const events: SimulatedEvent[] = [];
  const now = Date.now();

  for (let i = count; i > 0; i--) {
    const event = generateEvent();
    // Spread over last 10 minutes
    const offset = Math.floor((i / count) * 10 * 60 * 1000);
    events.push({
      ...event,
      timestamp: new Date(now - offset).toISOString(),
    });
  }
  return events.reverse(); // chronological
}
