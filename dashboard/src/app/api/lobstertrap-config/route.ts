import { NextResponse } from "next/server";

// Lobster Trap reference configuration for Agency Shield
// This shows how Lobster Trap would be deployed alongside Agency Shield
// Deploy with: lobstertrap serve -c lobstertrap.yaml
const LOBSTERTRAP_CONFIG = `# Agency Shield — Lobster Trap DPI Configuration
# Deploy with: lobstertrap serve -c lobstertrap.yaml
# Repo: https://github.com/veeainc/lobstertrap

server:
  listen: ":8080"
  upstream: "https://api.anthropic.com"
  log_level: info

policies:
  # Pattern 1: Instruction override injection
  - name: instruction-override
    pattern: "(?i)(ignore|disregard|forget).{0,30}(previous|prior|above|all).{0,30}(instructions|rules|guidelines|prompt)"
    action: DENY
    severity: critical
    log: true
    reason: "Prompt injection: instruction-override pattern detected"

  # Pattern 2: Invisible unicode exfiltration
  - name: invisible-unicode
    pattern: "[\\u200b-\\u200f\\u2060-\\u2064\\ufeff]"
    action: DENY
    severity: high
    log: true
    reason: "Invisible unicode characters detected — potential steganographic payload"

  # Pattern 3: Base64 payload injection
  - name: base64-payload
    pattern: "(?:[A-Za-z0-9+/]{40,}={0,2})"
    action: LOG
    severity: medium
    log: true
    reason: "Base64 payload detected — possible encoded instructions"

  # Pattern 4: PII detection (SSN)
  - name: pii-ssn
    pattern: "\\b(?!000|666|9\\d{2})\\d{3}-(?!00)\\d{2}-(?!0000)\\d{4}\\b"
    action: HUMAN_REVIEW
    severity: critical
    log: true
    reason: "PII: Social Security Number pattern detected"

  # Pattern 5: PII detection (credit card)
  - name: pii-credit-card
    pattern: "\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\\b"
    action: HUMAN_REVIEW
    severity: critical
    log: true
    reason: "PII: Credit card number pattern detected"

  # Pattern 6: External webhook exfiltration
  - name: exfil-webhook
    pattern: "(?i)(webhook|POST|curl|fetch).{0,60}(https?://)(?!api\\.anthropic\\.com)"
    action: DENY
    severity: high
    log: true
    reason: "Exfiltration attempt: outbound data POST to non-whitelisted domain"

  # Pattern 7: Declared vs detected intent mismatch
  - name: intent-mismatch
    declared_intent_field: "system.declared_intent"
    detected_via: "semantic-classifier-v2"
    confidence_threshold: 0.85
    action: LOG
    severity: medium
    log: true
    reason: "Declared intent does not match detected intent (semantic mismatch)"

  # Pattern 8: Fork bomb prevention (delegation chain)
  - name: fork-bomb-delegation
    pattern: "(?i)(spawn|create|delegate|fork).{0,30}(agent|worker|process|thread).{0,30}(multiple|many|all|unlimited)"
    action: DENY
    severity: critical
    log: true
    reason: "Potential fork bomb: bulk agent delegation pattern"

intent_classifier:
  enabled: true
  model: "local-classifier-v2"
  threshold: 0.85
  categories:
    - summarize
    - analyze
    - generate
    - exfiltrate
    - inject
    - override

audit:
  enabled: true
  output: "./lobstertrap-audit.jsonl"
  include_payload: false   # Never log raw prompt content in production
  rotate_daily: true

rate_limiting:
  enabled: true
  requests_per_minute: 60
  burst: 10
  per_agent: true

# Integration with Agency Shield governance engine
agency_shield:
  webhook: "http://localhost:3000/api/lobstertrap-events"
  events: [DENY, QUARANTINE, HUMAN_REVIEW]
  include_metadata: true
`;

export async function GET() {
  return new NextResponse(LOBSTERTRAP_CONFIG, {
    status: 200,
    headers: {
      "Content-Type": "text/yaml; charset=utf-8",
      "X-Agency-Shield": "lobstertrap-reference-config",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
