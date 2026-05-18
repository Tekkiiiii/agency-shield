---
marp: true
theme: default
paginate: true
backgroundColor: #0f172a
color: #e2e8f0
style: |
  section {
    font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
    background-color: #0f172a;
    color: #e2e8f0;
    padding: 60px 80px;
  }
  h1 {
    color: #22d3ee;
    font-size: 2.4em;
    font-weight: 800;
    letter-spacing: -0.02em;
    margin-bottom: 0.3em;
  }
  h2 {
    color: #22d3ee;
    font-size: 1.6em;
    font-weight: 700;
    border-bottom: 2px solid #1e3a5f;
    padding-bottom: 0.3em;
    margin-bottom: 0.6em;
  }
  h3 {
    color: #94a3b8;
    font-size: 1.1em;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 0.5em;
  }
  p {
    color: #cbd5e1;
    line-height: 1.6;
  }
  ul {
    color: #cbd5e1;
    line-height: 1.8;
  }
  li {
    margin-bottom: 0.2em;
  }
  strong {
    color: #f1f5f9;
    font-weight: 700;
  }
  code {
    background: #1e293b;
    color: #67e8f9;
    padding: 0.15em 0.4em;
    border-radius: 4px;
    font-size: 0.85em;
  }
  pre {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 8px;
    padding: 1.2em;
  }
  pre code {
    background: transparent;
    padding: 0;
    font-size: 0.8em;
    line-height: 1.6;
    color: #e2e8f0;
  }
  .accent { color: #22d3ee; }
  .warn { color: #fb923c; }
  .danger { color: #f87171; }
  .success { color: #4ade80; }
  section.lead {
    text-align: center;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  section.lead h1 {
    font-size: 3.2em;
    margin-bottom: 0.2em;
  }
  section.split {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 60px;
    align-items: start;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85em;
    margin-top: 1em;
  }
  th {
    background: #1e3a5f;
    color: #22d3ee;
    padding: 0.6em 1em;
    text-align: left;
    font-weight: 700;
  }
  td {
    padding: 0.5em 1em;
    border-bottom: 1px solid #1e293b;
    color: #cbd5e1;
  }
  tr:nth-child(even) td {
    background: #0f1e31;
  }
  footer {
    color: #475569;
    font-size: 0.65em;
  }
---

<!-- _class: lead -->

# Agency<span class="accent">Shield</span>

### Enterprise Governance Layer for Multi-Agent AI Systems

**TechEx Intelligent Enterprise Solutions Hackathon 2026**
Track 1 — Agent Security & AI Governance · Powered by Veea

---

## The Blind Spot in Enterprise AI Security

Every security tool secures the **LLM call**. Nobody secures what happens **between agents**.

- Agent A impersonates Agent B to escalate privileges
- A compromised worker spawns 50 sub-agents — **fork bomb**
- Prompt injection travels **agent-to-agent**, invisible to API-layer DPI
- A runaway agent loop burns $5,000 before anyone notices
- An invoice processor calls `execute_code` without authorization

These attacks happen at the **orchestration layer** — above the LLM, below the radar.

> **Current tools secure the floor. Agency Shield secures the ceiling.**

---

## Defense in Depth: Two Layers

```
[AI Agents] ──→ [Lobster Trap DPI] ──→ [LLM Backend]
     │                │
     │         LLM-layer firewall
     │         (prompt injection, PII,
     │          exfiltration at API level)
     │
     ▼
[Agency Shield Governance Engine]
     │  ORCHESTRATION-LAYER firewall
     ├── Tool Access Control
     ├── Message Scanner (inter-agent)
     ├── Policy Engine (8 rules)
     ├── Delegation Guard
     ├── Cost Circuit Breakers
     └── Audit Logger
```

**Lobster Trap** (Veea) handles LLM-layer threats.
**Agency Shield** handles everything above it.

---

## The Governance Engine

### Six security subsystems working together

**Prompt Injection Shield** — Scans every inter-agent message for invisible unicode, base64 payloads, instruction overrides, PII exfiltration patterns, and destructive commands. Catches attacks that travel agent-to-agent.

**Tool Access Control** — Three-tier permission model: `opus` leaders (32 tools), `sonnet` coordinators (20 tools), `haiku` workers (8 tools). Hard-blocked tools cannot be called by any tier. Restricted tools require explicit capability flags granted by a leader.

**Policy Engine** — 8 configurable rules. Actions: `ALLOW`, `DENY`, `LOG`, `HUMAN_REVIEW`, `QUARANTINE`, `RATE_LIMIT`. Rules fire on tool sequences, cross-department escalations, cost thresholds, and delegation chains.

---

## The Governance Engine (continued)

**Cost Circuit Breakers** — Per-agent token budgets with automatic cutoff. Anomalous spend is flagged before it becomes a billing incident. The demo scenario shows $847 saved by circuit breaker intervention across a 30-agent simulation.

**Delegation Guard** — Fork bomb protection. Enforces max delegation depth (3 levels) and rate limits on agent spawning. `haiku`-tier workers cannot spawn sub-agents without explicit authorization from an `opus` leader.

**Audit Trail** — Tamper-evident log of every governance decision: actor, target, timestamp, policy rule ID, action, evidence, and result. Built for enterprise compliance — every DENY has a paper trail.

---

## The Dashboard

Real-time governance visibility across 30 agents in 10 departments.

| Panel | What It Shows |
|-------|--------------|
| **Stats Row** | Active threats, injections caught, tools blocked, cost saved, compliance % |
| **Live Feed** | Real-time event stream from both security layers, filterable |
| **Agent Hierarchy** | All 30 agents, their tier, role, department, status, permission count |
| **Audit Trail** | Chronological log, filterable by result (allowed / denied / escalated) |
| **Policy Manager** | 8 rules with hit counts, enable/disable toggles, action labels |

Both **Agency Shield** events (orchestration-layer) and **Lobster Trap DPI** events (LLM-layer) appear in a unified feed — defense-in-depth, visible in one place.

---

## Demo Scenario: A Compromised Agent Workflow

**Step 1** — `invoice-processor` (haiku-tier) calls `execute_code`
- Agency Shield: tool access control fires — **DENIED**
- Audit entry created with policy reference `pol-002`

**Step 2** — `social-writer` sends a message with invisible unicode injection
- Lobster Trap DPI: pattern match fires — **QUARANTINED**
- Message never reaches the target agent

**Step 3** — `budget-monitor` exceeds its $50 token budget
- Cost circuit breaker fires — **RATE_LIMITED**
- $47 in estimated overspend prevented

**Step 4** — Unauthorized cross-department delegation attempt
- Delegation guard: depth limit enforced — **DENIED**
- Human review escalation logged

---

## Why Agency Shield Wins

| Capability | AgentGuard | Policy-Guard | WarRoom | Agency Shield |
|-----------|-----------|-------------|---------|--------------|
| LLM-layer DPI | Yes | Yes | No | **Yes (Lobster Trap)** |
| Orchestration-layer governance | No | No | Partial | **Yes** |
| Multi-agent permission model | No | Partial | No | **Yes (3-tier)** |
| Cost circuit breakers | No | No | No | **Yes** |
| Fork bomb / delegation guard | No | No | No | **Yes** |
| Inter-agent message scanning | No | No | No | **Yes** |
| Real-time unified dashboard | Yes | No | Yes | **Yes** |
| Audit trail | Partial | Yes | No | **Yes** |

---

## Business Value

### For any enterprise running multi-agent AI systems

**Risk reduction** — Governance stops privilege escalation, prompt injection, and unauthorized tool use before they cause damage. Not after.

**Cost control** — Circuit breakers prevent runaway agent loops from generating $10,000+ LLM bills. Every token budget has a hard ceiling.

**Compliance** — Tamper-evident audit trails answer the regulator's question: "What did your AI system do, and why?" Every action has a policy reference and evidence hash.

**Operational visibility** — 30 agents across 10 departments, visible in one dashboard. Security and compliance teams see the same data in real time.

> **The enterprise AI market is racing toward multi-agent deployments.**
> Governance infrastructure is the prerequisite, not the afterthought.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router) + TypeScript |
| UI | shadcn/ui + Tailwind CSS v4 |
| LLM Proxy | Lobster Trap (Veea, MIT-licensed Go binary) |
| Governance Engine | Custom TypeScript library (adapted from production system) |
| Deployment | Vercel |
| License | MIT |

The governance engine code in `governance-engine/` is adapted from a production multi-agent orchestration system — this is not a demo prototype, it is production logic brought to a hackathon.

---

<!-- _class: lead -->

## Agency<span class="accent">Shield</span>

**Defense in depth for multi-agent AI.**
From the LLM call to the orchestration layer.

**Demo**: agency-shield-demo.vercel.app

**GitHub**: github.com/Tekkiiiii/agency-shield

MIT Licensed · TechEx Hackathon 2026 · Track 1: Agent Security & AI Governance
