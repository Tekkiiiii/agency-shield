/**
 * room_shield.ts — Hermes Phase 6: T6-4
 *
 * Integrates with the RoomManager polling cycle.
 * On each poll: scans new messages in agency-rooms/{room}/messages.mdl
 * Emits structured events to agency-rooms/{room}/events/shield_events.jsonl
 * Fan-out: quarantine JSON file + JSONL event + optional RoomManager signal
 *
 * Drop-in: call initRoomShield() and then runShieldPoll() in your poll cycle.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { scanMessage, composeReason, type Severity } from "./scan_message.js";
import { SHIELD_ROOT } from "./message_processor.js";

export const ROOT = "/Users/Tekki/.claude";
export const ROOMS_ROOT = path.join(ROOT, "agency-rooms");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedMessage {
  message_id: string;
  body: string;
  source: string;
  timestamp: string;
}

export interface ShieldEvent {
  type: "shield.scan" | "shield.quarantine" | "shield.blocked";
  event_id: string;
  timestamp: string;
  room: string;
  message_id: string;
  source: string;
  destination: string;
  severity: Severity;
  flags: string[];
  reason: string;
  quarantine_path?: string;
}

export interface RoomShieldConfig {
  /** Rooms to shield (defaults to all subdirs of agency-rooms except .room-manager) */
  rooms?: string[];
  /** Write quarantine records alongside events */
  writeQuarantine?: boolean;
  /** Emit a RoomManager signal file (agency-rooms/{room}/events/shield_signal.json) */
  emitSignal?: boolean;
}

