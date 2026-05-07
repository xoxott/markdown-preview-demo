/**
 * 内置 Skill: /verify — 实施后验证
 *
 * 对齐 CC src/skills/bundled/verify.ts。在完成实现后，启动 verification 子代理 实际尝试破坏代码（运行测试、对抗性输入、边界条件等），返回
 * PASS/FAIL/PARTIAL。
 */

import { registerBundledSkill } from './BundledSkill';

const VERIFY_PROMPT = `# /verify — Verify implementation work

You just finished an implementation. Before declaring victory, run a verification subagent to actually try to break what you built.

## Step 1: Spawn the verification subagent

Use the Agent tool with \`subagent_type: 'verification'\`. Pass it everything it needs:
- The original user task description
- Files changed (paths)
- Brief description of approach taken
- Any plan file or spec it should compare against

The agent will run builds, tests, linters, and adversarial probes (concurrency, boundary values, idempotency, orphan operations) and return a verdict block ending with one of:
  VERDICT: PASS
  VERDICT: FAIL
  VERDICT: PARTIAL

## Step 2: Act on the verdict

- **PASS**: Report to the user with a 1-2 sentence summary of what was verified. Don't gold-plate.
- **FAIL**: The agent will give you exact errors. Fix them, then re-run /verify. Don't argue with the verdict — fix the issue.
- **PARTIAL**: Read the agent's notes about what couldn't be verified (no test framework, tool unavailable, etc.). Decide if you can fix the env issue or if the user should know about the limitation.

## Step 3: Be honest

Don't paste the verification report verbatim — it's long. Summarize:
- What was verified (list 2-3 key checks)
- What the verdict is
- Any caveats / things you couldn't verify

Most importantly: **don't spawn /verify with no real task to verify**. If the user just chatted ("hi", "thanks") or no edits were made, just respond directly without spawning the agent.
`;

export function registerVerifySkill(): void {
  registerBundledSkill({
    name: 'verify',
    description:
      'Spawn a verification subagent to test implementation work and report PASS/FAIL/PARTIAL with evidence.',
    userInvocable: true,
    agent: 'verification',
    async getPromptForCommand(args) {
      let prompt = VERIFY_PROMPT;
      if (args) {
        prompt += `\n\n## Additional context\n\n${args}`;
      }
      return [{ type: 'text', text: prompt }];
    }
  });
}
