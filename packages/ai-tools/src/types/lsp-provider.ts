/**
 * G2: LSP (Language Server Protocol) Provider 接口
 *
 * 定义 6 个核心 LSP 操作的宿主注入接口:
 *
 * 1. goToDefinition — 跳转到定义
 * 2. findReferences — 查找引用
 * 3. hover — 获取悬停信息
 * 4. documentSymbol — 文档符号列表
 * 5. diagnostics — 代码诊断
 * 6. completion — 代码补全
 *
 * 实际 LSP 连接由宿主环境实现（连接到语言服务器进程）。
 */

// ============================================================
// 通用类型
// ============================================================

/** 文件位置（行号+字符号，0-based） */
export interface LspPosition {
  /** 行号（0-based） */
  readonly line: number;
  /** 字符号（0-based） */
  readonly character: number;
}

/** 文件范围 */
export interface LspRange {
  /** 起始位置 */
  readonly start: LspPosition;
  /** 结束位置 */
  readonly end: LspPosition;
}

/** 位置链接（定义/引用的目标位置） */
export interface LspLocationLink {
  /** 目标文件路径 */
  readonly filePath: string;
  /** 目标范围 */
  readonly targetRange: LspRange;
  /** 目标选择范围（用户可见的范围） */
  readonly targetSelectionRange: LspRange;
  /** 原始选择范围（可选） */
  readonly originSelectionRange?: LspRange;
}

// ============================================================
// 1. goToDefinition 结果
// ============================================================

/** goToDefinition 结果 */
export interface LspGoToDefinitionResult {
  /** 定义位置列表 */
  readonly locations: readonly LspLocationLink[];
  /** 是否有结果 */
  readonly found: boolean;
}

// ============================================================
// 2. findReferences 结果
// ============================================================

/** 引用信息 */
export interface LspReferenceInfo {
  /** 引用位置 */
  readonly location: LspLocationLink;
  /** 是否为定义（而非引用） */
  readonly isDefinition: boolean;
  /** 上下文行（可选） */
  readonly contextLine?: string;
}

/** findReferences 结果 */
export interface LspFindReferencesResult {
  /** 引用列表 */
  readonly references: readonly LspReferenceInfo[];
  /** 总引用数 */
  readonly totalReferences: number;
}

// ============================================================
// 3. hover 结果
// ============================================================

/** hover 结果 */
export interface LspHoverResult {
  /** 类型签名（如函数签名） */
  readonly signature: string;
  /** 文档内容（Markdown） */
  readonly documentation?: string;
  /** 覆盖范围 */
  readonly range?: LspRange;
  /** 是否有结果 */
  readonly found: boolean;
}

// ============================================================
// 4. documentSymbol 结果
// ============================================================

/** 符号类型（对齐 LSP SymbolKind） */
export type LspSymbolKind =
  | 'file'
  | 'module'
  | 'namespace'
  | 'package'
  | 'class'
  | 'method'
  | 'property'
  | 'field'
  | 'constructor'
  | 'enum'
  | 'interface'
  | 'function'
  | 'variable'
  | 'constant'
  | 'string'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object'
  | 'key'
  | 'null'
  | 'enumMember'
  | 'struct'
  | 'event'
  | 'operator'
  | 'typeParameter';

/** 文档符号 */
export interface LspDocumentSymbol {
  /** 符号名称 */
  readonly name: string;
  /** 符号类型 */
  readonly kind: LspSymbolKind;
  /** 符号范围 */
  readonly range: LspRange;
  /** 选择范围（用户可见） */
  readonly selectionRange: LspRange;
  /** 子符号（层级结构） */
  readonly children?: readonly LspDocumentSymbol[];
}

/** documentSymbol 结果 */
export interface LspDocumentSymbolResult {
  /** 符号列表 */
  readonly symbols: readonly LspDocumentSymbol[];
  /** 总符号数 */
  readonly totalSymbols: number;
}

// ============================================================
// 5. diagnostics 结果
// ============================================================

/** 诊断严重级别 */
export type LspDiagnosticSeverity = 'error' | 'warning' | 'information' | 'hint';

/** 诊断项 */
export interface LspDiagnosticItem {
  /** 严重级别 */
  readonly severity: LspDiagnosticSeverity;
  /** 诊断消息 */
  readonly message: string;
  /** 覆盖范围 */
  readonly range: LspRange;
  /** 诊断来源（如 'typescript', 'eslint'） */
  readonly source?: string;
  /** 诊断代码（可选） */
  readonly code?: string | number;
  /** 相关信息（可选） */
  readonly relatedInformation?: readonly {
    readonly location: LspLocationLink;
    readonly message: string;
  }[];
}

/** diagnostics 结果 */
export interface LspDiagnosticsResult {
  /** 诊断列表 */
  readonly diagnostics: readonly LspDiagnosticItem[];
  /** 总诊断数 */
  readonly totalDiagnostics: number;
  /** 按严重级别统计 */
  readonly bySeverity: Record<LspDiagnosticSeverity, number>;
}

// ============================================================
// 6. completion 结果
// ============================================================

/** 补全项类型 */
export type LspCompletionItemKind =
  | 'text'
  | 'method'
  | 'function'
  | 'constructor'
  | 'field'
  | 'variable'
  | 'class'
  | 'interface'
  | 'module'
  | 'property'
  | 'unit'
  | 'value'
  | 'enum'
  | 'keyword'
  | 'snippet'
  | 'color'
  | 'file'
  | 'reference'
  | 'folder'
  | 'enumMember'
  | 'constant'
  | 'struct'
  | 'event'
  | 'operator'
  | 'typeParameter';

/** 补全项 */
export interface LspCompletionItem {
  /** 补全标签 */
  readonly label: string;
  /** 补全类型 */
  readonly kind: LspCompletionItemKind;
  /** 详细信息 */
  readonly detail?: string;
  /** 文档（Markdown） */
  readonly documentation?: string;
  /** 插入文本 */
  readonly insertText?: string;
  /** 是否推荐（高优先级） */
  readonly sortText?: string;
}

/** completion 结果 */
export interface LspCompletionResult {
  /** 补全列表 */
  readonly items: readonly LspCompletionItem[];
  /** 是否不完整（需要再次请求） */
  readonly isIncomplete: boolean;
}

// ============================================================
// LspProvider 接口
// ============================================================

/**
 * LspProvider — LSP 操作的宿主注入接口
 *
 * 宿主环境需要实现此接口，连接到实际的 LSP 语言服务器进程。 测试环境使用 InMemoryLspProvider 提供模拟数据。
 */
export interface LspProvider {
  /** 跳转到定义 */
  goToDefinition(filePath: string, position: LspPosition): Promise<LspGoToDefinitionResult>;

  /** 查找引用 */
  findReferences(
    filePath: string,
    position: LspPosition,
    includeDeclaration?: boolean
  ): Promise<LspFindReferencesResult>;

  /** 获取悬停信息 */
  hover(filePath: string, position: LspPosition): Promise<LspHoverResult>;

  /** 文档符号列表 */
  documentSymbol(filePath: string): Promise<LspDocumentSymbolResult>;

  /** 代码诊断 */
  diagnostics(filePath?: string): Promise<LspDiagnosticsResult>;

  /** 代码补全 */
  completion(filePath: string, position: LspPosition): Promise<LspCompletionResult>;
}
