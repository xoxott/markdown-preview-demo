export async function callOllamaStream(
  prompt: string,
  onMessage: (token: string) => void,
  model = 'openChat',
  options: {
    signal?: AbortSignal;
    timeout?: number;
  } = {}
) {
  try {
    const controller = new AbortController();
    const timeoutId = options.timeout 
      ? setTimeout(() => controller.abort(), options.timeout)
      : null;

    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: true,
      }),
      signal: options.signal || controller.signal,
    });

    if (!res.ok) {
      throw new Error(`请求失败: ${res.status} ${res.statusText}`);
    }

    if (!res.body) {
      throw new Error('响应体不可读');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let isStreamEnded = false;

    const processChunk = async () => {
      try {
        while (!isStreamEnded) {
          const { done, value } = await reader.read();
          
          if (done) {
            isStreamEnded = true;
            // 处理缓冲区剩余数据
            if (buffer.trim()) {
              try {
                const json = JSON.parse(buffer);
                if (json.response) onMessage(json.response);
              } catch (e) {
                console.warn('流结束时的缓冲区解析失败:', buffer, e);
              }
            }
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          
          // 保留最后一个不完整行
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (!line.trim()) continue;
            
            try {
              const json = JSON.parse(line);
              if (json.done) {
                isStreamEnded = true;
                break;
              }
              console.log(json)
              if (json.response) {
                console.log(json)
                onMessage(json.response);
              }
            } catch (e) {
              console.warn('流响应解析失败:', line, e);
              // 尝试恢复：将错误行追加回缓冲区
              buffer = line + '\n' + buffer;
              break;
            }
          }
        }
      } catch (e) {
        if (e.name !== 'AbortError') {
          throw e;
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        reader.releaseLock();
      }
    };

    await processChunk();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('请求超时');
    }
    throw error;
  }
}

