# `_guard/` — Hermes Delegation Audit Trail & Spawn-Level Tool Blocking

Internal TypeScript infrastructure modules for Phase 5 of the Hermes adoption plan.
These are **not user-facing skills** — they are loaded by the guard system,
`superpowers-guard`, and agent dispatch hooks at spawn time.

---

## Files

| File | Exports | Purpose |
|------|---------|---------|
| `blocked_tools.ts` | `DELEGATION_BLOCKED_TOOLS`, `INFRASTRUCTURE_EXEMPT_AGENTS`, helpers | Tool blocklist + exempt-agent list |
| `delegation_sink.ts` | `emitDelegationEvent`, `getDelegationEvents`, `queryDelegationEvents` | Append-only JSONL audit log |
| `blocked_tools_log.ts` | `emitBlockedToolEvent`, `emitBlockedToolEventSync` | Fan-out writer to both sinks |
| `README.md` | — | This file |

---

## Data Files

| Path | Sink type | Consumer |
|------|-----------|----------|
| `delegation_events.jsonl` | Audit | Any skill / query tool |
| `agency-rooms/operations/events/blocked_tools.jsonl` | Operational | RoomManager, on-call escalations |

---

## Event Schema (delegation_events.jsonl)

All events are JSON Lines — one valid JSON object per line, no trailing comma,
no surrounding array brackets.

### Base fields (all events)

| Field | Type | Description |
|-------|------|-------------|
| `timestamp` | string | ISO-8601 UTC, e.g. `2026-03-31T12:00:00.000Z` |
| `parent_id` | string | agent-uuid-or-name of the delegator |
| `child_id` | string | agent-uuid-or-name of the delegatee |
| `depth` | number | depth level in the delegation tree (0 = immediate) |
| `tool_name` | string | tool that triggered the event (always `Agent`) |
| `duration_ms` | number | wall-clock ms between START and END; 0 for non-END events |
| `blocked` | boolean | `false` for START/END/ESCALATION; `true` for BLOCKED |
| `event_type` | string | one of the four event types |
| `skip_depth_count` | boolean | `true` for ESCALATION events |
| `flags` | string[] | optional tag array for future extensions |

### Event types

#### `DELEGATION_START`
Emitted immediately before a child agent is spawned.

#### `DELEGATION_END`
Emitted after a child agent completes. `duration_ms` reflects wall-clock time
between START and END (set by the caller).

#### `DELEGATION_BLOCKED`
Emitted via `blocked_tools_log.ts` when a tool is blocked at spawn time.
Written to **both** sinks. Includes optional `blocked_reason` and `agent_name` fields.

#### `ESCALATION`
Emitted when an agent on `INFRASTRUCTURE_EXEMPT_AGENTS` is spawned.
`skip_depth_count` is always `true` — these events do not count toward the
depth ceiling.

---

## blocked_tools.jsonl Schema

Written to `agency-rooms/operations/events/blocked_tools.jsonl` by `blocked_tools_log.ts`.

| Field | Description |
|-------|-------------|
| `emitted_to` | `jsonl` = delegation_events.jsonl only; `roommanager` = blocked_tools.jsonl only; `both` = both sinks |

---

## Tool Blocklist Semantics

### Universal blocklist (`DELEGATION_BLOCKED_TOOLS`)
Blocked for **all children** regardless of trust level:
`delegate_task`, `clarify`, `agent_manage`, `teams/spawn`, `teams/create`, `teams/delete`

### Conditional blocklist (untrusted children only)
`send_message`, `execute_code`

### Infrastructure exempt agents (`INFRASTRUCTURE_EXEMPT_AGENTS`)
Agents whose delegation events have `skip_depth_count: true`:
`paperclip-control-plane`, `pd-status-loop`, `project-expansion-scout`

> Confirm with user before promoting placeholders to production.

---

## Integration Points

### Guard hook (PreToolUse)
The `superpowers-guard` skill's PreToolUse hook intercepts tool calls.
It checks the child agent's trust level against `DELEGATION_BLOCKED_TOOLS` and
emits `DELEGATION_BLOCKED` via `blocked_tools_log.ts` before allowing the tool to proceed.

### Spawn wrapper (T5-3)
Every agent spawn should wrap the spawn call with DELEGATION_START / DELEGATION_END
events via `emitDelegationEvent()` from `delegation_sink.ts`.

### RoomManager fan-out (T5-4)
`emitBlockedToolEvent()` in `blocked_tools_log.ts` handles the dual write.
Always route blocked tool events through this function to guarantee audit completeness.

---

## Querying the Log

```typescript
import {
  queryDelegationEvents,
  getDelegationEvents,
} from "./delegation_sink.js";

// Last 50 events
const recent = getDelegationEvents(50);

// All BLOCKED events for a given parent
const blocked = queryDelegationEvents({
  parent_id: "conductor-agent-01",
  event_type: "DELEGATION_BLOCKED",
});

// All escalations in a time window
const escalations = queryDelegationEvents({
  event_type: "ESCALATION",
  after: "2026-03-01T00:00:00.000Z",
  before: "2026-03-31T23:59:59.999Z",
});

// All events at depth > 2
const deep = queryDelegationEvents({ min_depth: 3 });
```

---

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `HERMES_DELEGATION_LOG` | `/Users/Tekki/.claude/delegation_events.jsonl` | Path to audit log |
| `HERMES_ROOMMANAGER_EVENTS` | `/Users/Tekki/.claude/agency-rooms/operations/events` | Path to RoomManager events dir |

---

## Phase 5 Task Map

| Task | File(s) | Status |
|------|---------|--------|
| T5-1 | `delegation_sink.ts` + `delegation_events.jsonl` | done |
| T5-2 | `blocked_tools.ts` | done |
| T5-4 | `blocked_tools_log.ts` (fan-out) | done |
| T5-3 | Spawn wrapper (delegation_sink consumer) | pending |
| T5-5 | Audit completeness verification script | pending |
