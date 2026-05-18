"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useGovernance } from "@/lib/governance/store";
import {
  Users, AlertOctagon, Zap, ShieldOff, DollarSign, CheckCircle2
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

export function StatsRow() {
  const { state } = useGovernance();
  const { stats } = state;

  const complianceColor =
    stats.complianceScore >= 90
      ? "text-green-400"
      : stats.complianceScore >= 70
      ? "text-yellow-400"
      : "text-red-400";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
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
        subtext="last 24h"
        icon={<AlertOctagon className="h-6 w-6" />}
        accent="text-red-400"
        pulse={stats.threatsBlocked > 0}
      />
      <StatCard
        label="Injections Caught"
        value={stats.injectionsCaught}
        subtext="by Lobster Trap DPI"
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
        label="Cost Saved"
        value={`$${stats.costSaved.toFixed(0)}`}
        subtext="via circuit breakers"
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
    </div>
  );
}
