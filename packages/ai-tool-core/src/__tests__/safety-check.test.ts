/** bypass-immune 安全检查测试 — P41 */

import { describe, expect, it } from 'vitest';
import {
  DANGEROUS_DIRECTORIES,
  DANGEROUS_FILES,
  isDangerousDirectoryPath,
  isDangerousFilePath,
  isDangerousToolInput
} from '../types/safety-check';

// ===== isDangerousFilePath 纯函数测试 =====

describe('isDangerousFilePath', () => {
  it('危险文件 .bashrc → true', () => {
    expect(isDangerousFilePath('.bashrc')).toBe(true);
  });

  it('危险文件带路径 /home/user/.bashrc → true', () => {
    expect(isDangerousFilePath('/home/user/.bashrc')).toBe(true);
  });

  it('危险文件 .gitconfig → true', () => {
    expect(isDangerousFilePath('.gitconfig')).toBe(true);
  });

  it('危险文件 .mcp.json → true', () => {
    expect(isDangerousFilePath('.mcp.json')).toBe(true);
  });

  it('危险文件 .claude/settings.json → basename=settings.json, 不直接匹配 → false（通过目录匹配）', () => {
    // .claude/settings.json 的 basename 是 "settings.json"，不在 DANGEROUS_FILES 中
    // 但 .claude 在 DANGEROUS_DIRECTORIES 中，通过 isDangerousDirectoryPath 检测
    expect(isDangerousFilePath('.claude/settings.json')).toBe(false);
    expect(isDangerousDirectoryPath('.claude/settings.json')).toBe(true);
  });

  it('危险文件 .env → true', () => {
    expect(isDangerousFilePath('.env')).toBe(true);
  });

  it('安全文件 /tmp/test.txt → false', () => {
    expect(isDangerousFilePath('/tmp/test.txt')).toBe(false);
  });

  it('安全文件 .npmrc → false', () => {
    expect(isDangerousFilePath('.npmrc')).toBe(false);
  });

  it('空字符串 → false', () => {
    expect(isDangerousFilePath('')).toBe(false);
  });
});

// ===== isDangerousDirectoryPath 纯函数测试 =====

describe('isDangerousDirectoryPath', () => {
  it('危险目录 .git → true', () => {
    expect(isDangerousDirectoryPath('.git')).toBe(true);
  });

  it('危险目录带路径 .git/hooks/pre-commit → true', () => {
    expect(isDangerousDirectoryPath('.git/hooks/pre-commit')).toBe(true);
  });

  it('危险目录 /project/.git/config → true', () => {
    expect(isDangerousDirectoryPath('/project/.git/config')).toBe(true);
  });

  it('危险目录 .claude → true', () => {
    expect(isDangerousDirectoryPath('.claude')).toBe(true);
  });

  it('危险目录 .vscode → true', () => {
    expect(isDangerousDirectoryPath('.vscode')).toBe(true);
  });

  it('危险目录 .idea → true', () => {
    expect(isDangerousDirectoryPath('.idea')).toBe(true);
  });

  it('危险目录 .ssh → true', () => {
    expect(isDangerousDirectoryPath('.ssh')).toBe(true);
  });

  it('安全目录 /tmp/myproject → false', () => {
    expect(isDangerousDirectoryPath('/tmp/myproject')).toBe(false);
  });

  it('空字符串 → false', () => {
    expect(isDangerousDirectoryPath('')).toBe(false);
  });
});

// ===== isDangerousToolInput 工具输入检测测试 =====

