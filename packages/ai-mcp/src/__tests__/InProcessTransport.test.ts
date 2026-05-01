/** InProcessTransport 链接传输对测试 */

import { describe, expect, it } from 'vitest';
import { createLinkedTransportPair } from '../transport/InProcessTransport';

describe('createLinkedTransportPair', () => {
  it('创建一对链接传输', () => {
    const pair = createLinkedTransportPair();
    expect(pair.clientTransport).toBeDefined();
    expect(pair.serverTransport).toBeDefined();
  });

  it('客户端发送 → 服务器接收', async () => {
    const pair = createLinkedTransportPair();
    const received: unknown[] = [];
    pair.serverTransport.onmessage = msg => {
      received.push(msg);
    };
    await pair.clientTransport.send({ type: 'test', data: 42 });
    // queueMicrotask 异步，需要等待
    await new Promise(resolve => {
      setTimeout(resolve, 0);
    });
    expect(received).toEqual([{ type: 'test', data: 42 }]);
  });

  it('服务器发送 → 客户端接收', async () => {
    const pair = createLinkedTransportPair();
    const received: unknown[] = [];
    pair.clientTransport.onmessage = msg => {
      received.push(msg);
    };
    await pair.serverTransport.send({ type: 'response' });
    await new Promise(resolve => {
      setTimeout(resolve, 0);
    });
    expect(received).toEqual([{ type: 'response' }]);
  });

  it('关闭客户端 → 两端 onclose 回调触发', async () => {
    const pair = createLinkedTransportPair();
    let clientClosed = false;
    let serverClosed = false;
    pair.clientTransport.onclose = () => {
      clientClosed = true;
    };
    pair.serverTransport.onclose = () => {
      serverClosed = true;
    };
    await pair.clientTransport.close();
    expect(clientClosed).toBe(true);
    expect(serverClosed).toBe(true);
  });

  it('关闭服务器 → 两端 onclose 回调触发', async () => {
    const pair = createLinkedTransportPair();
    let clientClosed = false;
    let serverClosed = false;
    pair.clientTransport.onclose = () => {
      clientClosed = true;
    };
    pair.serverTransport.onclose = () => {
      serverClosed = true;
    };
    await pair.serverTransport.close();
    expect(clientClosed).toBe(true);
    expect(serverClosed).toBe(true);
  });

  it('关闭后发送 → 抛出错误', async () => {
    const pair = createLinkedTransportPair();
    await pair.clientTransport.close();
    await expect(pair.clientTransport.send({ type: 'test' })).rejects.toThrow(
      'Transport is closed'
    );
  });

  it('重复关闭 → 不触发重复回调', async () => {
    const pair = createLinkedTransportPair();
    let closeCount = 0;
    pair.clientTransport.onclose = () => {
      closeCount++;
    };
    await pair.clientTransport.close();
    await pair.clientTransport.close();
    expect(closeCount).toBe(1);
  });

  it('start() → 无操作但成功', async () => {
    const pair = createLinkedTransportPair();
    await pair.clientTransport.start();
    // start 无操作，不应抛错
  });

  it('多消息传递', async () => {
    const pair = createLinkedTransportPair();
    const received: unknown[] = [];
    pair.serverTransport.onmessage = msg => {
      received.push(msg);
    };
    await pair.clientTransport.send('msg1');
    await pair.clientTransport.send('msg2');
    await pair.clientTransport.send('msg3');
    await new Promise(resolve => {
      setTimeout(resolve, 10);
    });
    expect(received).toEqual(['msg1', 'msg2', 'msg3']);
  });
});
