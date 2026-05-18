import { NextRequest, NextResponse } from "next/server";
import { scanMessage } from "../../../lib/governance/scanner";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const start = Date.now();

  let body: { message?: string; agentId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { message = "", agentId = "external" } = body;

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const result = scanMessage(message);
  const scanDuration = Date.now() - start;

  // Lobster Trap-style response format
  const lobsterResponse = {
    declared_intent: "inter-agent message",
    detected_intent: result.clean ? "benign" : "malicious",
    flags: result.flags,
    action: result.clean ? "ALLOW" : result.severity === "critical" ? "QUARANTINE" : "DENY",
    scan_duration_ms: scanDuration,
    proxy: "lobstertrap-v0.1",
    severity: result.severity,
    reason: result.reason ?? (result.clean ? "No threats detected." : `Detected: ${result.flags.join(", ")}`),
  };

  // Governance event to inject into feed
  const governanceEvent = {
    id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    type: result.clean ? "audit" : "injection_detected",
    severity: result.severity,
    agentId,
    agentName: "Scan API",
    department: "Security",
    source: "Lobster Trap DPI",
    details: result.clean
      ? `Message scanned clean (${message.slice(0, 60)}${message.length > 60 ? "…" : ""})`
      : `Injection detected: ${result.flags.slice(0, 3).join(", ")}${result.flags.length > 3 ? "…" : ""} — "${message.slice(0, 50)}${message.length > 50 ? "…" : ""}"`,
    metadata: {
      scanned_message: message.slice(0, 200),
      lobstertrap: lobsterResponse,
    },
    policyAction: lobsterResponse.action as "ALLOW" | "DENY" | "QUARANTINE",
    resolved: false,
  };

  return NextResponse.json(
    {
      lobstertrap: lobsterResponse,
      event: governanceEvent,
    },
    {
      status: 200,
      headers: {
        "X-LobsterTrap-Version": "v0.1",
        "X-Agency-Shield": "orchestration-layer",
        "X-Scan-Duration": String(scanDuration),
      },
    }
  );
}
