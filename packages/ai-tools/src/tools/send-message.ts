/** SendMessageTool — Agent间消息路由 */

import { buildTool } from '@suga/ai-tool-core';
import type { PermissionResult, SafetyLabel, ToolResult } from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { SendMessageInput } from '../types/tool-inputs';
import type { SendMessageOutput } from '../types/tool-outputs';
import { SendMessageInputSchema } from '../types/tool-inputs';

export const sendMessageTool = buildTool<SendMessageInput, SendMessageOutput>({
  name: 'send-message',

  inputSchema: SendMessageInputSchema,

  description: async input =>
    typeof input.message === 'string'
      ? `Send message to ${input.to}: ${input.message.slice(0, 50)}`
      : `Send ${input.message.type} to ${input.to}`,

  isReadOnly: input => typeof input.message === 'string',
  isConcurrencySafe: () => false,
  safetyLabel: input =>
    typeof input.message === 'string'
      ? ('readonly' as SafetyLabel)
      : ('destructive' as SafetyLabel),
  isDestructive: input =>
    typeof input.message !== 'string' && input.message.type === 'shutdown_request',

  checkPermissions: (): PermissionResult => {
    return { behavior: 'allow' };
  },

  call: async (
    input: SendMessageInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<SendMessageOutput>> => {
    const mailbox = context.mailboxProvider;
    if (!mailbox) {
      return { data: { success: false, message: 'No MailboxProvider' } };
    }

    // 广播消息（to === '*')
    if (input.to === '*') {
      if (typeof input.message === 'string') {
        const result = await mailbox.broadcastMessage(input.message, input.summary);
        return { data: result };
      }
      return { data: { success: false, message: 'Cannot broadcast structured messages' } };
    }

    // 纯文本消息
    if (typeof input.message === 'string') {
      await mailbox.writeToMailbox(input.to, input.message, input.summary);
      return { data: { success: true, message: `Sent to ${input.to}`, recipient: input.to } };
    }

    // 结构化消息
    const result = await mailbox.sendStructuredMessage(input.to, input.message);
    return { data: result };
  },

  toAutoClassifierInput: (input: SendMessageInput) => ({
    toolName: 'send_message',
    input,
    safetyLabel: typeof input.message === 'string' ? 'readonly' : 'destructive',
    isReadOnly: typeof input.message === 'string',
    isDestructive: typeof input.message !== 'string' && input.message.type === 'shutdown_request'
  }),

  maxResultSizeChars: 10_000
});
