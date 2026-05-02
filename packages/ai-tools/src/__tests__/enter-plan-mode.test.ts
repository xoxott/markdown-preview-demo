/** @suga/ai-tools — EnterPlanModeTool测试 */

import { describe, expect, it } from 'vitest';
import type { ToolRegistry } from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { EnterPlanModeInput } from '../types/tool-inputs';
import { InMemoryPlanModeProvider } from '../provider/InMemoryPlanModeProvider';
import { enterPlanModeTool } from '../tools/enter-plan-mode';

function createContext(provider?: InMemoryPlanModeProvider): ExtendedToolUseContext {
  const planModeProvider = provider ?? new InMemoryPlanModeProvider();
  return {
    abortController: new AbortController(),
    tools: {} as ToolRegistry,
    sessionId: 'test',
    fsProvider: {} as any,
    planModeProvider
  };
}

describe('EnterPlanModeTool', () => {
  it('enter → 成功切换到plan模式', async () => {
    const provider = new InMemoryPlanModeProvider();
    const result = await enterPlanModeTool.call({} as EnterPlanModeInput, createContext(provider));
    expect(result.data.success).toBe(true);
    expect(result.data.currentMode).toBe('plan');
    expect(provider.isInPlanMode()).toBe(true);
  });

  it('enter(已在plan模式) → 返回已有状态', async () => {
    const provider = new InMemoryPlanModeProvider();
    await provider.enterPlanMode();
    const result = await enterPlanModeTool.call({} as EnterPlanModeInput, createContext(provider));
    expect(result.data.currentMode).toBe('plan');
    expect(result.data.message).toContain('Already');
  });

  it('enter(无provider) → 返回错误', async () => {
    const result = await enterPlanModeTool.call(
      {} as EnterPlanModeInput,
      {
        abortController: new AbortController(),
        tools: {} as ToolRegistry,
        sessionId: 'test',
        fsProvider: {} as any
      } as ExtendedToolUseContext
    );
    expect(result.data.success).toBe(false);
  });

  it('isReadOnly → false', () => {
    expect(enterPlanModeTool.isReadOnly!({} as EnterPlanModeInput)).toBe(false);
  });

  it('safetyLabel → system', () => {
    expect(enterPlanModeTool.safetyLabel!({} as EnterPlanModeInput)).toBe('system');
  });

  it('checkPermissions → ask', () => {
    const ctx = createContext();
    const result = enterPlanModeTool.checkPermissions!({} as EnterPlanModeInput, ctx);
    expect(result.behavior).toBe('ask');
  });
});
