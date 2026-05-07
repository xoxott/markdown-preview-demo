/**
 * 内置 Skill: /remember — 内存层审查与提升
 *
 * 对齐 CC src/skills/bundled/remember.ts。审查 auto-memory / CLAUDE.md / CLAUDE.local.md
 * 等多层内存，提议将适合的条目晋升到 CLAUDE.md / CLAUDE.local.md / 团队共享内存，并发现重复/过期/冲突。
 */

import { registerBundledSkill } from './BundledSkill';

const REMEMBER_PROMPT = `# Memory Review

## Goal
Review the user's memory landscape and produce a clear report of proposed changes, grouped by action type. Do NOT apply changes — present proposals for user approval.

## Steps

### 1. Gather all memory layers
Read CLAUDE.md and CLAUDE.local.md from the project root (if they exist). Your auto-memory content is already in your system prompt — review it there. Note which team memory sections exist, if any.

### 2. Classify each auto-memory entry
For each substantive entry in auto-memory, determine the best destination:

| Destination | What belongs there |
|---|---|
| **CLAUDE.md** | Project conventions and instructions for Claude that all contributors should follow |
| **CLAUDE.local.md** | Personal instructions for Claude specific to this user |
| **Team memory** | Org-wide knowledge that applies across repositories |
| **Stay in auto-memory** | Working notes, temporary context, or entries that don't clearly fit elsewhere |

**Important distinctions:**
- CLAUDE.md and CLAUDE.local.md contain instructions for Claude, not user preferences for external tools
- Workflow practices are ambiguous — ask the user whether they're personal or team-wide
- When unsure, ask rather than guess

### 3. Identify cleanup opportunities
Scan across all layers for:
- **Duplicates**: Auto-memory entries already captured elsewhere
- **Outdated**: Entries contradicted by newer auto-memory entries
- **Conflicts**: Contradictions between any two layers

### 4. Present the report
Output a structured report grouped by action type:
1. **Promotions** — entries to move, with destination and rationale
2. **Cleanup** — duplicates, outdated entries, conflicts to resolve
3. **Ambiguous** — entries where you need the user's input
4. **No action needed** — brief note on entries that should stay put

## Rules
- Present ALL proposals before making any changes
- Do NOT modify files without explicit user approval
- Do NOT create new files unless the target doesn't exist yet
- Ask about ambiguous entries — don't guess
`;

export function registerRememberSkill(): void {
  registerBundledSkill({
    name: 'remember',
    description:
      'Review auto-memory entries and propose promotions to CLAUDE.md, CLAUDE.local.md, or shared memory.',
    whenToUse: 'Use when the user wants to review, organize, or promote their auto-memory entries.',
    userInvocable: true,
    async getPromptForCommand(args) {
      let prompt = REMEMBER_PROMPT;
      if (args) {
        prompt += `\n## Additional context from user\n\n${args}`;
      }
      return [{ type: 'text', text: prompt }];
    }
  });
}
