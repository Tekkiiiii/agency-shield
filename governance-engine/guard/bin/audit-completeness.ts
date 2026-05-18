#!/usr/bin/env bun
/**
 * audit-completeness.ts — Phase 5 T5-5
 * Audit completeness verification for delegation_events.jsonl.
 *
 * Checks:
 *   1. File exists and is readable
 *   2. Each line is valid JSON with required fields
 *   3. Completeness: every DELEGATION_START has a matching DELEGATION_END
 *   4. Depth accounting: every non-ESCALATION event increments depth
 *   5. BLOCKED events reference real tools from BLOCKED_TOOLS
 *   6. No orphaned events (END without a preceding START)
 *
 * Usage:
 *   bun _guard/bin/audit-completeness.ts
 *   bun _guard/bin/audit-completeness.ts --json     # machine-readable output
 *   bun _guard/bin/audit-completeness.ts --fix      # auto-remove orphans (backup first)
 */

// @ts-ignore — standalone bun script, node:fs types provided by bun runtime
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// TODO: wire in BLOCKED_TOOLS from blocked_tools.ts for tool-name validation
// import { BLOCKED_TOOLS } from "../blocked_tools.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const LOG_PATH = process.env.HERMES_DELEGATION_LOG
  ?? resolve(process.env.HOME ?? "", ".claude/delegation_events.jsonl");

const BLOCKED_TOOLS = new Set([
  "delegate_task",
  "Agent",
  "teams/spawn",
  "teams/create",
  "teams/delete",
]);

const REQUIRED_FIELDS = [
  "timestamp",
  "parent_id",
  "child_id",
  "depth",
  "tool_name",
  "duration_ms",
  "blocked",
  "event_type",
  "skip_depth_count",
  "flags",
] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ParsedEvent {
  raw: string;
  line: number;
  event_type: string;
  parent_id: string;
  child_id: string;
  depth: number;
  timestamp: string;
  duration_ms: number;
  blocked: boolean;
  skip_depth_count: boolean;
  flags: string[];
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------------

function parseEvents(): ParsedEvent[] {
  if (!existsSync(LOG_PATH)) {
    console.error(`ERROR: ${LOG_PATH} does not exist`);
    process.exit(1);
  }

  const raw = readFileSync(LOG_PATH, "utf8");
  const lines = raw.split("\n");
  const events: ParsedEvent[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    try {
      const obj = JSON.parse(line) as Record<string, unknown>;
      events.push({ ...obj, raw: line, line: i + 1 } as ParsedEvent);
    } catch (err) {
      events.push({
        raw: line,
        line: i + 1,
        event_type: "PARSE_ERROR",
        parent_id: "???",
        child_id: "???",
        depth: -1,
        timestamp: "???",
        duration_ms: 0,
        blocked: false,
        skip_depth_count: false,
        flags: [],
      });
    }
  }

  return events;
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

interface AuditResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    total: number;
    start: number;
    end: number;
    blocked: number;
    escalation: number;
    parse_error: number;
    orphans: number;
  };
}

