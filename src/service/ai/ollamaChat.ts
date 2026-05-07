/**
 * Ollama OpenAI 兼容 Chat Completions（浏览器）— 多轮消息 + SSE 流式增量 不依赖 Node 端 ai-runtime，避免 Vite 打包
 * child_process。
 */

export type OllamaApiRole = 'system' | 'user' | 'assistant';

export interface OllamaChatMessage {
  role: OllamaApiRole;
  content: string;
}

/** 解析 Ollama / OpenAI 兼容 baseURL */
export function resolveOllamaBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_OLLAMA_BASE_URL as string | undefined;
  if (fromEnv?.trim()) {
    return fromEnv.trim().replace(/\/$/, '');
  }
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    return `${window.location.origin}/ollama`.replace(/\/$/, '');
  }
  return 'http://localhost:11434';
}

export function resolveOllamaModel(): string {
  const m = import.meta.env.VITE_OLLAMA_MODEL as string | undefined;
  return (m?.trim() || 'llama3').trim();
}

/** 流式对话：逐段产出 assistant 的文本增量（delta） */
export async function* streamOllamaChat(
  messages: readonly OllamaChatMessage[],
  options: { model: string; signal?: AbortSignal }
): AsyncGenerator<string, void, void> {
  const base = resolveOllamaBaseUrl();
  const url = `${base}/v1/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: options.model,
      messages,
      stream: true
    }),
    signal: options.signal
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Ollama ${response.status}: ${text || response.statusText}`);
  }

  const body = response.body;
  if (!body) {
    throw new Error('响应体不可读');
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') return;

        let json: {
          choices?: Array<{ delta?: { content?: string; reasoning_content?: string } }>;
        };
        try {
          json = JSON.parse(payload);
        } catch {
          continue;
        }

        const delta = json.choices?.[0]?.delta;
        const piece = delta?.content ?? delta?.reasoning_content;
        if (typeof piece === 'string' && piece.length > 0) {
          yield piece;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
