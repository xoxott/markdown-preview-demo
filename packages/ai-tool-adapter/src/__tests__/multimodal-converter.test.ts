/** P82 测试 — 多模态图片发送支持（Anthropic + OpenAI 双路径） */

import { describe, expect, it } from 'vitest';
import type { UserContentPart, UserMessage } from '@suga/ai-agent-loop';
import type {
  AnthropicContentBlock,
  AnthropicImageBlock,
  AnthropicTextBlock
} from '../types/anthropic';
import type {
  OpenAIContentPart,
  OpenAIImagePart,
  OpenAITextPart,
  OpenAIUserMessage
} from '../types/openai';
import { convertToAnthropicMessages } from '../convert/message-converter';
import { convertToOpenAIMessages } from '../convert/openai-message-converter';

/** 辅助：创建纯文本用户消息 */
function createUserMsg(content: string): UserMessage {
  return { id: 'u1', role: 'user', content, timestamp: Date.now() };
}

/** 辅助：创建多模态用户消息（文本 + 图片） */
function createMultimodalUserMsg(parts: readonly UserContentPart[]): UserMessage {
  return { id: 'u2', role: 'user', content: parts, timestamp: Date.now() };
}

/** 辅助：从 AnthropicContentBlock[] 中获取文本块 */
function getAnthropicTextBlock(
  blocks: readonly AnthropicContentBlock[],
  index: number
): AnthropicTextBlock {
  return blocks[index] as AnthropicTextBlock;
}

/** 辅助：从 AnthropicContentBlock[] 中获取图片块 */
function getAnthropicImageBlock(
  blocks: readonly AnthropicContentBlock[],
  index: number
): AnthropicImageBlock {
  return blocks[index] as AnthropicImageBlock;
}

/** 辅助：从 OpenAIContentPart[] 中获取文本部分 */
function getOpenAITextPart(parts: readonly OpenAIContentPart[], index: number): OpenAITextPart {
  return parts[index] as OpenAITextPart;
}

/** 辅助：从 OpenAIContentPart[] 中获取图片部分 */
function getOpenAIImagePart(parts: readonly OpenAIContentPart[], index: number): OpenAIImagePart {
  return parts[index] as OpenAIImagePart;
}

// ============================================================
// Anthropic 多模态转换测试
// ============================================================

describe('convertToAnthropicMessages — 多模态', () => {
  it('纯文本用户消息 → 仍为 string content', () => {
    const messages = [createUserMsg('hello')];
    const result = convertToAnthropicMessages(messages);
    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('user');
    expect(result[0].content).toBe('hello');
  });

  it('多模态用户消息（text + base64 image） → Anthropic content block 数组', () => {
    const messages = [
      createMultimodalUserMsg([
        { type: 'text', text: '这张图片是什么？' },
        {
          type: 'image',
          source:
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          mediaType: 'image/png'
        }
      ])
    ];
    const result = convertToAnthropicMessages(messages);
    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('user');
    const content = result[0].content as readonly AnthropicContentBlock[];
    expect(content).toHaveLength(2);
    expect(content[0].type).toBe('text');
    expect(getAnthropicTextBlock(content, 0).text).toBe('这张图片是什么？');
    expect(content[1].type).toBe('image');
    const imageBlock = getAnthropicImageBlock(content, 1);
    expect(imageBlock.source.type).toBe('base64');
    expect(imageBlock.source.media_type).toBe('image/png');
    expect(imageBlock.source.data).toBe(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    );
  });

  it('多模态用户消息（text + URL image） → Anthropic url 模式', () => {
    const messages = [
      createMultimodalUserMsg([
        { type: 'text', text: '分析这张图片' },
        { type: 'image', source: 'https://example.com/photo.jpg', mediaType: 'image/jpeg' }
      ])
    ];
    const result = convertToAnthropicMessages(messages);
    const content = result[0].content as readonly AnthropicContentBlock[];
    expect(content).toHaveLength(2);
    const imageBlock = getAnthropicImageBlock(content, 1);
    expect(imageBlock.source.type).toBe('url');
    expect(imageBlock.source.url).toBe('https://example.com/photo.jpg');
    expect(imageBlock.source.media_type).toBe('image/jpeg');
  });

  it('base64 图片无 mediaType → 默认 image/png', () => {
    const messages = [createMultimodalUserMsg([{ type: 'image', source: 'abc123' }])];
    const result = convertToAnthropicMessages(messages);
    const content = result[0].content as readonly AnthropicContentBlock[];
    const imageBlock = getAnthropicImageBlock(content, 0);
    expect(imageBlock.source.media_type).toBe('image/png');
  });

  it('多模态 + assistant + tool_result → 消息序列正确', () => {
    const messages: import('@suga/ai-agent-loop').AgentMessage[] = [
      createMultimodalUserMsg([
        { type: 'text', text: '这张图片是什么？' },
        { type: 'image', source: 'https://example.com/img.png', mediaType: 'image/png' }
      ]),
      {
        id: 'a1',
        role: 'assistant',
        content: '这是一张风景图',
        toolUses: [],
        timestamp: Date.now()
      }
    ];
    const result = convertToAnthropicMessages(messages);
    expect(result).toHaveLength(2);
    expect(result[0].role).toBe('user');
    expect(result[1].role).toBe('assistant');
    const userContent = result[0].content as readonly AnthropicContentBlock[];
    expect(userContent).toHaveLength(2);
  });
});

