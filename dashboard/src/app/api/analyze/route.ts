import { NextRequest, NextResponse } from "next/server";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface IncomingEvent {
  id: string;
  timestamp: string;
  type: string;
  severity: string;
  agentId: string;
  agentName: string;
  department: string;
  details: string;
  metadata: Record<string, unknown>;
  policyAction: string;
  source: string;
}

interface ThreatIntelResult {
  summary: string;
  topThreat: string;
  trajectory: "increasing" | "decreasing" | "stable";
  attackPatterns: string[];
  riskScore: number;
  dominantDepartment: string;
  mostTargetedAgent: string;
  severityBreakdown: Record<string, number>;
  eventTypeBreakdown: Record<string, number>;
  coordinatedAttackDetected: boolean;
}

// ─── Heuristic Pattern Detector ────────────────────────────────────────────────

function detectCoordinatedAttack(events: IncomingEvent[]): boolean {
  // Coordinated = injection attempt(s) within 30s of escalation event
  const sorted = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].type === "injection_detected") {
      const t0 = new Date(sorted[i].timestamp).getTime();
      const followupEscalation = sorted.find(
        (e, j) => j > i && e.type === "escalation" && new Date(e.timestamp).getTime() - t0 < 30_000
      );
      if (followupEscalation) return true;
    }
  }
  return false;
}

function computeTrajectory(events: IncomingEvent[]): "increasing" | "decreasing" | "stable" {
  if (events.length < 4) return "stable";

  const sorted = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const half = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, half);
  const secondHalf = sorted.slice(half);

  const severityWeight = (s: string) => s === "critical" ? 4 : s === "high" ? 3 : s === "medium" ? 2 : 1;

  const firstScore = firstHalf.reduce((acc, e) => acc + severityWeight(e.severity), 0) / firstHalf.length;
  const secondScore = secondHalf.reduce((acc, e) => acc + severityWeight(e.severity), 0) / secondHalf.length;

  if (secondScore > firstScore * 1.25) return "increasing";
  if (secondScore < firstScore * 0.75) return "decreasing";
  return "stable";
}

function computeRiskScore(
  events: IncomingEvent[],
  coordinated: boolean
): number {
  if (events.length === 0) return 0;

  const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const e of events) counts[e.severity] = (counts[e.severity] ?? 0) + 1;

  let raw =
    counts.critical * 15 +
    counts.high * 8 +
    counts.medium * 3 +
    counts.low * 1;

  if (coordinated) raw += 20;

  // Normalize to 0–100
  return Math.min(100, Math.round(raw));
}

function buildNaturalLanguageSummary(
  events: IncomingEvent[],
  topDept: string,
  topAgent: string,
  trajectory: "increasing" | "decreasing" | "stable",
  riskScore: number,
  coordinated: boolean
): string {
  if (events.length === 0) {
    return "No threat events detected in the observation window. All agents are operating within policy boundaries.";
  }

  const threatEvents = events.filter((e) =>
    ["injection_detected", "tool_blocked", "escalation", "quarantine", "policy_violation"].includes(e.type)
  );

  const threatCount = threatEvents.length;
  const injections = events.filter((e) => e.type === "injection_detected").length;
  const escalations = events.filter((e) => e.type === "escalation").length;

  const trajectoryPhrase =
    trajectory === "increasing"
      ? "Threat activity is escalating — severity-weighted volume in the second half of the window exceeds the first by over 25%."
      : trajectory === "decreasing"
      ? "Threat activity is subsiding — severity is trending lower, suggesting the attack vector may be contained."
      : "Threat activity is holding steady with no clear directional trend.";

  const coordinatedPhrase = coordinated
    ? ` Correlation analysis detected a coordinated attack pattern: prompt injection attempts were followed by escalation events within 30 seconds, indicating an adversary probing delegation boundaries.`
    : "";

  const riskPhrase =
    riskScore >= 70
      ? "Risk posture is CRITICAL — immediate operator review is advised."
      : riskScore >= 40
      ? `Risk posture is ELEVATED at ${riskScore}/100.`
      : `Risk posture is LOW at ${riskScore}/100.`;

  return `${threatCount} threat event${threatCount !== 1 ? "s" : ""} detected across ${topDept} (most active department); agent ${topAgent} is the primary target with ${injections} injection attempt${injections !== 1 ? "s" : ""} and ${escalations} escalation${escalations !== 1 ? "s" : ""}.${coordinatedPhrase} ${trajectoryPhrase} ${riskPhrase}`;
}

