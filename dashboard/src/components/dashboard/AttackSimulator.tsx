"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGovernance } from "@/lib/governance/store";
import { SIMULATED_AGENTS } from "@/lib/governance/simulator";
import type { SimulatedEvent } from "@/lib/governance/simulator";
import { createGovernanceEvent } from "@/lib/governance/policy-engine";
import {
  Zap, Bug, DollarSign, Database, ShieldAlert, CheckCircle2
} from "lucide-react";

// ─── Attack Scenario Types ────────────────────────────────────────────────────

interface AttackScenario {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  buttonColor: string;
  events: AttackEventSpec[];
  quarantineAgentId?: string;
}

interface AttackEventSpec {
  delayMs: number;
  source: "Agency Shield" | "Lobster Trap DPI";
  type: SimulatedEvent["type"];
  severity: SimulatedEvent["severity"];
  policyAction: SimulatedEvent["policyAction"];
  agentId: string;
  detailsFn: () => string;
}

// ─── Scenario Definitions ─────────────────────────────────────────────────────

const SCENARIOS: AttackScenario[] = [
  {
    id: "prompt-injection",
    label: "Prompt Injection",
    description: "Lobster Trap DPI intercepts a malicious instruction-override payload in an inter-agent API call",
    icon: <Zap className="h-4 w-4" />,
    color: "text-orange-400",
    buttonColor: "bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20 hover:border-orange-500/50 text-orange-300",
    events: [
      {
        delayMs: 0,
        source: "Lobster Trap DPI",
        type: "injection_detected",
        severity: "critical",
        policyAction: "DENY",
        agentId: "ag-013",
        detailsFn: () => "CRITICAL: social-writer injected IGNORE_PREVIOUS_INSTRUCTIONS into marketing-lead outbound prompt",
      },
      {
        delayMs: 800,
        source: "Lobster Trap DPI",
        type: "injection_detected",
        severity: "high",
        policyAction: "DENY",
        agentId: "ag-013",
        detailsFn: () => "Lobster Trap DPI: base64 payload stripped from social-writer → LLM request (248 bytes)",
      },
      {
        delayMs: 1600,
        source: "Agency Shield",
        type: "quarantine",
        severity: "critical",
        policyAction: "QUARANTINE",
        agentId: "ag-013",
        detailsFn: () => "Agency Shield: social-writer QUARANTINED — repeated injection attempts (pol-001)",
      },
      {
        delayMs: 2400,
        source: "Agency Shield",
        type: "escalation",
        severity: "critical",
        policyAction: "HUMAN_REVIEW",
        agentId: "ag-011",
        detailsFn: () => "Escalation: marketing-lead notified — security-lead assigned for forensic review",
      },
    ],
    quarantineAgentId: "ag-013",
  },
  {
    id: "fork-bomb",
    label: "Fork Bomb",
    description: "Agent tries to spawn unlimited sub-agents — only orchestration-layer governance catches this (LLM-layer firewalls are blind to it)",
    icon: <Bug className="h-4 w-4" />,
    color: "text-red-400",
    buttonColor: "bg-red-500/10 border-red-500/30 hover:bg-red-500/20 hover:border-red-500/50 text-red-300",
    events: [
      {
        delayMs: 0,
        source: "Agency Shield",
        type: "permission_denied",
        severity: "high",
        policyAction: "DENY",
        agentId: "ag-007",
        detailsFn: () => "vuln-scanner attempted to spawn sub-agent (depth=2, limit=3) — allowed",
      },
      {
        delayMs: 600,
        source: "Agency Shield",
        type: "permission_denied",
        severity: "high",
        policyAction: "DENY",
        agentId: "ag-007",
        detailsFn: () => "DENIED: vuln-scanner attempted recursive spawn at depth=4 — delegation limit exceeded (pol-005)",
      },
      {
        delayMs: 1200,
        source: "Agency Shield",
        type: "tool_blocked",
        severity: "critical",
        policyAction: "DENY",
        agentId: "ag-007",
        detailsFn: () => "BLOCKED: vuln-scanner called delegate_task x7 in 2s — fork bomb pattern detected by DelegationGuard",
      },
      {
        delayMs: 2000,
        source: "Agency Shield",
        type: "quarantine",
        severity: "critical",
        policyAction: "QUARANTINE",
        agentId: "ag-007",
        detailsFn: () => "Agency Shield QUARANTINED vuln-scanner — LLM-layer firewall was blind to this, only orchestration-layer caught it",
      },
      {
        delayMs: 2800,
        source: "Agency Shield",
        type: "escalation",
        severity: "critical",
        policyAction: "HUMAN_REVIEW",
        agentId: "ag-005",
        detailsFn: () => "Escalation: security-lead ALERTED — fork bomb neutralized, 7 phantom agents terminated",
      },
    ],
    quarantineAgentId: "ag-007",
  },
  {
    id: "budget-exhaustion",
    label: "Budget Exhaustion",
    description: "Runaway agent burns through token budget — cost circuit breakers fire before the bill arrives",
    icon: <DollarSign className="h-4 w-4" />,
    color: "text-yellow-400",
    buttonColor: "bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20 hover:border-yellow-500/50 text-yellow-300",
    events: [
      {
        delayMs: 0,
        source: "Agency Shield",
        type: "cost_alert",
        severity: "medium",
        policyAction: "LOG",
        agentId: "ag-028",
        detailsFn: () => "Cost monitor: web-researcher at 70% budget ($35.20 / $50.00) — alert threshold crossed",
      },
      {
        delayMs: 900,
        source: "Agency Shield",
        type: "cost_alert",
        severity: "high",
        policyAction: "RATE_LIMIT",
        agentId: "ag-028",
        detailsFn: () => "RATE LIMITED: web-researcher at 90% budget ($45.80 / $50.00) — requests throttled to 1/min",
      },
      {
        delayMs: 1800,
        source: "Agency Shield",
        type: "cost_alert",
        severity: "critical",
        policyAction: "DENY",
        agentId: "ag-028",
        detailsFn: () => "CIRCUIT BREAKER TRIPPED: web-researcher budget EXHAUSTED ($50.21 spent) — all LLM calls blocked",
      },
      {
        delayMs: 2500,
        source: "Agency Shield",
        type: "escalation",
        severity: "high",
        policyAction: "HUMAN_REVIEW",
        agentId: "ag-027",
        detailsFn: () => "Escalation: research-lead alerted — $50.21 runaway spend stopped, estimated savings $240+ if unchecked",
      },
    ],
    quarantineAgentId: "ag-028",
  },
  {
    id: "pii-exfiltration",
    label: "PII Exfiltration",
    description: "Agent tries to leak customer PII via an external webhook — defense-in-depth stops it at both layers",
    icon: <Database className="h-4 w-4" />,
    color: "text-violet-400",
    buttonColor: "bg-violet-500/10 border-violet-500/30 hover:bg-violet-500/20 hover:border-violet-500/50 text-violet-300",
    events: [
      {
        delayMs: 0,
        source: "Lobster Trap DPI",
        type: "injection_detected",
        severity: "critical",
        policyAction: "DENY",
        agentId: "ag-010",
        detailsFn: () => "Lobster Trap DPI: PII detected in invoice-processor API call — SSN + credit card pattern matched",
      },
      {
        delayMs: 700,
        source: "Agency Shield",
        type: "tool_blocked",
        severity: "critical",
        policyAction: "DENY",
        agentId: "ag-010",
        detailsFn: () => "BLOCKED: invoice-processor attempted webhook_post to external URL — tool classification: BLOCKED",
      },
      {
        delayMs: 1400,
        source: "Lobster Trap DPI",
        type: "injection_detected",
        severity: "high",
        policyAction: "HUMAN_REVIEW",
        agentId: "ag-010",
        detailsFn: () => "Lobster Trap DPI: declared intent=invoice_summary, detected intent=data_exfiltration (confidence 94%)",
      },
      {
        delayMs: 2100,
        source: "Agency Shield",
        type: "quarantine",
        severity: "critical",
        policyAction: "QUARANTINE",
        agentId: "ag-010",
        detailsFn: () => "Agency Shield QUARANTINED invoice-processor — compliance violation POL-GDPR-001, legal team notified",
      },
    ],
    quarantineAgentId: "ag-010",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface ScenarioState {
  running: boolean;
  completed: boolean;
  eventsInjected: number;
}

export function AttackSimulator() {
  const { dispatch, quarantineAgent, restoreAgent } = useGovernance();
  const [scenarioStates, setScenarioStates] = useState<Record<string, ScenarioState>>({});

  const runScenario = useCallback((scenario: AttackScenario) => {
    // Restore any previously quarantined agent for this scenario
    if (scenario.quarantineAgentId) {
      restoreAgent(scenario.quarantineAgentId);
    }

    setScenarioStates((prev) => ({
      ...prev,
      [scenario.id]: { running: true, completed: false, eventsInjected: 0 },
    }));

    scenario.events.forEach((spec, idx) => {
      setTimeout(() => {
        const agent = SIMULATED_AGENTS.find((a) => a.id === spec.agentId)!;
        const base = createGovernanceEvent(
          spec.type,
          spec.severity,
          agent.id,
          agent.name,
          agent.department,
          spec.detailsFn(),
          spec.policyAction,
          { simulated: true, scenario: scenario.id }
        );
        const event: SimulatedEvent = { ...base, source: spec.source };
        dispatch({ type: "ADD_EVENT", event });

        // Quarantine the agent when the quarantine event fires
        if (spec.type === "quarantine" && scenario.quarantineAgentId) {
          quarantineAgent(scenario.quarantineAgentId);
        }

        const isLast = idx === scenario.events.length - 1;
        if (isLast) {
          setScenarioStates((prev) => ({
            ...prev,
            [scenario.id]: { running: false, completed: true, eventsInjected: scenario.events.length },
          }));
        } else {
          setScenarioStates((prev) => ({
            ...prev,
            [scenario.id]: { ...prev[scenario.id], eventsInjected: idx + 1 },
          }));
        }
      }, spec.delayMs);
    });
  }, [dispatch, quarantineAgent, restoreAgent]);

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-red-400" />
          <CardTitle className="text-base text-white">Attack Simulator</CardTitle>
          <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
            Demo Mode
          </Badge>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Fire scripted multi-agent attack sequences. Watch events appear in the Live Feed and affected agents get quarantined in the Agents tab.
        </p>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SCENARIOS.map((scenario) => {
          const sState = scenarioStates[scenario.id];
          const isRunning = sState?.running ?? false;
          const isCompleted = sState?.completed ?? false;
          const eventsInjected = sState?.eventsInjected ?? 0;

          return (
            <div
              key={scenario.id}
              className="flex flex-col gap-2 p-4 rounded-lg border border-slate-800 bg-slate-800/30"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className={`flex items-center gap-1.5 font-semibold text-sm ${scenario.color}`}>
                    {scenario.icon}
                    {scenario.label}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {scenario.description}
                  </p>
                </div>
                {isCompleted && (
                  <CheckCircle2 className="h-4 w-4 text-green-400 flex-none mt-0.5" />
                )}
              </div>

              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={() => runScenario(scenario)}
                  disabled={isRunning}
                  className={`flex-1 px-3 py-2 rounded border text-xs font-semibold transition-all ${scenario.buttonColor} disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {isRunning
                    ? `Running... (${eventsInjected}/${scenario.events.length} events)`
                    : isCompleted
                    ? "Run Again"
                    : "Simulate Attack"}
                </button>
                {isCompleted && scenario.quarantineAgentId && (
                  <button
                    onClick={() => {
                      restoreAgent(scenario.quarantineAgentId!);
                      setScenarioStates((prev) => ({
                        ...prev,
                        [scenario.id]: { running: false, completed: false, eventsInjected: 0 },
                      }));
                    }}
                    className="px-2.5 py-2 rounded border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 text-xs transition-colors"
                    title="Restore quarantined agent"
                  >
                    Reset
                  </button>
                )}
              </div>

              {isRunning && (
                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${scenario.color.replace("text-", "bg-")}`}
                    style={{ width: `${(eventsInjected / scenario.events.length) * 100}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
