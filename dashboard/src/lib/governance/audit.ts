import type { AuditEntry, GovernanceEvent } from "./types";

// ─── In-memory store ──────────────────────────────────────────────────────────

let _entries: AuditEntry[] = [];
let _counter = 0;

// ─── Write ────────────────────────────────────────────────────────────────────

export function logAuditEntry(entry: Omit<AuditEntry, "id" | "timestamp">): AuditEntry {
  const full: AuditEntry = {
    ...entry,
    id: `aud-${Date.now()}-${++_counter}`,
    timestamp: new Date().toISOString(),
  };
  _entries = [full, ..._entries].slice(0, 1000); // cap at 1000
  return full;
}

export function auditFromEvent(event: GovernanceEvent): AuditEntry {
  const resultMap: Record<GovernanceEvent["policyAction"], AuditEntry["result"]> = {
    ALLOW: "allowed",
    LOG: "allowed",
    DENY: "denied",
    RATE_LIMIT: "denied",
    QUARANTINE: "denied",
    HUMAN_REVIEW: "escalated",
  };

  return logAuditEntry({
    actor: event.agentName,
    action: event.type.replace(/_/g, " "),
    target: event.department,
    result: resultMap[event.policyAction] ?? "denied",
    evidence: event.details,
    policyRef: (event.metadata?.policy as string | undefined) ?? undefined,
  });
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export function getAuditEntries(): AuditEntry[] {
  return [..._entries];
}

export function queryByTimeRange(from: Date, to: Date): AuditEntry[] {
  return _entries.filter((e) => {
    const t = new Date(e.timestamp).getTime();
    return t >= from.getTime() && t <= to.getTime();
  });
}

export function queryByAgent(agentName: string): AuditEntry[] {
  return _entries.filter((e) =>
    e.actor.toLowerCase().includes(agentName.toLowerCase())
  );
}

export function queryBySeverity(result: AuditEntry["result"]): AuditEntry[] {
  return _entries.filter((e) => e.result === result);
}

export function countByResult(): Record<AuditEntry["result"], number> {
  return _entries.reduce(
    (acc, e) => { acc[e.result]++; return acc; },
    { allowed: 0, denied: 0, escalated: 0 } as Record<AuditEntry["result"], number>
  );
}

export function clearAuditLog(): void {
  _entries = [];
  _counter = 0;
}
