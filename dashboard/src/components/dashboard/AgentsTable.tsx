"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useGovernance } from "@/lib/governance/store";
import { Users } from "lucide-react";
import type { Agent, AgentTier } from "@/lib/governance/types";

const TIER_STYLES: Record<AgentTier, { badge: string; dot: string; label: string }> = {
  opus:   { badge: "bg-purple-500/20 text-purple-400 border-purple-500/40", dot: "bg-purple-400", label: "Opus" },
  sonnet: { badge: "bg-blue-500/20 text-blue-400 border-blue-500/40",       dot: "bg-blue-400",   label: "Sonnet" },
  haiku:  { badge: "bg-green-500/20 text-green-400 border-green-500/40",    dot: "bg-green-400",  label: "Haiku" },
};

const ROLE_STYLES: Record<string, string> = {
  leader:      "text-amber-400",
  coordinator: "text-cyan-400",
  member:      "text-slate-400",
};

const STATUS_STYLES: Record<string, string> = {
  active:     "bg-green-500/20 text-green-400 border-green-500/40",
  idle:       "bg-slate-500/20 text-slate-400 border-slate-500/40",
  blocked:    "bg-red-500/20 text-red-400 border-red-500/40",
  terminated: "bg-red-900/20 text-red-600 border-red-900/40",
};

function PermissionCount({ agent }: { agent: Agent }) {
  // Compute simulated permission count based on tier + role
  const base = agent.tier === "opus" ? 24 : agent.tier === "sonnet" ? 16 : 8;
  const roleBonus = agent.role === "leader" ? 8 : agent.role === "coordinator" ? 4 : 0;
  return <span className="font-mono text-slate-300">{base + roleBonus}</span>;
}

export function AgentsTable() {
  const { state } = useGovernance();
  const agents = state.agents;

  const depts = [...new Set(agents.map((a) => a.department))].sort();

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-cyan-400" />
            <CardTitle className="text-base text-white">Agent Hierarchy</CardTitle>
            <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs font-mono">
              {agents.length} agents · {depts.length} departments
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            {(["opus", "sonnet", "haiku"] as AgentTier[]).map((t) => (
              <div key={t} className="flex items-center gap-1.5">
                <div className={`h-2 w-2 rounded-full ${TIER_STYLES[t].dot}`} />
                <span>{TIER_STYLES[t].label} ({agents.filter((a) => a.tier === t).length})</span>
              </div>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider">Agent</TableHead>
                <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider">Department</TableHead>
                <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider">Role</TableHead>
                <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider">Tier</TableHead>
                <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider">Reports To</TableHead>
                <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider">Permissions</TableHead>
                <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((agent) => {
                const tier = TIER_STYLES[agent.tier];
                const reportsTo = agents.find((a) => a.id === agent.reportsTo);
                return (
                  <TableRow
                    key={agent.id}
                    className="border-slate-800/60 hover:bg-slate-800/30 transition-colors"
                  >
                    <TableCell className="font-mono text-sm text-slate-200">
                      <div className="flex items-center gap-2">
                        <div className={`h-1.5 w-1.5 rounded-full ${tier.dot}`} />
                        {agent.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm">{agent.department}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-semibold capitalize ${ROLE_STYLES[agent.role]}`}>
                        {agent.role}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs font-mono capitalize ${tier.badge}`}
                      >
                        {agent.tier}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs font-mono">
                      {reportsTo?.name ?? "root"}
                    </TableCell>
                    <TableCell>
                      <PermissionCount agent={agent} />
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${STATUS_STYLES[agent.status]}`}
                      >
                        {agent.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
