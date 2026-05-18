/**
 * message_processor.ts — Hermes Phase 6: T6-2
 *
 * Wraps scan_message(). Processes inbound room messages before routing.
 * On flag: writes to skills/_shield/quarantine/ and always emits
 * a structured event (never blocks silently).
 *
 * Integration point: call processInboundMessage() from your RoomManager
 * step that handles incoming messages.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { scanMessage, type Severity } from "./scan_message.js";

export const ROOT = "/Users/Tekki/.claude";
export const ROOMS_ROOT = path.join(ROOT, "agency-rooms");
export const SHIELD_ROOT = path.join(ROOT, "skills", "_shield");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InboundMessage {
  message_id: string;
  body: string;
  source: string;
  destination: string;
  timestamp?: string;
}

export interface QuarantineRecord {
  message_id: string;
  flagged_at: string;
  reason: string;
  source: string;
  destination: string;
  severity: Severity;
  raw_snippet: string;   // first 200 chars of body
}

export interface ProcessedMessage {
  message: InboundMessage;
  scanResult: ReturnType<typeof scanMessage>;
  quarantined: boolean;
  quarantinePath?: string;
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function isoNow(): string {
  return new Date().toISOString();
}

function truncate(text: string, max = 200): string {
  const stripped = text.replace(/\n+/g, " ").trim();
  return stripped.length <= max ? stripped : stripped.slice(0, max);
}

/** Strip path traversal attempts from room names */
export function sanitizeRoom(room: string): string {
  return room.replace(/[^a-z0-9_-]/gi, "").slice(0, 64);
}

/**
 * Main entry point — scan a single inbound message.
 *
 * Always returns a ProcessedMessage. If the scan flags anything, writes a
 * quarantine file and returns quarantined: true.
 *
 * @throws Never — all filesystem errors are caught and logged.
 */
export function processInboundMessage(msg: InboundMessage): ProcessedMessage {
  const scanResult = scanMessage(msg.body);

  const processed: ProcessedMessage = {
    message: msg,
    scanResult,
    quarantined: false,
  };

  if (scanResult.clean) return processed;

  const record: QuarantineRecord = {
    message_id: msg.message_id,
    flagged_at: isoNow(),
    reason: scanResult.reason ?? "unknown",
    source: msg.source,
    destination: msg.destination,
    severity: scanResult.severity,
    raw_snippet: truncate(msg.body),
  };

  const room = sanitizeRoom(msg.destination);
  if (room) {
    try {
      const quarantineDir = path.join(SHIELD_ROOT, "quarantine", room);
      ensureDir(quarantineDir);
      const qPath = path.join(quarantineDir, `${msg.message_id}.json`);
      fs.writeFileSync(qPath, JSON.stringify(record, null, 2), "utf8");
      processed.quarantined = true;
      processed.quarantinePath = qPath;
    } catch (err) {
      console.error(`[shield] Failed to write quarantine file: ${err}`);
    }
  }

  return processed;
}

/**
 * Process a batch of inbound messages from a room.
 * Returns both the processed results and any that were flagged.
 */
export function processRoomMessages(
  room: string,
  messages: InboundMessage[]
): { results: ProcessedMessage[]; flagged: ProcessedMessage[] } {
  const results: ProcessedMessage[] = [];
  const flagged: ProcessedMessage[] = [];

  for (const msg of messages) {
    const annotated: InboundMessage = { ...msg, destination: msg.destination || room };
    const processed = processInboundMessage(annotated);
    results.push(processed);
    if (!processed.scanResult.clean) flagged.push(processed);
  }

  return { results, flagged };
}

/** Load a quarantine record by room and message ID */
export function loadQuarantineRecord(room: string, messageId: string): QuarantineRecord | null {
  try {
    const qPath = path.join(SHIELD_ROOT, "quarantine", sanitizeRoom(room), `${messageId}.json`);
    if (!fs.existsSync(qPath)) return null;
    return JSON.parse(fs.readFileSync(qPath, "utf8")) as QuarantineRecord;
  } catch {
    return null;
  }
}

/** List all quarantined message IDs for a room */
export function listQuarantined(room: string): string[] {
  try {
    const dir = path.join(SHIELD_ROOT, "quarantine", sanitizeRoom(room));
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""));
  } catch {
    return [];
  }
}
