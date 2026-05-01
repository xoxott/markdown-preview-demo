/** RemoteAgentTask — 远程Agent执行（通过Mailbox发送任务+接收结果） */

import type { TaskDefinition } from '../types/task';
import type {
  TaskExecutionContext,
  TaskResult,
  TaskType,
  TaskTypeIdentifier
} from '../types/task-executor';
import type { MailboxMessage, StructuredMessage } from '../types/mailbox';

/** 远程Agent任务类型 — 通过Mailbox发送任务到远程Worker并等待结果 */
export class RemoteAgentTask implements TaskType {
  readonly identifier: TaskTypeIdentifier = 'remote_agent';
  readonly description = 'Remote agent execution via Mailbox send/receive';

  async execute(task: TaskDefinition, context: TaskExecutionContext): Promise<TaskResult> {
    const startTime = Date.now();

    if (!context.mailbox) {
      return {
        taskId: task.taskId,
        success: false,
        output: '',
        error: 'RemoteAgentTask: no Mailbox in context',
        durationMs: Date.now() - startTime
      };
    }

    const workerName = task.owner ?? 'worker';

    // 发送任务到远程Worker
    const message: MailboxMessage = {
      messageId: `remote_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      from: 'coordinator',
      to: workerName,
      content: {
        type: 'task_assignment',
        payload: { prompt: task.subject, taskId: task.taskId, description: task.description }
      },
      timestamp: Date.now(),
      summary: task.subject
    };

    await context.mailbox.send(message);

    // 等待结果 — 通过mailbox.receive
    // 设置超时（默认30秒）
    const timeoutMs = (task.metadata?.timeoutMs as number) ?? 30_000;
    const deadline = Date.now() + timeoutMs;

    let resultMessage: MailboxMessage | undefined;
    while (Date.now() < deadline) {
      const received = await context.mailbox.receive('coordinator');
      // 查找匹配taskId的结果
      resultMessage = received.find(m => {
        if (typeof m.content !== 'object' || m.content === null) return false;
        const content = m.content as StructuredMessage;
        return content.type === 'task_result' && (content.payload as any)?.taskId === task.taskId;
      });
      if (resultMessage) break;

      // 等待一小段时间再轮询
      await new Promise(resolve => { setTimeout(resolve, 500); });
    }

    if (!resultMessage) {
      return {
        taskId: task.taskId,
        success: false,
        output: '',
        error: `RemoteAgentTask: timeout waiting for result from ${workerName} (${timeoutMs}ms)`,
        durationMs: Date.now() - startTime
      };
    }

    const content =
      typeof resultMessage.content === 'object'
        ? (resultMessage.content as StructuredMessage)
        : null;
    const payload = content?.payload as any;
    return {
      taskId: task.taskId,
      success: payload?.success ?? true,
      output: payload?.output ?? resultMessage.summary ?? '',
      error: payload?.error,
      durationMs: Date.now() - startTime
    };
  }
}
