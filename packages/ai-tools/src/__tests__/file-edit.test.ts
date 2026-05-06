/** FileEditTool 测试 — 文件精确编辑工具 */

import { describe, expect, it } from 'vitest';
import type { ToolRegistry } from '@suga/ai-tool-core';
import { fileEditTool, preserveQuoteStyle } from '../tools/file-edit';
import { FileEditInputSchema } from '../types/tool-inputs';
import type { ExtendedToolUseContext } from '../context-merge';
import { MockFileSystemProvider } from './mocks/MockFileSystemProvider';

function createContext(fs: MockFileSystemProvider): ExtendedToolUseContext {
  return {
    abortController: new AbortController(),
    tools: {} as ToolRegistry,
    sessionId: 'test-session',
    fsProvider: fs
  };
}

describe('FileEditTool — schema 验证', () => {
  it('有效最小输入 → filePath+old+new', () => {
    const result = FileEditInputSchema.safeParse({
      filePath: '/test.txt',
      oldString: 'old',
      newString: 'new'
    });
    expect(result.success).toBe(true);
  });

  it('含 replaceAll → 有效', () => {
    const result = FileEditInputSchema.safeParse({
      filePath: '/test.txt',
      oldString: 'old',
      newString: 'new',
      replaceAll: true
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.replaceAll).toBe(true);
  });

  it('strictObject → 拒绝额外字段', () => {
    const result = FileEditInputSchema.safeParse({
      filePath: '/test.txt',
      oldString: 'old',
      newString: 'new',
      extra: true
    });
    expect(result.success).toBe(false);
  });

  it('空 oldString → schema 通过（validateInput 拦截）', () => {
    const result = FileEditInputSchema.safeParse({
      filePath: '/test.txt',
      oldString: '',
      newString: 'new'
    });
    expect(result.success).toBe(true);
  });

  it('空 filePath → schema 通过（validateInput 拦截）', () => {
    const result = FileEditInputSchema.safeParse({
      filePath: '',
      oldString: 'old',
      newString: 'new'
    });
    expect(result.success).toBe(true);
  });

  it('replaceAll 默认值 → false', () => {
    const result = FileEditInputSchema.safeParse({
      filePath: '/test.txt',
      oldString: 'old',
      newString: 'new'
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.replaceAll).toBe(false);
  });
});

describe('FileEditTool — validateInput', () => {
  it('有效输入 → allow', () => {
    const result = fileEditTool.validateInput(
      { filePath: '/test.txt', oldString: 'old', newString: 'new', replaceAll: false },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('allow');
  });

  it('空路径 → deny', () => {
    const result = fileEditTool.validateInput(
      { filePath: '', oldString: 'old', newString: 'new', replaceAll: false },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('deny');
    if (result.behavior === 'deny') expect(result.reason).toBe('empty_path');
  });

  it('相对路径 → deny', () => {
    const result = fileEditTool.validateInput(
      { filePath: 'test.txt', oldString: 'old', newString: 'new', replaceAll: false },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('deny');
    if (result.behavior === 'deny') expect(result.reason).toBe('relative_path');
  });

  it('空 oldString → deny', () => {
    const result = fileEditTool.validateInput(
      { filePath: '/test.txt', oldString: '', newString: 'new', replaceAll: false },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('deny');
    if (result.behavior === 'deny') expect(result.reason).toBe('empty_old_string');
  });

  it('oldString 弯引号规范化 → updatedInput', () => {
    const result = fileEditTool.validateInput(
      {
        filePath: '/test.txt',
        oldString: '\u2018old\u2019',
        newString: "'new'",
        replaceAll: false
      },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('allow');
    if (result.behavior === 'allow' && result.updatedInput) {
      const updated = result.updatedInput as { oldString: string; newString: string };
      expect(updated.oldString).toBe("'old'");
    }
  });

  it('newString 弯引号规范化 → updatedInput', () => {
    const result = fileEditTool.validateInput(
      {
        filePath: '/test.txt',
        oldString: "'old'",
        newString: '\u2018new\u2019',
        replaceAll: false
      },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('allow');
    if (result.behavior === 'allow' && result.updatedInput) {
      const updated = result.updatedInput as { oldString: string; newString: string };
      expect(updated.newString).toBe("'new'");
    }
  });

  it('双字符串同时规范化 → updatedInput', () => {
    const result = fileEditTool.validateInput(
      {
        filePath: '/test.txt',
        oldString: '\u2018old\u2019\r\nline',
        newString: '\u201Cnew\u201D\r\nline',
        replaceAll: false
      },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('allow');
    if (result.behavior === 'allow' && result.updatedInput) {
      const updated = result.updatedInput as { oldString: string; newString: string };
      expect(updated.oldString).toBe("'old'\nline");
      expect(updated.newString).toBe('"new"\nline');
    }
  });

  it('LF 行尾规范化 → updatedInput', () => {
    const result = fileEditTool.validateInput(
      {
        filePath: '/test.txt',
        oldString: 'old\r\nline',
        newString: 'new\r\nline',
        replaceAll: false
      },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('allow');
    if (result.behavior === 'allow' && result.updatedInput) {
      const updated = result.updatedInput as { oldString: string; newString: string };
      expect(updated.oldString).toBe('old\nline');
      expect(updated.newString).toBe('new\nline');
    }
  });

  it('无需规范化 → allow 无 updatedInput', () => {
    const result = fileEditTool.validateInput(
      {
        filePath: '/test.txt',
        oldString: "'old'\nline",
        newString: "'new'\nline",
        replaceAll: false
      },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('allow');
    if (result.behavior === 'allow') expect(result.updatedInput).toBeUndefined();
  });

  it('oldString === newString → allow（不做特殊限制）', () => {
    const result = fileEditTool.validateInput(
      { filePath: '/test.txt', oldString: 'same', newString: 'same', replaceAll: false },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('allow');
  });
});

describe('FileEditTool — checkPermissions', () => {
  it('总是 ask', () => {
    const result = fileEditTool.checkPermissions(
      { filePath: '/test.txt', oldString: 'old', newString: 'new', replaceAll: false },
      createContext(new MockFileSystemProvider())
    );
    expect(result.behavior).toBe('ask');
  });

  it('ask message 含文件路径', () => {
    const result = fileEditTool.checkPermissions(
      { filePath: '/test.txt', oldString: 'old', newString: 'new', replaceAll: false },
      createContext(new MockFileSystemProvider())
    );
    if (result.behavior === 'ask') expect(result.message).toContain('/test.txt');
  });
});

describe('FileEditTool — call 执行', () => {
  it('编辑单一匹配 → applied=true + replacementCount=1', async () => {
    const fs = new MockFileSystemProvider();
    fs.addFile('/test.txt', 'hello old world');
    const ctx = createContext(fs);
    const result = await fileEditTool.call(
      { filePath: '/test.txt', oldString: 'old', newString: 'new', replaceAll: false },
      ctx
    );
    expect(result.data.applied).toBe(true);
    expect(result.data.replacementCount).toBe(1);
    const content = await fs.readFile('/test.txt');
    expect(content.content).toBe('hello new world');
  });

  it('replaceAll=true → 替换所有匹配', async () => {
    const fs = new MockFileSystemProvider();
    fs.addFile('/test.txt', 'old old old');
    const ctx = createContext(fs);
    const result = await fileEditTool.call(
      { filePath: '/test.txt', oldString: 'old', newString: 'new', replaceAll: true },
      ctx
    );
    expect(result.data.applied).toBe(true);
    expect(result.data.replacementCount).toBe(3);
  });

  it('文件不存在 → applied=false + error', async () => {
    const fs = new MockFileSystemProvider();
    const ctx = createContext(fs);
    const result = await fileEditTool.call(
      { filePath: '/nonexistent.txt', oldString: 'old', newString: 'new', replaceAll: false },
      ctx
    );
    expect(result.data.applied).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('oldString 未找到 → applied=false + error', async () => {
    const fs = new MockFileSystemProvider();
    fs.addFile('/test.txt', 'hello world');
    const ctx = createContext(fs);
    const result = await fileEditTool.call(
      { filePath: '/test.txt', oldString: 'notfound', newString: 'new', replaceAll: false },
      ctx
    );
    expect(result.data.applied).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('非唯一 oldString (replaceAll=false) → applied=false', async () => {
    const fs = new MockFileSystemProvider();
    fs.addFile('/test.txt', 'hello hello world');
    const ctx = createContext(fs);
    const result = await fileEditTool.call(
      { filePath: '/test.txt', oldString: 'hello', newString: 'hi', replaceAll: false },
      ctx
    );
    expect(result.data.applied).toBe(false);
  });

  it('非唯一 oldString (replaceAll=true) → applied=true', async () => {
    const fs = new MockFileSystemProvider();
    fs.addFile('/test.txt', 'hello hello world');
    const ctx = createContext(fs);
    const result = await fileEditTool.call(
      { filePath: '/test.txt', oldString: 'hello', newString: 'hi', replaceAll: true },
      ctx
    );
    expect(result.data.applied).toBe(true);
    expect(result.data.replacementCount).toBe(2);
  });

  it('newContent 在结果中', async () => {
    const fs = new MockFileSystemProvider();
    fs.addFile('/test.txt', 'old content');
    const ctx = createContext(fs);
    const result = await fileEditTool.call(
      { filePath: '/test.txt', oldString: 'old', newString: 'new', replaceAll: false },
      ctx
    );
    expect(result.data.newContent).toBe('new content');
  });

  it('fsProvider 委托 → 调用 editFile', async () => {
    const fs = new MockFileSystemProvider();
    fs.addFile('/test.txt', 'a b c');
    const ctx = createContext(fs);
    const result = await fileEditTool.call(
      { filePath: '/test.txt', oldString: 'b', newString: 'x', replaceAll: false },
      ctx
    );
    expect(result.data.applied).toBe(true);
  });
});

describe('FileEditTool — 安全声明', () => {
  it('isReadOnly → false', () => {
    expect(
      fileEditTool.isReadOnly({
        filePath: '/test.txt',
        oldString: 'a',
        newString: 'b',
        replaceAll: false
      })
    ).toBe(false);
  });

  it('isConcurrencySafe → false', () => {
    expect(
      fileEditTool.isConcurrencySafe({
        filePath: '/test.txt',
        oldString: 'a',
        newString: 'b',
        replaceAll: false
      })
    ).toBe(false);
  });

  it('safetyLabel → destructive', () => {
    expect(
      fileEditTool.safetyLabel({
        filePath: '/test.txt',
        oldString: 'a',
        newString: 'b',
        replaceAll: false
      })
    ).toBe('destructive');
  });

  it('isDestructive → false（修改而非销毁）', () => {
    expect(
      fileEditTool.isDestructive({
        filePath: '/test.txt',
        oldString: 'a',
        newString: 'b',
        replaceAll: false
      })
    ).toBe(false);
  });
});

describe('FileEditTool — description', () => {
  it('replaceAll=false → 含 "one occurrence"', async () => {
    const desc = await fileEditTool.description({
      filePath: '/test.txt',
      oldString: 'old',
      newString: 'new',
      replaceAll: false
    });
    expect(desc).toContain('one occurrence');
  });

  it('replaceAll=true → 含 "all occurrences"', async () => {
    const desc = await fileEditTool.description({
      filePath: '/test.txt',
      oldString: 'old',
      newString: 'new',
      replaceAll: true
    });
    expect(desc).toContain('all occurrences');
  });
});

describe('preserveQuoteStyle', () => {
  it('no curly quotes → unchanged', () => {
    expect(preserveQuoteStyle("'old'", "'new'")).toBe("'new'");
  });

  it('left curly single → newString gets curly single', () => {
    // oldString has ' (left curly single) → newString ' converts to '
    expect(preserveQuoteStyle('\u2018old\u2019', "'new'")).toBe('\u2018new\u2019');
  });

  it('right curly single only → all straight quotes become right curly', () => {
    expect(preserveQuoteStyle('old\u2019', "'new'")).toBe('\u2019new\u2019');
  });

  it('left curly double → newString gets curly double', () => {
    expect(preserveQuoteStyle('\u201Cold\u201D', '"new"')).toBe('\u201Cnew\u201D');
  });

  it('right curly double only → all straight quotes become right curly', () => {
    expect(preserveQuoteStyle('old\u201D', '"new"')).toBe('\u201Dnew\u201D');
  });

  it('mixed curly quotes → both types preserved', () => {
    expect(preserveQuoteStyle('\u2018old\u2019 \u201Cword\u201D', '\'new\' "word"')).toBe(
      '\u2018new\u2019 \u201Cword\u201D'
    );
  });

  it('no straight quotes in newString → unchanged', () => {
    expect(preserveQuoteStyle('\u2018old\u2019', '\u2018new\u2019')).toBe('\u2018new\u2019');
  });
});
