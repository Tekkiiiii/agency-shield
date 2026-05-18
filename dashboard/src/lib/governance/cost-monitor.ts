import type { CostGuardrail } from "./types";

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_BUDGET: Record<string, number> = {
  opus: 50.0,
  sonnet: 20.0,
  haiku: 5.0,
};

const DEFAULT_ALERT_THRESHOLD = 0.8; // 80%

// ─── Store ────────────────────────────────────────────────────────────────────

const _guardrails = new Map<string, CostGuardrail>();

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initGuardrail(agentId: string, tier: "opus" | "sonnet" | "haiku", customBudget?: number): CostGuardrail {
  const guardrail: CostGuardrail = {
    agentId,
    budgetLimit: customBudget ?? DEFAULT_BUDGET[tier],
    currentSpend: 0,
    alertThreshold: DEFAULT_ALERT_THRESHOLD,
    circuitBreakerTripped: false,
  };
  _guardrails.set(agentId, guardrail);
  return guardrail;
}

// ─── Track spend ──────────────────────────────────────────────────────────────

export interface SpendResult {
  allowed: boolean;
  circuitTripped: boolean;
  alertFired: boolean;
  guardrail: CostGuardrail;
  savedAmount?: number;
}

export function recordSpend(agentId: string, amount: number): SpendResult {
  let g = _guardrails.get(agentId);
  if (!g) {
    g = { agentId, budgetLimit: 20.0, currentSpend: 0, alertThreshold: 0.8, circuitBreakerTripped: false };
    _guardrails.set(agentId, g);
  }

  if (g.circuitBreakerTripped) {
    return { allowed: false, circuitTripped: true, alertFired: false, guardrail: g, savedAmount: amount };
  }

  g.currentSpend += amount;

  const ratio = g.currentSpend / g.budgetLimit;
  const alertFired = ratio >= g.alertThreshold;
  let circuitTripped = false;

  if (g.currentSpend >= g.budgetLimit) {
    g.circuitBreakerTripped = true;
    circuitTripped = true;
  }

  return {
    allowed: !circuitTripped,
    circuitTripped,
    alertFired,
    guardrail: { ...g },
    savedAmount: circuitTripped ? g.currentSpend - g.budgetLimit : undefined,
  };
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export function getGuardrail(agentId: string): CostGuardrail | undefined {
  return _guardrails.get(agentId);
}

export function getAllGuardrails(): CostGuardrail[] {
  return [..._guardrails.values()];
}

export function getTotalSpend(): number {
  return [..._guardrails.values()].reduce((s, g) => s + g.currentSpend, 0);
}

export function getTotalSaved(): number {
  // Amount saved = how much would have been spent if circuit breakers hadn't tripped
  return [..._guardrails.values()]
    .filter((g) => g.circuitBreakerTripped)
    .reduce((s, g) => s + (g.currentSpend - g.budgetLimit), 0);
}

export function tripCircuitBreaker(agentId: string): void {
  const g = _guardrails.get(agentId);
  if (g) g.circuitBreakerTripped = true;
}

export function resetGuardrail(agentId: string): void {
  const g = _guardrails.get(agentId);
  if (g) {
    g.currentSpend = 0;
    g.circuitBreakerTripped = false;
  }
}

// ─── Seed (for demo) ──────────────────────────────────────────────────────────

export function seedCostData(agents: Array<{ id: string; tier: "opus" | "sonnet" | "haiku" }>): void {
  for (const { id, tier } of agents) {
    const g = initGuardrail(id, tier);
    // Random spend between 10% and 95% of budget
    const ratio = 0.1 + Math.random() * 0.85;
    g.currentSpend = parseFloat((g.budgetLimit * ratio).toFixed(2));
    if (g.currentSpend >= g.budgetLimit) g.circuitBreakerTripped = true;
  }
}
