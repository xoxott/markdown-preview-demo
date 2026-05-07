/** G7 sed -i 拦截测试 */

import { describe, expect, it } from 'vitest';
import {
  applySedSubstitution,
  isSedInPlaceEdit,
  parseSedEditCommand
} from '../tools/sedEditParser';
import type { SedEditInfo } from '../tools/sedEditParser';
import {
  checkSedConstraints,
  containsDangerousOperations,
  sedCommandIsAllowedByAllowlist
} from '../tools/sedValidation';

// ============================================================
// sedEditParser — parseSedEditCommand
// ============================================================

describe('parseSedEditCommand', () => {
  it('简单 sed -i s/old/new/ file → 解析成功', () => {
    const result = parseSedEditCommand("sed -i 's/old/new/g' file.txt");
    expect(result).not.toBeNull();
    expect(result!.filePath).toBe('file.txt');
    expect(result!.pattern).toBe('old');
    expect(result!.replacement).toBe('new');
    expect(result!.flags).toBe('g');
    expect(result!.extendedRegex).toBe(false);
  });

  it('sed -i s/old/new/ file (无标志)', () => {
    const result = parseSedEditCommand("sed -i 's/hello/world/' config.yaml");
    expect(result).not.toBeNull();
    expect(result!.flags).toBe('');
    expect(result!.filePath).toBe('config.yaml');
  });

  it('sed -E -i s/pattern/replacement/ file → extendedRegex=true', () => {
    const result = parseSedEditCommand("sed -E -i 's/foo|bar/baz/g' data.txt");
    expect(result).not.toBeNull();
    expect(result!.extendedRegex).toBe(true);
    expect(result!.pattern).toBe('foo|bar');
  });

  it('sed -i -e s/old/new/ file → -e 标志', () => {
    const result = parseSedEditCommand("sed -i -e 's/old/new/' test.txt");
    expect(result).not.toBeNull();
    expect(result!.pattern).toBe('old');
  });

  it('sed --in-place s/old/new/ file → 长标志', () => {
    const result = parseSedEditCommand("sed --in-place 's/old/new/' file.txt");
    expect(result).not.toBeNull();
    expect(result!.filePath).toBe('file.txt');
  });

  it('不同分隔符 s|old|new| → 解析成功', () => {
    const result = parseSedEditCommand("sed -i 's|old|new|g' file.txt");
    expect(result).not.toBeNull();
    expect(result!.pattern).toBe('old');
    expect(result!.replacement).toBe('new');
  });

  it("sed -i'' s/old/new/ file → BSD 风格空后缀", () => {
    const result = parseSedEditCommand("sed -i '' 's/old/new/g' file.txt");
    expect(result).not.toBeNull();
    expect(result!.filePath).toBe('file.txt');
  });

  // 不支持的命令 → null

  it('管道命令 → null', () => {
    expect(parseSedEditCommand("sed -i 's/old/new/' file | grep foo")).toBeNull();
  });

  it('重定向 → null', () => {
    expect(parseSedEditCommand("sed -i 's/old/new/' file > output")).toBeNull();
  });

  it('多个 -e 表达式 → null', () => {
    expect(parseSedEditCommand("sed -i -e 's/a/b/' -e 's/c/d/' file")).toBeNull();
  });

  it('备份后缀 -i.bak → null', () => {
    expect(parseSedEditCommand("sed -i.bak 's/old/new/' file")).toBeNull();
  });

  it('glob 文件路径 → null', () => {
    expect(parseSedEditCommand("sed -i 's/old/new/' *.txt")).toBeNull();
  });

  it('非 sed 命令 → null', () => {
    expect(parseSedEditCommand('ls -la')).toBeNull();
  });

  it('sed 无 -i → null', () => {
    expect(parseSedEditCommand("sed 's/old/new/' file")).toBeNull();
  });

  it('分号分隔多命令 → null (表达式含分号)', () => {
    expect(parseSedEditCommand("sed -i 's/old/new/; s/a/b/' file")).toBeNull();
  });
});

