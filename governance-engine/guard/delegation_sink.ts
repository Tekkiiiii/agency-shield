// delegation_sink.ts — Append-only JSONL writer for Hermes delegation events.
//
// Phase 5 T5E11: The audit trail for all delegation events.
//
// Design goals:
//   - Append-only via O_APPEND flag — no read-before-write race
//   - One JSON object per line — no trailing commas, no array brackets
//   - Graceful file-not-yet-existent case — creates the file on first write
//   - Query support — filter by agent, event_type, time range, depth

import {
  appendFileSync,
  existsSync,
  readFileSync,
} from 'node:fs';
import { resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Path — override with HERMES_DELEGATION_LOG env var
// ---------------------------------------------------------------------------
const LOG_PATH = resolve(
  process.env.HERMES_DELEGATION_LOG
    ?? '/Users/Tekki/.claude/delegation_events.jsonl',
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DelegationEventType =
  | 'DELEGATION_START'
  | 'DELEGATION_END'
  | 'DELEGATION_BLOCKED'
  | 'ESCALATION';

export interface BaseDelegationEvent {
  timestamp: string;   // ISO-8601 UTC, e.g. "2026-03-31T12:00:00.000Z"
  parent_id: string;   // agent-uuid-or-name of the delegator
  child_id: string;    // agent-uuid-or-name of the delegatee
  depth: number;       // depth level in the delegation tree
  tool_name: string;   // tool that triggered the event (always "Agent")
  duration_ms: number; // wall-clock ms between START and END; 0 for non-END events
  blocked: boolean;    // always false here; true only in DELEGATION_BLOCKED
  event_type: DelegationEventType;
  skip_depth_count: boolean;
  flags: string[];
}

export interface DelegationStartEvent extends BaseDelegationEvent {
  event_type: 'DELEGATION_START';
  duration_ms: 0;
  blocked: false;
}

export interface DelegationEndEvent extends BaseDelegationEvent {
  event_type: 'DELEGATION_END';
  duration_ms: number;
  blocked: false;
}

export interface DelegationBlockedEvent extends BaseDelegationEvent {
  event_type: 'DELEGATION_BLOCKED';
  duration_ms: 0;
  blocked: true;
  blocked_reason?: string;
  agent_name?: string;
}

export interface EscalationEvent extends BaseDelegationEvent {
  event_type: 'ESCALATION';
  duration_ms: 0;
  blocked: false;
  skip_depth_count: true;
}

export type DelegationEvent =
  | DelegationStartEvent
  | DelegationEndEvent
  | DelegationBlockedEvent
  | EscalationEvent;

// ---------------------------------------------------------------------------
// Write — synchronous, append-only
// ---------------------------------------------------------------------------

/**
 * Emit a single delegation event to the JSONL audit log.
 * Uses O_APPEND to avoid read-before-write races without locking.
 * This is the primary write path; the async variant is for batch operations.
 */
export function emitDelegationEvent(event: DelegationEvent): void {
  if (!existsSync(LOG_PATH)) {
    appendFileSync(LOG_PATH, '', { flag: 'a' });
  }
  appendFileSync(LOG_PATH, JSON.stringify(event) + '\n', { flag: 'a' });
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export function getDelegationEvents(limit = 100): DelegationEvent[] {
  if (!existsSync(LOG_PATH)) return [];
  const raw = readFileSync(LOG_PATH, 'utf8');
  const lines = raw.split('\n').filter(l => l.trim() !== '');
  const events = lines
    .map(l => {
      try { return JSON.parse(l) as DelegationEvent; }
      catch { return null; }
    })
    .filter(Boolean) as DelegationEvent[];
  return limit < Infinity ? events.slice(-limit) : events;
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

export interface DelegationFilter {
  parent_id?: string;
  child_id?: string;
  event_type?: DelegationEventType;
  min_depth?: number;
  max_depth?: number;
  after?: string;
  before?: string;
  skip_depth_count?: boolean;
  flags_contain?: string[];
}

export function queryDelegationEvents(
  filter: DelegationFilter,
  limit = Infinity,
): DelegationEvent[] {
  return getDelegationEvents(Infinity)
    .filter(e => {
      if (filter.parent_id && e.parent_id !== filter.parent_id) return false;
      if (filter.child_id && e.child_id !== filter.child_id) return false;
      if (filter.event_type && e.event_type !== filter.event_type) return false;
      if (filter.min_depth !== undefined && e.depth < filter.min_depth) return false;
      if (filter.max_depth !== undefined && e.depth > filter.max_depth) return false;
      if (filter.skip_depth_count !== undefined && e.skip_depth_count !== filter.skip_depth_count) return false;
      if (filter.after && e.timestamp <= filter.after) return false;
      if (filter.before && e.timestamp >= filter.before) return false;
      if (filter.flags_contain) {
        for (const f of filter.flags_contain) {
          if (!e.flags.includes(f)) return false;
        }
      }
      return true;
    })
    .slice(-limit);
}

export function getLogPath(): string {
  return LOG_PATH;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

if (require.main === module) {
  const args = process.argv.slice(2);
  const limit = args.includes('--all') ? Infinity : 20;
  const events = getDelegationEvents(limit);
  console.log(`Delegation events (${events.length} recent):`);
  events.forEach(e => console.log(`  [${e.event_type}] ${e.child_id} via ${e.tool_name} depth=${e.depth}`));
}
