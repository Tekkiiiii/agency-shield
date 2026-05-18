"use client";

import { Shield, Activity, AlertTriangle, Cpu } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { StatsRow } from "./StatsRow";
import { LiveFeed } from "./LiveFeed";
import { AgentsTable } from "./AgentsTable";
import { AuditTrail } from "./AuditTrail";
import { PoliciesPanel } from "./PoliciesPanel";
import { AttackSimulator } from "./AttackSimulator";
import { useGovernance } from "@/lib/governance/store";

function ThreatLevelBadge() {
  const { state } = useGovernance();
  const { stats } = state;

  let level = "NORMAL";
  let color = "text-green-400";
  let bg = "bg-green-500/10 border-green-500/30";
  let icon = <Activity className="h-3.5 w-3.5 text-green-400" />;

  if (stats.threatsBlocked > 20 || stats.injectionsCaught > 10) {
    level = "CRITICAL";
    color = "text-red-400";
    bg = "bg-red-500/10 border-red-500/30";
    icon = <AlertTriangle className="h-3.5 w-3.5 text-red-400 animate-pulse" />;
  } else if (stats.threatsBlocked > 10 || stats.injectionsCaught > 5) {
    level = "HIGH";
    color = "text-orange-400";
    bg = "bg-orange-500/10 border-orange-500/30";
    icon = <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />;
  } else if (stats.threatsBlocked > 3) {
    level = "ELEVATED";
    color = "text-yellow-400";
    bg = "bg-yellow-500/10 border-yellow-500/30";
    icon = <AlertTriangle className="h-3.5 w-3.5 text-yellow-400" />;
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${bg}`}>
      {icon}
      <span className={`text-xs font-semibold ${color}`}>Threat Level: {level}</span>
    </div>
  );
}

export function DashboardShell() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Shield className="h-8 w-8 text-cyan-400" strokeWidth={1.5} />
              <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-400 border-2 border-slate-950 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Agency<span className="text-cyan-400">Shield</span>
              </h1>
              <p className="text-xs text-slate-400 leading-none mt-0.5">
                Defense in Depth for Multi-Agent Systems
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live indicator */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Activity className="h-3.5 w-3.5 text-green-400 animate-pulse" />
              <span>Live</span>
            </div>

            {/* Reactive threat level */}
            <ThreatLevelBadge />

            <div className="text-xs text-slate-500 hidden xl:block">
              TechEx Hackathon · Track 1
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-6 py-6 space-y-6">
        {/* Stats */}
        <StatsRow />

        <Separator className="bg-slate-800" />

        {/* Tabs */}
        <Tabs defaultValue="feed" className="space-y-4">
          <TabsList className="bg-slate-900 border border-slate-800 p-1">
            <TabsTrigger
              value="feed"
              className="text-slate-400 data-[state=active]:bg-slate-800 data-[state=active]:text-white"
            >
              Live Feed
            </TabsTrigger>
            <TabsTrigger
              value="agents"
              className="text-slate-400 data-[state=active]:bg-slate-800 data-[state=active]:text-white"
            >
              Agents
            </TabsTrigger>
            <TabsTrigger
              value="audit"
              className="text-slate-400 data-[state=active]:bg-slate-800 data-[state=active]:text-white"
            >
              Audit Trail
            </TabsTrigger>
            <TabsTrigger
              value="policies"
              className="text-slate-400 data-[state=active]:bg-slate-800 data-[state=active]:text-white"
            >
              Policies
            </TabsTrigger>
            <TabsTrigger
              value="simulate"
              className="text-slate-400 data-[state=active]:bg-red-900/40 data-[state=active]:text-red-300"
            >
              Simulate
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="mt-0">
            <LiveFeed />
          </TabsContent>
          <TabsContent value="agents" className="mt-0">
            <AgentsTable />
          </TabsContent>
          <TabsContent value="audit" className="mt-0">
            <AuditTrail />
          </TabsContent>
          <TabsContent value="policies" className="mt-0">
            <PoliciesPanel />
          </TabsContent>
          <TabsContent value="simulate" className="mt-0">
            <AttackSimulator />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-6 py-3 flex items-center justify-center gap-4 text-xs text-slate-600">
        <span>Agency Shield · TechEx Intelligent Enterprise Solutions Hackathon 2026 · Track 1: Agent Security &amp; AI Governance</span>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/20">
          <Cpu className="h-3 w-3 text-violet-500" />
          <span className="text-violet-400">Powered by Lobster Trap (Veea)</span>
        </div>
      </footer>
    </div>
  );
}
