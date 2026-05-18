"use client";

import { useMemo } from "react";
import { Map } from "lucide-react";
import { useGovernance } from "@/lib/governance/store";

const DEPARTMENTS = [
  "Engineering",
  "Security",
  "Finance",
  "Marketing",
  "Compliance",
  "HR",
  "Legal",
  "Data",
  "DevOps",
  "Support",
  "Research",
  "Product",
];

function getThreatColor(count: number): { bg: string; text: string; pulse: boolean } {
  if (count === 0) return { bg: "bg-slate-800/60 border-slate-700/40", text: "text-slate-500", pulse: false };
  if (count <= 2) return { bg: "bg-yellow-900/20 border-yellow-700/30", text: "text-yellow-400", pulse: false };
  if (count <= 5) return { bg: "bg-orange-900/25 border-orange-700/40", text: "text-orange-400", pulse: false };
  if (count <= 8) return { bg: "bg-red-900/30 border-red-700/50", text: "text-red-400", pulse: false };
  return { bg: "bg-red-900/40 border-red-500/60", text: "text-red-300", pulse: true };
}

function HeatCell({ dept, count, total }: { dept: string; count: number; total: number }) {
  const { bg, text, pulse } = getThreatColor(count);
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div
      className={`relative flex flex-col items-center justify-center gap-0.5 p-2 rounded border text-center transition-all duration-500 ${bg} ${pulse ? "shadow-sm shadow-red-500/20" : ""}`}
      title={`${dept}: ${count} threat events`}
    >
      {pulse && (
        <div className="absolute inset-0 rounded border border-red-500/30 animate-ping opacity-20" />
      )}
      <span className="text-xs font-medium text-slate-400 leading-tight truncate w-full text-center">{dept}</span>
      <span className={`text-sm font-bold font-mono ${text}`}>{count}</span>
      {count > 0 && (
        <span className="text-xs text-slate-600">{pct}%</span>
      )}
    </div>
  );
}

export function DepartmentHeatmap() {
  const { state } = useGovernance();

  // Count threat events per department (only hostile event types)
  const threatEvents = useMemo(() => {
    return state.events.filter((e) =>
      ["injection_detected", "tool_blocked", "escalation", "quarantine", "policy_violation"].includes(e.type)
    );
  }, [state.events]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const dept of DEPARTMENTS) map[dept] = 0;
    for (const e of threatEvents) {
      if (e.department in map) {
        map[e.department]++;
      }
    }
    return map;
  }, [threatEvents]);

  const total = threatEvents.length;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Map className="h-4 w-4 text-cyan-400" />
          <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Department Threat Heatmap</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded bg-slate-700" />
            <span>Clean</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded bg-yellow-700" />
            <span>1–2</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded bg-orange-700" />
            <span>3–5</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded bg-red-700" />
            <span>6–8</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded bg-red-500 animate-pulse" />
            <span>9+</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2">
        {DEPARTMENTS.map((dept) => (
          <HeatCell key={dept} dept={dept} count={counts[dept] ?? 0} total={total} />
        ))}
      </div>

      <div className="mt-2 text-xs text-slate-600 text-right font-mono">
        {total} threat events tracked across {DEPARTMENTS.length} departments
      </div>
    </div>
  );
}
