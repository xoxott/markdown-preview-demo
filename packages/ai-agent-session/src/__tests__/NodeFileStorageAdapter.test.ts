/** NodeFileStorageAdapter 真实测试 — 在临时目录中验证持久化存储 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NodeFileStorageAdapter } from '../storage/NodeFileStorageAdapter';

let tmpDir: string;
let adapter: NodeFileStorageAdapter;

const mockSession = {
  sessionId: 'test_session_001',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  state: { phase: 'running' },
  transitions: []
};

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-session-test-'));
  adapter = new NodeFileStorageAdapter(tmpDir);
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('NodeFileStorageAdapter', () => {
  it('save + load → 持久化读写', async () => {
    await adapter.save('session_001', mockSession as any);
    const loaded = await adapter.load('session_001');
    expect(loaded).not.toBeNull();
    expect(loaded!.sessionId).toBe('test_session_001');
  });

  it('load(不存在) → null', async () => {
    const loaded = await adapter.load('nonexistent_session');
    expect(loaded).toBeNull();
  });

  it('remove → 删除后load返回null', async () => {
    await adapter.save('session_002', mockSession as any);
    await adapter.remove('session_002');
    const loaded = await adapter.load('session_002');
    expect(loaded).toBeNull();
  });

  it('remove(不存在) → 不报错', async () => {
    await adapter.remove('nonexistent');
    // 不抛出错误即成功
  });

  it('list → 返回所有会话ID', async () => {
    await adapter.save('session_a', mockSession as any);
    await adapter.save('session_b', mockSession as any);
    const ids = await adapter.list();
    expect(ids).toContain('session_a');
    expect(ids).toContain('session_b');
  });

  it('list(空目录) → 返回空数组', async () => {
    const emptyDir = path.join(tmpDir, 'empty');
    fs.mkdirSync(emptyDir, { recursive: true });
    const emptyAdapter = new NodeFileStorageAdapter(emptyDir);
    const ids = await emptyAdapter.list();
    expect(ids).toEqual([]);
  });

  it('会话ID含路径分隔符 → 安全化处理', async () => {
    await adapter.save('path/with/slashes', mockSession as any);
    const loaded = await adapter.load('path/with/slashes');
    expect(loaded).not.toBeNull();
    expect(loaded!.sessionId).toBe('test_session_001');
  });
});
