"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGovernance } from "@/lib/governance/store";
import { SeverityBadge, ActionBadge } from "./SeverityBadge";
import { ShieldCheck, ToggleLeft, ToggleRight } from "lucide-react";

export function PoliciesPanel() {
  const { state, togglePolicy } = useGovernance();
  const { policies } = state;

  const enabled = policies.filter((p) => p.enabled).length;
  const totalHits = policies.reduce((s, p) => s + p.hitCount, 0);

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-cyan-400" />
            <CardTitle className="text-base text-white">Policy Rules</CardTitle>
            <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs font-mono">
              {enabled}/{policies.length} enabled · {totalHits} total hits
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {policies.map((policy) => (
          <div
            key={policy.id}
            className={`flex items-start gap-4 p-4 rounded-lg border transition-all ${
              policy.enabled
                ? "bg-slate-800/50 border-slate-700"
                : "bg-slate-900/30 border-slate-800/40 opacity-50"
            }`}
          >
            {/* Toggle */}
            <button
              onClick={() => togglePolicy(policy.id)}
              className="flex-none mt-0.5 text-slate-400 hover:text-cyan-400 transition-colors"
              title={policy.enabled ? "Disable policy" : "Enable policy"}
            >
              {policy.enabled ? (
                <ToggleRight className="h-5 w-5 text-cyan-400" />
              ) : (
                <ToggleLeft className="h-5 w-5" />
              )}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-white">{policy.name}</span>
                <span className="text-xs font-mono text-slate-500">{policy.id}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{policy.description}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-xs font-mono bg-slate-700/60 px-2 py-0.5 rounded text-slate-400">
                  pattern: {policy.pattern}
                </span>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-col items-end gap-2 flex-none">
              <ActionBadge action={policy.action} />
              <SeverityBadge severity={policy.severity} />
            </div>

            {/* Hit count */}
            <div className="flex-none text-right min-w-[60px]">
              <div className="text-xl font-bold tabular-nums text-white">{policy.hitCount}</div>
              <div className="text-xs text-slate-500">hits</div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