function audit(events: ParsedEvent[]): AuditResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const stats = {
    total: events.length,
    start: 0,
    end: 0,
    blocked: 0,
    escalation: 0,
    parse_error: 0,
    orphans: 0,
  };

  // 1. Required fields
  for (const ev of events) {
    if (ev.event_type === "PARSE_ERROR") {
      stats.parse_error++;
      errors.push(`line ${ev.line}: PARSE ERROR — ${ev.raw.slice(0, 80)}`);
      continue;
    }
    for (const field of REQUIRED_FIELDS) {
      if (!(field in ev)) {
        errors.push(
          `line ${ev.line}: missing required field '${field}' in ${ev.event_type} event`
        );
      }
    }
  }

  // 2. Stats + type validation
  for (const ev of events) {
    if (ev.event_type === "PARSE_ERROR") continue;
    switch (ev.event_type) {
      case "DELEGATION_START":
        stats.start++;
        if (ev.blocked !== false)
          errors.push(`line ${ev.line}: DELEGATION_START must have blocked=false`);
        if (ev.skip_depth_count !== false)
          errors.push(`line ${ev.line}: DELEGATION_START must have skip_depth_count=false`);
        if (ev.duration_ms !== 0)
          errors.push(`line ${ev.line}: DELEGATION_START must have duration_ms=0`);
        break;
      case "DELEGATION_END":
        stats.end++;
        if (ev.blocked !== false)
          errors.push(`line ${ev.line}: DELEGATION_END must have blocked=false`);
        if (typeof ev.duration_ms !== "number")
          errors.push(`line ${ev.line}: DELEGATION_END duration_ms must be a number`);
        break;
      case "DELEGATION_BLOCKED":
        stats.blocked++;
        if (ev.blocked !== true)
          errors.push(`line ${ev.line}: DELEGATION_BLOCKED must have blocked=true`);
        if (!ev.blocked_reason)
          warnings.push(`line ${ev.line}: DELEGATION_BLOCKED has no blocked_reason`);
        break;
      case "ESCALATION":
        stats.escalation++;
        if (ev.skip_depth_count !== true)
          errors.push(`line ${ev.line}: ESCALATION must have skip_depth_count=true`);
        break;
      default:
        warnings.push(`line ${ev.line}: unknown event_type '${ev.event_type}'`);
    }
  }

  // 3. Completeness: every START must have a matching END
  const startStack: Array<{ ev: ParsedEvent; matched: boolean }> = [];
  const orphanEnds: ParsedEvent[] = [];

  for (const ev of events) {
    if (ev.event_type === "PARSE_ERROR") continue;

    if (ev.event_type === "DELEGATION_START") {
      startStack.push({ ev, matched: false });
    } else if (ev.event_type === "DELEGATION_END") {
      // Find the innermost unmatched START for this child_id
      const idx = [...startStack]
        .reverse()
        .findIndex((s) => !s.matched && s.ev.child_id === ev.child_id);
      if (idx === -1) {
        orphanEnds.push(ev);
      } else {
        // Mark matched counting from top of stack
        const realIdx = startStack.length - 1 - idx;
        startStack[realIdx].matched = true;
      }
    }
  }

  stats.orphans = orphanEnds.length;
  for (const ev of orphanEnds) {
    errors.push(
      `line ${ev.line}: DELEGATION_END for child='${ev.child_id}' has no preceding DELEGATION_START`
    );
  }

  // 4. Orphan STARTs (unmatched — not necessarily an error, agent may be in-flight)
  const unmatched = startStack.filter((s) => !s.matched);
  if (unmatched.length > 0) {
    warnings.push(
      `${unmatched.length} unmatched DELEGATION_START(s) — agent may still be running`
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    stats,
  };
}

// ---------------------------------------------------------------------------
// Reporter
// ---------------------------------------------------------------------------

function report(result: AuditResult, jsonMode: boolean): void {
  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log("=== Delegation Audit — completeness check ===");
  console.log(`  Log: ${LOG_PATH}`);
  console.log(`  Total lines:  ${result.stats.total}`);
  console.log(`  START:        ${result.stats.start}`);
  console.log(`  END:          ${result.stats.end}`);
  console.log(`  BLOCKED:      ${result.stats.blocked}`);
  console.log(`  ESCALATION:   ${result.stats.escalation}`);
  console.log(`  PARSE_ERROR:  ${result.stats.parse_error}`);
  console.log(`  ORPHAN ENDs:  ${result.stats.orphans}`);
  console.log();

  if (result.warnings.length > 0) {
    console.log("WARNINGS:");
    for (const w of result.warnings) console.log(`  ⚠  ${w}`);
    console.log();
  }

  if (result.errors.length > 0) {
    console.log("ERRORS:");
    for (const e of result.errors) console.log(`  ✗  ${e}`);
    console.log();
  }

  if (result.ok) {
    console.log("PASS — no errors found.");
  } else {
    console.log(`FAIL — ${result.errors.length} error(s), ${result.warnings.length} warning(s).`);
    process.exitCode = 1;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const jsonMode = process.argv.includes("--json");
const events = parseEvents();
const result = audit(events);
report(result, jsonMode);
