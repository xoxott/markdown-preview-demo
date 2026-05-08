/** @suga/ai-tools — SleepTool测试 */

import { describe, expect, it } from 'vitest';
import type { SleepInput } from '../types/tool-inputs';
import { sleepTool } from '../tools/sleep';
import { awaitedValidation, minimalToolUseContext } from './test-helpers';

describe('SleepTool', () => {
  it('sleep(正常duration) → 返回结果', async () => {
    const result = await sleepTool.call({ seconds: 5 } as SleepInput, minimalToolUseContext());
    expect(result.data.slept).toBe(true);
    expect(result.data.seconds).toBe(5);
  });

  it('sleep(0秒) → 返回结果', async () => {
    const result = await sleepTool.call({ seconds: 0 } as SleepInput, minimalToolUseContext());
    expect(result.data.slept).toBe(true);
    expect(result.data.seconds).toBe(0);
  });

  it('validateInput(负数) → deny', async () => {
    const result = await awaitedValidation(
      sleepTool.validateInput!({ seconds: -1 } as SleepInput, minimalToolUseContext())
    );
    expect(result.behavior).toBe('deny');
  });

  it('validateInput(超过300) → deny', async () => {
    const result = await awaitedValidation(
      sleepTool.validateInput!({ seconds: 301 } as SleepInput, minimalToolUseContext())
    );
    expect(result.behavior).toBe('deny');
  });

  it('isReadOnly → true', () => {
    expect(sleepTool.isReadOnly!({ seconds: 5 } as SleepInput)).toBe(true);
  });

  it('safetyLabel → readonly', () => {
    expect(sleepTool.safetyLabel!({ seconds: 5 } as SleepInput)).toBe('readonly');
  });

  it('isDestructive → false', () => {
    expect(sleepTool.isDestructive!({ seconds: 5 } as SleepInput)).toBe(false);
  });
});