// ============================================================
// OpenAI 多模态转换测试
// ============================================================

describe('convertToOpenAIMessages — 多模态', () => {
  it('纯文本用户消息 → 仍为 string content', () => {
    const messages = [createUserMsg('hello')];
    const result = convertToOpenAIMessages(messages);
    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('user');
    expect((result[0] as OpenAIUserMessage).content).toBe('hello');
  });

  it('多模态用户消息（text + base64 image） → OpenAI image_url data URI', () => {
    const messages = [
      createMultimodalUserMsg([
        { type: 'text', text: '这张图片是什么？' },
        {
          type: 'image',
          source: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ',
          mediaType: 'image/png'
        }
      ])
    ];
    const result = convertToOpenAIMessages(messages);
    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('user');
    const content = (result[0] as OpenAIUserMessage).content as readonly OpenAIContentPart[];
    expect(content).toHaveLength(2);
    expect(content[0].type).toBe('text');
    expect(getOpenAITextPart(content, 0).text).toBe('这张图片是什么？');
    expect(content[1].type).toBe('image_url');
    expect(getOpenAIImagePart(content, 1).image_url.url).toBe(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ'
    );
  });

  it('多模态用户消息（text + URL image） → OpenAI image_url 直接 URL', () => {
    const messages = [
      createMultimodalUserMsg([
        { type: 'text', text: '分析这张图片' },
        { type: 'image', source: 'https://example.com/photo.jpg', mediaType: 'image/jpeg' }
      ])
    ];
    const result = convertToOpenAIMessages(messages);
    const content = (result[0] as OpenAIUserMessage).content as readonly OpenAIContentPart[];
    expect(content).toHaveLength(2);
    expect(content[1].type).toBe('image_url');
    expect(getOpenAIImagePart(content, 1).image_url.url).toBe('https://example.com/photo.jpg');
  });

  it('base64 图片无 mediaType → 默认 image/png data URI', () => {
    const messages = [createMultimodalUserMsg([{ type: 'image', source: 'abc123def' }])];
    const result = convertToOpenAIMessages(messages);
    const content = (result[0] as OpenAIUserMessage).content as readonly OpenAIContentPart[];
    expect(content[0].type).toBe('image_url');
    expect(getOpenAIImagePart(content, 0).image_url.url).toBe('data:image/png;base64,abc123def');
  });

  it('多模态 + system prompt + tool_use → 完整对话流', () => {
    const messages: import('@suga/ai-agent-loop').AgentMessage[] = [
      createMultimodalUserMsg([
        { type: 'text', text: '描述这张图片' },
        { type: 'image', source: 'https://cdn.example.com/img.png', mediaType: 'image/png' }
      ]),
      {
        id: 'a1',
        role: 'assistant',
        content: '分析中',
        toolUses: [{ id: 'c1', name: 'vision', input: { action: 'describe' } }],
        timestamp: Date.now()
      },
      {
        id: 'r1',
        role: 'tool_result',
        toolUseId: 'c1',
        toolName: 'vision',
        result: '这是一张风景照片',
        isSuccess: true,
        timestamp: Date.now()
      }
    ];
    const result = convertToOpenAIMessages(messages);
    expect(result).toHaveLength(3);
    expect(result[0].role).toBe('user');
    expect(result[1].role).toBe('assistant');
    expect(result[2].role).toBe('tool');
    const userContent = (result[0] as OpenAIUserMessage).content as readonly OpenAIContentPart[];
    expect(userContent).toHaveLength(2);
  });

  it('http:// 开头 → URL 模式（而非 data URI）', () => {
    const messages = [
      createMultimodalUserMsg([
        { type: 'image', source: 'http://localhost:3000/test.png', mediaType: 'image/png' }
      ])
    ];
    const result = convertToOpenAIMessages(messages);
    const content = (result[0] as OpenAIUserMessage).content as readonly OpenAIContentPart[];
    expect(getOpenAIImagePart(content, 0).image_url.url).toBe('http://localhost:3000/test.png');
  });
});
