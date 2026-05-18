"use client";

import { createContext, useContext, useEffect, useReducer, useRef, useCallback } from "react";
import type { GovernanceEvent, Agent, AuditEntry, PolicyRule, DashboardStats } from "./types";
import type { SimulatedEvent } from "./simulator";
import { generateSeedEvents, onEvent, startSimulation, SIMULATED_AGENTS } from "./simulator";
import { auditFromEvent, getAuditEntries } from "./audit";
import { seedCostData, getTotalSaved, getAllGuardrails } from "./cost-monitor";
import { getPolicies } from "./policy-engine";

// ─── State ────────────────────────────────────────────────────────────────────

export interface GovernanceState {
  events: SimulatedEvent[];
  agents: Agent[];
  auditEntries: AuditEntry[];
  policies: PolicyRule[];
  stats: DashboardStats;
  totalCostSaved: number;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: "ADD_EVENT"; event: SimulatedEvent }
  | { type: "SEED_EVENTS"; events: SimulatedEvent[] }
  | { type: "TOGGLE_POLICY"; id: string }
  | { type: "QUARANTINE_AGENT"; agentId: string }
  | { type: "RESTORE_AGENT"; agentId: string }
  | { type: "RECOVER_TRUST" };

// Trust score penalties per severity
const TRUST_PENALTY: Record<string, number> = {
  critical: 15,
  high: 10,
  medium: 5,
  low: 2,
};

