/** FileSystemProvider 接口契约测试 */

import { describe, expect, it } from 'vitest';
import { MockFileSystemProvider } from './mocks/MockFileSystemProvider';
// Types verified via MockFileSystemProvider — no unused imports needed

describe('MockFileSystemProvider — 基础文件操作', () => {
  it('stat → 不存在的文件返回 exists=false', async () => {
    const fs = new MockFileSystemProvider();
    const stat = await fs.stat('/nonexistent.txt');
    expect(stat.exists).toBe(false);
    expect(stat.isFile).toBe(false);
  });

  it('stat → 存在的文件返回 exists=true + mimeType', async () => {
    const fs = new MockFileSystemProvider();
    fs.addFile('/test.ts', 'const x = 1;');
    const stat = await fs.stat('/test.ts');
    expect(stat.exists).toBe(true);
    expect(stat.isFile).toBe(true);
    expect(stat.mimeType).toBe('text/x-typescript');
  });

  it('readFile → 读取文件内容', async () => {
    const fs = new MockFileSystemProvider();
    fs.addFile('/hello.txt', 'hello world');
    const content = await fs.readFile('/hello.txt');
    expect(content.content).toBe('hello world');
    expect(content.mimeType).toBe('text/plain');
  });

  it('readFile + offset/limit → 读取行范围', async () => {
    const fs = new MockFileSystemProvider();
    fs.addFile('/lines.txt', 'line0\nline1\nline2\nline3');
    const content = await fs.readFile('/lines.txt', { offset: 1, limit: 2 });
    expect(content.content).toBe('line1\nline2');
  });

  it('writeFile → 写入后可读取', async () => {
    const fs = new MockFileSystemProvider();
    await fs.writeFile('/new.txt', 'new content');
    const content = await fs.readFile('/new.txt');
    expect(content.content).toBe('new content');
  });

  it('editFile → 替换字符串', async () => {
    const fs = new MockFileSystemProvider();
    fs.addFile('/edit.txt', 'hello old world');
    const result = await fs.editFile('/edit.txt', 'old', 'new');
    expect(result.applied).toBe(true);
    expect(result.replacementCount).toBe(1);
    const content = await fs.readFile('/edit.txt');
    expect(content.content).toBe('hello new world');
  });

  it('glob → 模式匹配', async () => {
    const fs = new MockFileSystemProvider();
    fs.addFile('/src/a.ts', '');
    fs.addFile('/src/b.ts', '');
    fs.addFile('/src/c.js', '');
    const paths = await fs.glob('*.ts', '/src');
    expect(paths.length).toBe(2);
  });

  it('grep → 内容搜索', async () => {
    const fs = new MockFileSystemProvider();
    fs.addFile('/src/a.ts', 'const hello = 1;\nconst world = 2;');
    const result = await fs.grep('hello', { outputMode: 'content' });
    expect(result.totalMatches).toBe(1);
    expect(result.matches?.[0]?.content).toContain('hello');
  });

  it('runCommand → 返回预置结果', async () => {
    const fs = new MockFileSystemProvider();
    fs.addCommandResult('ls', { exitCode: 0, stdout: 'a.txt b.txt', stderr: '', timedOut: false });
    const result = await fs.runCommand('ls');
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('a.txt b.txt');
  });
});
