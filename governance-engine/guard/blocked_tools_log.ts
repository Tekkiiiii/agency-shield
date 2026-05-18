/**
 * blocked_tools_log.ts — Fan-out writer for blocked tool events.
 *
 * Phase 5 T5-4: Every blocked_tool_attempt must fan out to BOTH:
 *   1. delegation_events.jsonl  (audit — DelegationEvent, via delegation_sink)
 *   2. agency-rooms/operations/events/blocked_tools.jsonl  (operational monitoring)
 *
 * This module provides the unified emitBlockedToolEvent() call that writes
 * to both sinks atomically (best-effort on the RoomManager sink — audit is
 * never blocked by a RoomManager write failure).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BlockedToolEvent {
  timestamp: string;
  parent_id: string;
  child_id: string;
  tool_name: string;
  reason: string;
  blocked: true;
  emitted_to: "jsonl" | "roommanager" | "both";
}

export type BlockedToolFanOut = "both" | "audit_only" | "roommanager_only";

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { emitDelegationEvent } from "./delegation_sink.js";

const ROOMMANAGER_EVENTS_DIR = resolve(
  process.env.HERMES_ROOMMANAGER_EVENTS ??
    "/Users/Tekki/.claude/agency-rooms/operations/events"
);

const ROOMMANAGER_BLOCKED_PATH = resolve(
  ROOMMANAGER_EVENTS_DIR,
  "blocked_tools.jsonl"
);

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Ensures the RoomManager events directory exists.
 * Called lazily on each emit so we don't touch the filesystem on import.
 */
function _ensureRoomManagerDir(): void {
  if (!existsSync(ROOMMANAGER_EVENTS_DIR)) {
    mkdirSync(ROOMMANAGER_EVENTS_DIR, { recursive: true });
  }
}

/**
 * Writes a BlockedToolEvent to the RoomManager operational signal file.
 * Failures are swallowed — audit sink is authoritative and must not be
 * blocked by operational monitoring failures.
 */
function _writeToRoomManager(event: BlockedToolEvent): void {
  try {
    _ensureRoomManagerDir();
    appendFileSync(
      ROOMMANAGER_BLOCKED_PATH,
      JSON.stringify(event) + "\n",
      { flag: 'a' }
    );
  } catch {
    // Swallow — do not let operational monitoring failures affect audit.
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Emits a blocked tool event to the configured sinks.
 *
 * Fan-out:
 *   - Always writes to delegation_events.jsonl via delegation_sink when fanOut
 *     is not roommanager_only
 *   - Always writes to agency-rooms/operations/events/blocked_tools.jsonl when
 *     fanOut is not audit_only
 *   - Sets emitted_to accordingly
 *
 * @param event   - BlockedToolEvent fields (timestamp, parent_id, child_id,
 *                  tool_name, reason are required; blocked is forced to true)
 * @param fanOut  - Which sinks to write to (default: "both")
 */
export function emitBlockedToolEvent(
  event: Omit<BlockedToolEvent, "blocked" | "emitted_to">,
  fanOut: BlockedToolFanOut = "both"
): void {
  const fullEvent: BlockedToolEvent = {
    ...event,
    blocked: true,
    emitted_to:
      fanOut === "audit_only"
        ? "jsonl"
        : fanOut === "roommanager_only"
          ? "roommanager"
          : "both",
  };

  // 1. Audit sink — always fire if fanOut is not roommanager_only
  if (fanOut !== "roommanager_only") {
    try {
      emitDelegationEvent({
        timestamp: fullEvent.timestamp,
        parent_id: fullEvent.parent_id,
        child_id: fullEvent.child_id,
        depth: 0,
        tool_name: fullEvent.tool_name,
        duration_ms: 0,
        blocked: true,
        event_type: "DELEGATION_BLOCKED",
        skip_depth_count: false,
        flags: [],
        blocked_reason: fullEvent.reason,
        agent_name: fullEvent.child_id,
      });
    } catch {
      // Audit failures must not block the RoomManager write.
      // TODO (T5-3): wire to alerting path when error-reporting is in place.
    }
  }

  // 2. Operational monitoring sink — best-effort
  if (fanOut !== "audit_only") {
    _writeToRoomManager(fullEvent);
  }
}

/**
 * Synchronous variant — exported for use in pre-tool-use hook contexts where
 * async is not available. Semantics are identical to emitBlockedToolEvent.
 */
export function emitBlockedToolEventSync(
  event: Omit<BlockedToolEvent, "blocked" | "emitted_to">,
  fanOut: BlockedToolFanOut = "both"
): void {
  emitBlockedToolEvent(event, fanOut);
}

/**
 * Returns the path to the RoomManager blocked tools signal file.
 */
export function getRoomManagerBlockedPath(): string {
  return ROOMMANAGER_BLOCKED_PATH;
}

// ---------------------------------------------------------------------------
// CLI entry point — allows SKILL.md PreToolUse hook to call via:
//   bun --bun blocked_tools_log.ts "$TOOL_NAME" "$TARGET" "$REASON"
//
// Args: <tool_name> <target_path> <reason>
// ---------------------------------------------------------------------------

import { fileURLToPath } from "node:url";

function isMainModule(): boolean {
  try {
    const thisFile = fileURLToPath(import.meta.url);
    const argv1 = process.argv[1];
    if (!argv1) return false;
    const argv1Abs = resolve(argv1);
    return argv1Abs === thisFile;
  } catch {
    return false;
  }
}

if (isMainModule()) {
  const [, , toolName, targetPath, reason] = process.argv;

  if (!toolName || !targetPath || !reason) {
    console.error(
      "Usage: bun --bun blocked_tools_log.ts <tool_name> <target_path> <reason>\n" +
      "Example: bun --bun blocked_tools_log.ts Write /etc/passwd outside_freeze_boundary"
    );
    process.exit(1);
  }

  emitBlockedToolEventSync(
    {
      timestamp: new Date().toISOString(),
      parent_id: "cli",
      child_id: "cli",
      tool_name: toolName,
      reason,
    },
    "roommanager_only" // Use roommanager_only in CLI context — delegation_sink needs session IDs
  );

  console.error(
    `Fan-out emitted: ${toolName} ${targetPath} — ${reason}\n` +
    `Wrote to: ${getRoomManagerBlockedPath()}`
  );
}
