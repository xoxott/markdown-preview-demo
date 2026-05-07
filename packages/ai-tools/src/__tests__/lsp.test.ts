/** G2: LSP 工具测试 — InMemoryLspProvider + 6 工具 */

import { afterEach, describe, expect, it } from 'vitest';
import { ToolRegistry } from '@suga/ai-tool-core';
import {
  InMemoryLspProvider,
  lspCompletionTool,
  lspDiagnosticsTool,
  lspDocumentSymbolTool,
  lspFindReferencesTool,
  lspGoToDefinitionTool,
  lspHoverTool
} from '../index';
import type { ExtendedToolUseContext } from '../context-merge';

function createContext(provider?: InMemoryLspProvider): ExtendedToolUseContext {
  return {
    fsProvider: {} as any,
    tools: new ToolRegistry(),
    abortController: new AbortController(),
    sessionId: 'test-g2',
    lspProvider: provider
  } as ExtendedToolUseContext;
}

// ============================================================
// InMemoryLspProvider
// ============================================================

describe('InMemoryLspProvider', () => {
  let provider: InMemoryLspProvider;

  beforeEach(() => {
    provider = new InMemoryLspProvider();
  });
  afterEach(() => {
    provider.setFallbackEnabled(true);
  });

  it('goToDefinition (无mock) → found=false', async () => {
    const result = await provider.goToDefinition('test.ts', { line: 5, character: 10 });
    expect(result.found).toBe(false);
    expect(result.locations.length).toBe(0);
  });

  it('goToDefinition (有mock) → 返回mock数据', async () => {
    const loc = InMemoryLspProvider.makeLocation('def.ts', 10, 0, 10, 5);
    provider.setMockDefinition('test.ts:5:10', { locations: [loc], found: true });
    const result = await provider.goToDefinition('test.ts', { line: 5, character: 10 });
    expect(result.found).toBe(true);
    expect(result.locations[0].filePath).toBe('def.ts');
  });

  it('findReferences → 返回mock引用', async () => {
    const ref = InMemoryLspProvider.makeReference(
      InMemoryLspProvider.makeLocation('ref.ts', 20, 0, 20, 5),
      false,
      'import foo'
    );
    provider.setMockReferences('test.ts:5:10:true', { references: [ref], totalReferences: 1 });
    const result = await provider.findReferences('test.ts', { line: 5, character: 10 }, true);
    expect(result.totalReferences).toBe(1);
    expect(result.references[0].contextLine).toBe('import foo');
  });

  it('hover → 返回签名+文档', async () => {
    provider.setMockHover('test.ts:5:10', {
      signature: 'function add(a: number, b: number): number',
      documentation: 'Adds two numbers',
      found: true
    });
    const result = await provider.hover('test.ts', { line: 5, character: 10 });
    expect(result.found).toBe(true);
    expect(result.signature).toContain('add');
  });

  it('documentSymbol → 返回符号列表', async () => {
    const sym = InMemoryLspProvider.makeSymbol('MyClass', 'class', 0);
    provider.setMockSymbols('test.ts', { symbols: [sym], totalSymbols: 1 });
    const result = await provider.documentSymbol('test.ts');
    expect(result.totalSymbols).toBe(1);
    expect(result.symbols[0].name).toBe('MyClass');
  });

  it('diagnostics → 返回诊断列表+统计', async () => {
    const diag = InMemoryLspProvider.makeDiagnostic('Unused variable', 'warning', 5, 'typescript');
    provider.setMockDiagnostics('test.ts', {
      diagnostics: [diag],
      totalDiagnostics: 1,
      bySeverity: { error: 0, warning: 1, information: 0, hint: 0 }
    });
    const result = await provider.diagnostics('test.ts');
    expect(result.totalDiagnostics).toBe(1);
    expect(result.bySeverity.warning).toBe(1);
  });

  it('completion → 返回补全列表', async () => {
    const comp = InMemoryLspProvider.makeCompletion('add', 'function', 'function add(a, b)');
    provider.setMockCompletion('test.ts:5:10', { items: [comp], isIncomplete: false });
    const result = await provider.completion('test.ts', { line: 5, character: 10 });
    expect(result.items.length).toBe(1);
    expect(result.items[0].label).toBe('add');
  });

  it('fallback=false → throw Error', async () => {
    provider.setFallbackEnabled(false);
    await expect(provider.goToDefinition('test.ts', { line: 0, character: 0 })).rejects.toThrow(
      'No mock data'
    );
  });
});

// ============================================================
// 6 个 LSP 工具
// ============================================================

describe('lspGoToDefinitionTool', () => {
  let provider: InMemoryLspProvider;

  beforeEach(() => {
    provider = new InMemoryLspProvider();
  });

  it('有 lspProvider → 返回定义', async () => {
    const loc = InMemoryLspProvider.makeLocation('def.ts', 10, 0, 10, 5);
    provider.setMockDefinition('src.ts:3:5', { locations: [loc], found: true });
    const ctx = createContext(provider);
    const result = await lspGoToDefinitionTool.call(
      { filePath: 'src.ts', position: { line: 3, character: 5 } },
      ctx
    );
    expect(result.data.found).toBe(true);
    expect(result.data.locations.length).toBe(1);
  });

  it('无 lspProvider → error', async () => {
    const ctx = createContext();
    const result = await lspGoToDefinitionTool.call(
      { filePath: 'src.ts', position: { line: 0, character: 0 } },
      ctx
    );
    expect(result.error).toContain('No LspProvider');
  });
});

