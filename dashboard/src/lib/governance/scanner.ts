import type { ScanResult, Severity } from "./types";

const INVISIBLE_UNICODE: ReadonlyMap<string, string> = new Map([
  ["​", "U200B"],
  ["‌", "U200C"],
  ["‍", "U200D"],
  ["﻿", "UFEFF"],
  ["‮", "U202E"],
  ["‭", "U202D"],
]);

const INSTRUCTION_PATTERNS: ReadonlyArray<{ pattern: RegExp; flag: string }> = [
  { pattern: /ignore\s+(all\s+)?previous\s+instruction/i, flag: "INSTRUCTION_IGNORE_PREVIOUS" },
  { pattern: /disregard\s+(all\s+)?previous/i, flag: "INSTRUCTION_DISREGARD" },
  { pattern: /forget\s+your?\s+(system\s+)?instruction/i, flag: "INSTRUCTION_FORGET" },
  { pattern: /\byou\s+are\s+now\b/i, flag: "INSTRUCTION_YOU_ARE_NOW" },
  { pattern: /\bact\s+as\b/i, flag: "INSTRUCTION_ACT_AS" },
  { pattern: /\bsystem\s+prompt\b/i, flag: "INSTRUCTION_SYSTEM_PROMPT" },
  { pattern: /ignore\s+system/i, flag: "INSTRUCTION_IGNORE_SYSTEM" },
];

const EXFILTRATION_PATTERNS: ReadonlyArray<{ pattern: RegExp; flag: string }> = [
  { pattern: /fetch\s*\(\s*['"]https?:\/\//i, flag: "EXFIL_FETCH_URL" },
  { pattern: /curl\s+/i, flag: "EXFIL_CURL" },
  { pattern: /wget\s+/i, flag: "EXFIL_WGET" },
  { pattern: /send.*to.*external/i, flag: "EXFIL_EXTERNAL_SEND" },
  { pattern: /webhook.*url/i, flag: "EXFIL_WEBHOOK" },
];

const DESTRUCTIVE_PATTERNS: ReadonlyArray<{ pattern: RegExp; flag: string }> = [
  { pattern: /rm\s+-rf\b/, flag: "RM_RF" },
  { pattern: /delete\s+everything/i, flag: "DELETE_ALL" },
  { pattern: /drop\s+table/i, flag: "DROP_TABLE" },
  { pattern: /truncate\s+table/i, flag: "TRUNCATE_TABLE" },
  { pattern: /shutdown\s+--?force/i, flag: "SHUTDOWN_FORCE" },
];

const PII_PATTERNS: ReadonlyArray<{ pattern: RegExp; flag: string }> = [
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/, flag: "PII_SSN" },
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, flag: "PII_EMAIL" },
  { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, flag: "PII_CREDIT_CARD" },
  { pattern: /\b(password|secret|api.?key|token)\s*[:=]\s*\S+/i, flag: "PII_CREDENTIAL" },
];

const SEVERITY_RANK: Record<string, Severity> = {
  INSTRUCTION_IGNORE_PREVIOUS: "critical",
  INSTRUCTION_DISREGARD: "critical",
  INSTRUCTION_FORGET: "critical",
  INSTRUCTION_SYSTEM_PROMPT: "critical",
  INSTRUCTION_IGNORE_SYSTEM: "critical",
  INSTRUCTION_YOU_ARE_NOW: "high",
  INSTRUCTION_ACT_AS: "medium",
  EXFIL_FETCH_URL: "high",
  EXFIL_CURL: "high",
  EXFIL_EXTERNAL_SEND: "high",
  EXFIL_WEBHOOK: "high",
  INVISIBLE_UNICODE: "medium",
  BASE64_PAYLOAD: "medium",
  PII_SSN: "critical",
  PII_CREDIT_CARD: "critical",
  PII_CREDENTIAL: "high",
  PII_EMAIL: "medium",
  DESTRUCTIVE: "high",
};

const SEVERITY_ORDER: Severity[] = ["none", "low", "medium", "high", "critical"];

function worstSeverity(flags: string[]): Severity {
  return flags.reduce<Severity>((worst, f) => {
    const base = f.replace(/_[A-Z0-9]+$/, "");
    const cat = SEVERITY_RANK[f] ?? SEVERITY_RANK[base] ?? "low";
    return SEVERITY_ORDER.indexOf(cat) > SEVERITY_ORDER.indexOf(worst) ? cat : worst;
  }, "none");
}

export function scanMessage(message: string): ScanResult {
  if (typeof message !== "string" || !message.trim()) {
    return { clean: true, flags: [], severity: "none" };
  }

  const flags: string[] = [];

  for (const [char, code] of INVISIBLE_UNICODE) {
    if (message.includes(char)) flags.push(`INVISIBLE_UNICODE_${code}`);
  }

  for (const { pattern, flag } of INSTRUCTION_PATTERNS) {
    if (pattern.test(message)) flags.push(flag);
  }

  for (const { pattern, flag } of EXFILTRATION_PATTERNS) {
    if (pattern.test(message)) flags.push(flag);
  }

  for (const { pattern, flag } of DESTRUCTIVE_PATTERNS) {
    if (pattern.test(message)) flags.push(`DESTRUCTIVE_${flag}`);
  }

  for (const { pattern, flag } of PII_PATTERNS) {
    if (pattern.test(message)) flags.push(flag);
  }

  const base64Re = /(?:[A-Za-z0-9+/]{4}){3,}[A-Za-z0-9+/]*={0,2}/;
  if (base64Re.test(message)) {
    const matches = message.match(new RegExp(base64Re.source, "g")) ?? [];
    for (const m of matches) {
      if (m.length >= 16 && /=+$/.test(m)) { flags.push("BASE64_PAYLOAD"); break; }
    }
  }

  const uniqueFlags = [...new Set(flags)];
  return {
    clean: uniqueFlags.length === 0,
    flags: uniqueFlags,
    severity: worstSeverity(uniqueFlags),
    reason: uniqueFlags.length === 0
      ? "No threats detected."
      : `Flagged: ${uniqueFlags.join(", ")}.`,
  };
}