function buildAttackPatterns(events: IncomingEvent[], coordinated: boolean): string[] {
  const patterns: string[] = [];
  const types = events.map((e) => e.type);
  const injections = types.filter((t) => t === "injection_detected").length;
  const escalations = types.filter((t) => t === "escalation").length;
  const quarantines = types.filter((t) => t === "quarantine").length;
  const toolBlocks = types.filter((t) => t === "tool_blocked").length;
  const policViolations = types.filter((t) => t === "policy_violation").length;

  if (coordinated) {
    patterns.push("Coordinated attack: injection → escalation correlation within 30s window");
  }
  if (injections >= 3) {
    patterns.push(`Injection storm: ${injections} injection attempts suggest automated probing`);
  }
  if (escalations >= 2 && toolBlocks >= 2) {
    patterns.push("Privilege escalation + tool abuse: dual-vector attack pattern detected");
  }
  if (quarantines >= 1) {
    patterns.push(`${quarantines} agent${quarantines > 1 ? "s" : ""} auto-quarantined — trust score threshold breached`);
  }
  if (toolBlocks > injections && toolBlocks >= 3) {
    patterns.push("Tool enumeration: high block rate suggests systematic capability probing");
  }
  if (policViolations >= 2) {
    patterns.push(`${policViolations} policy violations — policy engine under sustained pressure`);
  }
  if (patterns.length === 0) {
    patterns.push("Low-level background noise — no structured attack pattern detected");
  }

  return patterns;
}

// ─── Route Handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const events: IncomingEvent[] = Array.isArray(body.events) ? body.events.slice(0, 30) : [];

    // Frequency analysis
    const deptCounts: Record<string, number> = {};
    const agentCounts: Record<string, number> = {};
    const severityCounts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, none: 0 };
    const typeCounts: Record<string, number> = {};

    for (const e of events) {
      deptCounts[e.department] = (deptCounts[e.department] ?? 0) + 1;
      agentCounts[e.agentName] = (agentCounts[e.agentName] ?? 0) + 1;
      severityCounts[e.severity] = (severityCounts[e.severity] ?? 0) + 1;
      typeCounts[e.type] = (typeCounts[e.type] ?? 0) + 1;
    }

    const topDept = Object.entries(deptCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Unknown";
    const topAgent = Object.entries(agentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Unknown";

    // Pattern detection
    const coordinated = detectCoordinatedAttack(events);
    const trajectory = computeTrajectory(events);
    const riskScore = computeRiskScore(events, coordinated);
    const attackPatterns = buildAttackPatterns(events, coordinated);
    const summary = buildNaturalLanguageSummary(events, topDept, topAgent, trajectory, riskScore, coordinated);

    // Top threat type
    const topThreatEntry = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
    const topThreatLabel: Record<string, string> = {
      injection_detected: "Prompt Injection",
      tool_blocked: "Unauthorized Tool Use",
      escalation: "Privilege Escalation",
      cost_alert: "Cost Overrun",
      permission_denied: "Permission Violation",
      quarantine: "Agent Quarantine",
      policy_violation: "Policy Violation",
      audit: "Audit Event",
    };
    const topThreat = topThreatEntry ? (topThreatLabel[topThreatEntry[0]] ?? topThreatEntry[0]) : "None";

    const result: ThreatIntelResult = {
      summary,
      topThreat,
      trajectory,
      attackPatterns,
      riskScore,
      dominantDepartment: topDept,
      mostTargetedAgent: topAgent,
      severityBreakdown: severityCounts,
      eventTypeBreakdown: typeCounts,
      coordinatedAttackDetected: coordinated,
    };

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
