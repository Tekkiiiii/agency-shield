#!/usr/bin/env bash
# delegation-spawn.sh — Delegation event wrapper for superpowers-guard
# Phase 5 T5-3 — Hermes Adoption Plan
#
# Usage (source this script):
#
#   source delegation-spawn.sh start       <parent_id> <child_id> [agent_type]
#   source delegation-spawn.sh end        <parent_id> <child_id> <duration_ms>
#   source delegation-spawn.sh blocked    <parent_id> <child_id> <tool_name> <reason>
#   source delegation-spawn.sh escalation  <parent_id> <child_id>
#
# Output: one JSON line appended to ${HERMES_DELEGATION_LOG:-$HOME/.claude/delegation_events.jsonl}
# Exit:   0 always (non-blocking — append failures are silently swallowed)

set -euo pipefail

# ---------------------------------------------------------------------------
# Timestamp (macOS-compatible: BSD date + milliseconds)
# ---------------------------------------------------------------------------

_timestamp() {
  local now ms
  now=$(date -u +"%Y-%m-%dT%H:%M:%S")
  ms=$(date -u +%N | cut -c1-3)
  printf '%s.%sZ' "$now" "$ms"
}

# ---------------------------------------------------------------------------
# JSON emitter via Python (handles all quoting/escaping correctly)
# ---------------------------------------------------------------------------

_emit_json() {
  local action="$1"; shift
  local parent_id="$1"; shift
  local child_id="$1"; shift
  local ts
  ts=$(_timestamp)

  # Build event via Python dict — no quoting/escaping headaches
  python3 - "$action" "$ts" "$parent_id" "$child_id" "$@" <<'PYEOF'
import sys, json, os
action = sys.argv[1]
ts     = sys.argv[2]
parent = sys.argv[3]
child  = sys.argv[4]
args   = sys.argv[5:]

base = {
    "timestamp":       ts,
    "parent_id":        parent,
    "child_id":         child,
    "depth":            0,
    "tool_name":        "Agent",
    "duration_ms":      0,
    "blocked":          False,
    "skip_depth_count": False,
    "flags":            [],
}

if action == "start":
    event = {**base,
             "event_type": "DELEGATION_START",
             "skip_depth_count": False}
    if args:
        event["agent_name"] = args[0]

elif action == "end":
    event = {**base,
             "event_type":   "DELEGATION_END",
             "duration_ms":  int(args[0]) if args else 0}

elif action == "escalation":
    event = {**base,
             "event_type":         "ESCALATION",
             "skip_depth_count":   True}

elif action == "blocked":
    tool   = args[0] if len(args) > 0 else "Agent"
    reason = args[1] if len(args) > 1 else "unknown"
    event = {**base,
             "event_type":    "DELEGATION_BLOCKED",
             "blocked":       True,
             "blocked_reason": reason,
             "agent_name":    child}

else:
    sys.exit(1)

sys.stdout.write(json.dumps(event) + "\n")
PYEOF
}

# ---------------------------------------------------------------------------
# Append to audit log (failures silently swallowed)
# ---------------------------------------------------------------------------

_emit() {
  local action="$1"; shift
  local parent_id="$1"; shift
  local child_id="$1"; shift

  local line
  line=$(_emit_json "$action" "$parent_id" "$child_id" "$@") || return 0

  local log_path="${HERMES_DELEGATION_LOG:-${HOME}/.claude/delegation_events.jsonl}"
  {
    printf '%s\n' "$line"
  } >> "$log_path" 2>/dev/null || true
}

# ---------------------------------------------------------------------------
# CLI / source dispatch
# ---------------------------------------------------------------------------

if [[ $# -eq 0 ]]; then
  echo "delegation-spawn.sh — delegation event emitter" >&2
  echo "Usage: source delegation-spawn.sh <action> ..." >&2
  echo "  start <parent_id> <child_id> [agent_type]" >&2
  echo "  end <parent_id> <child_id> <duration_ms>" >&2
  echo "  blocked <parent_id> <child_id> <tool_name> <reason>" >&2
  echo "  escalation <parent_id> <child_id>" >&2
  return 0 2>/dev/null || exit 0
fi

_emit "$@"
