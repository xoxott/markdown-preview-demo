/**
 * Memory Shape Telemetry — 内存使用形态遥测
 *
 * 对齐 CC memdir/memoryShapeTelemetry.ts。在内存召回与写入时记录形态指标 （召回总数 / 选中数 / 来源分布 / 写入工具 / 写入作用域），用于分析模型如何
 * 使用 memory，定位 prompt 设计/召回算法/scope 划分问题。
 */

// ============================================================
// 类型
// ============================================================

/** 内存项简化形态 */
export interface MemoryItem {
  readonly id?: string;
  readonly source?: 'auto' | 'project' | 'user' | 'team' | 'remote';
  readonly tags?: readonly string[];
  readonly tokens?: number;
}

/** 内存写入工具 */
export type MemoryWriteTool = 'FileWrite' | 'FileEdit' | 'NotebookEdit' | string;

/** 内存写入作用域 */
export type MemoryWriteScope = 'auto' | 'project' | 'user' | 'team' | 'unknown';

/** 召回形态事件 */
export interface MemoryRecallShapeEvent {
  readonly type: 'memory_recall_shape';
  readonly totalCount: number;
  readonly selectedCount: number;
  readonly selectedRate: number;
  readonly bySource: Readonly<Record<string, number>>;
  readonly totalTokens: number;
  readonly selectedTokens: number;
  readonly timestamp: number;
}

/** 写入形态事件 */
export interface MemoryWriteShapeEvent {
  readonly type: 'memory_write_shape';
  readonly tool: MemoryWriteTool;
  readonly scope: MemoryWriteScope;
  readonly filePath: string;
  readonly contentLength: number;
  readonly timestamp: number;
}

export type MemoryShapeEvent = MemoryRecallShapeEvent | MemoryWriteShapeEvent;

// ============================================================
// 抽样器
// ============================================================

/** 形态遥测发射器 — 由宿主提供（接入 logEvent / Datadog） */
export interface MemoryShapeTelemetrySink {
  emit(event: MemoryShapeEvent): void;
}

const NULL_SINK: MemoryShapeTelemetrySink = { emit: () => undefined };

let globalSink: MemoryShapeTelemetrySink = NULL_SINK;

/** 注册全局 sink */
export function setMemoryShapeTelemetrySink(sink: MemoryShapeTelemetrySink): void {
  globalSink = sink ?? NULL_SINK;
}

/** 重置（测试用） */
export function resetMemoryShapeTelemetrySink(): void {
  globalSink = NULL_SINK;
}

// ============================================================
// 召回形态
// ============================================================

function sumTokens(items: readonly MemoryItem[]): number {
  let total = 0;
  for (const item of items) {
    if (typeof item.tokens === 'number' && item.tokens > 0) {
      total += item.tokens;
    }
  }
  return total;
}

function countBySource(items: readonly MemoryItem[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const src = item.source ?? 'unknown';
    counts[src] = (counts[src] ?? 0) + 1;
  }
  return counts;
}

/**
 * 记录一次内存召回的形态
 *
 * @param memories 召回的所有内存（候选）
 * @param selected 实际注入到 prompt 的内存
 */
export function logMemoryRecallShape(
  memories: readonly MemoryItem[],
  selected: readonly MemoryItem[]
): MemoryRecallShapeEvent {
  const totalCount = memories.length;
  const selectedCount = selected.length;
  const event: MemoryRecallShapeEvent = {
    type: 'memory_recall_shape',
    totalCount,
    selectedCount,
    selectedRate: totalCount > 0 ? selectedCount / totalCount : 0,
    bySource: countBySource(memories),
    totalTokens: sumTokens(memories),
    selectedTokens: sumTokens(selected),
    timestamp: Date.now()
  };
  globalSink.emit(event);
  return event;
}

// ============================================================
// 写入形态
// ============================================================

/** 检测路径属于哪个 memory scope（启发式） */
export function detectMemoryScope(filePath: string): MemoryWriteScope {
  const normalized = filePath.replace(/\\/g, '/');
  if (normalized.includes('/agent-memory/')) return 'auto';
  if (/\/CLAUDE(\.local)?\.md$/.test(normalized)) {
    return normalized.includes('.local.') ? 'user' : 'project';
  }
  if (normalized.includes('/team_memory/') || normalized.includes('/team-memory/')) {
    return 'team';
  }
  if (normalized.includes('/.claude/')) return 'project';
  return 'unknown';
}

/**
 * 记录一次内存写入的形态
 *
 * @param tool 工具名（FileWrite/FileEdit/...）
 * @param toolInput 工具输入（用于推导 contentLength）
 * @param filePath 文件路径
 * @param scope 显式作用域；未指定时自动检测
 */
export function logMemoryWriteShape(
  tool: MemoryWriteTool,
  toolInput: { content?: string; new_string?: string },
  filePath: string,
  scope?: MemoryWriteScope
): MemoryWriteShapeEvent {
  const content = toolInput.content ?? toolInput.new_string ?? '';
  const event: MemoryWriteShapeEvent = {
    type: 'memory_write_shape',
    tool,
    scope: scope ?? detectMemoryScope(filePath),
    filePath,
    contentLength: content.length,
    timestamp: Date.now()
  };
  globalSink.emit(event);
  return event;
}
