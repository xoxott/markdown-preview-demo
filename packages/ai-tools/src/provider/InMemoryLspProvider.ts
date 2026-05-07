/**
 * G2: InMemoryLspProvider — LSP 操作的内存模拟实现
 *
 * 用于测试环境，提供可编程的模拟 LSP 数据。 宿主可通过 setMock* 方法注入测试数据。
 */

import type {
  LspCompletionItem,
  LspCompletionResult,
  LspDiagnosticItem,
  LspDiagnosticsResult,
  LspDocumentSymbol,
  LspDocumentSymbolResult,
  LspFindReferencesResult,
  LspGoToDefinitionResult,
  LspHoverResult,
  LspLocationLink,
  LspPosition,
  LspProvider,
  LspReferenceInfo
} from '../types/lsp-provider';

export class InMemoryLspProvider implements LspProvider {
  // === 模拟数据存储 ===

  private mockDefinitions = new Map<string, LspGoToDefinitionResult>();
  private mockReferences = new Map<string, LspFindReferencesResult>();
  private mockHoverData = new Map<string, LspHoverResult>();
  private mockSymbols = new Map<string, LspDocumentSymbolResult>();
  private mockDiagnostics = new Map<string, LspDiagnosticsResult>();
  private mockCompletions = new Map<string, LspCompletionResult>();

  /** 通用 fallback 结果（未设置特定数据时使用） */
  private fallbackEnabled = true;

  // === 数据注入方法 ===

  /** 设置 goToDefinition 模拟数据（key: filePath:line:character） */
  setMockDefinition(key: string, result: LspGoToDefinitionResult): void {
    this.mockDefinitions.set(key, result);
  }

  /** 设置 findReferences 模拟数据 */
  setMockReferences(key: string, result: LspFindReferencesResult): void {
    this.mockReferences.set(key, result);
  }

  /** 设置 hover 模拟数据 */
  setMockHover(key: string, result: LspHoverResult): void {
    this.mockHoverData.set(key, result);
  }

  /** 设置 documentSymbol 模拟数据 */
  setMockSymbols(filePath: string, result: LspDocumentSymbolResult): void {
    this.mockSymbols.set(filePath, result);
  }

  /** 设置 diagnostics 模拟数据（key: filePath 或 'all'） */
  setMockDiagnostics(key: string, result: LspDiagnosticsResult): void {
    this.mockDiagnostics.set(key, result);
  }

  /** 设置 completion 模拟数据 */
  setMockCompletion(key: string, result: LspCompletionResult): void {
    this.mockCompletions.set(key, result);
  }

  /** 启用/禁用 fallback（未设置数据时的默认返回） */
  setFallbackEnabled(enabled: boolean): void {
    this.fallbackEnabled = enabled;
  }

  // === LspProvider 实现 ===

  async goToDefinition(filePath: string, position: LspPosition): Promise<LspGoToDefinitionResult> {
    const key = `${filePath}:${position.line}:${position.character}`;
    const mock = this.mockDefinitions.get(key);
    if (mock) return mock;

    if (this.fallbackEnabled) {
      return { locations: [], found: false };
    }
    throw new Error(`No mock data for goToDefinition: ${key}`);
  }

  async findReferences(
    filePath: string,
    position: LspPosition,
    includeDeclaration?: boolean
  ): Promise<LspFindReferencesResult> {
    const key = `${filePath}:${position.line}:${position.character}:${includeDeclaration ?? true}`;
    const mock = this.mockReferences.get(key);
    if (mock) return mock;

    if (this.fallbackEnabled) {
      return { references: [], totalReferences: 0 };
    }
    throw new Error(`No mock data for findReferences: ${key}`);
  }

  async hover(filePath: string, position: LspPosition): Promise<LspHoverResult> {
    const key = `${filePath}:${position.line}:${position.character}`;
    const mock = this.mockHoverData.get(key);
    if (mock) return mock;

    if (this.fallbackEnabled) {
      return { signature: '', found: false };
    }
    throw new Error(`No mock data for hover: ${key}`);
  }

  async documentSymbol(filePath: string): Promise<LspDocumentSymbolResult> {
    const mock = this.mockSymbols.get(filePath);
    if (mock) return mock;

    if (this.fallbackEnabled) {
      return { symbols: [], totalSymbols: 0 };
    }
    throw new Error(`No mock data for documentSymbol: ${filePath}`);
  }

  async diagnostics(filePath?: string): Promise<LspDiagnosticsResult> {
    const key = filePath ?? 'all';
    const mock = this.mockDiagnostics.get(key);
    if (mock) return mock;

    if (this.fallbackEnabled) {
      return {
        diagnostics: [],
        totalDiagnostics: 0,
        bySeverity: { error: 0, warning: 0, information: 0, hint: 0 }
      };
    }
    throw new Error(`No mock data for diagnostics: ${key}`);
  }

  async completion(filePath: string, position: LspPosition): Promise<LspCompletionResult> {
    const key = `${filePath}:${position.line}:${position.character}`;
    const mock = this.mockCompletions.get(key);
    if (mock) return mock;

    if (this.fallbackEnabled) {
      return { items: [], isIncomplete: false };
    }
    throw new Error(`No mock data for completion: ${key}`);
  }

  // === 辅助: 快捷构造函数 ===

  /** 创建含定义的 LspLocationLink */
  static makeLocation(
    filePath: string,
    startLine: number,
    startChar: number,
    endLine: number,
    endChar: number
  ): LspLocationLink {
    return {
      filePath,
      targetRange: {
        start: { line: startLine, character: startChar },
        end: { line: endLine, character: endChar }
      },
      targetSelectionRange: {
        start: { line: startLine, character: startChar },
        end: { line: startLine, character: endChar }
      }
    };
  }

  /** 创建含引用的 LspReferenceInfo */
  static makeReference(
    location: LspLocationLink,
    isDefinition: boolean = false,
    contextLine?: string
  ): LspReferenceInfo {
    return { location, isDefinition, contextLine };
  }

  /** 创建文档符号 */
  static makeSymbol(
    name: string,
    kind: import('../types/lsp-provider').LspSymbolKind,
    startLine: number,
    children?: readonly LspDocumentSymbol[]
  ): LspDocumentSymbol {
    return {
      name,
      kind,
      range: {
        start: { line: startLine, character: 0 },
        end: { line: startLine + 5, character: 0 }
      },
      selectionRange: {
        start: { line: startLine, character: 0 },
        end: { line: startLine, character: name.length }
      },
      children
    };
  }

  /** 创建诊断项 */
  static makeDiagnostic(
    message: string,
    severity: import('../types/lsp-provider').LspDiagnosticSeverity,
    line: number,
    source?: string
  ): LspDiagnosticItem {
    return {
      severity,
      message,
      range: {
        start: { line, character: 0 },
        end: { line, character: 50 }
      },
      source,
      code: undefined
    };
  }

  /** 创建补全项 */
  static makeCompletion(
    label: string,
    kind: import('../types/lsp-provider').LspCompletionItemKind,
    detail?: string
  ): LspCompletionItem {
    return { label, kind, detail };
  }
}
