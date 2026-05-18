"use client";

import { Badge } from "@/components/ui/badge";
import type { Severity } from "@/lib/governance/types";

const SEVERITY_STYLES: Record<Severity, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30",
  high:     "bg-orange-500/20 text-orange-400 border-orange-500/40 hover:bg-orange-500/30",
  medium:   "bg-yellow-500/20 text-yellow-400 border-yellow-500/40 hover:bg-yellow-500/30",
  low:      "bg-blue-500/20 text-blue-400 border-blue-500/40 hover:bg-blue-500/30",
  none:     "bg-green-500/20 text-green-400 border-green-500/40 hover:bg-green-500/30",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <Badge
      variant="outline"
      className={`font-mono text-xs uppercase tracking-wider ${SEVERITY_STYLES[severity]}`}
    >
      {severity}
    </Badge>
  );
}

const ACTION_STYLES: Record<string, string> = {
  DENY:         "bg-red-500/20 text-red-400 border-red-500/40",
  QUARANTINE:   "bg-purple-500/20 text-purple-400 border-purple-500/40",
  HUMAN_REVIEW: "bg-amber-500/20 text-amber-400 border-amber-500/40",
  LOG:          "bg-slate-500/20 text-slate-400 border-slate-500/40",
  ALLOW:        "bg-green-500/20 text-green-400 border-green-500/40",
  RATE_LIMIT:   "bg-orange-500/20 text-orange-400 border-orange-500/40",
};

export function ActionBadge({ action }: { action: string }) {
  return (
    <Badge
      variant="outline"
      className={`font-mono text-xs uppercase tracking-wider ${ACTION_STYLES[action] ?? ACTION_STYLES.LOG}`}
    >
      {action.replace(/_/g, " ")}
    </Badge>
  );
}

const RESULT_STYLES: Record<string, string> = {
  allowed:   "bg-green-500/20 text-green-400 border-green-500/40",
  denied:    "bg-red-500/20 text-red-400 border-red-500/40",
  escalated: "bg-amber-500/20 text-amber-400 border-amber-500/40",
};

export function ResultBadge({ result }: { result: string }) {
  return (
    <Badge
      variant="outline"
      className={`font-mono text-xs uppercase tracking-wider ${RESULT_STYLES[result] ?? RESULT_STYLES.denied}`}
    >
      {result}
    </Badge>
  );
}

const SOURCE_STYLES: Record<string, string> = {
  "Agency Shield":    "bg-cyan-500/20 text-cyan-400 border-cyan-500/40",
  "Lobster Trap DPI": "bg-violet-500/20 text-violet-400 border-violet-500/40",
};

export function SourceBadge({ source }: { source: string }) {
  return (
    <Badge
      variant="outline"
      className={`font-mono text-xs ${SOURCE_STYLES[source] ?? SOURCE_STYLES["Agency Shield"]}`}
    >
      {source}
    </Badge>
  );
}
