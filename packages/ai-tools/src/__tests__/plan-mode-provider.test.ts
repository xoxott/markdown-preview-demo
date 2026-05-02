/** @suga/ai-tools — InMemoryPlanModeProvider测试 */

import { describe, expect, it } from 'vitest';
import { InMemoryPlanModeProvider } from '../provider/InMemoryPlanModeProvider';

describe('InMemoryPlanModeProvider', () => {
  it('enterPlanMode → 切换到plan模式', async () => {
    const provider = new InMemoryPlanModeProvider();
    const result = await provider.enterPlanMode();
    expect(result.success).toBe(true);
    expect(result.currentMode).toBe('plan');
    expect(provider.isInPlanMode()).toBe(true);
  });

  it('exitPlanMode → 切换回default', async () => {
    const provider = new InMemoryPlanModeProvider();
    await provider.enterPlanMode();
    const result = await provider.exitPlanMode();
    expect(result.success).toBe(true);
    expect(result.currentMode).toBe('default');
    expect(provider.isInPlanMode()).toBe(false);
  });

  it('enterPlanMode(已在plan) → 返回Already', async () => {
    const provider = new InMemoryPlanModeProvider();
    await provider.enterPlanMode();
    const result = await provider.enterPlanMode();
    expect(result.message).toContain('Already');
  });

  it('exitPlanMode(不在plan) → 返回Already', async () => {
    const provider = new InMemoryPlanModeProvider();
    const result = await provider.exitPlanMode();
    expect(result.message).toContain('Already');
  });

  it('isInPlanMode → 默认false', () => {
    const provider = new InMemoryPlanModeProvider();
    expect(provider.isInPlanMode()).toBe(false);
  });

  it('reset → 重置为default', async () => {
    const provider = new InMemoryPlanModeProvider();
    await provider.enterPlanMode();
    provider.reset();
    expect(provider.isInPlanMode()).toBe(false);
  });
});
