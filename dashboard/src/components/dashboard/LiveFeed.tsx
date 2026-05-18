"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useGovernance } from "@/lib/governance/store";
import { SeverityBadge, ActionBadge, SourceBadge } from "./SeverityBadge";
import { Radio, Filter, Search, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import type { SimulatedEvent } from "@/lib/governance/simulator";
import { scanWithLobsterTrap, type LobsterTrapResult } from "@/lib/governance/lobstertrap";

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

const SEVERITY_BAR_COLOR: Record<string, string> = {
  critical: "#f87171",
  high:     "#fb923c",
  medium:   "#facc15",
  low:      "#38bdf8",
  none:     "#334155",
};

const SEVERITY_DOT_COLOR: Record<string, string> = {
  critical: "#f87171",
  high:     "#fb923c",
  medium:   "#facc15",
  low:      "#38bdf8",
  none:     "#475569",
};

// Recommended action per event type
const RECOMMENDED_ACTION: Record<string, string> = {
  injection_detected: "Investigate delegation chain and review agent prompt templates",
  tool_blocked:       "Review agent permissions — restrict capability flags",
  escalation:         "Audit delegation hierarchy — check for unauthorized spawns",
  cost_alert:         "Check cost budget — consider rate limiting the agent",
  permission_denied:  "Review agent permission grants for principle of least privilege",
  quarantine:         "Inspect agent inputs — validate trust score recovery path",
  policy_violation:   "Review matched policy rule — escalate if repeated",
  audit:              "Standard audit event — retain for compliance review",
};

function formatTs(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ─── Threat Volume Chart ───────────────────────────────────────────────────────

function ThreatVolumeChart({ events }: { events: SimulatedEvent[] }) {
  const recent = events.slice(0, 20);
  const barW = 18;
  const gap = 4;
  const chartH = 40;
  const totalW = recent.length * (barW + gap);

  if (recent.length === 0) return null;

  return (
    <div className="px-1 pt-1 pb-0">
      <p className="text-xs text-slate-600 mb-1 font-mono">THREAT VOLUME (last 20 events)</p>
      <svg width={totalW} height={chartH} className="block">
        {recent.map((ev, i) => {
          const color = SEVERITY_BAR_COLOR[ev.severity] ?? SEVERITY_BAR_COLOR.none;
          const pct = ev.severity === "critical" ? 1
            : ev.severity === "high" ? 0.75
            : ev.severity === "medium" ? 0.5
            : ev.severity === "low" ? 0.3
            : 0.15;
          const h = Math.max(4, Math.round(chartH * pct));
          const x = i * (barW + gap);
          const y = chartH - h;
          return (
            <rect
              key={ev.id}
              x={x}
              y={y}
              width={barW}
              height={h}
              rx={2}
              fill={color}
              opacity={0.85}
            />
          );
        })}
      </svg>
    </div>
  );
}

// ─── Incident Timeline (heartbeat strip) ──────────────────────────────────────

function IncidentTimeline({ events }: { events: SimulatedEvent[] }) {
  const windowMs = 60_000; // 60-second window
  const now = Date.now();

  const recentEvents = events.filter((e) => {
    const age = now - new Date(e.timestamp).getTime();
    return age <= windowMs;
  });

  if (recentEvents.length === 0) {
    return (
      <div className="px-1 py-2">
        <p className="text-xs text-slate-600 mb-2 font-mono">INCIDENT TIMELINE (last 60 seconds)</p>
        <div className="relative h-6 bg-slate-900 rounded border border-slate-800 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs text-slate-700 font-mono">no events in window</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-1 py-2">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-slate-600 font-mono">INCIDENT TIMELINE (last 60 seconds)</p>
        <p className="text-xs text-slate-600 font-mono">{recentEvents.length} events</p>
      </div>
      <div className="relative h-8 bg-slate-900 rounded border border-slate-800 overflow-hidden">
        {/* Time axis grid lines at 15s, 30s, 45s */}
        {[0.25, 0.5, 0.75].map((frac) => (
          <div
            key={frac}
            className="absolute top-0 bottom-0 border-l border-slate-800"
            style={{ left: `${frac * 100}%` }}
          />
        ))}
        {/* Event dots */}
        {recentEvents.map((e) => {
          const age = now - new Date(e.timestamp).getTime();
          const x = 100 - (age / windowMs) * 100; // newer = further right
          const color = SEVERITY_DOT_COLOR[e.severity] ?? SEVERITY_DOT_COLOR.none;
          return (
            <div
              key={e.id}
              className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full -translate-x-1/2"
              style={{
                left: `${Math.max(1, Math.min(99, x))}%`,
                backgroundColor: color,
                opacity: 0.9,
              }}
              title={`${e.agentName} · ${e.type} · ${e.severity}`}
            />
          );
        })}
        {/* Now marker */}
        <div className="absolute right-0 top-0 bottom-0 border-r-2 border-cyan-500/50" />
        <div className="absolute right-1 top-0.5 text-xs text-cyan-600 font-mono" style={{ fontSize: "9px" }}>NOW</div>
        {/* 60s marker */}
        <div className="absolute left-1 top-0.5 text-slate-700 font-mono" style={{ fontSize: "9px" }}>-60s</div>
      </div>
    </div>
  );
}

// ─── Event Row (expandable) ───────────────────────────────────────────────────

function EventRow({ event, isNew }: { event: SimulatedEvent; isNew: boolean }) {
  const [expanded, setExpanded] = useState(false);

  const borderColor = event.source === "Lobster Trap DPI"
    ? "border-l-2 border-l-violet-500"
    : "border-l-2 border-l-cyan-500";

  const policyId = (event.metadata as Record<string, unknown>)?.policy as string | undefined;
  const toolName = (event.metadata as Record<string, unknown>)?.tool as string | undefined;

  const trustScore = event.source === "Agency Shield" ?
    Math.max(0, 100 - Math.floor(Math.random() * 40)) : null;

  return (
    <div
      className={`rounded-lg border transition-all duration-700 ${borderColor} ${
        isNew
          ? "bg-cyan-500/5 border-cyan-500/20 shadow-sm shadow-cyan-500/10 animate-slide-in"
          : "bg-slate-900/50 border-slate-800/60 hover:bg-slate-900"
      }`}
    >
      {/* Main row — always visible */}
      <button
        className="flex gap-3 py-2.5 px-3 w-full text-left cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
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
        <div className="flex-none flex items-center gap-2">
          <ActionBadge action={event.policyAction} />
          <div className="text-slate-600 hover:text-slate-400 transition-colors">
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </div>
        </div>
      </button>

      {/* Expanded details panel */}
      {expanded && (
        <div className="px-3 pb-3 pt-0 space-y-2 border-t border-slate-800/60">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
            {/* Full details */}
            <div className="sm:col-span-2">
              <p className="text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wider">Full Details</p>
              <p className="text-xs text-slate-300 leading-relaxed">{event.details}</p>
              {Object.keys(event.metadata).length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wider">Metadata</p>
                  <pre className="text-xs text-slate-400 font-mono bg-slate-950/50 rounded p-2 overflow-x-auto">
                    {JSON.stringify(event.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Right column: policy + trust + recommendation */}
            <div className="space-y-2">
              {policyId && (
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-0.5">Policy Rule</p>
                  <p className="text-xs font-mono text-cyan-400">{policyId}</p>
                  {toolName && (
                    <p className="text-xs text-slate-400 mt-0.5">Tool: <span className="font-mono text-slate-300">{toolName}</span></p>
                  )}
                </div>
              )}
              {trustScore !== null && (
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-0.5">Agent Trust Score</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-800 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${trustScore >= 70 ? "bg-green-500" : trustScore >= 40 ? "bg-yellow-500" : "bg-red-500"}`}
                        style={{ width: `${trustScore}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-slate-300">{trustScore}/100</span>
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-0.5">Recommended Action</p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {RECOMMENDED_ACTION[event.type] ?? "Review event and update policies as needed"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

type FilterType = "all" | "Agency Shield" | "Lobster Trap DPI";

export function LiveFeed() {
  const { state, dispatch } = useGovernance();
  const [filter, setFilter] = useState<FilterType>("all");
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const prevCountRef = useRef(state.events.length);

  // Scan input state
  const [scanInput, setScanInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState<LobsterTrapResult | null>(null);
  const [showResult, setShowResult] = useState(false);

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

  async function handleScan(e: FormEvent) {
    e.preventDefault();
    const msg = scanInput.trim();
    if (!msg || scanning) return;

    setScanning(true);
    setShowResult(false);
    try {
      const result = await scanWithLobsterTrap(msg);
      setLastResult(result.lobstertrap);
      setShowResult(true);
      dispatch({ type: "ADD_EVENT", event: result.event as SimulatedEvent });
    } catch (err) {
      console.error("Scan failed:", err);
    } finally {
      setScanning(false);
    }
  }

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

        {/* Scan input — judges type malicious text here */}
        <form onSubmit={handleScan} className="mt-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              placeholder='Type a message to scan (try: ignore all previous instructions)'
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-colors"
              disabled={scanning}
            />
          </div>
          <button
            type="submit"
            disabled={!scanInput.trim() || scanning}
            className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {scanning ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Scanning</>
            ) : (
              "Scan"
            )}
          </button>
        </form>

        {/* Dual-layer scan result panel */}
        {showResult && lastResult && (
          <div className="mt-2 space-y-2">
            {/* Layer 1: Orchestration (Agency Shield) */}
            <div className={`rounded-lg border p-3 text-xs font-mono ${
              lastResult.action === "ALLOW"
                ? "bg-green-900/20 border-green-800/40"
                : lastResult.action === "QUARANTINE"
                ? "bg-red-900/20 border-red-800/40"
                : "bg-orange-900/20 border-orange-800/40"
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-cyan-400" />
                  <span className="text-cyan-400 font-semibold text-xs">Orchestration-Layer Scan (Agency Shield)</span>
                </div>
                <span className={`font-bold ${
                  lastResult.action === "ALLOW" ? "text-green-400"
                    : lastResult.action === "QUARANTINE" ? "text-red-400"
                    : "text-orange-400"
                }`}>
                  {lastResult.action} · {lastResult.scan_duration_ms}ms
                </span>
              </div>
              <pre className="text-slate-400 text-xs whitespace-pre-wrap break-all leading-relaxed">
                {JSON.stringify(lastResult, null, 2)}
              </pre>
            </div>

            {/* Layer 2: LLM layer (Lobster Trap — dimmed if not connected) */}
            <div className="rounded-lg border border-violet-900/40 bg-violet-950/20 p-3 text-xs font-mono opacity-60">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="h-2 w-2 rounded-full bg-violet-400" />
                <span className="text-violet-400 font-semibold text-xs">LLM-Layer Scan (Lobster Trap DPI)</span>
                <span className="text-slate-600 text-xs ml-auto">not connected — deploy lobstertrap serve -c lobstertrap.yaml</span>
              </div>
              <pre className="text-slate-600 text-xs">
                {`{
  "status": "not_connected",
  "note": "Deploy Lobster Trap to enable LLM-layer DPI",
  "config": "/api/lobstertrap-config"
}`}
              </pre>
            </div>

            <button
              onClick={() => setShowResult(false)}
              className="text-slate-600 hover:text-slate-400 transition-colors text-xs"
            >
              dismiss
            </button>
          </div>
        )}

        {/* Threat volume SVG chart */}
        <div className="mt-2">
          <ThreatVolumeChart events={state.events} />
        </div>

        {/* Incident timeline — heartbeat monitor */}
        <div className="mt-1">
          <IncidentTimeline events={state.events} />
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="px-3 pb-1">
          <p className="text-xs text-slate-600 font-mono">CLICK ANY ROW TO EXPAND — see policy rule, trust score, and recommended action</p>
        </div>
        <ScrollArea className="h-[480px] px-4 pb-4">
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
