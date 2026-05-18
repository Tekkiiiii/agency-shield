/**
 * scan_message.ts — Hermes Phase 6: Prompt Injection Shield
 * Scans inter-agent messages for injection attacks, invisible unicode,
 * encoded payloads, and destructive command patterns.
 */

export type Severity = "none" | "low" | "medium" | "high";

export interface ScanResult {
  clean: boolean;
  flags: string[];         // e.g. ["INVISIBLE_UNICODE_U200B", "BASE64_PAYLOAD"]
  severity: Severity;
  reason?: string;
}

export interface MessageEntry {
  id: string;
  body: string;
  source?: string;
  destination?: string;
  timestamp?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Invisible / control unicode codepoints relevant to injection attacks */
const INVISIBLE_UNICODE: ReadonlyMap<string, string> = new Map([
  ["\u200B", "U200B"],   // Zero-width space (ZWSP)
  ["\u200C", "U200C"],   // Zero-width non-joiner (ZWNJ)
  ["\u200D", "U200D"],   // Zero-width joiner (ZWJ)
  ["\uFEFF", "UFEFF"],   // Byte order mark (BOM)
  ["\u202E", "U202E"],   // Right-to-left override (RLO)
  ["\u202D", "U202D"],   // Left-to-right override (LRO)
]);

/** Patterns that signal instruction override attempts */
const INSTRUCTION_PATTERNS: ReadonlyArray<{ pattern: RegExp; flag: string }> = [
  { pattern: /ignore\s+(all\s+)?previous\s+instruction/i, flag: "INSTRUCTION_IGNORE_PREVIOUS" },
  { pattern: /disregard\s+(all\s+)?previous/i,             flag: "INSTRUCTION_DISREGARD" },
  { pattern: /forget\s+your?\s+(system\s+)?instruction/i,  flag: "INSTRUCTION_FORGET" },
  { pattern: /\byou\s+are\s+now\b/i,                       flag: "INSTRUCTION_YOU_ARE_NOW" },
  { pattern: /\bact\s+as\b/i,                              flag: "INSTRUCTION_ACT_AS" },
  { pattern: /\bsystem\s+prompt\b/i,                       flag: "INSTRUCTION_SYSTEM_PROMPT" },
  { pattern: /ignore\s+system/i,                           flag: "INSTRUCTION_IGNORE_SYSTEM" },
];

/** Patterns signalling recursive / template injection */
const RECURSIVE_PATTERNS: ReadonlyArray<{ pattern: RegExp; flag: string }> = [
  { pattern: /\{\{/,        flag: "TEMPLATE_INJECTION_DOUBLE_BRACE" },
  { pattern: /\}\}/,        flag: "TEMPLATE_INJECTION_DOUBLE_BRACE_CLOSE" },
  { pattern: /<script>/i,   flag: "SCRIPT_TAG_INJECTION" },
  { pattern: /<\/script>/i, flag: "SCRIPT_TAG_CLOSE" },
];

/** Patterns signalling destructive commands */
const DESTRUCTIVE_PATTERNS: ReadonlyArray<{ pattern: RegExp; flag: string }> = [
  { pattern: /rm\s+-rf\b/,           flag: "RM_RF" },
  { pattern: /delete\s+everything/i, flag: "DELETE_ALL" },
  { pattern: /drop\s+table/i,        flag: "DROP_TABLE" },
  { pattern: /truncate\s+table/i,    flag: "TRUNCATE_TABLE" },
  { pattern: /shutdown\s+--?force/i, flag: "SHUTDOWN_FORCE" },
  { pattern: /:\s*!\s*rm/i,         flag: "SHELL_ESCAPE_RM" },
  { pattern: /\|\s*rm\b/,           flag: "PIPE_RM" },
]);

// ---------------------------------------------------------------------------
// Severity ranking
// ---------------------------------------------------------------------------

const SEVERITY_RANK: Record<string, Severity> = {
  INSTRUCTION_IGNORE_PREVIOUS: "high",
  INSTRUCTION_DISREGARD:       "high",
  INSTRUCTION_FORGET:          "high",
  INSTRUCTION_YOU_ARE_NOW:     "high",
  INSTRUCTION_ACT_AS:          "medium",
  INSTRUCTION_SYSTEM_PROMPT:   "high",
  INSTRUCTION_IGNORE_SYSTEM:   "high",
  INVISIBLE_UNICODE:           "medium",
  BASE64_PAYLOAD:              "medium",
  TEMPLATE_INJECTION:          "medium",
  SCRIPT_TAG_INJECTION:        "high",
  DESTRUCTIVE:                 "high",
};

