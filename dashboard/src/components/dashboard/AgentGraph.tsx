"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGovernance } from "@/lib/governance/store";
import { Network, ZoomIn, ZoomOut, RefreshCw } from "lucide-react";
import type { Agent, AgentTier } from "@/lib/governance/types";

// ─── Layout constants ─────────────────────────────────────────────────────────

const DEPT_COLORS: Record<string, string> = {
  Engineering:  "#22d3ee", // cyan
  Security:     "#f87171", // red
  Finance:      "#facc15", // yellow
  Marketing:    "#a78bfa", // violet
  Compliance:   "#fb923c", // orange
  HR:           "#34d399", // emerald
  Legal:        "#60a5fa", // blue
  Data:         "#f472b6", // pink
  DevOps:       "#4ade80", // green
  Support:      "#94a3b8", // slate
  Research:     "#c084fc", // purple
  Product:      "#2dd4bf", // teal
};

const TIER_FILL: Record<AgentTier, string> = {
  opus:   "#7c3aed", // purple
  sonnet: "#1d4ed8", // blue
  haiku:  "#065f46", // dark green
};

const TIER_STROKE: Record<AgentTier, string> = {
  opus:   "#a78bfa",
  sonnet: "#60a5fa",
  haiku:  "#34d399",
};

const ROLE_RADIUS: Record<string, number> = {
  leader:      18,
  coordinator: 13,
  member:      9,
};

// ─── Position calculation ─────────────────────────────────────────────────────

interface NodePosition {
  x: number;
  y: number;
  agent: Agent;
}

