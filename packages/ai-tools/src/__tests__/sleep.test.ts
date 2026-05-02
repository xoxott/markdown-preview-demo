/** @suga/ai-tools — SleepTool测试 */

import { describe, expect, it } from 'vitest';
import type { SleepInput } from '../types/tool-inputs';
import { sleepTool } from '../tools/sleep';

describe('SleepTool', () => {
  it('sleep(正常duration) → 返回结果', async () => {
    const result = await sleepTool.call({ seconds: 5 } as SleepInput, {} as any);
    expect(result.data.slept).toBe(true);
    expect(result.data.seconds).toBe(5);
  });

  it('sleep(0秒) → 返回结果', async () => {
    const result = await sleepTool.call({ seconds: 0 } as SleepInput, {} as any);
    expect(result.data.slept).toBe(true);
    expect(result.data.seconds).toBe(0);
  });

  it('validateInput(负数) → deny', () => {
    const result = sleepTool.validateInput!({ seconds: -1 } as SleepInput, {} as any);
    expect(result.behavior).toBe('deny');
  });

  it('validateInput(超过300) → deny', () => {
    const result = sleepTool.validateInput!({ seconds: 301 } as SleepInput, {} as any);
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