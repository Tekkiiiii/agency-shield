// blocked_tools.ts — Tool-level delegation guard policy for Hermes Phase 5.
//
// Phase 5 T5E2: Defines which tools are blocked at spawn level for untrusted
// child agents, and which agents are exempt from depth/guard checks entirely.
//
// Integration: Import classifyTool() and isInfrastructureExempt() into the
// SendMessage guard hook to gate delegation tool calls before they execute.

/**
 * System-level infrastructure agents that bypass delegation guardrails entirely.
 * These are explicitly approved by the parent AI for unrestricted spawning.
 * Never delegate to untrusted agents under these names.
 */
export const INFRASTRUCTURE_AGENTS: readonly string[] = [
  'paperclip-control-plane',
  'pd-status-loop',
  'project-expansion-scout',
] as const;

// ---------------------------------------------------------------------------
// Tool classification
// ---------------------------------------------------------------------------

/** Tools never permitted in child agent spawn payloads regardless of context. */
export const BLOCKED_TOOLS: readonly string[] = [
  'delegate_task',
  'Agent',        // tool name for spawning sub-agents
  'teams/spawn',
  'teams/create',
  'teams/delete',
] as const;

/** Tools that require an explicit capability flag to be permitted. */
export const RESTRICTED_TOOLS: readonly string[] = [
  'send_message',
  'execute_code',
  'mcp__plugin_figma__*',   // any Figma plugin tool
  'mcp__plugin_notion__*',  // any Notion plugin tool
  'mcp__plugin_slack__*',   // any Slack plugin tool
  'mcp__railway-mcp-server__*', // railway infrastructure
] as const;

export type BlockedToolName = typeof BLOCKED_TOOLS[number];
export type RestrictedToolName = typeof RESTRICTED_TOOLS[number];

// ---------------------------------------------------------------------------
// Classification helpers
// ---------------------------------------------------------------------------

/** True if the tool is unconditionally blocked for all child agents. */
export function isUniversallyBlocked(tool: string): boolean {
  if ((BLOCKED_TOOLS as readonly string[]).includes(tool)) return true;
  // Wildcard pattern match for blocked MCP namespaces
  if (tool.startsWith('mcp__plugin_figma__')) return true;
  if (tool.startsWith('mcp__railway-mcp-server__')) return true;
  return false;
}

/** True if the tool is restricted and requires an explicit capability flag. */
export function isConditionallyBlocked(tool: string): boolean {
  return (RESTRICTED_TOOLS as readonly string[]).includes(tool);
}

/**
 * Returns the classification of a tool in the delegation context.
 * Infrastructure agents bypass all restrictions regardless of tool class.
 */
export function classifyTool(tool: string): 'blocked' | 'restricted' | 'allowed' {
  if (isUniversallyBlocked(tool)) return 'blocked';
  if (isConditionallyBlocked(tool)) return 'restricted';
  return 'allowed';
}

/**
 * Whether a target agent bypasses tool restrictions entirely.
 * These are system-level infrastructure agents that the parent AI
 * has explicitly exempted from delegation guardrails.
 */
export function isInfrastructureExempt(agentName: string): boolean {
  return INFRASTRUCTURE_AGENTS.includes(agentName);
}

/**
 * Whether the given tool+target combo is allowed under the current policy.
 * Returns true for infrastructure agents regardless of tool.
 */
export function isToolAllowed(tool: string, targetAgent?: string): boolean {
  if (targetAgent && isInfrastructureExempt(targetAgent)) return true;
  return classifyTool(tool) !== 'blocked';
}

/**
 * Whether the given tool+target combo requires an explicit capability flag.
 */
export function requiresCapability(tool: string, targetAgent?: string): boolean {
  if (targetAgent && isInfrastructureExempt(targetAgent)) return false;
  return classifyTool(tool) === 'restricted';
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

if (require.main === module) {
  console.log('Blocked tools:', [...BLOCKED_TOOLS]);
  console.log('Restricted tools:', [...RESTRICTED_TOOLS]);
  console.log('Infrastructure agents:', INFRASTRUCTURE_AGENTS);
}