const SEVERITY_ORDER: Severity[] = ["none", "low", "medium", "high"];

const UNICODE_LABELS: Record<string, string> = {
  U200B: "zero-width space (ZWSP)",
  U200C: "zero-width non-joiner (ZWNJ)",
  U200D: "zero-width joiner (ZWJ)",
  UFEFF: "byte order mark (BOM)",
  U202E: "right-to-left override (RLO)",
  U202D: "left-to-right override (LRO)",
};

export function worstSeverity(flags: string[]): Severity {
  return flags.reduce<Severity>((worst, f) => {
    const cat = SEVERITY_RANK[f] ?? SEVERITY_RANK[f.replace(/_[A-Z0-9]+$/, "")] ?? "low";
    return SEVERITY_ORDER.indexOf(cat) > SEVERITY_ORDER.indexOf(worst) ? cat : worst;
  }, "none");
}

export function composeReason(flags: string[]): string {
  if (flags.length === 0) return "No threats detected.";
  const unique = [...new Set(flags)];
  const parts = unique.map((f) => {
    if (f.startsWith("INVISIBLE_UNICODE_")) {
      const code = f.replace("INVISIBLE_UNICODE_", "");
      return `${f} (${UNICODE_LABELS[code] ?? code})`;
    }
    return f.replace(/_/g, " ").toLowerCase();
  });
  if (parts.length === 1) return `Flagged: ${parts[0]}.`;
  const last = parts.pop()!;
  return `Flagged: ${parts.join(", ")}, and ${last}.`;
}

// ---------------------------------------------------------------------------
// Core scanner
// ---------------------------------------------------------------------------

/**
 * Scans a single message body for prompt injection threats.
 */
export function scanMessage(message: string): ScanResult {
  if (typeof message !== "string") {
    return { clean: true, flags: [], severity: "none", reason: "Non-string input — treated as clean." };
  }

  const flags: string[] = [];

  // 1. Invisible unicode
  for (const [char, code] of INVISIBLE_UNICODE) {
    if (message.includes(char)) flags.push(`INVISIBLE_UNICODE_${code}`);
  }

  // 2. Instruction override patterns
  for (const { pattern, flag } of INSTRUCTION_PATTERNS) {
    if (pattern.test(message)) flags.push(flag);
  }

  // 3. Base64-encoded strings (3+ groups of 4, with padding, ≥16 chars)
  const base64Re = /(?:[A-Za-z0-9+/]{4}){3,}[A-Za-z0-9+/]*={0,2}/;
  if (base64Re.test(message)) {
    const matches = message.match(new RegExp(base64Re.source, "g")) ?? [];
    for (const m of matches) {
      if (m.length >= 16 && /=+$/.test(m)) { flags.push("BASE64_PAYLOAD"); break; }
    }
  }

  // 4. Recursive / template injection markers
  for (const { pattern, flag } of RECURSIVE_PATTERNS) {
    if (pattern.test(message)) flags.push(flag);
  }

  // 5. Destructive command hints
  for (const { pattern, flag } of DESTRUCTIVE_PATTERNS) {
    if (pattern.test(message)) flags.push(`DESTRUCTIVE_${flag}`);
  }

  const uniqueFlags = [...new Set(flags)];
  return {
    clean: uniqueFlags.length === 0,
    flags: uniqueFlags,
    severity: worstSeverity(uniqueFlags),
    reason: composeReason(uniqueFlags),
  };
}

/**
 * Scan multiple messages at once.
 */
export function scanMessages(messages: MessageEntry[]): Map<string, ScanResult> {
  const results = new Map<string, ScanResult>();
  for (const msg of messages) results.set(msg.id, scanMessage(msg.body));
  return results;
}

/**
 * Return only clean messages from a list.
 */
export function filterCleanMessages(messages: MessageEntry[]): MessageEntry[] {
  return messages.filter((msg) => scanMessage(msg.body).clean);
}
