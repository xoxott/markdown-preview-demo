/** OpenAI API 类型定义测试 */

import { describe, expect, it } from 'vitest';
import type {
  OpenAIAdapterConfig,
  OpenAIAssistantMessage,
  OpenAIErrorResponse,
  OpenAIRequestBody,
  OpenAISystemMessage,
  OpenAIToolCallDelta,
  OpenAIToolDef,
  OpenAIToolMessage,
  OpenAIUsageInfo,
  OpenAIUserMessage
} from '../types/openai';
import { DEFAULT_OPENAI_MAX_TOKENS, DEFAULT_OPENAI_TIMEOUT } from '../types/openai';

describe('OpenAIAdapterConfig', () => {
  it('基本配置 → baseURL+apiKey+model', () => {
    const config: OpenAIAdapterConfig = {
      baseURL: 'https://api.openai.com',
      apiKey: 'sk-xxx',
      model: 'gpt-4o'
    };
    expect(config.baseURL).toBe('https://api.openai.com');
    expect(config.model).toBe('gpt-4o');
  });

  it('含 organization + customHeaders', () => {
    const config: OpenAIAdapterConfig = {
      baseURL: 'https://api.openai.com',
      apiKey: 'sk-xxx',
      model: 'gpt-4o',
      organization: 'org-xxx',
      customHeaders: { 'X-Custom': 'value' }
    };
    expect(config.organization).toBe('org-xxx');
    expect(config.customHeaders!['X-Custom']).toBe('value');
  });

  it('默认超时和最大 token 数', () => {
    expect(DEFAULT_OPENAI_TIMEOUT).toBe(60_000);
    expect(DEFAULT_OPENAI_MAX_TOKENS).toBe(4096);
  });
});

describe('OpenAIMessage 类型', () => {
  it('SystemMessage → role:system', () => {
    const msg: OpenAISystemMessage = { role: 'system', content: 'You are a helpful assistant' };
    expect(msg.role).toBe('system');
  });

  it('UserMessage → role:user + content', () => {
    const msg: OpenAIUserMessage = { role: 'user', content: 'Hello' };
    expect(msg.role).toBe('user');
    expect(msg.content).toBe('Hello');
  });

  it('UserMessage → content 数组', () => {
    const msg: OpenAIUserMessage = {
      role: 'user',
      content: [{ type: 'text', text: 'Hello' }]
    };
    expect(msg.content).toEqual([{ type: 'text', text: 'Hello' }]);
  });

  it('AssistantMessage → role:assistant + tool_calls', () => {
    const msg: OpenAIAssistantMessage = {
      role: 'assistant',
      content: null,
      tool_calls: [
        {
          id: 'call-1',
          type: 'function',
          function: { name: 'get_weather', arguments: '{"city":"SF"}' }
        }
      ]
    };
    expect(msg.tool_calls!.length).toBe(1);
    expect(msg.tool_calls![0].function.name).toBe('get_weather');
  });

  it('ToolMessage → role:tool + tool_call_id', () => {
    const msg: OpenAIToolMessage = {
      role: 'tool',
      tool_call_id: 'call-1',
      content: '72°F'
    };
    expect(msg.tool_call_id).toBe('call-1');
  });
});

describe('OpenAIToolDef', () => {
  it('工具定义 → name+description+parameters', () => {
    const tool: OpenAIToolDef = {
      type: 'function',
      function: {
        name: 'get_weather',
        description: 'Get weather for a city',
        parameters: { type: 'object', properties: { city: { type: 'string' } } }
      }
    };
    expect(tool.function.name).toBe('get_weather');
  });
});

describe('OpenAIToolCallDelta', () => {
  it('增量工具调用 → index+name+arguments', () => {
    const delta: OpenAIToolCallDelta = {
      index: 0,
      id: 'call-1',
      type: 'function',
      function: { name: 'get_weather', arguments: '{"city":' }
    };
    expect(delta.index).toBe(0);
    expect(delta.function!.arguments).toBe('{"city":');
  });
});

describe('OpenAIUsageInfo', () => {
  it('基本用量 → prompt+completion+total', () => {
    const usage: OpenAIUsageInfo = {
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150
    };
    expect(usage.prompt_tokens).toBe(100);
    expect(usage.total_tokens).toBe(150);
  });

  it('含缓存详情 → cached_tokens', () => {
    const usage: OpenAIUsageInfo = {
      prompt_tokens: 1000,
      completion_tokens: 200,
      total_tokens: 1200,
      prompt_tokens_details: { cached_tokens: 700 }
    };
    expect(usage.prompt_tokens_details!.cached_tokens).toBe(700);
  });

  it('含推理详情 → reasoning_tokens', () => {
    const usage: OpenAIUsageInfo = {
      prompt_tokens: 100,
      completion_tokens: 200,
      total_tokens: 300,
      completion_tokens_details: { reasoning_tokens: 100 }
    };
    expect(usage.completion_tokens_details!.reasoning_tokens).toBe(100);
  });
});

describe('OpenAIErrorResponse', () => {
  it('错误响应 → message+type+code', () => {
    const err: OpenAIErrorResponse = {
      error: {
        message: 'Rate limit exceeded',
        type: 'rate_limit_error',
        code: '429'
      }
    };
    expect(err.error.type).toBe('rate_limit_error');
    expect(err.error.code).toBe('429');
  });
});

describe('OpenAIRequestBody', () => {
  it('基本请求体 → model+messages', () => {
    const body: OpenAIRequestBody = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }]
    };
    expect(body.model).toBe('gpt-4o');
    expect(body.messages.length).toBe(1);
  });

  it('含 tools+stream+temperature', () => {
    const body: OpenAIRequestBody = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hello' }],
      tools: [
        {
          type: 'function',
          function: { name: 'search', description: 'Search', parameters: {} }
        }
      ],
      stream: true,
      temperature: 0.7
    };
    expect(body.tools!.length).toBe(1);
    expect(body.stream).toBe(true);
    expect(body.temperature).toBe(0.7);
  });
});
