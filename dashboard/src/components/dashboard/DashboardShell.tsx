"use client";

import { Shield, Activity, AlertTriangle, Cpu, Network, Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { StatsRow } from "./StatsRow";
import { LiveFeed } from "./LiveFeed";
import { AgentsTable } from "./AgentsTable";
import { AgentGraph } from "./AgentGraph";
import { AuditTrail } from "./AuditTrail";
import { PoliciesPanel } from "./PoliciesPanel";
import { AttackSimulator } from "./AttackSimulator";
import { LobsterTrapConfig } from "./LobsterTrapConfig";
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

function OverviewHero() {
  const { state } = useGovernance();
  const depts = [...new Set(state.agents.map((a) => a.department))];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Left: what it is */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Info className="h-3.5 w-3.5 text-cyan-400 flex-none" />
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">What Agency Shield Does</span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">
            Monitors <span className="text-white font-semibold">{state.agents.length} AI agents</span> across{" "}
            <span className="text-white font-semibold">{depts.length} departments</span> with two independent security layers.{" "}
            Defends against prompt injection, unauthorized tool use, fork bombs, cost overruns, and delegation attacks — at the{" "}
            <span className="text-cyan-400 font-semibold">orchestration layer</span>, the blind spot every other security tool misses.
          </p>
        </div>

        {/* Center: defense-in-depth diagram */}
        <div className="flex-none">
          <div className="flex items-center gap-0 text-xs font-mono">
            <div className="flex flex-col items-center gap-0.5 px-3 py-2 rounded border border-slate-700 bg-slate-800/60">
              <span className="text-slate-400 text-xs">AI Agents</span>
            </div>
            <div className="text-slate-600 px-1 text-xs">→</div>
            <div className="flex flex-col items-center gap-0.5 px-3 py-2 rounded border border-violet-700/50 bg-violet-900/20">
              <Cpu className="h-3 w-3 text-violet-400" />
              <span className="text-violet-300 text-xs">Lobster Trap</span>
              <span className="text-violet-600" style={{ fontSize: "9px" }}>LLM layer</span>
            </div>
            <div className="text-slate-600 px-1 text-xs">→</div>
            <div className="flex flex-col items-center gap-0.5 px-3 py-2 rounded border border-slate-700 bg-slate-800/60">
              <span className="text-slate-400 text-xs">LLM API</span>
            </div>
          </div>
          <div className="flex justify-start pl-3 mt-0">
            <div className="text-slate-600 text-xs font-mono ml-3">│</div>
          </div>
          <div className="flex items-center gap-0 text-xs font-mono pl-3">
            <div className="text-slate-600 text-xs font-mono mr-1">▼</div>
            <div className="flex flex-col items-center gap-0.5 px-3 py-2 rounded border border-cyan-700/50 bg-cyan-900/20">
              <Shield className="h-3 w-3 text-cyan-400" />
              <span className="text-cyan-300 text-xs">Agency Shield</span>
              <span className="text-cyan-600" style={{ fontSize: "9px" }}>Orchestration layer</span>
            </div>
          </div>
        </div>

        {/* Right: quick nav hint */}
        <div className="flex-none text-xs text-slate-500 space-y-1.5 border-l border-slate-800 pl-4">
          <p className="font-semibold text-slate-400">Explore:</p>
          <p><span className="text-cyan-400">Live Feed</span> — real-time events</p>
          <p><span className="text-cyan-400">Topology</span> — visual agent graph</p>
          <p><span className="text-red-400">Simulate</span> — fire attack scenarios</p>
          <p><span className="text-violet-400">Lobster Trap</span> — DPI config</p>
        </div>
      </div>
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

        {/* Overview hero — gives judges the 5-second mental model */}
        <OverviewHero />

        <Separator className="bg-slate-800" />

        {/* Tabs */}
        <Tabs defaultValue="feed" className="space-y-4">
          <TabsList className="bg-slate-900 border border-slate-800 p-1 flex-wrap">
            <TabsTrigger
              value="feed"
              className="text-slate-400 data-[state=active]:bg-slate-800 data-[state=active]:text-white"
            >
              Live Feed
            </TabsTrigger>
            <TabsTrigger
              value="topology"
              className="text-slate-400 data-[state=active]:bg-slate-800 data-[state=active]:text-white flex items-center gap-1.5"
            >
              <Network className="h-3.5 w-3.5" />
              Topology
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
              value="lobstertrap"
              className="text-slate-400 data-[state=active]:bg-violet-900/40 data-[state=active]:text-violet-300 flex items-center gap-1.5"
            >
              <Cpu className="h-3.5 w-3.5" />
              Lobster Trap
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
          <TabsContent value="topology" className="mt-0">
            <AgentGraph />
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
          <TabsContent value="lobstertrap" className="mt-0">
            <LobsterTrapConfig />
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