function applyTrustPenalty(agents: Agent[], agentId: string, severity: string): Agent[] {
  const penalty = TRUST_PENALTY[severity] ?? 0;
  if (penalty === 0) return agents;
  return agents.map((a) => {
    if (a.id !== agentId) return a;
    const newScore = Math.max(0, a.trustScore - penalty);
    return { ...a, trustScore: newScore };
  });
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function computeStats(events: SimulatedEvent[], agents: Agent[]): DashboardStats {
  const threats = events.filter((e) => ["injection_detected", "tool_blocked", "quarantine", "escalation"].includes(e.type));
  const injections = events.filter((e) => e.type === "injection_detected");
  const toolBlocks = events.filter((e) => e.type === "tool_blocked");
  const active = agents.filter((a) => a.status === "active").length;

  return {
    totalAgents: agents.length,
    activeAgents: active,
    eventsLast24h: events.length,
    threatsBlocked: threats.length,
    injectionsCaught: injections.length,
    costSaved: parseFloat(getTotalSaved().toFixed(2)),
    complianceScore: Math.max(60, 100 - Math.floor(threats.length * 0.8)),
    policyRules: 8,
  };
}

function governanceReducer(state: GovernanceState, action: Action): GovernanceState {
  switch (action.type) {
    case "ADD_EVENT": {
      // Log to audit trail
      auditFromEvent(action.event);
      const events = [action.event, ...state.events].slice(0, 500);

      // Apply trust score penalty for the affected agent
      let updatedAgents = applyTrustPenalty(state.agents, action.event.agentId, action.event.severity);

      // Auto-quarantine if trust drops below 30 and agent is not already blocked
      updatedAgents = updatedAgents.map((a) => {
        if (a.trustScore < 30 && a.status === "active") {
          return { ...a, status: "blocked" as const };
        }
        return a;
      });

      return {
        ...state,
        events,
        agents: updatedAgents,
        auditEntries: getAuditEntries().slice(0, 200),
        stats: computeStats(events, updatedAgents),
        totalCostSaved: getTotalSaved(),
      };
    }
    case "SEED_EVENTS": {
      for (const e of action.events) auditFromEvent(e);
      const events = [...action.events].reverse().concat(state.events).slice(0, 500);
      // Apply trust penalties from seeded events
      let seededAgents = state.agents;
      for (const e of action.events) {
        if (e.severity === "critical" || e.severity === "high" || e.severity === "medium") {
          seededAgents = applyTrustPenalty(seededAgents, e.agentId, e.severity);
        }
      }
      return {
        ...state,
        events,
        agents: seededAgents,
        auditEntries: getAuditEntries().slice(0, 200),
        stats: computeStats(events, seededAgents),
        totalCostSaved: getTotalSaved(),
      };
    }
    case "TOGGLE_POLICY": {
      const policies = state.policies.map((p) =>
        p.id === action.id ? { ...p, enabled: !p.enabled } : p
      );
      return { ...state, policies };
    }
    case "QUARANTINE_AGENT": {
      const agents = state.agents.map((a) =>
        a.id === action.agentId ? { ...a, status: "blocked" as const } : a
      );
      return { ...state, agents, stats: computeStats(state.events, agents) };
    }
    case "RESTORE_AGENT": {
      const agents = state.agents.map((a) =>
        a.id === action.agentId ? { ...a, status: "active" as const, trustScore: Math.min(100, a.trustScore + 20) } : a
      );
      return { ...state, agents, stats: computeStats(state.events, agents) };
    }
    case "RECOVER_TRUST": {
      // +1 trust per 30s for all non-quarantined agents (cap at 100)
      const agents = state.agents.map((a) => {
        if (a.status === "blocked") return a;
        return { ...a, trustScore: Math.min(100, a.trustScore + 1) };
      });
      return { ...state, agents, stats: computeStats(state.events, agents) };
    }
    default:
      return state;
  }
}

// ─── Initial State ────────────────────────────────────────────────────────────

function buildInitialState(): GovernanceState {
  // Seed cost data
  seedCostData(SIMULATED_AGENTS.map((a) => ({ id: a.id, tier: a.tier })));

  return {
    events: [],
    agents: SIMULATED_AGENTS,
    auditEntries: [],
    policies: getPolicies(),
    stats: {
      totalAgents: SIMULATED_AGENTS.length,
      activeAgents: SIMULATED_AGENTS.filter((a) => a.status === "active").length,
      eventsLast24h: 0,
      threatsBlocked: 0,
      injectionsCaught: 0,
      costSaved: 0,
      complianceScore: 100,
      policyRules: 8,
    },
    totalCostSaved: 0,
  };
}

// ─── Context ──────────────────────────────────────────────────────────────────

import React from "react";

interface GovernanceContextValue {
  state: GovernanceState;
  togglePolicy: (id: string) => void;
  quarantineAgent: (agentId: string) => void;
  restoreAgent: (agentId: string) => void;
  dispatch: React.Dispatch<Action>;
}

const GovernanceContext = createContext<GovernanceContextValue | null>(null);

export function GovernanceProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(governanceReducer, undefined, buildInitialState);
  const seeded = useRef(false);

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;

    // Seed historical events
    const seeds = generateSeedEvents(40);
    dispatch({ type: "SEED_EVENTS", events: seeds });

    // Subscribe to live events
    const unsub = onEvent((event) => {
      dispatch({ type: "ADD_EVENT", event });
    });

    // Start simulator
    startSimulation();

    // Trust recovery: +1 per 30 seconds for non-quarantined agents
    const trustInterval = setInterval(() => {
      dispatch({ type: "RECOVER_TRUST" });
    }, 30_000);

    return () => {
      unsub();
      clearInterval(trustInterval);
    };
  }, []);

  const togglePolicy = useCallback((id: string) => {
    dispatch({ type: "TOGGLE_POLICY", id });
  }, []);

  const quarantineAgent = useCallback((agentId: string) => {
    dispatch({ type: "QUARANTINE_AGENT", agentId });
  }, []);

  const restoreAgent = useCallback((agentId: string) => {
    dispatch({ type: "RESTORE_AGENT", agentId });
  }, []);

  return React.createElement(GovernanceContext.Provider, { value: { state, togglePolicy, quarantineAgent, restoreAgent, dispatch } }, children);
}

export function useGovernance(): GovernanceContextValue {
  const ctx = useContext(GovernanceContext);
  if (!ctx) throw new Error("useGovernance must be used inside GovernanceProvider");
  return ctx;
}
