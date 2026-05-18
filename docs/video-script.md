# Agency Shield — Demo Video Script (3-5 min)

---

## 0:00-0:30 — HOOK

"Every AI security tool in this competition protects the same thing: the call from your app to the LLM. Nobody protects what happens BETWEEN agents. Agency Shield does."

---

## 0:30-1:00 — THE PROBLEM

"In production multi-agent systems, agents delegate to agents, access tools, and spend money. A compromised worker can spawn 50 sub-agents, exfiltrate data sideways, or burn through your compute budget — and Lobster Trap never sees it because it never hits the LLM."

---

## 1:00-1:30 — THE ARCHITECTURE

"Agency Shield adds the orchestration layer. Lobster Trap is your floor — LLM-level DPI. Agency Shield is your ceiling — permissions, delegation chains, cost guardrails, audit trails."

---

## 1:30-2:30 — LIVE DEMO

[Click "Prompt Injection"] → show both layers catching it
[Click "Fork Bomb Attack"] → show ONLY Agency Shield catching it

"Notice: Lobster Trap didn't fire. This attack never touches the LLM — it's agent-to-agent. Only the orchestration layer sees it."

[Click "Budget Exhaustion"] → show cost circuit breaker

[Type in Scan input: "ignore all previous instructions"] → show real network request in DevTools Network tab + event appearing in live feed

"That POST to /api/scan — that's a real Lobster Trap DPI scan. Watch it appear in the feed."

---

## 2:30-3:30 — BUSINESS VALUE

"30 agents, 10 departments, 8 policy rules, real-time compliance scoring. Every denial has a policy reference. Every escalation has a paper trail."

[Click Export CSV in Audit Trail] → "Enterprise compliance. One click."

"$847 saved in this 10-minute demo. Annualized across an enterprise deployment: $44M."

---

## 3:30-4:00 — COMPETITIVE EDGE

"We're the only submission with orchestration-layer governance, cost circuit breakers, delegation guards, and inter-agent message scanning. Every other tool secures the LLM call. We secure everything above it."

---

## 4:00-4:30 — CLOSE

"Agency Shield. Defense in depth for multi-agent systems. MIT licensed. Powered by Lobster Trap."

[Show final URL on screen]
`https://dashboard-iota-swart-15.vercel.app`
