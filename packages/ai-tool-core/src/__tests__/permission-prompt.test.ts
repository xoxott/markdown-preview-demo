/** PermissionPrompt 类型 + resolvePermissionPrompt + bridgeCanUseToolFnResponse 测试 */

import { describe, expect, it } from 'vitest';
import type {
  PermissionPromptHandler,
  PermissionPromptRequest,
  PermissionPromptResponse
} from '../types/permission-prompt';
import {
  bridgeCanUseToolFnResponse,
  generatePromptRequestId,
  resolvePermissionPrompt
} from '../types/permission-prompt';
import type { DenialTrackingState } from '../types/permission-decision';
import { DEFAULT_DENIAL_TRACKING } from '../types/permission-decision';
import type { PermissionUpdate } from '../types/permission-context';

describe('PermissionPromptRequest 接口', () => {
  it('接口可被实现', () => {
    const request: PermissionPromptRequest = {
      requestId: generatePromptRequestId(),
      toolName: 'Bash',
      toolInput: { command: 'git push' },
      reason: 'ask_rule_match',
      message: 'Bash 需要确认',
      currentMode: 'default',
      consecutiveDenials: 0,
      totalDenials: 0
    };
    expect(request.toolName).toBe('Bash');
    expect(request.currentMode).toBe('default');
  });

  it('含 classifierSuggestion', () => {
    const request: PermissionPromptRequest = {
      requestId: 'prompt_test',
      toolName: 'Bash',
      toolInput: {},
      reason: 'classifier_ask',
      message: '分类器建议确认',
      currentMode: 'auto',
      classifierSuggestion: {
        behavior: 'ask',
        reason: '看起来像危险命令',
        confidence: 'medium'
      },
      consecutiveDenials: 2,
      totalDenials: 5
    };
    expect(request.classifierSuggestion?.behavior).toBe('ask');
  });
});

describe('PermissionPromptResponse 接口', () => {
  it('approve 一次性', () => {
    const response: PermissionPromptResponse = {
      behavior: 'approve'
    };
    expect(response.behavior).toBe('approve');
    expect(response.persistent).toBeUndefined();
  });

  it('approve persistent', () => {
    const response: PermissionPromptResponse = {
      behavior: 'approve',
      persistent: true,
      persistentTarget: 'session'
    };
    expect(response.persistent).toBe(true);
    expect(response.persistentTarget).toBe('session');
  });

  it('deny + feedback', () => {
    const response: PermissionPromptResponse = {
      behavior: 'deny',
      feedback: '不允许执行 rm 命令'
    };
    expect(response.behavior).toBe('deny');
    expect(response.feedback).toBe('不允许执行 rm 命令');
  });
});

describe('PermissionPromptHandler 接口', () => {
  it('接口可被宿主实现', () => {
    const handler: PermissionPromptHandler = {
      prompt: async request => ({
        behavior: request.consecutiveDenials && request.consecutiveDenials > 2 ? 'deny' : 'approve'
      })
    };
    expect(handler.prompt).toBeInstanceOf(Function);
  });
});

describe('resolvePermissionPrompt', () => {
  const baseRequest: PermissionPromptRequest = {
    requestId: 'prompt_test',
    toolName: 'Bash',
    toolInput: { command: 'git push' },
    reason: 'ask_rule_match',
    message: 'Bash(git push) 需要确认',
    currentMode: 'default'
  };

  it('deny → DenialTracking +1, finalBehavior=deny', () => {
    const response: PermissionPromptResponse = { behavior: 'deny' };
    const result = resolvePermissionPrompt(response, baseRequest, DEFAULT_DENIAL_TRACKING);
    expect(result.finalBehavior).toBe('deny');
    expect(result.denialTracking.consecutiveDenials).toBe(1);
    expect(result.denialTracking.totalDenials).toBe(1);
    expect(result.update).toBeUndefined();
  });

  it('approve 一次性 → undefined update, finalBehavior=allow, consecutive 清零', () => {
    const tracking: DenialTrackingState = {
      consecutiveDenials: 2,
      totalDenials: 5,
      shouldFallbackToPrompting: false
    };
    const response: PermissionPromptResponse = { behavior: 'approve' };
    const result = resolvePermissionPrompt(response, baseRequest, tracking);
    expect(result.finalBehavior).toBe('allow');
    expect(result.update).toBeUndefined();
    expect(result.denialTracking.consecutiveDenials).toBe(0);
    expect(result.denialTracking.totalDenials).toBe(5);
  });

  it('approve persistent session → addRules update', () => {
    const response: PermissionPromptResponse = {
      behavior: 'approve',
      persistent: true,
      persistentTarget: 'session'
    };
    const result = resolvePermissionPrompt(response, baseRequest, DEFAULT_DENIAL_TRACKING);
    expect(result.finalBehavior).toBe('allow');
    expect(result.update).toBeDefined();
    const update = result.update as PermissionUpdate;
    expect(update.type).toBe('addRules');
    if (update.type === 'addRules') {
      expect(update.rules).toHaveLength(1);
      expect(update.rules[0].ruleValue).toBe('Bash');
      expect(update.rules[0].source).toBe('session');
    }
  });

  it('approve persistent project → addRules + source=project', () => {
    const response: PermissionPromptResponse = {
      behavior: 'approve',
      persistent: true,
      persistentTarget: 'project'
    };
    const result = resolvePermissionPrompt(response, baseRequest, DEFAULT_DENIAL_TRACKING);
    const update = result.update as PermissionUpdate;
    if (update.type === 'addRules') {
      expect(update.rules[0].source).toBe('project');
    }
  });

  it('approve persistent user → addRules + source=user', () => {
    const response: PermissionPromptResponse = {
      behavior: 'approve',
      persistent: true,
      persistentTarget: 'user'
    };
    const result = resolvePermissionPrompt(response, baseRequest, DEFAULT_DENIAL_TRACKING);
    const update = result.update as PermissionUpdate;
    if (update.type === 'addRules') {
      expect(update.rules[0].source).toBe('user');
    }
  });

  it('approve persistent 无 target → fallback session', () => {
    const response: PermissionPromptResponse = { behavior: 'approve', persistent: true };
    const result = resolvePermissionPrompt(response, baseRequest, DEFAULT_DENIAL_TRACKING);
    const update = result.update as PermissionUpdate;
    if (update.type === 'addRules') {
      expect(update.rules[0].source).toBe('session');
    }
  });
});

describe('bridgeCanUseToolFnResponse', () => {
  it('true → approve 一次性', () => {
    const result = bridgeCanUseToolFnResponse(true);
    expect(result.behavior).toBe('approve');
    expect(result.persistent).toBeUndefined();
  });

  it('false → deny', () => {
    const result = bridgeCanUseToolFnResponse(false);
    expect(result.behavior).toBe('deny');
  });
});

describe('generatePromptRequestId', () => {
  it('生成唯一 ID — 格式 prompt_{ts}_{random}', () => {
    const id = generatePromptRequestId();
    expect(id).toMatch(/^prompt_\d+_[a-z0-9]+$/);
  });
});
