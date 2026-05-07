/**
 * SessionMemory 服务 — 自动维护笔记的 forked agent
 *
 * N25: 对齐 CC services/SessionMemory/ SessionMemory 是一种特殊的记忆层：
 *
 * - 自动维护会话期间的临时笔记
 * - 笔记内容在 compact 后保留（不会被压缩掉）
 * - 会话结束时可选择提取为持久记忆
 */

// ============================================================
// 类型定义
// ============================================================

/** SessionMemory 配置 */
export interface SessionMemoryConfig {
  readonly enabled: boolean;
  /** 笔记最大字符数（默认 4000） */
  readonly maxNotesChars: number;
  /** 是否在 compact 中保留（默认 true） */
  readonly preservedInCompact: boolean;
  /** 会话结束时是否提取为持久记忆（默认 true） */
  readonly extractOnSessionEnd: boolean;
}

export const DEFAULT_SESSION_MEMORY_CONFIG: SessionMemoryConfig = {
  enabled: true,
  maxNotesChars: 4000,
  preservedInCompact: true,
  extractOnSessionEnd: true
};

/** SessionMemory 笔记条目 */
export interface SessionNote {
  readonly id: string;
  readonly content: string;
  readonly category: 'observation' | 'decision' | 'progress' | 'context';
  readonly createdAt: number;
  readonly updatedAt: number;
}

/** SessionMemory 状态 */
export interface SessionMemoryState {
  readonly notes: readonly SessionNote[];
  readonly totalChars: number;
  readonly lastUpdated: number;
}

// ============================================================
// 核心函数
// ============================================================

/** createInitialSessionMemoryState — 创建初始状态 */
export function createInitialSessionMemoryState(): SessionMemoryState {
  return {
    notes: [],
    totalChars: 0,
    lastUpdated: Date.now()
  };
}

/** addSessionNote — 添加笔记 */
export function addSessionNote(
  state: SessionMemoryState,
  content: string,
  category: SessionNote['category']
): SessionMemoryState {
  const id = `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const now = Date.now();

  const note: SessionNote = {
    id,
    content,
    category,
    createdAt: now,
    updatedAt: now
  };

  // 检查字符上限
  const newTotalChars = state.totalChars + content.length;
  if (newTotalChars > DEFAULT_SESSION_MEMORY_CONFIG.maxNotesChars) {
    // 超限 → 移除最早的笔记
    const trimmedNotes = [...state.notes];
    let chars = newTotalChars;
    while (chars > DEFAULT_SESSION_MEMORY_CONFIG.maxNotesChars && trimmedNotes.length > 0) {
      chars -= trimmedNotes[0].content.length;
      trimmedNotes.shift();
    }
    return {
      notes: [...trimmedNotes, note],
      totalChars: chars,
      lastUpdated: now
    };
  }

  return {
    notes: [...state.notes, note],
    totalChars: newTotalChars,
    lastUpdated: now
  };
}

/** removeSessionNote — 移除笔记 */
export function removeSessionNote(state: SessionMemoryState, noteId: string): SessionMemoryState {
  const note = state.notes.find(n => n.id === noteId);
  if (!note) return state;

  return {
    notes: state.notes.filter(n => n.id !== noteId),
    totalChars: state.totalChars - note.content.length,
    lastUpdated: Date.now()
  };
}

/** formatSessionNotesForPrompt — 格式化为 prompt 注入文本 */
export function formatSessionNotesForPrompt(state: SessionMemoryState): string {
  if (state.notes.length === 0) return '';

  const lines: string[] = ['## Session Notes\n'];

  for (const note of state.notes) {
    lines.push(`[${note.category}] ${note.content}`);
  }

  return lines.join('\n');
}

/** buildSessionMemoryAutoSavePrompt — 构建自动保存提示 */
export function buildSessionMemoryAutoSavePrompt(
  observations: readonly string[],
  decisions: readonly string[]
): string {
  const lines: string[] = [];

  if (observations.length > 0) {
    lines.push('Observations:');
    for (const obs of observations) lines.push(`- ${obs}`);
  }

  if (decisions.length > 0) {
    lines.push('Decisions:');
    for (const dec of decisions) lines.push(`- ${dec}`);
  }

  return lines.join('\n');
}
