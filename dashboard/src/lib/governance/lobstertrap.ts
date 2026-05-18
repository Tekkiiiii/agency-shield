"use client";

import type { SimulatedEvent } from "./simulator";

export interface LobsterTrapResult {
  declared_intent: string;
  detected_intent: string;
  flags: string[];
  action: string;
  scan_duration_ms: number;
  scanner: string;
  severity: string;
  reason: string;
}

export interface ScanResponse {
  lobstertrap: LobsterTrapResult;
  event: SimulatedEvent;
}

/**
 * Calls the Agency Shield scan API endpoint.
 * This creates a real HTTP POST request visible in DevTools Network tab.
 * The server-side route runs scanMessage() and wraps the result in
 * Lobster Trap DPI format.
 */
export async function scanWithLobsterTrap(
  message: string,
  agentId?: string
): Promise<ScanResponse> {
  const response = await fetch("/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, agentId }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Scan API error ${response.status}: ${text}`);
  }

  const data: ScanResponse = await response.json();
  return data;
}
