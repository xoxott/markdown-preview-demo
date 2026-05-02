/** @suga/ai-tool-adapter — Session Ingress Provider 测试 */

import { describe, expect, it } from 'vitest';
import { InMemorySessionIngress } from '../session-ingress/InMemorySessionIngress';
import type { SessionIngressEntry, SessionIngressEventType } from '../types/session-ingress';

/** 创建测试用的 SessionIngressEntry */
function createEntry(
  sessionId: string,
  eventType: SessionIngressEventType,
  timestamp: number,
  data?: Record<string, unknown>
): SessionIngressEntry {
  return {
    sessionId,
    timestamp,
    eventType,
    data: data ?? {}
  };
}

describe('InMemorySessionIngress', () => {
  it('writeEntry → 存储条目', async () => {
    const ingress = new InMemorySessionIngress();
    await ingress.writeEntry(createEntry('session-1', 'request_start', 1000));

    expect(ingress.getEntryCount()).toBe(1);
  });

  it('writeEntry多条 → 累计存储', async () => {
    const ingress = new InMemorySessionIngress();
    await ingress.writeEntry(createEntry('s1', 'request_start', 1000));
    await ingress.writeEntry(createEntry('s1', 'request_end', 2000));
    await ingress.writeEntry(createEntry('s2', 'request_start', 3000));

    expect(ingress.getEntryCount()).toBe(3);
  });

  it('queryEntries(无filter) → 返回全部', async () => {
    const ingress = new InMemorySessionIngress();
    await ingress.writeEntry(createEntry('s1', 'request_start', 1000));
    await ingress.writeEntry(createEntry('s2', 'request_start', 2000));

    const result = await ingress.queryEntries({});
    expect(result).toHaveLength(2);
  });

  it('queryEntries(按sessionId过滤)', async () => {
    const ingress = new InMemorySessionIngress();
    await ingress.writeEntry(createEntry('s1', 'request_start', 1000));
    await ingress.writeEntry(createEntry('s2', 'request_start', 2000));
    await ingress.writeEntry(createEntry('s1', 'request_end', 3000));

    const result = await ingress.queryEntries({ sessionId: 's1' });
    expect(result).toHaveLength(2);
    expect(result.every(e => e.sessionId === 's1')).toBe(true);
  });

  it('queryEntries(按eventType过滤)', async () => {
    const ingress = new InMemorySessionIngress();
    await ingress.writeEntry(createEntry('s1', 'request_start', 1000));
    await ingress.writeEntry(createEntry('s1', 'request_end', 2000));
    await ingress.writeEntry(createEntry('s2', 'request_start', 3000));

    const result = await ingress.queryEntries({ eventType: 'request_start' });
    expect(result).toHaveLength(2);
  });

  it('queryEntries(按since过滤)', async () => {
    const ingress = new InMemorySessionIngress();
    await ingress.writeEntry(createEntry('s1', 'request_start', 1000));
    await ingress.writeEntry(createEntry('s1', 'request_end', 2000));
    await ingress.writeEntry(createEntry('s2', 'request_start', 3000));

    const result = await ingress.queryEntries({ since: 2000 });
    expect(result).toHaveLength(2);
  });

  it('queryEntries(按limit过滤)', async () => {
    const ingress = new InMemorySessionIngress();
    for (let i = 0; i < 10; i++) {
      await ingress.writeEntry(createEntry('s1', 'request_start', i * 100));
    }

    const result = await ingress.queryEntries({ limit: 5 });
    expect(result).toHaveLength(5);
  });

  it('queryEntries(组合过滤)', async () => {
    const ingress = new InMemorySessionIngress();
    await ingress.writeEntry(createEntry('s1', 'request_start', 1000));
    await ingress.writeEntry(createEntry('s1', 'request_end', 2000));
    await ingress.writeEntry(createEntry('s2', 'request_start', 3000));

    const result = await ingress.queryEntries({
      sessionId: 's1',
      eventType: 'request_start',
      since: 500
    });
    expect(result).toHaveLength(1);
  });

  it('超出上限 → 丢弃最旧条目', async () => {
    const ingress = new InMemorySessionIngress(5);
    for (let i = 0; i < 10; i++) {
      await ingress.writeEntry(createEntry('s1', 'request_start', i * 100));
    }

    expect(ingress.getEntryCount()).toBe(5);
    const entries = ingress.getAllEntries();
    expect(entries[0].timestamp).toBe(500); // 保留最后5条(500-900)
  });

  it('reset → 清空条目', async () => {
    const ingress = new InMemorySessionIngress();
    await ingress.writeEntry(createEntry('s1', 'request_start', 1000));
    ingress.reset();
    expect(ingress.getEntryCount()).toBe(0);
    expect(ingress.getAllEntries()).toHaveLength(0);
  });

  it('getAllEntries → 返回副本', async () => {
    const ingress = new InMemorySessionIngress();
    await ingress.writeEntry(createEntry('s1', 'request_start', 1000));

    const entries = ingress.getAllEntries();
    entries.push(createEntry('s2', 'request_start', 2000)); // 修改副本不影响原数据

    expect(ingress.getEntryCount()).toBe(1);
  });

  it('entry包含correlationId', async () => {
    const ingress = new InMemorySessionIngress();
    const entry: SessionIngressEntry = {
      sessionId: 's1',
      timestamp: 1000,
      eventType: 'request_start',
      data: { model: 'claude-sonnet-4-20250514' },
      correlationId: 'corr-123'
    };
    await ingress.writeEntry(entry);

    const result = await ingress.queryEntries({});
    expect(result[0].correlationId).toBe('corr-123');
  });

  it('session ingress entries → 保持原始数据', async () => {
    const ingress = new InMemorySessionIngress();
    const entry: SessionIngressEntry = {
      sessionId: 's1',
      timestamp: 1000,
      eventType: 'error',
      data: { errorCode: 429, message: 'rate limited' }
    };
    await ingress.writeEntry(entry);

    const result = await ingress.queryEntries({});
    expect(result[0].data).toEqual({ errorCode: 429, message: 'rate limited' });
  });
});