function layoutNodes(agents: Agent[], width: number): NodePosition[] {
  // Group by department
  const deptMap = new Map<string, Agent[]>();
  for (const a of agents) {
    if (!deptMap.has(a.department)) deptMap.set(a.department, []);
    deptMap.get(a.department)!.push(a);
  }

  const departments = [...deptMap.keys()];
  const numDepts = departments.length;
  const cols = Math.ceil(Math.sqrt(numDepts * 1.5)); // slightly wider than square
  const deptW = width / cols;
  const deptH = 160;
  const positions: NodePosition[] = [];

  departments.forEach((dept, deptIdx) => {
    const col = deptIdx % cols;
    const row = Math.floor(deptIdx / cols);
    const deptX = col * deptW + deptW / 2;
    const deptY = row * deptH + 60;

    const members = deptMap.get(dept)!;

    // Sort: leader first, then coordinator, then members
    const sorted = [...members].sort((a, b) => {
      const order = { leader: 0, coordinator: 1, member: 2 };
      return order[a.role] - order[b.role];
    });

    sorted.forEach((agent, i) => {
      // Place leader at top-center, others below in a row
      const isLeader = agent.role === "leader";
      const isCoord = agent.role === "coordinator";

      if (isLeader) {
        positions.push({ x: deptX, y: deptY, agent });
      } else if (isCoord) {
        const coords = sorted.filter((a) => a.role === "coordinator");
        const coordIdx = coords.indexOf(agent);
        const spread = (coords.length - 1) * 40;
        const startX = deptX - spread / 2;
        positions.push({ x: startX + coordIdx * 40, y: deptY + 50, agent });
      } else {
        // Members below coordinators
        const members = sorted.filter((a) => a.role === "member");
        const memberIdx = members.indexOf(agent);
        const spread = (members.length - 1) * 30;
        const startX = deptX - spread / 2;
        positions.push({ x: startX + memberIdx * 30, y: deptY + 95, agent });
      }
    });
  });

  return positions;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface PulseState {
  agentId: string;
  type: "attack" | "quarantine";
  ts: number;
}

export function AgentGraph() {
  const { state } = useGovernance();
  const { agents, events } = state;

  const [zoom, setZoom] = useState(1);
  const [pulses, setPulses] = useState<PulseState[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const lastEventCount = useRef(events.length);

  const SVG_W = 900;
  const SVG_H = 520;

  const positions = layoutNodes(agents, SVG_W - 60);

  // Watch for new events → pulse the affected agent node
  useEffect(() => {
    if (events.length <= lastEventCount.current) return;
    const newEvents = events.slice(0, events.length - lastEventCount.current);
    lastEventCount.current = events.length;

    const newPulses: PulseState[] = [];
    for (const ev of newEvents) {
      if (ev.severity === "critical" || ev.severity === "high") {
        newPulses.push({
          agentId: ev.agentId,
          type: ev.type === "quarantine" ? "quarantine" : "attack",
          ts: Date.now(),
        });
      }
    }
    if (newPulses.length > 0) {
      setPulses((prev) => [...prev.slice(-10), ...newPulses]);
      // Clear pulses after animation
      setTimeout(() => {
        setPulses((prev) => prev.filter((p) => Date.now() - p.ts < 3000));
      }, 3000);
    }
  }, [events]);

  const posMap = new Map(positions.map((p) => [p.agent.id, p]));

  // Build edges
  const edges: { x1: number; y1: number; x2: number; y2: number; deptColor: string }[] = [];
  for (const pos of positions) {
    const parent = posMap.get(pos.agent.reportsTo);
    if (parent) {
      const color = DEPT_COLORS[pos.agent.department] ?? "#94a3b8";
      edges.push({
        x1: parent.x, y1: parent.y,
        x2: pos.x, y2: pos.y,
        deptColor: color,
      });
    }
  }

  // Get departments for legend
  const depts = [...new Set(agents.map((a) => a.department))].sort();

  // Active pulses
  const activePulseIds = new Set(pulses.map((p) => p.agentId));

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4 text-cyan-400" />
            <CardTitle className="text-base text-white">Agent Topology</CardTitle>
            <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs font-mono">
              {agents.length} agents · {depts.length} departments
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.2, 2))}
              className="p-1.5 rounded border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(z - 0.2, 0.5))}
              className="p-1.5 rounded border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-1.5 rounded border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
              title="Reset zoom"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Tier legend */}
        <div className="flex gap-4 mt-2 text-xs text-slate-500">
          {(["opus", "sonnet", "haiku"] as AgentTier[]).map((t) => (
            <div key={t} className="flex items-center gap-1.5">
              <div
                className="h-3 w-3 rounded-full border"
                style={{ backgroundColor: TIER_FILL[t] + "99", borderColor: TIER_STROKE[t] }}
              />
              <span className="capitalize">{t} · {agents.filter((a) => a.tier === t).length} agents</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 ml-4">
            <div className="h-3 w-3 rounded-full border border-red-500" style={{ backgroundColor: "#7f1d1d99" }} />
            <span>Quarantined</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full animate-pulse" style={{ backgroundColor: "#f87171" }} />
            <span>Active threat</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0">
        {/* Department color key */}
        <div className="flex flex-wrap gap-2 mb-3">
          {depts.map((dept) => (
            <div key={dept} className="flex items-center gap-1 text-xs text-slate-500">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: DEPT_COLORS[dept] ?? "#94a3b8" }}
              />
              <span>{dept}</span>
            </div>
          ))}
        </div>

        <div className="overflow-auto rounded-lg border border-slate-800 bg-slate-950">
          <svg
            ref={svgRef}
            width={SVG_W}
            height={SVG_H}
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            style={{ transform: `scale(${zoom})`, transformOrigin: "top left", display: "block" }}
          >
            <defs>
              {/* Glow filter for active threats */}
              <filter id="glow-red">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="glow-orange">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Department backgrounds */}
            {depts.map((dept) => {
              const deptPositions = positions.filter((p) => p.agent.department === dept);
              if (deptPositions.length === 0) return null;
              const xs = deptPositions.map((p) => p.x);
              const ys = deptPositions.map((p) => p.y);
              const minX = Math.min(...xs) - 28;
              const maxX = Math.max(...xs) + 28;
              const minY = Math.min(...ys) - 30;
              const maxY = Math.max(...ys) + 24;
              const color = DEPT_COLORS[dept] ?? "#94a3b8";
              return (
                <g key={dept}>
                  <rect
                    x={minX}
                    y={minY}
                    width={maxX - minX}
                    height={maxY - minY}
                    rx={6}
                    fill={color + "08"}
                    stroke={color + "20"}
                    strokeWidth={1}
                  />
                  <text
                    x={(minX + maxX) / 2}
                    y={minY + 14}
                    textAnchor="middle"
                    fontSize={9}
                    fontFamily="ui-monospace, monospace"
                    fill={color + "99"}
                    fontWeight="600"
                    letterSpacing="0.06em"
                  >
                    {dept.toUpperCase()}
                  </text>
                </g>
              );
            })}

            {/* Edges */}
            {edges.map((e, i) => (
              <line
                key={i}
                x1={e.x1} y1={e.y1}
                x2={e.x2} y2={e.y2}
                stroke={e.deptColor + "30"}
                strokeWidth={1}
              />
            ))}

            {/* Pulse rings for active threats */}
            {positions.map((pos) => {
              const pulse = pulses.find((p) => p.agentId === pos.agent.id);
              if (!pulse) return null;
              const r = ROLE_RADIUS[pos.agent.role] ?? 9;
              return (
                <circle
                  key={`pulse-${pos.agent.id}`}
                  cx={pos.x}
                  cy={pos.y}
                  r={r + 8}
                  fill="none"
                  stroke={pulse.type === "quarantine" ? "#dc2626" : "#f87171"}
                  strokeWidth={2}
                  opacity={0.7}
                  style={{ animation: "pulse-ring 1.5s ease-out infinite" }}
                />
              );
            })}

            {/* Agent nodes */}
            {positions.map((pos) => {
              const { agent } = pos;
              const r = ROLE_RADIUS[agent.role] ?? 9;
              const isQuarantined = agent.status === "blocked";
              const isPulsing = activePulseIds.has(agent.id);
              const deptColor = DEPT_COLORS[agent.department] ?? "#94a3b8";

              const fill = isQuarantined
                ? "#7f1d1d"
                : TIER_FILL[agent.tier];

              // Trust-based border: green > 70, yellow 30-70, red < 30
              const trustStroke =
                agent.trustScore > 70
                  ? "#4ade80"
                  : agent.trustScore > 30
                  ? "#facc15"
                  : "#f87171";

              const stroke = isQuarantined
                ? "#dc2626"
                : isPulsing
                ? "#f87171"
                : trustStroke;

              return (
                <g key={agent.id} filter={isPulsing ? "url(#glow-red)" : undefined}>
                  {/* Role ring (department color) */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={r + 2}
                    fill="none"
                    stroke={deptColor + "40"}
                    strokeWidth={1.5}
                  />

                  {/* Node body */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={r}
                    fill={fill + "cc"}
                    stroke={stroke}
                    strokeWidth={isQuarantined ? 2 : 1.5}
                  />

                  {/* Quarantine X */}
                  {isQuarantined && (
                    <g>
                      <line
                        x1={pos.x - r * 0.5} y1={pos.y - r * 0.5}
                        x2={pos.x + r * 0.5} y2={pos.y + r * 0.5}
                        stroke="#f87171" strokeWidth={2} strokeLinecap="round"
                      />
                      <line
                        x1={pos.x + r * 0.5} y1={pos.y - r * 0.5}
                        x2={pos.x - r * 0.5} y2={pos.y + r * 0.5}
                        stroke="#f87171" strokeWidth={2} strokeLinecap="round"
                      />
                    </g>
                  )}

                  {/* Tier dot for leaders */}
                  {agent.role === "leader" && (
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={4}
                      fill={TIER_STROKE[agent.tier]}
                      opacity={0.9}
                    />
                  )}

                  {/* Name label — only for leaders and coordinators */}
                  {(agent.role === "leader" || agent.role === "coordinator") && (
                    <text
                      x={pos.x}
                      y={pos.y + r + 11}
                      textAnchor="middle"
                      fontSize={agent.role === "leader" ? 8 : 7}
                      fontFamily="ui-monospace, monospace"
                      fill={isQuarantined ? "#f87171" : "#94a3b8"}
                      fontWeight={agent.role === "leader" ? "600" : "400"}
                    >
                      {agent.name.replace(/-/g, " ").split(" ").slice(0, 2).join(" ")}
                    </text>
                  )}

                  {/* Trust score label for all non-member agents */}
                  {agent.role !== "member" && (
                    <text
                      x={pos.x}
                      y={pos.y + r + 21}
                      textAnchor="middle"
                      fontSize={6}
                      fontFamily="ui-monospace, monospace"
                      fill={
                        agent.trustScore > 70
                          ? "#4ade8099"
                          : agent.trustScore > 30
                          ? "#facc1599"
                          : "#f8717199"
                      }
                    >
                      t:{Math.round(agent.trustScore)}
                    </text>
                  )}

                  {/* Tooltip on hover — invisible rect for hit target */}
                  <title>
                    {agent.name} ({agent.tier}) — {agent.department}
                    {"\n"}Role: {agent.role} · Status: {agent.status === "blocked" ? "QUARANTINED" : agent.status}
                  </title>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Quarantined agents list */}
        {agents.some((a) => a.status === "blocked") && (
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs text-red-400 font-semibold">QUARANTINED:</span>
            {agents
              .filter((a) => a.status === "blocked")
              .map((a) => (
                <Badge
                  key={a.id}
                  variant="outline"
                  className="border-red-800/60 text-red-400 text-xs font-mono"
                >
                  {a.name}
                </Badge>
              ))}
          </div>
        )}

        <p className="text-xs text-slate-600 mt-2">
          Node size = role (leader &gt; coordinator &gt; member). Node color = model tier (purple=Opus, blue=Sonnet, green=Haiku). Ring color = department. Red X = quarantined. Hover nodes for details.
        </p>
      </CardContent>

      <style jsx>{`
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.7; }
          100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </Card>
  );
}