describe('isDangerousToolInput', () => {
  it('file-write .bashrc → isDangerous=true, matchType=file', () => {
    const result = isDangerousToolInput('file-write', { path: '/home/user/.bashrc' });
    expect(result.isDangerous).toBe(true);
    expect(result.matchType).toBe('file');
    expect(result.matchedItem).toBe('.bashrc');
  });

  it('file-write .git/config → isDangerous=true, matchType=directory', () => {
    const result = isDangerousToolInput('file-write', { path: '/project/.git/config' });
    expect(result.isDangerous).toBe(true);
    expect(result.matchType).toBe('directory');
    expect(result.matchedItem).toBe('.git');
  });

  it('file-write .env → isDangerous=true, matchType=file', () => {
    const result = isDangerousToolInput('file-write', { path: '.env' });
    expect(result.isDangerous).toBe(true);
    expect(result.matchType).toBe('file');
    expect(result.matchedItem).toBe('.env');
  });

  it('file-write /tmp/safe.txt → isDangerous=false', () => {
    const result = isDangerousToolInput('file-write', { path: '/tmp/safe.txt' });
    expect(result.isDangerous).toBe(false);
  });

  it('file-read .ssh/authorized_keys → isDangerous=true, matchType=directory', () => {
    const result = isDangerousToolInput('file-read', { path: '/home/user/.ssh/authorized_keys' });
    expect(result.isDangerous).toBe(true);
    expect(result.matchType).toBe('directory');
  });

  it('edit .gitconfig → isDangerous=true', () => {
    const result = isDangerousToolInput('edit', { file_path: '/home/user/.gitconfig' });
    expect(result.isDangerous).toBe(true);
    expect(result.matchType).toBe('file');
  });

  it('bash 写 .bashrc → isDangerous=true', () => {
    const result = isDangerousToolInput('bash', { command: 'echo "export PATH" >> ~/.bashrc' });
    expect(result.isDangerous).toBe(true);
    expect(result.matchType).toBe('file');
  });

  it('bash 写 .git/ → isDangerous=true', () => {
    const result = isDangerousToolInput('bash', { command: 'git init && cat .git/config' });
    expect(result.isDangerous).toBe(true);
  });

  it('bash 安全命令 → isDangerous=false', () => {
    const result = isDangerousToolInput('bash', { command: 'ls -la /tmp' });
    expect(result.isDangerous).toBe(false);
  });

  it('null input → isDangerous=false', () => {
    const result = isDangerousToolInput('file-write', null);
    expect(result.isDangerous).toBe(false);
  });

  it('undefined input → isDangerous=false', () => {
    const result = isDangerousToolInput('file-write', undefined);
    expect(result.isDangerous).toBe(false);
  });

  it('非对象 input → isDangerous=false', () => {
    const result = isDangerousToolInput('file-write', 'just a string');
    expect(result.isDangerous).toBe(false);
  });

  it('filePath 字段名 → 正常检测', () => {
    const result = isDangerousToolInput('file-write', { filePath: '/home/user/.zshrc' });
    expect(result.isDangerous).toBe(true);
    expect(result.matchedItem).toBe('.zshrc');
  });

  it('file 字段名 → 正常检测', () => {
    const result = isDangerousToolInput('file-write', { file: '.profile' });
    expect(result.isDangerous).toBe(true);
    expect(result.matchedItem).toBe('.profile');
  });
});

// ===== DANGEROUS_FILES / DANGEROUS_DIRECTORIES 常量完整性 =====

describe('DANGEROUS_FILES / DANGEROUS_DIRECTORIES', () => {
  it('DANGEROUS_FILES 包含关键文件', () => {
    expect(DANGEROUS_FILES).toContain('.bashrc');
    expect(DANGEROUS_FILES).toContain('.gitconfig');
    expect(DANGEROUS_FILES).toContain('.zshrc');
    expect(DANGEROUS_FILES).toContain('.env');
    expect(DANGEROUS_FILES).toContain('.mcp.json');
    expect(DANGEROUS_FILES).toContain('.claude/settings.json');
  });

  it('DANGEROUS_DIRECTORIES 包含关键目录', () => {
    expect(DANGEROUS_DIRECTORIES).toContain('.git');
    expect(DANGEROUS_DIRECTORIES).toContain('.vscode');
    expect(DANGEROUS_DIRECTORIES).toContain('.idea');
    expect(DANGEROUS_DIRECTORIES).toContain('.claude');
    expect(DANGEROUS_DIRECTORIES).toContain('.ssh');
  });
});
