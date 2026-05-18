# Agency Shield

**Enterprise Governance Layer for Multi-Agent AI Systems**

> Built for TechEx Intelligent Enterprise Solutions Hackathon 2026 — Track 1: Agent Security & AI Governance (Veea)

---

## The Problem

Every enterprise security tool secures single-agent LLM calls. But production multi-agent systems face threats that single-agent DPI cannot catch:

- Agent A impersonates Agent B to escalate privileges
- A compromised Haiku worker tries to spawn 50 sub-agents (fork bomb)
- An invoice-processing agent attempts to call `execute_code` without authorization
- Prompt injection travels **between agents**, not from user to LLM
- Cost spirals when no circuit breaker stops a runaway agent loop

These attacks happen at the **orchestration layer** — above the LLM, invisible to packet inspection.

## The Solution

Agency Shield is a defense-in-depth governance platform that operates at two layers:

```
[AI Agents] ──→ [Lobster Trap DPI Proxy] ──→ [LLM Backend]
     │                    │
     │              LLM-layer security:
     │              prompt injection, PII,
     │              exfiltration at API level
     │
     ▼
[Agency Shield Governance Engine]
     │
     ├── Tool Access Control      — blocked/restricted/allowed per agent tier
     ├── Message Scanner          — invisible unicode, base64, exfiltration patterns
     ├── Policy Engine            — 8 default rules, YAML-configurable
     ├── Delegation Guard         — prevents unauthorized agent spawning
     ├── Cost Circuit Breakers    — per-agent budget limits with auto-cutoff
     └── Audit Logger             — tamper-evident trail of every action
     │
     ▼
[Governance Dashboard]
     ├── Real-time Event Feed     — live governance events from both layers
     ├── Agent Hierarchy          — 30-agent org across 12 departments
     ├── Audit Trail              — filterable, sortable log
     ├── Policy Manager           — toggle rules, see hit counts
     └── Stats Dashboard          — threats blocked, cost saved, compliance %
```

**Lobster Trap** (Veea's MIT-licensed DPI proxy) handles LLM-layer security. **Agency Shield** handles everything above it — the orchestration layer that DPI cannot see.

Agency Shield implements the same detection patterns at the orchestration layer that Lobster Trap applies at the LLM layer. Together they create defense-in-depth: Lobster Trap catches LLM-layer attacks, Agency Shield catches orchestration-layer attacks that never reach the LLM.

## Live Demo

**Dashboard**: [https://dashboard-iota-swart-15.vercel.app](https://dashboard-iota-swart-15.vercel.app)

## Features

### Defense Layer 1: Lobster Trap DPI (LLM-layer)
- Declared-vs-detected intent inspection
- Prompt injection at the API boundary
- PII and exfiltration patterns in raw LLM calls

### Defense Layer 2: Agency Shield (Orchestration-layer)

**Prompt Injection Shield**
Scans inter-agent messages for invisible unicode, instruction overrides, base64-encoded payloads, PII exfiltration, and destructive commands. Catches attacks that travel agent-to-agent, not user-to-LLM.

**Tool Access Control**
Three-tier model: `opus` (leader, 32 permissions), `sonnet` (coordinator, 20 permissions), `haiku` (member, 8 permissions). Hard-blocked tools (e.g., `rm -rf`, `format_disk`) cannot be called by any tier. Restricted tools require explicit capability flags.

**Policy Engine**
8 default rules covering delegation limits, cross-department escalation, cost thresholds, suspicious tool sequences, and compliance logging. Each rule has configurable action: ALLOW, DENY, LOG, HUMAN_REVIEW, QUARANTINE, RATE_LIMIT.

**Cost Circuit Breakers**
Per-agent token budgets with automatic cutoff. Tracks tokens by agent tier, flags anomalous spend, and calculates total cost saved by intervention. Simulated $847 saved in the demo scenario.

**Delegation Guard**
Prevents fork bombs by enforcing max delegation depth (3 levels) and rate limits on agent spawning. Haiku-tier agents cannot spawn sub-agents without explicit authorization from an opus-tier leader.

**Audit Trail**
Every governance event is logged with: actor agent, target resource, timestamp, policy rule ID, action taken, evidence hash, and result. Filterable by result (allowed/denied/escalated).

## Architecture

```
dashboard/
├── src/
│   ├── app/
│   │   └── page.tsx                    # Single-page dashboard
│   ├── components/dashboard/
│   │   ├── DashboardShell.tsx          # Header + tabs layout
│   │   ├── StatsRow.tsx                # 6 KPI cards
│   │   ├── LiveFeed.tsx                # Real-time event stream
│   │   ├── AgentsTable.tsx             # Agent hierarchy + permissions
│   │   ├── AuditTrail.tsx              # Filterable audit log
│   │   ├── PoliciesPanel.tsx           # Policy rules + toggles
│   │   └── SeverityBadge.tsx           # Severity/action/source badges
│   └── lib/governance/
│       ├── types.ts                    # Full type system
│       ├── scanner.ts                  # Prompt injection scanner
│       ├── policy-engine.ts            # 8-rule policy engine
│       ├── simulator.ts                # Multi-agent event generator
│       ├── audit.ts                    # Audit trail logger
│       ├── cost-monitor.ts             # Cost circuit breakers
│       └── store.ts                    # React context + reducer
governance-engine/
├── guard/
│   ├── blocked_tools.ts                # Production tool access control
│   └── delegation_sink.ts             # Delegation guardrails
└── shield/
    ├── scan_message.ts                 # Production message scanner
    └── room_shield.ts                  # Room-level security
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router) + TypeScript |
| UI | shadcn/ui + Tailwind CSS v4 |
| LLM Proxy | Lobster Trap (Veea, Go binary) |
| Governance | Custom TypeScript library |
| Deploy | Vercel |
| License | MIT |

## Quick Start

```bash
git clone https://github.com/Tekkiiiii/agency-shield.git
cd agency-shield/dashboard
npm install
npm run dev
# Open http://localhost:3000
```

The dashboard starts a simulation automatically, generating realistic multi-agent governance events across 30 agents in 12 departments.

## Demo Scenario

The simulator runs a scripted scenario where:

1. A `haiku` invoice-processor tries to call `execute_code` — **blocked by Agency Shield** (tool access control)
2. A compromised `social-writer` agent sends a message with invisible unicode injection — **blocked by Lobster Trap DPI**
3. A `budget-monitor` agent exceeds its token budget — **cost circuit breaker fires**
4. An unauthorized cross-department delegation attempt is detected — **delegation guard blocks it**
5. A policy violation triggers human review escalation — **escalation event logged**

The Governance Dashboard shows all of this in real time across both security layers.

## Why Agency Shield Wins

| Feature | AgentGuard | Policy-Guard | Agency Shield |
|---------|-----------|-------------|--------------|
| LLM-layer DPI | Yes | Yes | Yes (Lobster Trap) |
| Orchestration-layer governance | No | No | Yes |
| Multi-agent permission model | No | Partial | Yes (3-tier) |
| Cost circuit breakers | No | No | Yes |
| Delegation guard / fork bomb protection | No | No | Yes |
| Inter-agent message scanning | No | No | Yes |
| Real-time dashboard | Yes | No | Yes |
| Audit trail | Partial | Yes | Yes |

## Hackathon Context

- **Event**: TechEx Intelligent Enterprise Solutions Hackathon (lablab.ai)
- **Track**: Track 1 — Agent Security & AI Governance (powered by Veea)
- **Deadline**: May 19, 2026

## License

MIT — see [LICENSE](LICENSE)
