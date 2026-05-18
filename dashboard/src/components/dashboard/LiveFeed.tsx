"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useGovernance } from "@/lib/governance/store";
import { SeverityBadge, ActionBadge, SourceBadge } from "./SeverityBadge";
import { Radio, Filter } from "lucide-react";
import type { SimulatedEvent } from "@/lib/governance/simulator";

const EVENT_TYPE_LABELS: Record<string, string> = {
  tool_blocked:      "TOOL BLOCKED",
  injection_detected:"INJECTION",
  escalation:        "ESCALATION",
  cost_alert:        "COST ALERT",
  permission_denied: "PERM DENIED",
  quarantine:        "QUARANTINE",
  audit:             "AUDIT",
  policy_violation:  "POLICY VIOLATION",
};

const EVENT_TYPE_COLORS: Record<string, string> = {
  tool_blocked:      "text-yellow-400",
  injection_detected:"text-red-400",
  escalation:        "text-purple-400",
  cost_alert:        "text-orange-400",
  permission_denied: "text-yellow-500",
  quarantine:        "text-red-500",
  audit:             "text-slate-400",
  policy_violation:  "text-orange-500",
};

function formatTs(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function EventRow({ event, isNew }: { event: SimulatedEvent; isNew: boolean }) {
  return (
    <div
      className={`flex gap-3 py-2.5 px-3 rounded-lg border transition-all duration-700 ${
        isNew
          ? "bg-cyan-500/5 border-cyan-500/20 shadow-sm shadow-cyan-500/10"
          : "bg-slate-900/50 border-slate-800/60 hover:bg-slate-900"
      }`}
    >
      <div className="flex-none w-20 text-xs font-mono text-slate-500 pt-0.5">
        {formatTs(event.timestamp)}
      </div>
      <div className="flex-none w-28">
        <SourceBadge source={event.source} />
      </div>
      <div className="flex-none w-24">
        <span className={`text-xs font-semibold font-mono ${EVENT_TYPE_COLORS[event.type] ?? "text-slate-400"}`}>
          {EVENT_TYPE_LABELS[event.type] ?? event.type.toUpperCase()}
        </span>
      </div>
      <div className="flex-none w-20">
        <SeverityBadge severity={event.severity} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-300 truncate">{event.details}</p>
        <p className="text-xs text-slate-500 mt-0.5 font-mono">{event.agentName} · {event.department}</p>
      </div>
      <div className="flex-none">
        <ActionBadge action={event.policyAction} />
      </div>
    </div>
  );
}

type FilterType = "all" | "Agency Shield" | "Lobster Trap DPI";

export function LiveFeed() {
  const { state } = useGovernance();
  const [filter, setFilter] = useState<FilterType>("all");
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const prevCountRef = useRef(state.events.length);

  // Track new events and highlight them briefly
  useEffect(() => {
    const curr = state.events;
    const prev = prevCountRef.current;
    if (curr.length > prev) {
      const newEventIds = new Set(curr.slice(0, curr.length - prev).map((e) => e.id));
      setNewIds(newEventIds);
      const timer = setTimeout(() => setNewIds(new Set()), 3000);
      prevCountRef.current = curr.length;
      return () => clearTimeout(timer);
    }
    prevCountRef.current = curr.length;
  }, [state.events]);

  const filtered = state.events.filter(
    (e) => filter === "all" || e.source === filter
  );

  const agencyCount = state.events.filter((e) => e.source === "Agency Shield").length;
  const lobsterCount = state.events.filter((e) => e.source === "Lobster Trap DPI").length;

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-cyan-400 animate-pulse" />
            <CardTitle className="text-base text-white">Live Governance Feed</CardTitle>
            <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs font-mono">
              {filtered.length} events
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <div className="flex gap-1">
              {(["all", "Agency Shield", "Lobster Trap DPI"] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    filter === f
                      ? "bg-slate-700 text-white"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {f === "all"
                    ? `All (${state.events.length})`
                    : f === "Agency Shield"
                    ? `Shield (${agencyCount})`
                    : `Lobster Trap (${lobsterCount})`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Layer legend */}
        <div className="flex gap-4 mt-2 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-cyan-400" />
            <span>Agency Shield = Orchestration-layer governance</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-violet-400" />
            <span>Lobster Trap DPI = LLM-layer deep packet inspection</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[520px] px-4 pb-4">
          <div className="space-y-1.5">
            {filtered.length === 0 ? (
              <p className="text-center text-slate-500 text-sm py-12">No events yet — starting simulation...</p>
            ) : (
              filtered.map((event) => (
                <EventRow key={event.id} event={event} isNew={newIds.has(event.id)} />
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
