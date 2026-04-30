/** transitionSerializer 测试 — LoopTransition 序列化/反序列化 */

import { describe, expect, it } from 'vitest';
import type { LoopTransition } from '@suga/ai-agent-loop';
import { deserializeTransition, serializeTransition } from '../serialize/transitionSerializer';
import type { SerializedLoopTransition } from '../types/serialized';

describe('transitionSerializer', () => {
  describe('serializeTransition', () => {
    it('next_turn → 直接复制', () => {
      const transition: LoopTransition = { type: 'next_turn' };
      const serialized = serializeTransition(transition);
      expect(serialized).toEqual({ type: 'next_turn' });
    });

    it('completed → 直接复制', () => {
      const transition: LoopTransition = { type: 'completed', reason: '对话结束' };
      const serialized = serializeTransition(transition);
      expect(serialized).toEqual({ type: 'completed', reason: '对话结束' });
    });

    it('aborted → 直接复制', () => {
      const transition: LoopTransition = { type: 'aborted', reason: '用户中断' };
      const serialized = serializeTransition(transition);
      expect(serialized).toEqual({ type: 'aborted', reason: '用户中断' });
    });

    it('max_turns → 直接复制', () => {
      const transition: LoopTransition = { type: 'max_turns', maxTurns: 10 };
      const serialized = serializeTransition(transition);
      expect(serialized).toEqual({ type: 'max_turns', maxTurns: 10 });
    });

    it('model_error → Error 对象转为 errorMessage + errorStack', () => {
      const error = new Error('API rate limit exceeded');
      const transition: LoopTransition = { type: 'model_error', error };
      const serialized = serializeTransition(transition);

      expect(serialized.type).toBe('model_error');
      if (serialized.type === 'model_error') {
        expect(serialized.errorMessage).toBe('API rate limit exceeded');
        expect(serialized.errorStack).toBeDefined();
        expect(serialized.errorStack).toContain('API rate limit exceeded');
      }
    });
  });

  describe('deserializeTransition', () => {
    it('next_turn → 直接还原', () => {
      const serialized: SerializedLoopTransition = { type: 'next_turn' };
      const transition = deserializeTransition(serialized);
      expect(transition).toEqual({ type: 'next_turn' });
    });

    it('completed → 直接还原', () => {
      const serialized: SerializedLoopTransition = { type: 'completed', reason: '对话结束' };
      const transition = deserializeTransition(serialized);
      expect(transition).toEqual({ type: 'completed', reason: '对话结束' });
    });

    it('aborted → 直接还原', () => {
      const serialized: SerializedLoopTransition = { type: 'aborted', reason: '用户中断' };
      const transition = deserializeTransition(serialized);
      expect(transition).toEqual({ type: 'aborted', reason: '用户中断' });
    });

    it('max_turns → 直接还原', () => {
      const serialized: SerializedLoopTransition = { type: 'max_turns', maxTurns: 10 };
      const transition = deserializeTransition(serialized);
      expect(transition).toEqual({ type: 'max_turns', maxTurns: 10 });
    });

    it('model_error → errorMessage 重建 Error 对象', () => {
      const serialized: SerializedLoopTransition = {
        type: 'model_error',
        errorMessage: 'API rate limit exceeded',
        errorStack: 'Error: API rate limit exceeded\n  at test.js:1:1'
      };
      const transition = deserializeTransition(serialized);

      expect(transition.type).toBe('model_error');
      if (transition.type === 'model_error') {
        expect(transition.error).toBeInstanceOf(Error);
        expect(transition.error.message).toBe('API rate limit exceeded');
        expect(transition.error.stack).toBe('Error: API rate limit exceeded\n  at test.js:1:1');
      }
    });

    it('model_error 无 errorStack → stack 保持默认', () => {
      const serialized: SerializedLoopTransition = {
        type: 'model_error',
        errorMessage: 'unknown error'
      };
      const transition = deserializeTransition(serialized);

      expect(transition.type).toBe('model_error');
      if (transition.type === 'model_error') {
        expect(transition.error.message).toBe('unknown error');
        expect(transition.error.stack).toBeDefined();
      }
    });
  });

  describe('序列化→反序列化 round-trip', () => {
    it('所有类型 round-trip 保持语义一致', () => {
      const transitions: LoopTransition[] = [
        { type: 'next_turn' },
        { type: 'completed', reason: '对话结束' },
        { type: 'aborted', reason: '中断' },
        { type: 'max_turns', maxTurns: 5 },
        { type: 'model_error', error: new Error('test error') }
      ];

      for (const transition of transitions) {
        const serialized = serializeTransition(transition);
        const deserialized = deserializeTransition(serialized);

        expect(deserialized.type).toBe(transition.type);

        if (transition.type === 'model_error' && deserialized.type === 'model_error') {
          expect(deserialized.error.message).toBe(transition.error.message);
        } else {
          expect(deserialized).toEqual(transition);
        }
      }
    });
  });
});
