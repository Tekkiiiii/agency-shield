"use client";

import { useEffect, useState, useRef } from "react";
import { Brain, TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import { useGovernance } from "@/lib/governance/store";

interface ThreatIntelData {
  summary: string;
  topThreat: string;
  trajectory: "increasing" | "decreasing" | "stable";
  attackPatterns: string[];
  riskScore: number;
  dominantDepartment: string;
  mostTargetedAgent: string;
  coordinatedAttackDetected: boolean;
}

function RiskGauge({ score }: { score: number }) {
  const color =
    score >= 70 ? "#f87171" :
    score >= 40 ? "#fb923c" :
    score >= 20 ? "#facc15" :
    "#34d399";

  const label =
    score >= 70 ? "CRITICAL" :
    score >= 40 ? "ELEVATED" :
    score >= 20 ? "MODERATE" :
    "LOW";

  // Arc gauge: 180-degree semicircle
  const radius = 28;
  const cx = 36;
  const cy = 36;
  const startAngle = -180;
  const sweepAngle = 180 * (score / 100);
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const x1 = cx + radius * Math.cos(toRad(startAngle));
  const y1 = cy + radius * Math.sin(toRad(startAngle));
  const endDeg = startAngle + sweepAngle;
  const x2 = cx + radius * Math.cos(toRad(endDeg));
  const y2 = cy + radius * Math.sin(toRad(endDeg));
  const largeArc = sweepAngle > 180 ? 1 : 0;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={72} height={40} viewBox="0 0 72 40" className="overflow-visible">
        {/* Background arc */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="#1e293b"
          strokeWidth={6}
          strokeLinecap="round"
        />
        {/* Filled arc */}
        {score > 0 && (
          <path
            d={`M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`}
            fill="none"
            stroke={color}
            strokeWidth={6}
            strokeLinecap="round"
          />
        )}
        {/* Score text */}
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize={11} fontWeight="700" fill={color} fontFamily="monospace">
          {score}
        </text>
      </svg>
      <span className="text-xs font-bold font-mono" style={{ color }}>{label}</span>
    </div>
  );
}

function TrajectoryIcon({ trajectory }: { trajectory: "increasing" | "decreasing" | "stable" }) {
  if (trajectory === "increasing")
    return <TrendingUp className="h-4 w-4 text-red-400 animate-pulse" />;
  if (trajectory === "decreasing")
    return <TrendingDown className="h-4 w-4 text-green-400" />;
  return <Minus className="h-4 w-4 text-slate-400" />;
}

export function ThreatIntel() {
  const { state } = useGovernance();
  const [data, setData] = useState<ThreatIntelData | null>(null);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchIntel(events: typeof state.events) {
    if (events.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: events.slice(0, 30) }),
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Silently fail — the component is supplementary
    } finally {
      setLoading(false);
    }
  }

  // Fetch once on mount, then every 10 seconds
  useEffect(() => {
    fetchIntel(state.events);
    intervalRef.current = setInterval(() => {
      fetchIntel(state.events);
    }, 10_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Also refetch when events grow significantly (new attack scenario)
  const prevCountRef = useRef(state.events.length);
  useEffect(() => {
    const prev = prevCountRef.current;
    const curr = state.events.length;
    if (curr > prev + 5) {
      fetchIntel(state.events);
    }
    prevCountRef.current = curr;
  }, [state.events]);

  if (!data && !loading) return null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="h-4 w-4 text-violet-400" />
        <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">Threat Intelligence</span>
        {loading && (
          <span className="text-xs text-slate-600 font-mono animate-pulse">analyzing...</span>
        )}
        {data?.coordinatedAttackDetected && (
          <div className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/30">
            <AlertTriangle className="h-3 w-3 text-red-400 animate-pulse" />
            <span className="text-xs font-bold text-red-400">COORDINATED ATTACK</span>
          </div>
        )}
      </div>

      {data && (
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Left: risk gauge + top threat */}
          <div className="flex-none flex flex-col items-center gap-2 min-w-[80px]">
            <RiskGauge score={data.riskScore} />
            <div className="text-center">
              <p className="text-xs text-slate-500">Top Threat</p>
              <p className="text-xs font-semibold text-orange-400 font-mono">{data.topThreat}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <TrajectoryIcon trajectory={data.trajectory} />
              <span className="text-xs text-slate-400 capitalize">{data.trajectory}</span>
            </div>
          </div>

          {/* Center: summary */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-300 leading-relaxed">{data.summary}</p>

            {/* Attack patterns */}
            {data.attackPatterns.length > 0 && (
              <div className="mt-2 space-y-1">
                {data.attackPatterns.slice(0, 2).map((p, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="text-orange-500 text-xs mt-0.5 flex-none">▸</span>
                    <span className="text-xs text-slate-400">{p}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: key metrics */}
          <div className="flex-none text-xs text-slate-500 space-y-1 border-l border-slate-800 pl-4 min-w-[120px]">
            <p className="text-slate-400 font-semibold">Hot Spots</p>
            <p><span className="text-slate-300">{data.dominantDepartment}</span> dept</p>
            <p><span className="text-slate-300 font-mono">{data.mostTargetedAgent}</span></p>
            <p className="text-slate-600 text-xs">{state.events.length} events analyzed</p>
          </div>
        </div>
      )}

      {!data && loading && (
        <div className="h-16 flex items-center justify-center">
          <span className="text-xs text-slate-600 font-mono animate-pulse">Running threat intelligence analysis...</span>
        </div>
      )}
    </div>
  );
}
