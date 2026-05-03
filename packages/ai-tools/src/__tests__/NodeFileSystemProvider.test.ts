/** NodeFileSystemProvider 真实测试 — 在临时目录中验证 fs/glob/grep/runCommand */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NodeFileSystemProvider } from '../provider/NodeFileSystemProvider';

let tmpDir: string;
let provider: NodeFileSystemProvider;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-tools-test-'));
  provider = new NodeFileSystemProvider();

  // 创建测试文件结构
  fs.writeFileSync(
    path.join(tmpDir, 'hello.ts'),
    'export const hello = "world";\nexport const foo = 42;\n'
  );
  fs.writeFileSync(path.join(tmpDir, 'readme.md'), '# Test\n\nHello world\n');
  fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
  fs.writeFileSync(
    path.join(tmpDir, 'src', 'index.ts'),
    'import { hello } from "../hello";\nconsole.log(hello);\n'
  );
  fs.writeFileSync(
    path.join(tmpDir, 'src', 'utils.ts'),
    'export function add(a: number, b: number) { return a + b; }\n'
  );
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('NodeFileSystemProvider — stat', () => {
  it('stat(存在的文件) → isFile=true', async () => {
    const result = await provider.stat(path.join(tmpDir, 'hello.ts'));
    expect(result.exists).toBe(true);
    expect(result.isFile).toBe(true);
    expect(result.isDirectory).toBe(false);
    expect(result.size).toBeGreaterThan(0);
    expect(result.mimeType).toBe('text/typescript');
  });

  it('stat(存在的目录) → isDirectory=true', async () => {
    const result = await provider.stat(path.join(tmpDir, 'src'));
    expect(result.exists).toBe(true);
    expect(result.isDirectory).toBe(true);
    expect(result.isFile).toBe(false);
  });

  it('stat(不存在的路径) → exists=false', async () => {
    const result = await provider.stat(path.join(tmpDir, 'nonexistent.txt'));
    expect(result.exists).toBe(false);
    expect(result.isFile).toBe(false);
  });
});

describe('NodeFileSystemProvider — readFile', () => {
  it('readFile(全部内容) → 返回内容+行数+mimeType', async () => {
    const result = await provider.readFile(path.join(tmpDir, 'hello.ts'));
    expect(result.content).toContain('hello = "world"');
    expect(result.mimeType).toBe('text/typescript');
    expect(result.lineCount).toBeGreaterThan(0);
  });

  it('readFile(offset+limit) → 返回部分行', async () => {
    const result = await provider.readFile(path.join(tmpDir, 'hello.ts'), { offset: 0, limit: 1 });
    expect(result.content).toContain('hello');
    expect(result.content).not.toContain('foo');
  });
});

describe('NodeFileSystemProvider — writeFile', () => {
  it('writeFile(新文件) → 创建文件', async () => {
    const filePath = path.join(tmpDir, 'new-file.txt');
    await provider.writeFile(filePath, 'hello new file');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toBe('hello new file');
  });

  it('writeFile(覆盖) → 更新内容', async () => {
    const filePath = path.join(tmpDir, 'hello.ts');
    await provider.writeFile(filePath, 'updated content');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toBe('updated content');
  });
});

describe('NodeFileSystemProvider — editFile', () => {
  it('editFile(单次替换) → applied=true+replacementCount=1', async () => {
    const filePath = path.join(tmpDir, 'readme.md');
    fs.writeFileSync(filePath, '# Test\n\nHello world\n');
    const result = await provider.editFile(filePath, 'Hello world', 'Hello vitest');
    expect(result.applied).toBe(true);
    expect(result.replacementCount).toBe(1);
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('Hello vitest');
  });

  it('editFile(replaceAll) → 替换所有匹配', async () => {
    const filePath = path.join(tmpDir, 'multi.txt');
    fs.writeFileSync(filePath, 'aaa bbb aaa ccc aaa');
    const result = await provider.editFile(filePath, 'aaa', 'xxx', true);
    expect(result.applied).toBe(true);
    expect(result.replacementCount).toBe(3);
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toBe('xxx bbb xxx ccc xxx');
  });

  it('editFile(oldString不存在) → applied=false', async () => {
    const filePath = path.join(tmpDir, 'readme.md');
    const result = await provider.editFile(filePath, 'nonexistent_string', 'replacement');
    expect(result.applied).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('editFile(oldString不唯一) → applied=false', async () => {
    const filePath = path.join(tmpDir, 'dup.txt');
    fs.writeFileSync(filePath, 'aaa bbb aaa');
    const result = await provider.editFile(filePath, 'aaa', 'xxx');
    expect(result.applied).toBe(false);
    expect(result.error).toContain('appears 2 times');
  });
});

describe('NodeFileSystemProvider — glob', () => {
  it('glob(star-star/star.ts) → 返回匹配文件', async () => {
    const results = await provider.glob('**/*.ts', tmpDir);
    expect(results.length).toBeGreaterThanOrEqual(3);
    results.forEach(r => expect(r).toContain('.ts'));
  });

  it('glob(不匹配的模式) → 返回空数组', async () => {
    const results = await provider.glob('**/*.xyz', tmpDir);
    expect(results).toEqual([]);
  });
});

describe('NodeFileSystemProvider — grep', () => {
  it('grep(files-with-matches) → 返回匹配文件列表', async () => {
    const result = await provider.grep('hello', { path: tmpDir, outputMode: 'files-with-matches' });
    expect(result.mode).toBe('files-with-matches');
    expect(result.totalMatches).toBeGreaterThanOrEqual(1);
  });

  it('grep(content) → 返回匹配行', async () => {
    const result = await provider.grep('hello', { path: tmpDir, outputMode: 'content' });
    expect(result.mode).toBe('content');
    expect(result.totalMatches).toBeGreaterThanOrEqual(1);
    if (result.matches) {
      expect(result.matches[0].lineNumber).toBeGreaterThan(0);
      expect(result.matches[0].content).toContain('hello');
    }
  });

  it('grep(count) → 返回计数', async () => {
    const result = await provider.grep('hello', { path: tmpDir, outputMode: 'count' });
    expect(result.mode).toBe('count');
    if (result.counts) {
      expect(result.counts.length).toBeGreaterThanOrEqual(1);
      expect(result.counts[0].count).toBeGreaterThanOrEqual(1);
    }
  });

  it('grep(caseInsensitive) → 匹配大小写', async () => {
    const result = await provider.grep('HELLO', {
      path: tmpDir,
      outputMode: 'files-with-matches',
      caseInsensitive: true
    });
    expect(result.totalMatches).toBeGreaterThanOrEqual(1);
  });

  it('grep(不匹配) → 返回空结果', async () => {
    const result = await provider.grep('xyz_nonexistent_pattern', {
      path: tmpDir,
      outputMode: 'files-with-matches'
    });
    expect(result.totalMatches).toBe(0);
  });
});

describe('NodeFileSystemProvider — runCommand', () => {
  it('runCommand(echo) → stdout有输出', async () => {
    const result = await provider.runCommand('echo "hello from test"', { cwd: tmpDir });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('hello from test');
    expect(result.timedOut).toBe(false);
  });

  it('runCommand(失败命令) → exitCode!=0', async () => {
    const result = await provider.runCommand('ls /nonexistent_dir', { cwd: tmpDir });
    expect(result.exitCode).not.toBe(0);
  });

  it('runCommand(pwd) → 返回cwd', async () => {
    const result = await provider.runCommand('pwd', { cwd: tmpDir });
    expect(result.exitCode).toBe(0);
    expect(result.cwd).toBe(tmpDir);
  });
});
