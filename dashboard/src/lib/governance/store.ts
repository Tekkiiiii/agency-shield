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
  | { type: "TOGGLE_POLICY"; id: string };

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
      return {
        ...state,
        events,
        auditEntries: getAuditEntries().slice(0, 200),
        stats: computeStats(events, state.agents),
        totalCostSaved: getTotalSaved(),
      };
    }
    case "SEED_EVENTS": {
      for (const e of action.events) auditFromEvent(e);
      const events = [...action.events].reverse().concat(state.events).slice(0, 500);
      return {
        ...state,
        events,
        auditEntries: getAuditEntries().slice(0, 200),
        stats: computeStats(events, state.agents),
        totalCostSaved: getTotalSaved(),
      };
    }
    case "TOGGLE_POLICY": {
      const policies = state.policies.map((p) =>
        p.id === action.id ? { ...p, enabled: !p.enabled } : p
      );
      return { ...state, policies };
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

    return unsub;
  }, []);

  const togglePolicy = useCallback((id: string) => {
    dispatch({ type: "TOGGLE_POLICY", id });
  }, []);

  return React.createElement(GovernanceContext.Provider, { value: { state, togglePolicy } }, children);
}

export function useGovernance(): GovernanceContextValue {
  const ctx = useContext(GovernanceContext);
  if (!ctx) throw new Error("useGovernance must be used inside GovernanceProvider");
  return ctx;
}
