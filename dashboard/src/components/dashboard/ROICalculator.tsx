"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Clock, Zap } from "lucide-react";

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}

function Slider({ label, value, min, max, step, format, onChange }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-sm font-mono font-bold text-white">{format(value)}</span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #22d3ee ${pct}%, #1e293b ${pct}%)`,
          }}
        />
      </div>
      <div className="flex justify-between text-xs text-slate-600">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

interface OutputCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
  accent: string;
}

function OutputCard({ icon, label, value, subtext, accent }: OutputCardProps) {
  return (
    <div className={`flex-1 rounded-lg border bg-slate-900/60 p-4 border-slate-700`}>
      <div className="flex items-center gap-2 mb-1">
        <div className={accent}>{icon}</div>
        <span className="text-xs text-slate-400 font-medium">{label}</span>
      </div>
      <div className={`text-2xl font-bold tabular-nums ${accent}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{subtext}</div>
    </div>
  );
}

export function ROICalculator() {
  const [agents, setAgents] = useState(100);
  const [costPerIncident, setCostPerIncident] = useState(2000);
  const [incidentsPerMonth, setIncidentsPerMonth] = useState(5);

  // Annual savings: incidents prevented * cost per incident * 12
  // Not every incident is caught by every agent — normalize by fleet size factor
  const fleetFactor = Math.log10(Math.max(10, agents)) / 2;
  const annualSavings = Math.round(incidentsPerMonth * costPerIncident * 12 * fleetFactor);

  // Compliance hours saved: audit automation = 8h/agent/year baseline
  const complianceHours = Math.round(agents * 8 * 0.7); // 70% audit automation coverage

  const formatUSD = (v: number) =>
    v >= 1_000_000
      ? `$${(v / 1_000_000).toFixed(1)}M`
      : v >= 1_000
      ? `$${(v / 1_000).toFixed(0)}K`
      : `$${v}`;

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-green-400" />
          <CardTitle className="text-base text-white">ROI Calculator</CardTitle>
          <span className="text-xs text-slate-500 font-normal">— adjust to your fleet</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Estimate annual savings from prevented incidents, automated compliance, and faster threat detection.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Slider
            label="Number of agents"
            value={agents}
            min={10}
            max={1000}
            step={10}
            format={(v) => v.toString()}
            onChange={setAgents}
          />
          <Slider
            label="Avg cost per incident"
            value={costPerIncident}
            min={100}
            max={10000}
            step={100}
            format={(v) => `$${v.toLocaleString()}`}
            onChange={setCostPerIncident}
          />
          <Slider
            label="Incidents prevented / month"
            value={incidentsPerMonth}
            min={1}
            max={50}
            step={1}
            format={(v) => v.toString()}
            onChange={setIncidentsPerMonth}
          />
        </div>

        {/* Outputs */}
        <div className="flex flex-col sm:flex-row gap-3">
          <OutputCard
            icon={<DollarSign className="h-4 w-4" />}
            label="Annual savings"
            value={formatUSD(annualSavings)}
            subtext={`from ${incidentsPerMonth * 12} incidents prevented/year`}
            accent="text-green-400"
          />
          <OutputCard
            icon={<Clock className="h-4 w-4" />}
            label="Compliance hours saved"
            value={`${complianceHours.toLocaleString()} hrs/yr`}
            subtext="via automated audit trail generation"
            accent="text-cyan-400"
          />
          <OutputCard
            icon={<Zap className="h-4 w-4" />}
            label="Time to detect"
            value="< 1 sec"
            subtext="vs 4.2 hr industry average (IBM X-Force)"
            accent="text-yellow-400"
          />
        </div>

        <p className="text-xs text-slate-600">
          Savings model: incidents_prevented × cost_per_incident × 12 × fleet_scale_factor.
          Compliance hours based on 8h/agent/year audit automation at 70% coverage.
          Detection speed: IBM X-Force Threat Intelligence Index 2024.
        </p>
      </CardContent>

      <style jsx>{`
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #22d3ee;
          cursor: pointer;
          border: 2px solid #0f172a;
          box-shadow: 0 0 0 2px #22d3ee40;
        }
        input[type='range']::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #22d3ee;
          cursor: pointer;
          border: 2px solid #0f172a;
        }
      `}</style>
    </Card>
  );
}