export interface ShieldPollResult {
  room: string;
  messagesScanned: number;
  flagged: number;
  events: ShieldEvent[];
  errors: string[];
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

function sanitizeRoom(room: string): string {
  return room.replace(/[^a-z0-9_-]/gi, "").slice(0, 64);
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function truncate(text: string, max = 200): string {
  return text.replace(/\n+/g, " ").trim().slice(0, max);
}

// ---------------------------------------------------------------------------
// Message parsing
// ---------------------------------------------------------------------------

/**
 * Parse messages from a messages.mdl file.
 * Extracts message blocks after the last checkpoint offset.
 *
 * Expected format per message block:
 *   ### [ISO timestamp] {source}
 *   {body lines}
 *   ---
 */
export function parseMessagesMdl(content: string): ParsedMessage[] {
  const messages: ParsedMessage[] = [];
  const blocks = content.split(/(?=^### \[)/m);
  for (const block of blocks) {
    const headerMatch = block.match(/^### \[([^\]]+)\] ([^\n]+)/m);
    if (!headerMatch) continue;
    const timestamp = headerMatch[1];
    const source = headerMatch[2].replace(/\s*→.+$/, "").trim();
    const body = block
      .replace(/^### \[[^\]]+\] [^\n]+\n/, "")
      .replace(/^---$/m, "")
      .trim();
    if (!body) continue;
    const idInput = `${source}:${timestamp}:${body.slice(0, 40)}`;
    const message_id = Buffer.from(idInput, "utf8")
      .toString("base64")
      .replace(/[/+=]/g, "_")
      .slice(0, 32);
    messages.push({ message_id, body, source, timestamp });
  }
  return messages;
}

/** Discover all rooms under agency-rooms/ (excluding .room-manager and dot-prefixed) */
export function discoverRooms(): string[] {
  try {
    return fs
      .readdirSync(ROOMS_ROOT)
      .filter(
        (d) =>
          !d.startsWith(".") &&
          fs.statSync(path.join(ROOMS_ROOT, d)).isDirectory()
      );
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Core scan + emit
// ---------------------------------------------------------------------------

function writeShieldJsonlEvent(event: ShieldEvent): void {
  try {
    const eventsDir = path.join(ROOMS_ROOT, event.room, "events");
    ensureDir(eventsDir);
    const jsonlPath = path.join(eventsDir, "shield_events.jsonl");
    fs.appendFileSync(jsonlPath, JSON.stringify(event) + "\n", "utf8");
  } catch (err) {
    console.error(`[shield] Failed to write shield_events.jsonl: ${err}`);
  }
}

function writeQuarantineFile(
  room: string,
  msg: ParsedMessage,
  severity: Severity,
  flags: string[],
  reason: string
): string | null {
  try {
    const quarantineDir = path.join(SHIELD_ROOT, "quarantine", sanitizeRoom(room));
    ensureDir(quarantineDir);
    const record = {
      message_id: msg.message_id,
      flagged_at: isoNow(),
      reason,
      source: msg.source,
      destination: room,
      severity,
      raw_snippet: truncate(msg.body),
    };
    const qPath = path.join(quarantineDir, `${msg.message_id}.json`);
    fs.writeFileSync(qPath, JSON.stringify(record, null, 2), "utf8");
    return qPath;
  } catch (err) {
    console.error(`[shield] Failed to write quarantine file: ${err}`);
    return null;
  }
}

function writeSignalFile(room: string, event: ShieldEvent): void {
  try {
    const sigDir = path.join(ROOMS_ROOT, room, "events");
    ensureDir(sigDir);
    fs.writeFileSync(
      path.join(sigDir, "shield_signal.json"),
      JSON.stringify(
        {
          type: "shield",
          event_id: event.event_id,
          severity: event.severity,
          room,
          message_id: event.message_id,
        },
        null,
        2
      ),
      "utf8"
    );
  } catch (err) {
    console.error(`[shield] Failed to write shield_signal.json: ${err}`);
  }
}

function scanAndEmit(
  msg: ParsedMessage,
  room: string,
  cfg: Required<RoomShieldConfig>
): ShieldEvent | null {
  const scanResult = scanMessage(msg.body);
  if (scanResult.clean) return null;

  const event: ShieldEvent = {
    type: "shield.quarantine",
    event_id: uuid(),
    timestamp: isoNow(),
    room,
    message_id: msg.message_id,
    source: msg.source,
    destination: room,
    severity: scanResult.severity,
    flags: scanResult.flags,
    reason: scanResult.reason ?? composeReason(scanResult.flags),
  };

  writeShieldJsonlEvent(event);

  if (cfg.writeQuarantine) {
    const qPath = writeQuarantineFile(
      room,
      msg,
      scanResult.severity,
      scanResult.flags,
      event.reason
    );
    if (qPath) event.quarantine_path = qPath;
  }

  if (cfg.emitSignal) writeSignalFile(room, event);

  return event;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run a full shield poll across all (or configured) rooms.
 *
 * Drop-in for RoomManager step:
 *   Step X: Run shieldPoll() — reads messages.mdl from last checkpoint,
 *           scans new messages, emits events.
 */
export function runShieldPoll(config: RoomShieldConfig = {}): ShieldPollResult[] {
  const rooms = config.rooms ?? discoverRooms();
  const cfg: Required<RoomShieldConfig> = {
    rooms,
    writeQuarantine: config.writeQuarantine ?? true,
    emitSignal: config.emitSignal ?? false,
  };

  const results: ShieldPollResult[] = [];

  for (const room of rooms) {
    const result: ShieldPollResult = {
      room,
      messagesScanned: 0,
      flagged: 0,
      events: [],
      errors: [],
    };
    try {
      const msgPath = path.join(ROOMS_ROOT, room, "messages.mdl");
      if (!fs.existsSync(msgPath)) { results.push(result); continue; }

      const content = fs.readFileSync(msgPath, "utf8");
      const messages = parseMessagesMdl(content);
      result.messagesScanned = messages.length;

      for (const msg of messages) {
        const event = scanAndEmit(msg, room, cfg);
        if (event) { result.flagged++; result.events.push(event); }
      }
    } catch (err) {
      result.errors.push(String(err));
    }
    results.push(result);
  }

  return results;
}

/**
 * Scan a single room's messages file directly (no checkpointing).
 */
export function scanRoomMessages(
  room: string,
  messages: ParsedMessage[],
  config: RoomShieldConfig = {}
): ShieldEvent[] {
  const cfg: Required<RoomShieldConfig> = {
    rooms: [room],
    writeQuarantine: config.writeQuarantine ?? true,
    emitSignal: config.emitSignal ?? false,
  };
  const events: ShieldEvent[] = [];
  for (const msg of messages) {
    const event = scanAndEmit(msg, room, cfg);
    if (event) events.push(event);
  }
  return events;
}

/** Summarize a poll result for logging */
export function formatPollSummary(results: ShieldPollResult[]): string {
  const totalRooms = results.length;
  const totalScanned = results.reduce((s, r) => s + r.messagesScanned, 0);
  const totalFlagged = results.reduce((s, r) => s + r.flagged, 0);
  const lines = [
    `[shield] Poll — ${totalRooms} rooms, ${totalScanned} msgs scanned, ${totalFlagged} flagged`,
  ];
  for (const r of results) {
    if (r.flagged > 0) lines.push(`  ${r.room}: ${r.flagged} quarantined`);
    if (r.errors.length) lines.push(`  ${r.room}: ERROR — ${r.errors.join("; ")}`);
  }
  return lines.join("\n");
}
