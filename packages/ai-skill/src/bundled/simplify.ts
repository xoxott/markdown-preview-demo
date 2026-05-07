/**
 * 内置 Skill: /simplify — 代码审查与清理
 *
 * 对齐 CC src/skills/bundled/simplify.ts。审查所有改动文件的复用性、质量、效率， 并修复发现的问题。通过并行 agent 提高审查覆盖度。
 */

import { registerBundledSkill } from './BundledSkill';

const SIMPLIFY_PROMPT = `# Simplify: Code Review and Cleanup

Review all changed files for reuse, quality, and efficiency. Fix any issues found.

## Phase 1: Identify Changes

Run \`git diff\` (or \`git diff HEAD\` if there are staged changes) to see what changed. If there are no git changes, review the most recently modified files that the user mentioned or that you edited earlier in this conversation.

## Phase 2: Launch Three Review Agents in Parallel

Use the Agent tool to launch all three agents concurrently in a single message. Pass each agent the full diff so it has the complete context.

### Agent 1: Code Reuse Review

For each change:

1. **Search for existing utilities and helpers** that could replace newly written code.
2. **Flag any new function that duplicates existing functionality.** Suggest the existing function to use instead.
3. **Flag any inline logic that could use an existing utility** — hand-rolled string manipulation, manual path handling, custom environment checks, ad-hoc type guards, and similar patterns are common candidates.

### Agent 2: Code Quality Review

Review the same changes for hacky patterns:

1. **Redundant state**
2. **Parameter sprawl**
3. **Copy-paste with slight variation**
4. **Leaky abstractions**
5. **Stringly-typed code**
6. **Unnecessary JSX nesting**
7. **Unnecessary comments**

### Agent 3: Efficiency Review

Review the same changes for efficiency:

1. **Unnecessary work**: redundant computations, repeated file reads, duplicate API calls, N+1 patterns
2. **Missed concurrency**: independent operations run sequentially
3. **Hot-path bloat**: new blocking work added to startup or per-request hot paths
4. **Recurring no-op updates**: state updates inside intervals/event handlers without change-detection
5. **Unnecessary existence checks**: pre-checking before operating (TOCTOU)
6. **Memory**: unbounded data structures, missing cleanup, event listener leaks
7. **Overly broad operations**

## Phase 3: Fix Issues

Wait for all three agents to complete. Aggregate findings and fix each issue directly. If a finding is a false positive or not worth addressing, note it and move on.

When done, briefly summarize what was fixed (or confirm the code was already clean).
`;

export function registerSimplifySkill(): void {
  registerBundledSkill({
    name: 'simplify',
    description:
      'Review changed code for reuse, quality, and efficiency, then fix any issues found.',
    userInvocable: true,
    async getPromptForCommand(args) {
      let prompt = SIMPLIFY_PROMPT;
      if (args) {
        prompt += `\n\n## Additional Focus\n\n${args}`;
      }
      return [{ type: 'text', text: prompt }];
    }
  });
}
