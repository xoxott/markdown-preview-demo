/** PTLTokenGapParser 测试 — 从 API 413 错误消息解析精确 token 溢出量 */

import { describe, expect, it } from 'vitest';
import { parsePTLTokenGap } from '../core/PTLTokenGapParser';
import { extractApiError } from '../core/ReactiveCompactRecovery';

describe('PTLTokenGapParser', () => {
  describe('parsePTLTokenGap', () => {
    it('应解析 "prompt is too long: X tokens > Y maximum" 格式', () => {
      const error = {
        statusCode: 413,
        message: 'prompt is too long: 150000 tokens > 200000 maximum'
      };

      const result = parsePTLTokenGap(error);
      expect(result.promptTokens).toBe(150000);
      expect(result.maxTokens).toBe(200000);
      expect(result.tokenGap).toBe(-50000); // 150000 - 200000 = -50000 (实际未超)
    });

    it('应解析 "Prompt is too long: X tokens, max Y" 格式', () => {
      const error = {
        statusCode: 413,
        message: 'Prompt is too long: 210000 tokens, max 200000'
      };

      const result = parsePTLTokenGap(error);
      expect(result.promptTokens).toBe(210000);
      expect(result.maxTokens).toBe(200000);
      expect(result.tokenGap).toBe(10000); // 需释放 10000 tokens
    });

    it('应解析嵌套 error.message 格式', () => {
      const error = {
        statusCode: 413,
        error: {
          type: 'invalid_request_error',
          message: 'prompt is too long: 250000 tokens > 200000 maximum'
        }
      };

      const result = parsePTLTokenGap(error);
      expect(result.promptTokens).toBe(250000);
      expect(result.maxTokens).toBe(200000);
      expect(result.tokenGap).toBe(50000);
    });

    it('应解析 "X tokens > Y" 简洁格式', () => {
      const error = {
        statusCode: 413,
        message: '230000 tokens > 200000'
      };

      const result = parsePTLTokenGap(error);
      expect(result.promptTokens).toBe(230000);
      expect(result.maxTokens).toBe(200000);
      expect(result.tokenGap).toBe(30000);
    });

    it('无法解析时应返回空结果', () => {
      const error = {
        statusCode: 413,
        message: 'Request too large'
      };

      const result = parsePTLTokenGap(error);
      expect(result.promptTokens).toBeUndefined();
      expect(result.maxTokens).toBeUndefined();
      expect(result.tokenGap).toBeUndefined();
    });

    it('应从纯字符串错误中解析', () => {
      const result = parsePTLTokenGap('prompt is too long: 220000 tokens > 200000 maximum');
      expect(result.promptTokens).toBe(220000);
      expect(result.maxTokens).toBe(200000);
      expect(result.tokenGap).toBe(20000);
    });
  });

  describe('extractApiError 集成', () => {
    it('extractApiError 应包含 PTL token gap 信息', () => {
      const error = {
        statusCode: 413,
        message: 'prompt is too long: 250000 tokens > 200000 maximum'
      };

      const apiError = extractApiError(error);
      expect(apiError.statusCode).toBe(413);
      expect(apiError.promptTokens).toBe(250000);
      expect(apiError.maxTokens).toBe(200000);
      expect(apiError.tokenGap).toBe(50000);
    });

    it('extractApiError 对无可解析消息时应不含 token gap', () => {
      const error = {
        statusCode: 413,
        message: 'Too many tokens'
      };

      const apiError = extractApiError(error);
      expect(apiError.statusCode).toBe(413);
      expect(apiError.promptTokens).toBeUndefined();
      expect(apiError.tokenGap).toBeUndefined();
    });
  });
});
