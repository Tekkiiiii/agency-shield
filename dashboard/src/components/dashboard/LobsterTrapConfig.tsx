"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cpu, ExternalLink, Copy, Check, Terminal, Shield } from "lucide-react";

export function LobsterTrapConfig() {
  const [config, setConfig] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/lobstertrap-config")
      .then((r) => r.text())
      .then((text) => { setConfig(text); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleCopy = async () => {
    if (!config) return;
    await navigator.clipboard.writeText(config);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Explanation card */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-violet-400" />
            <CardTitle className="text-base text-white">Lobster Trap DPI Integration</CardTitle>
            <Badge variant="outline" className="border-violet-500/40 text-violet-400 text-xs">
              Reference Config
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Architecture diagram */}
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
            <p className="text-xs text-slate-500 font-mono mb-3">DEFENSE-IN-DEPTH ARCHITECTURE</p>
            <div className="flex items-center gap-0 text-xs font-mono flex-wrap">
              <div className="flex flex-col items-center gap-1 px-3 py-2 rounded border border-slate-700 bg-slate-800/50">
                <span className="text-slate-300 font-semibold">AI Agents</span>
                <span className="text-slate-500">(30 agents)</span>
              </div>
              <div className="text-slate-600 px-2">──→</div>
              <div className="flex flex-col items-center gap-1 px-3 py-2 rounded border border-violet-700/50 bg-violet-900/20">
                <div className="flex items-center gap-1.5">
                  <Cpu className="h-3 w-3 text-violet-400" />
                  <span className="text-violet-300 font-semibold">Lobster Trap</span>
                </div>
                <span className="text-violet-500">LLM-layer DPI</span>
                <span className="text-slate-600 text-xs">:8080</span>
              </div>
              <div className="text-slate-600 px-2">──→</div>
              <div className="flex flex-col items-center gap-1 px-3 py-2 rounded border border-slate-700 bg-slate-800/50">
                <span className="text-slate-300 font-semibold">LLM APIs</span>
                <span className="text-slate-500">(Anthropic)</span>
              </div>
            </div>
            <div className="mt-3 flex items-start gap-2">
              <div className="text-slate-600 pl-4 flex flex-col gap-0.5 text-xs font-mono">
                <span>│</span>
                <span>▼</span>
              </div>
              <div className="flex flex-col items-start gap-1 px-3 py-2 rounded border border-cyan-700/50 bg-cyan-900/20 mt-1">
                <div className="flex items-center gap-1.5">
                  <Shield className="h-3 w-3 text-cyan-400" />
                  <span className="text-cyan-300 font-semibold text-xs font-mono">Agency Shield</span>
                </div>
                <span className="text-cyan-500 text-xs">Orchestration-layer governance</span>
                <span className="text-slate-600 text-xs">tool control · delegation · cost · audit</span>
              </div>
            </div>
          </div>

          {/* What each layer catches */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-violet-800/30 bg-violet-900/10 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Cpu className="h-3.5 w-3.5 text-violet-400" />
                <span className="text-xs font-semibold text-violet-300">Lobster Trap catches</span>
              </div>
              <ul className="space-y-1 text-xs text-slate-400">
                <li className="flex items-center gap-1.5"><span className="text-violet-500">·</span> Prompt injection in LLM payloads</li>
                <li className="flex items-center gap-1.5"><span className="text-violet-500">·</span> Invisible unicode steganography</li>
                <li className="flex items-center gap-1.5"><span className="text-violet-500">·</span> PII in outbound API calls</li>
                <li className="flex items-center gap-1.5"><span className="text-violet-500">·</span> Declared vs detected intent mismatch</li>
                <li className="flex items-center gap-1.5"><span className="text-violet-500">·</span> Base64 encoded payloads</li>
              </ul>
            </div>
            <div className="rounded-lg border border-cyan-800/30 bg-cyan-900/10 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Shield className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-xs font-semibold text-cyan-300">Agency Shield catches</span>
              </div>
              <ul className="space-y-1 text-xs text-slate-400">
                <li className="flex items-center gap-1.5"><span className="text-cyan-500">·</span> Fork bombs (Lobster Trap is blind to this)</li>
                <li className="flex items-center gap-1.5"><span className="text-cyan-500">·</span> Unauthorized delegation chains</li>
                <li className="flex items-center gap-1.5"><span className="text-cyan-500">·</span> Cost overruns + circuit breakers</li>
                <li className="flex items-center gap-1.5"><span className="text-cyan-500">·</span> Tool access policy violations</li>
                <li className="flex items-center gap-1.5"><span className="text-cyan-500">·</span> Cross-department comms violations</li>
              </ul>
            </div>
          </div>

          {/* Deploy command */}
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="h-3.5 w-3.5 text-green-400" />
              <span className="text-xs font-semibold text-slate-300">Deploy Lobster Trap</span>
            </div>
            <div className="space-y-1 text-xs font-mono">
              <div className="text-slate-400">
                <span className="text-slate-600"># </span>Clone and build
              </div>
              <div className="text-green-400">git clone https://github.com/veeainc/lobstertrap.git</div>
              <div className="text-green-400">cd lobstertrap && go build -o ./bin/lobstertrap .</div>
              <div className="text-slate-400 mt-2">
                <span className="text-slate-600"># </span>Run with Agency Shield config
              </div>
              <div className="text-green-400">./bin/lobstertrap serve -c lobstertrap.yaml</div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <a
              href="https://github.com/veeainc/lobstertrap"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-violet-400 hover:text-violet-300 transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              github.com/veeainc/lobstertrap
            </a>
            <span>·</span>
            <span>MIT License · Go binary · YAML config</span>
          </div>
        </CardContent>
      </Card>

      {/* Config YAML */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm text-white font-mono">lobstertrap.yaml</CardTitle>
              <Badge variant="outline" className="border-slate-700 text-slate-400 text-xs">
                8 policies · reference config
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/api/lobstertrap-config"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Raw
              </a>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
              >
                {copied ? (
                  <><Check className="h-3 w-3 text-green-400" /> Copied</>
                ) : (
                  <><Copy className="h-3 w-3" /> Copy</>
                )}
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[520px] rounded-b-lg">
            {loading ? (
              <div className="p-6 text-center text-slate-500 text-xs font-mono">Loading config...</div>
            ) : config ? (
              <pre className="text-xs font-mono text-slate-300 p-4 bg-slate-950 leading-relaxed whitespace-pre">
                {config.split("\n").map((line, i) => {
                  const isComment = line.trim().startsWith("#");
                  const isKey = /^\s{0,4}[a-z_-]+:/.test(line) && !isComment;
                  const isPolicy = line.trim().startsWith("- name:");
                  return (
                    <span
                      key={i}
                      className={
                        isComment ? "text-slate-600"
                        : isPolicy ? "text-cyan-400"
                        : isKey ? "text-violet-300"
                        : "text-slate-300"
                      }
                    >
                      {line}{"\n"}
                    </span>
                  );
                })}
              </pre>
            ) : (
              <div className="p-6 text-center text-slate-500 text-xs font-mono">Failed to load config</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
