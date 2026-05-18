"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useGovernance } from "@/lib/governance/store";
import {
  Users, AlertOctagon, Zap, ShieldOff, DollarSign, CheckCircle2, HeartPulse
} from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  accent: string;
  pulse?: boolean;
}

function StatCard({ label, value, subtext, icon, accent, pulse }: StatCardProps) {
  return (
    <Card className="bg-slate-900 border-slate-800 flex-1">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{label}</p>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-3xl font-bold tabular-nums ${accent}`}>
                {value}
              </span>
            </div>
            {subtext && <p className="text-xs text-slate-500">{subtext}</p>}
          </div>
          <div className={`${accent} opacity-60 relative`}>
            {pulse && (
              <span className={`absolute -top-1 -right-1 h-2 w-2 rounded-full ${accent.replace("text-", "bg-")} animate-ping opacity-75`} />
            )}
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function useDeltaLast60s(events: { timestamp: string; type: string }[], type: string): number {
  const [delta, setDelta] = useState(0);

  useEffect(() => {
    function count() {
      const cutoff = Date.now() - 60_000;
      return events.filter(
        (e) => e.type === type && new Date(e.timestamp).getTime() >= cutoff
      ).length;
    }
    setDelta(count());
    const interval = setInterval(() => setDelta(count()), 5000);
    return () => clearInterval(interval);
  }, [events, type]);

  return delta;
}

export function StatsRow() {
  const { state } = useGovernance();
  const { stats } = state;

  const threatDelta = useDeltaLast60s(
    state.events.filter((e) => ["injection_detected", "tool_blocked", "quarantine", "escalation"].includes(e.type)),
    state.events.find((e) => ["injection_detected", "tool_blocked", "quarantine", "escalation"].includes(e.type))?.type ?? "injection_detected"
  );

  // Count ALL threat-type events in last 60s
  const [threatsLast60, setThreatsLast60] = useState(0);
  const [injectionsLast60, setInjectionsLast60] = useState(0);

  useEffect(() => {
    function countThreats() {
      const cutoff = Date.now() - 60_000;
      return state.events.filter(
        (e) =>
          ["injection_detected", "tool_blocked", "quarantine", "escalation"].includes(e.type) &&
          new Date(e.timestamp).getTime() >= cutoff
      ).length;
    }
    function countInjections() {
      const cutoff = Date.now() - 60_000;
      return state.events.filter(
        (e) => e.type === "injection_detected" && new Date(e.timestamp).getTime() >= cutoff
      ).length;
    }
    setThreatsLast60(countThreats());
    setInjectionsLast60(countInjections());
    const iv = setInterval(() => {
      setThreatsLast60(countThreats());
      setInjectionsLast60(countInjections());
    }, 5000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.events]);

  void threatDelta;

  const complianceColor =
    stats.complianceScore >= 90
      ? "text-green-400"
      : stats.complianceScore >= 70
      ? "text-yellow-400"
      : "text-red-400";

  const avgTrust = state.agents.length > 0
    ? Math.round(state.agents.reduce((sum, a) => sum + a.trustScore, 0) / state.agents.length)
    : 100;

  const trustColor =
    avgTrust > 70 ? "text-green-400" : avgTrust > 30 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-7 gap-4">
      <StatCard
        label="Total Agents"
        value={stats.totalAgents}
        subtext={`${stats.activeAgents} active`}
        icon={<Users className="h-6 w-6" />}
        accent="text-cyan-400"
      />
      <StatCard
        label="Active Threats"
        value={stats.threatsBlocked}
        subtext={threatsLast60 > 0 ? `+${threatsLast60} last 60s` : "last 24h"}
        icon={<AlertOctagon className="h-6 w-6" />}
        accent="text-red-400"
        pulse={stats.threatsBlocked > 0}
      />
      <StatCard
        label="Injections Caught"
        value={stats.injectionsCaught}
        subtext={injectionsLast60 > 0 ? `+${injectionsLast60} last 60s` : "by Lobster Trap DPI"}
        icon={<Zap className="h-6 w-6" />}
        accent="text-orange-400"
        pulse={stats.injectionsCaught > 0}
      />
      <StatCard
        label="Tools Blocked"
        value={state.events.filter((e) => e.type === "tool_blocked").length}
        subtext="unauthorized calls"
        icon={<ShieldOff className="h-6 w-6" />}
        accent="text-yellow-400"
      />
      <StatCard
        label="Overruns Caught"
        value={`$${stats.costSaved.toFixed(0)}`}
        subtext="stopped by circuit breakers"
        icon={<DollarSign className="h-6 w-6" />}
        accent="text-green-400"
      />
      <StatCard
        label="Compliance"
        value={`${stats.complianceScore}%`}
        subtext="policy adherence"
        icon={<CheckCircle2 className="h-6 w-6" />}
        accent={complianceColor}
      />
      <StatCard
        label="Avg Trust Score"
        value={avgTrust}
        subtext={avgTrust < 30 ? "critical — agents at risk" : avgTrust < 70 ? "degraded behavior" : "healthy fleet"}
        icon={<HeartPulse className="h-6 w-6" />}
        accent={trustColor}
        pulse={avgTrust < 50}
      />
    </div>
  );
}
