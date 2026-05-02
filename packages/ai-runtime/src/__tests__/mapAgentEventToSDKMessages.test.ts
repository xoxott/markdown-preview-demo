/** mapAgentEventToSDKMessages 测试 — AgentEvent → SDKMessage 映射 */

import { describe, expect, it } from 'vitest';
import type { AgentEvent, AgentMessage } from '@suga/ai-agent-loop';
import type { SDKMessage, SDKResultError, SDKResultSuccess } from '@suga/ai-sdk';
import {
  createSDKMapContext,
  mapAgentEventToSDKMessages,
  updateSDKMapContext
} from '../sdk/mapAgentEventToSDKMessages';
import type { SDKMapContext } from '../sdk/mapAgentEventToSDKMessages';

/** 辅助：只映射一个event并取首个SDKMessage */
function mapFirst(event: AgentEvent, ctx?: SDKMapContext): SDKMessage | undefined {
  const mapCtx = ctx ?? createSDKMapContext();
  const msgs = mapAgentEventToSDKMessages(event, mapCtx);
  return msgs[0];
}

describe('mapAgentEventToSDKMessages', () => {
  it('text_delta → SDKPartialAssistantMessage (content)', () => {
    const event: AgentEvent = { type: 'text_delta', delta: 'hello' };
    const msg = mapFirst(event);
    expect(msg).toBeDefined();
    expect(msg!.type).toBe('partial_assistant');
    expect((msg as any).message.content).toBe('hello');
  });

  it('thinking_delta → SDKPartialAssistantMessage (thinking)', () => {
    const event: AgentEvent = { type: 'thinking_delta', delta: '思考中' };
    const msg = mapFirst(event);
    expect(msg!.type).toBe('partial_assistant');
    expect((msg as any).message.thinking).toBe('思考中');
  });

  it('tool_use_start → SDKPartialAssistantMessage (toolUses)', () => {
    const event: AgentEvent = {
      type: 'tool_use_start',
      toolUse: { id: 'c1', name: 'Read', input: { path: '/foo' } }
    };
    const msg = mapFirst(event);
    expect(msg!.type).toBe('partial_assistant');
    expect((msg as any).message.toolUses).toHaveLength(1);
  });

  it('tool_result → SDKToolProgressMessage', () => {
    const event: AgentEvent = {
      type: 'tool_result',
      result: {
        id: 'tr1',
        role: 'tool_result',
        toolUseId: 'c1',
        toolName: 'Read',
        result: 'file content',
        isSuccess: true,
        timestamp: Date.now()
      }
    };
    const msg = mapFirst(event);
    expect(msg!.type).toBe('tool_progress');
    expect((msg as any).tool_use_id).toBe('c1');
    expect((msg as any).progress).toBe(100);
  });

  it('turn_start → SDKStatusMessage (running)', () => {
    const event: AgentEvent = { type: 'turn_start', turnCount: 0 };
    const msg = mapFirst(event);
    expect(msg!.type).toBe('status');
    expect((msg as any).status).toBe('running');
  });

  it('turn_end → 无SDKMessage', () => {
    const event: AgentEvent = { type: 'turn_end', turnCount: 1 };
    const msgs = mapAgentEventToSDKMessages(event, createSDKMapContext());
    expect(msgs).toHaveLength(0);
  });

  it('loop_end completed → SDKResultSuccess', () => {
    const ctx = createSDKMapContext();
    const event: AgentEvent = {
      type: 'loop_end',
      result: {
        type: 'completed',
        reason: '对话结束',
        messages: [] as readonly AgentMessage[]
      }
    };
    const msgs = mapAgentEventToSDKMessages(event, ctx);
    expect(msgs).toHaveLength(1);
    const resultMsg = msgs[0] as SDKResultSuccess;
    expect(resultMsg.type).toBe('result');
    expect(resultMsg.subtype).toBe('success');
    expect(resultMsg.result).toBe('对话结束');
    expect(resultMsg.is_error).toBe(false);
    expect(resultMsg.num_turns).toBeGreaterThan(0);
  });

  it('loop_end model_error → SDKResultError (error_api)', () => {
    const ctx = createSDKMapContext();
    const event: AgentEvent = {
      type: 'loop_end',
      result: {
        type: 'model_error',
        reason: 'API调用失败: timeout',
        messages: [] as readonly AgentMessage[]
      }
    };
    const msgs = mapAgentEventToSDKMessages(event, ctx);
    const resultMsg = msgs[0] as SDKResultError;
    expect(resultMsg.type).toBe('result');
    expect(resultMsg.subtype).toBe('error_api');
    expect(resultMsg.error).toBe('API调用失败: timeout');
  });

  it('loop_end aborted → SDKResultError (error_interrupt)', () => {
    const ctx = createSDKMapContext();
    const event: AgentEvent = {
      type: 'loop_end',
      result: {
        type: 'aborted',
        reason: '用户中断',
        messages: [] as readonly AgentMessage[]
      }
    };
    const msgs = mapAgentEventToSDKMessages(event, ctx);
    const resultMsg = msgs[0] as SDKResultError;
    expect(resultMsg.subtype).toBe('error_interrupt');
  });

  it('updateSDKMapContext — turn_start更新turnCount', () => {
    const ctx = createSDKMapContext();
    updateSDKMapContext(ctx, { type: 'turn_start', turnCount: 5 });
    expect(ctx.turnCount).toBe(5);
  });
});
