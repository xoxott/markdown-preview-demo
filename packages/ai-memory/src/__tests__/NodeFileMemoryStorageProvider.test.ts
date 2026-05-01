/** NodeFileMemoryStorageProvider 真实测试 — 在临时目录中验证读写/目录/元信息 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NodeFileMemoryStorageProvider } from '../core/NodeFileMemoryStorageProvider';

let tmpDir: string;
let provider: NodeFileMemoryStorageProvider;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-memory-test-'));
  provider = new NodeFileMemoryStorageProvider();

  // 创建测试文件
  fs.writeFileSync(path.join(tmpDir, 'test.md'), '# Test\nhello content\n');
  fs.writeFileSync(path.join(tmpDir, 'notes.md'), 'some notes here\n');
  fs.mkdirSync(path.join(tmpDir, 'sub'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'sub', 'deep.md'), 'deep content\n');
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('NodeFileMemoryStorageProvider', () => {
  it('readFile → 读取真实文件内容', async () => {
    const content = await provider.readFile(path.join(tmpDir, 'test.md'));
    expect(content).toContain('# Test');
    expect(content).toContain('hello content');
  });

  it('readFile(不存在) → 抛出错误', async () => {
    await expect(provider.readFile(path.join(tmpDir, 'nonexistent.md'))).rejects.toThrow();
  });

  it('writeFile → 创建新文件并写入', async () => {
    const filePath = path.join(tmpDir, 'new-memory.md');
    await provider.writeFile(filePath, 'new content');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toBe('new content');
  });

  it('writeFile → 自动创建目录', async () => {
    const filePath = path.join(tmpDir, 'nested', 'dir', 'file.md');
    await provider.writeFile(filePath, 'nested content');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toBe('nested content');
  });

  it('exists(存在文件) → true', async () => {
    expect(await provider.exists(path.join(tmpDir, 'test.md'))).toBe(true);
  });

  it('exists(不存在) → false', async () => {
    expect(await provider.exists(path.join(tmpDir, 'nonexistent.md'))).toBe(false);
  });

  it('mkdir → 创建目录（已存在不报错）', async () => {
    const newDir = path.join(tmpDir, 'new-dir');
    await provider.mkdir(newDir);
    expect(fs.existsSync(newDir)).toBe(true);

    // 重复创建不报错
    await provider.mkdir(newDir);
    expect(fs.existsSync(newDir)).toBe(true);
  });

  it('listFiles(无过滤) → 返回所有md文件', async () => {
    const files = await provider.listFiles(tmpDir, '.md');
    expect(files.length).toBeGreaterThanOrEqual(3);
    files.forEach(f => expect(f).toContain('.md'));
  });

  it('listFiles(子目录) → 包含子目录中的文件', async () => {
    const files = await provider.listFiles(tmpDir, '.md');
    const hasDeep = files.some(f => f.includes('deep.md'));
    expect(hasDeep).toBe(true);
  });

  it('listFiles(不存在的目录) → 返回空数组', async () => {
    const files = await provider.listFiles(path.join(tmpDir, 'nonexistent'));
    expect(files).toEqual([]);
  });

  it('stat → 返回mtimeMs+size', async () => {
    const result = await provider.stat(path.join(tmpDir, 'test.md'));
    expect(result.mtimeMs).toBeGreaterThan(0);
    expect(result.size).toBeGreaterThan(0);
  });

  it('realpath → 返回真实路径', async () => {
    const result = await provider.realpath(path.join(tmpDir, 'test.md'));
    expect(result).toContain(tmpDir);
    expect(result).toContain('test.md');
  });

  it('realpath(不存在) → 返回原始路径', async () => {
    const result = await provider.realpath(path.join(tmpDir, 'nonexistent.md'));
    expect(result).toBe(path.join(tmpDir, 'nonexistent.md'));
  });
});
