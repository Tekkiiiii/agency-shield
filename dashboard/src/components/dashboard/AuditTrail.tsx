"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGovernance } from "@/lib/governance/store";
import { ResultBadge } from "./SeverityBadge";
import { ClipboardList, Filter, Download } from "lucide-react";
import type { AuditEntry } from "@/lib/governance/types";

function formatTs(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

type ResultFilter = "all" | AuditEntry["result"];

function exportCsv(entries: AuditEntry[], filter: ResultFilter) {
  const rows = entries.filter((e) => filter === "all" || e.result === filter);
  const header = ["timestamp", "actor", "action", "target", "result", "evidence", "policy_ref"];
  const csvContent = [
    header.join(","),
    ...rows.map((e) =>
      [
        e.timestamp,
        `"${e.actor}"`,
        `"${e.action}"`,
        `"${e.target}"`,
        e.result,
        `"${(e.evidence ?? "").replace(/"/g, '""')}"`,
        e.policyRef ?? "",
      ].join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `agency-shield-audit-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AuditTrail() {
  const { state } = useGovernance();
  const [filter, setFilter] = useState<ResultFilter>("all");

  const entries = state.auditEntries;
  const filtered = entries.filter((e) => filter === "all" || e.result === filter);

  const counts = entries.reduce(
    (acc, e) => { acc[e.result] = (acc[e.result] ?? 0) + 1; return acc; },
    {} as Record<string, number>
  );

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-cyan-400" />
            <CardTitle className="text-base text-white">Audit Trail</CardTitle>
            <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs font-mono">
              {filtered.length} entries
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportCsv(entries, filter)}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              title="Export CSV"
            >
              <Download className="h-3 w-3" />
              Export CSV
            </button>
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            {(["all", "allowed", "denied", "escalated"] as ResultFilter[]).map((f) => (
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
                  ? `All (${entries.length})`
                  : `${f} (${counts[f] ?? 0})`}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[520px]">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent sticky top-0 bg-slate-900">
                <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider w-24">Time</TableHead>
                <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider">Actor</TableHead>
                <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider">Action</TableHead>
                <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider">Target</TableHead>
                <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider w-24">Result</TableHead>
                <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider">Evidence</TableHead>
                <TableHead className="text-slate-400 font-medium text-xs uppercase tracking-wider w-20">Policy</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-500 py-12">
                    No audit entries yet
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((entry) => (
                  <TableRow
                    key={entry.id}
                    className="border-slate-800/60 hover:bg-slate-800/30 transition-colors"
                  >
                    <TableCell className="font-mono text-xs text-slate-500">
                      {formatTs(entry.timestamp)}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-300">
                      {entry.actor}
                    </TableCell>
                    <TableCell className="text-xs text-slate-400 capitalize">
                      {entry.action}
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">
                      {entry.target}
                    </TableCell>
                    <TableCell>
                      <ResultBadge result={entry.result} />
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 max-w-xs truncate">
                      {entry.evidence}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-600">
                      {entry.policyRef ?? "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