describe('lspFindReferencesTool', () => {
  let provider: InMemoryLspProvider;

  beforeEach(() => {
    provider = new InMemoryLspProvider();
  });

  it('有 lspProvider → 返回引用', async () => {
    const ref = InMemoryLspProvider.makeReference(
      InMemoryLspProvider.makeLocation('ref.ts', 20, 0, 20, 5),
      true
    );
    provider.setMockReferences('src.ts:3:5:true', { references: [ref], totalReferences: 1 });
    const ctx = createContext(provider);
    const result = await lspFindReferencesTool.call(
      { filePath: 'src.ts', position: { line: 3, character: 5 }, includeDeclaration: true },
      ctx
    );
    expect(result.data.totalReferences).toBe(1);
  });

  it('无 lspProvider → error', async () => {
    const ctx = createContext();
    const result = await lspFindReferencesTool.call(
      { filePath: 'src.ts', position: { line: 0, character: 0 }, includeDeclaration: true },
      ctx
    );
    expect(result.error).toContain('No LspProvider');
  });
});

describe('lspHoverTool', () => {
  let provider: InMemoryLspProvider;

  beforeEach(() => {
    provider = new InMemoryLspProvider();
  });

  it('有 lspProvider → 返回hover信息', async () => {
    provider.setMockHover('src.ts:3:5', {
      signature: 'function foo(): void',
      documentation: 'A function',
      found: true
    });
    const ctx = createContext(provider);
    const result = await lspHoverTool.call(
      { filePath: 'src.ts', position: { line: 3, character: 5 } },
      ctx
    );
    expect(result.data.found).toBe(true);
    expect(result.data.signature).toContain('foo');
  });

  it('无 lspProvider → error', async () => {
    const ctx = createContext();
    const result = await lspHoverTool.call(
      { filePath: 'src.ts', position: { line: 0, character: 0 } },
      ctx
    );
    expect(result.error).toContain('No LspProvider');
  });
});

describe('lspDocumentSymbolTool', () => {
  let provider: InMemoryLspProvider;

  beforeEach(() => {
    provider = new InMemoryLspProvider();
  });

  it('有 lspProvider → 返回符号', async () => {
    const sym = InMemoryLspProvider.makeSymbol('MyClass', 'class', 0, [
      InMemoryLspProvider.makeSymbol('myMethod', 'method', 2)
    ]);
    provider.setMockSymbols('src.ts', { symbols: [sym], totalSymbols: 2 });
    const ctx = createContext(provider);
    const result = await lspDocumentSymbolTool.call({ filePath: 'src.ts' }, ctx);
    expect(result.data.totalSymbols).toBe(2);
    expect(result.data.symbols[0].children!.length).toBe(1);
  });
});

describe('lspDiagnosticsTool', () => {
  let provider: InMemoryLspProvider;

  beforeEach(() => {
    provider = new InMemoryLspProvider();
  });

  it('有 lspProvider → 返回诊断', async () => {
    provider.setMockDiagnostics('src.ts', {
      diagnostics: [
        InMemoryLspProvider.makeDiagnostic('Type error', 'error', 5, 'ts'),
        InMemoryLspProvider.makeDiagnostic('Unused var', 'warning', 10, 'ts')
      ],
      totalDiagnostics: 2,
      bySeverity: { error: 1, warning: 1, information: 0, hint: 0 }
    });
    const ctx = createContext(provider);
    const result = await lspDiagnosticsTool.call({ filePath: 'src.ts' }, ctx);
    expect(result.data.totalDiagnostics).toBe(2);
    expect(result.data.bySeverity.error).toBe(1);
  });

  it('workspace diagnostics (filePath undefined)', async () => {
    provider.setMockDiagnostics('all', {
      diagnostics: [],
      totalDiagnostics: 0,
      bySeverity: { error: 0, warning: 0, information: 0, hint: 0 }
    });
    const ctx = createContext(provider);
    const result = await lspDiagnosticsTool.call({}, ctx);
    expect(result.data.totalDiagnostics).toBe(0);
  });
});

describe('lspCompletionTool', () => {
  let provider: InMemoryLspProvider;

  beforeEach(() => {
    provider = new InMemoryLspProvider();
  });

  it('有 lspProvider → 返回补全', async () => {
    provider.setMockCompletion('src.ts:3:5', {
      items: [
        InMemoryLspProvider.makeCompletion('foo', 'function', 'function foo()'),
        InMemoryLspProvider.makeCompletion('bar', 'variable', 'const bar = 1')
      ],
      isIncomplete: false
    });
    const ctx = createContext(provider);
    const result = await lspCompletionTool.call(
      { filePath: 'src.ts', position: { line: 3, character: 5 } },
      ctx
    );
    expect(result.data.items.length).toBe(2);
    expect(result.data.isIncomplete).toBe(false);
  });
});