// ============================================================
// sedEditParser — isSedInPlaceEdit
// ============================================================

describe('isSedInPlaceEdit', () => {
  it('可拦截的命令 → true', () => {
    expect(isSedInPlaceEdit("sed -i 's/old/new/' file.txt")).toBe(true);
  });

  it('不可拦截的命令 → false', () => {
    expect(isSedInPlaceEdit('ls -la')).toBe(false);
    expect(isSedInPlaceEdit("sed 's/old/new/' file")).toBe(false);
  });
});

// ============================================================
// sedEditParser — applySedSubstitution
// ============================================================

describe('applySedSubstitution', () => {
  it('简单文本替换 g 标志', () => {
    const info: SedEditInfo = {
      filePath: 'test.txt',
      pattern: 'old',
      replacement: 'new',
      flags: 'g',
      extendedRegex: false,
      originalCommand: "sed -i 's/old/new/g' test.txt"
    };
    expect(applySedSubstitution('old old old', info)).toBe('new new new');
  });

  it('无 g 标志 → 只替换第一次', () => {
    const info: SedEditInfo = {
      filePath: 'test.txt',
      pattern: 'old',
      replacement: 'new',
      flags: '',
      extendedRegex: false,
      originalCommand: "sed -i 's/old/new/' test.txt"
    };
    expect(applySedSubstitution('old old old', info)).toBe('new old old');
  });

  it('i 标志 → 大小写不敏感', () => {
    const info: SedEditInfo = {
      filePath: 'test.txt',
      pattern: 'hello',
      replacement: 'world',
      flags: 'gi',
      extendedRegex: false,
      originalCommand: "sed -i 's/hello/world/gi' test.txt"
    };
    expect(applySedSubstitution('HELLO hello HeLLo', info)).toBe('world world world');
  });

  it('& 引用 → 整个匹配', () => {
    const _info: SedEditInfo = {
      filePath: 'test.txt',
      pattern: '[0-9]+',
      replacement: 'number-&',
      flags: 'g',
      extendedRegex: false,
      originalCommand: "sed -i 's/[0-9]+/number-&/g' test.txt"
    };
    // BRE: [0-9]+ 在BRE中 + 需转义 → \+ 才是"至少一次"
    // 这里 pattern 是 [0-9]+，在BRE中 + 是普通字符，所以只匹配单数字后面紧跟+
    // 让我们用正确的BRE模式
    const infoBRE: SedEditInfo = {
      filePath: 'test.txt',
      pattern: '[0-9]\\+',
      replacement: '[&]',
      flags: 'g',
      extendedRegex: false,
      originalCommand: "sed -i 's/[0-9]\\+/[&]/g' test.txt"
    };
    expect(applySedSubstitution('abc 123 def', infoBRE)).toBe('abc [123] def');
  });

  it('\\1 分组引用 → $1', () => {
    const info: SedEditInfo = {
      filePath: 'test.txt',
      pattern: '\\(hello\\) \\(world\\)',
      replacement: '\\2 \\1',
      flags: '',
      extendedRegex: false,
      originalCommand: "sed -i 's/\\(hello\\) \\(world\\)/\\2 \\1/' test.txt"
    };
    expect(applySedSubstitution('hello world foo', info)).toBe('world hello foo');
  });

  it('ERE 模式 → 直接使用', () => {
    const info: SedEditInfo = {
      filePath: 'test.txt',
      pattern: 'foo|bar',
      replacement: 'baz',
      flags: 'g',
      extendedRegex: true,
      originalCommand: "sed -E -i 's/foo|bar/baz/g' test.txt"
    };
    expect(applySedSubstitution('foo and bar', info)).toBe('baz and baz');
  });

  it('正则编译失败 → 返回原内容', () => {
    const info: SedEditInfo = {
      filePath: 'test.txt',
      pattern: '[invalid regex(((',
      replacement: 'new',
      flags: '',
      extendedRegex: true,
      originalCommand: "sed -E -i 's/[invalid regex(((/new/' test.txt"
    };
    expect(applySedSubstitution('original content', info)).toBe('original content');
  });
});

