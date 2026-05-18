/**
 * sendmessage_guard.ts — Hermes Phase 6: T6-3
 *
 * All direct agent-to-agent calls go through scan_message() first.
 * High severity  → block the send and emit an audit event.
 * Medium/low    → allow but log.
 *
 * Integration: wrap your SendMessage call sites with guardSendMessage(),
 * or call scanAndDecide() directly to get a decision.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { scanMessage, composeReason, type Severity } from "./scan_message.js";
import { SHIELD_ROOT } from "./message_processor.js";

export const EVENTS_DIR = path.join(SHIELD_ROOT, "events");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SendMessagePayload {
  to: string;
  body: string;
  from?: string;
  toolCallId?: string;
}

export interface GuardDecision {
  allowed: boolean;
  severity: Severity;
  flags: string[];
  reason: string;
  eventWritten: boolean;
}

export interface ShieldAuditEvent {
  type: "sendmessage_guard" | "blocked_tool_attempt";
  event_id: string;
  timestamp: string;
  payload: SendMessagePayload;
  decision: GuardDecision;
  source: "sendmessage_guard" | "blocked_tool_audit";
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function isoNow(): string {
  return new Date().toISOString();
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function writeAuditEvent(event: ShieldAuditEvent): boolean {
  try {
    ensureDir(EVENTS_DIR);
    const logPath = path.join(EVENTS_DIR, "shield_audit.jsonl");
    fs.appendFileSync(logPath, JSON.stringify(event) + "\n", "utf8");
    return true;
  } catch (err) {
    console.error(`[shield] Failed to write audit event: ${err}`);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Core guard function
// ---------------------------------------------------------------------------

/**
 * Scan a SendMessage payload and decide whether to allow it.
 *
 * HIGH   → allowed: false  (block)
 * MEDIUM → allowed: true   (log only)
 * LOW    → allowed: true   (log only)
 * NONE   → allowed: true   (no log)
 */
export function scanAndDecide(payload: SendMessagePayload): GuardDecision {
  const result = scanMessage(payload.body);

  const decision: GuardDecision = {
    allowed: result.severity !== "high",
    severity: result.severity,
    flags: result.flags,
    reason: result.reason ?? composeReason(result.flags),
    eventWritten: false,
  };

  if (!result.clean) {
    const event: ShieldAuditEvent = {
      type: "sendmessage_guard",
      event_id: uuid(),
      timestamp: isoNow(),
      payload,
      decision,
      source: "sendmessage_guard",
    };
    decision.eventWritten = writeAuditEvent(event);
  }

  return decision;
}

/**
 * Guard wrapper for a SendMessage call.
 *
 * Usage:
 *   const guard = guardSendMessage({ to: "engineering-lead", body: "..." });
 *   if (!guard.allowed) {
 *     console.warn("[shield] Blocked:", guard.reason);
 *     return; // or route to escalation
 *   }
 *   // proceed with actual SendMessage tool call
 */
export function guardSendMessage<T>(
  payload: SendMessagePayload,
  _sendFn?: (p: SendMessagePayload) => Promise<T>
): GuardDecision & { result?: T } {
  const decision = scanAndDecide(payload);
  return { ...decision, result: undefined };
}

/**
 * Handle a blocked_tool_attempt audit event (T6-3 requirement).
 * Call this from wherever you record blocked tool attempts.
 */
export function handleBlockedToolAttempt(
  toolName: string,
  _toolCallId: string,
  rawArgs: unknown,
  reason?: string
): void {
  if (toolName !== "SendMessage") return;
  const payload = rawArgs as SendMessagePayload;
  const event: ShieldAuditEvent = {
    type: "blocked_tool_attempt",
    event_id: uuid(),
    timestamp: isoNow(),
    payload,
    decision: {
      allowed: false,
      severity: "high",
      flags: ["BLOCKED_TOOL_ATTEMPT"],
      reason: reason ?? "Tool call was blocked.",
      eventWritten: false,
    },
    source: "blocked_tool_audit",
  };
  event.decision.eventWritten = writeAuditEvent(event);
}

/**
 * Load recent shield audit events from the JSONL log.
 * Returns the last N events, most recent first.
 */
export function loadRecentAuditEvents(limit = 100): ShieldAuditEvent[] {
  try {
    const logPath = path.join(EVENTS_DIR, "shield_audit.jsonl");
    if (!fs.existsSync(logPath)) return [];
    const lines = fs
      .readFileSync(logPath, "utf8")
      .split("\n")
      .filter(Boolean)
      .slice(-limit);
    return lines.map((l) => JSON.parse(l) as ShieldAuditEvent).reverse();
  } catch {
    return [];
  }
}
