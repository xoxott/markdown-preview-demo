/** @suga/ai-tools — ExitPlanModeTool测试 */

import { describe, expect, it } from 'vitest';
import type { ToolRegistry } from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { ExitPlanModeInput } from '../types/tool-inputs';
import { InMemoryPlanModeProvider } from '../provider/InMemoryPlanModeProvider';
import { exitPlanModeTool } from '../tools/exit-plan-mode';

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

describe('ExitPlanModeTool', () => {
  it('exit(从plan模式) → 成功切换到default', async () => {
    const provider = new InMemoryPlanModeProvider();
    await provider.enterPlanMode();
    const result = await exitPlanModeTool.call({} as ExitPlanModeInput, createContext(provider));
    expect(result.data.success).toBe(true);
    expect(result.data.currentMode).toBe('default');
    expect(provider.isInPlanMode()).toBe(false);
  });

  it('exit(不在plan模式) → 返回已有状态', async () => {
    const provider = new InMemoryPlanModeProvider();
    const result = await exitPlanModeTool.call({} as ExitPlanModeInput, createContext(provider));
    expect(result.data.currentMode).toBe('default');
    expect(result.data.message).toContain('Already');
  });

  it('exit(无provider) → 返回错误', async () => {
    const result = await exitPlanModeTool.call(
      {} as ExitPlanModeInput,
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
    expect(exitPlanModeTool.isReadOnly!({} as ExitPlanModeInput)).toBe(false);
  });

  it('safetyLabel → system', () => {
    expect(exitPlanModeTool.safetyLabel!({} as ExitPlanModeInput)).toBe('system');
  });

  it('checkPermissions → ask', () => {
    const ctx = createContext();
    const result = exitPlanModeTool.checkPermissions!({} as ExitPlanModeInput, ctx);
    expect(result.behavior).toBe('ask');
  });
});