// ============================================================
// sedValidation
// ============================================================

describe('checkSedConstraints', () => {
  it('正常 s 命令 → allowed=true', () => {
    const info: SedEditInfo = {
      filePath: 'test.txt',
      pattern: 'old',
      replacement: 'new',
      flags: 'g',
      extendedRegex: false,
      originalCommand: "sed -i 's/old/new/g' test.txt"
    };
    expect(checkSedConstraints(info).allowed).toBe(true);
  });

  it('pattern 含 w 命令 → allowed=false', () => {
    const info: SedEditInfo = {
      filePath: 'test.txt',
      pattern: 'woutfile',
      replacement: 'new',
      flags: '',
      extendedRegex: false,
      originalCommand: "sed -i 's/woutfile/new/' test.txt"
    };
    // w 在 pattern 字面文本中也会被检测 — 这是保守策略
    expect(checkSedConstraints(info).allowed).toBe(false);
  });
});

describe('sedCommandIsAllowedByAllowlist', () => {
  it('简单文本替换 → allowed', () => {
    const info: SedEditInfo = {
      filePath: 'test.txt',
      pattern: 'hello',
      replacement: 'world',
      flags: 'g',
      extendedRegex: false,
      originalCommand: "sed -i 's/hello/world/g' test.txt"
    };
    expect(sedCommandIsAllowedByAllowlist(info)).toBe(true);
  });

  it('常见正则 → allowed', () => {
    const info: SedEditInfo = {
      filePath: 'test.txt',
      pattern: '^function\\s+\\w+',
      replacement: 'def $1',
      flags: '',
      extendedRegex: false,
      originalCommand: "sed -i 's/^function\\s+\\w+/def $1/' test.txt"
    };
    expect(sedCommandIsAllowedByAllowlist(info)).toBe(true);
  });

  it('前瞻断言 → 不允许', () => {
    const info: SedEditInfo = {
      filePath: 'test.txt',
      pattern: 'foo(?=bar)',
      replacement: 'baz',
      flags: '',
      extendedRegex: true,
      originalCommand: "sed -E -i 's/foo(?=bar)/baz/' test.txt"
    };
    expect(sedCommandIsAllowedByAllowlist(info)).toBe(false);
  });

  it('超长 pattern → 不允许', () => {
    const info: SedEditInfo = {
      filePath: 'test.txt',
      pattern: 'a'.repeat(501),
      replacement: 'b',
      flags: '',
      extendedRegex: false,
      originalCommand: "sed -i 's/long/b/' test.txt"
    };
    expect(sedCommandIsAllowedByAllowlist(info)).toBe(false);
  });
});

describe('containsDangerousOperations', () => {
  it('普通 sed 命令 → 无危险', () => {
    const result = containsDangerousOperations("sed -i 's/old/new/' file.txt");
    expect(result.hasDangerous).toBe(false);
  });

  it('包含 e 命令 → 危险', () => {
    const result = containsDangerousOperations("sed 's/old/new/e' file.txt");
    expect(result.hasDangerous).toBe(true);
  });

  it('包含控制字符 → 危险', () => {
    const result = containsDangerousOperations("sed -i 's/old/new/' \x01file");
    expect(result.hasDangerous).toBe(true);
  });

  it('包含 curly braces → 危险', () => {
    const result = containsDangerousOperations("sed -i '{/pattern/d}' file");
    expect(result.hasDangerous).toBe(true);
  });

  it('包含非 s 命令 (d) → 危险', () => {
    const result = containsDangerousOperations("sed -i '3d' file.txt");
    expect(result.hasDangerous).toBe(true);
  });
});
