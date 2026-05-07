/**
 * Diff/Patch 工具 — G5 缺口补全
 *
 * 对齐 Claude Code 的 diff 工具集:
 *
 * 1. structuredPatch — 生成结构化 diff ( hunks: {oldStart, newStart, lines} )
 * 2. getPatchForEdit — 从 oldString/newString 生成 diff patch
 * 3. getSnippet — 从 patch 中提取指定范围的上下文 snippet
 * 4. formatPatch — 将结构化 patch 格式化为可读文本
 * 5. applyPatch — 将 patch 应用到原始内容
 * 6. reversePatch — 反转 patch（用于回滚）
 *
 * 参考 Claude Code src/utils/diff.ts
 *
 * 算法基于 Myers diff algorithm 的简化实现， 对于 Edit 工具场景（局部字符串替换），使用 LCS (最长公共子序列) 算法。
 */

// ============================================================
// 1. 基础类型
// ============================================================

/** Diff 行类型 */
export type DiffLineType = 'add' | 'remove' | 'context';

/** Diff 行 */
export interface DiffLine {
  /** 行类型 */
  type: DiffLineType;
  /** 行内容（不含换行符） */
  content: string;
  /** 旧文件行号（仅 context/remove 行） */
  oldLineNumber?: number;
  /** 新文件行号（仅 context/add 行） */
  newLineNumber?: number;
}

/** Diff Hunk（变更块） */
export interface DiffHunk {
  /** 旧文件起始行号 */
  oldStart: number;
  /** 旧文件行数 */
  oldLines: number;
  /** 新文件起始行号 */
  newStart: number;
  /** 新文件行数 */
  newLines: number;
  /** Hunk 内的 diff 行 */
  lines: DiffLine[];
}

/** 结构化 Patch */
export interface StructuredPatch {
  /** 旧文件名 */
  oldFileName: string;
  /** 新文件名 */
  newFileName: string;
  /** Hunk 列表 */
  hunks: DiffHunk[];
}

/** Snippet — 从 patch 中提取的上下文片段 */
export interface DiffSnippet {
  /** 行范围（旧文件） */
  oldStart: number;
  oldEnd: number;
  /** 行范围（新文件） */
  newStart: number;
  newEnd: number;
  /** snippet 内容 */
  lines: DiffLine[];
  /** 是否有更多上下文在上方 */
  hasMoreAbove: boolean;
  /** 是否有更多上下文在下方 */
  hasMoreBelow: boolean;
}

// ============================================================
// 2. LCS Diff 算法
// ============================================================

/**
 * 计算 LCS (最长公共子序列) 长度表
 *
 * 用于生成 diff 的核心算法：
 *
 * - 将文本按行分割
 * - 计算 LCS 长度表
 * - 从 LCS 表回溯生成 diff 行
 */
function computeLcsTable(oldLines: string[], newLines: string[]): number[][] {
  const m = oldLines.length;
  const n = newLines.length;
  const table: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        table[i][j] = table[i - 1][j - 1] + 1;
      } else {
        table[i][j] = Math.max(table[i - 1][j], table[i][j - 1]);
      }
    }
  }

  return table;
}

/** 从 LCS 表回溯生成 diff 行 */
function backtrackLcs(table: number[][], oldLines: string[], newLines: string[]): DiffLine[] {
  const result: DiffLine[] = [];
  let i = oldLines.length;
  let j = newLines.length;

  // 先收集所有 diff 操作（从后往前）
  const ops: DiffLine[] = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      ops.push({
        type: 'context',
        content: oldLines[i - 1],
        oldLineNumber: i,
        newLineNumber: j
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || table[i][j - 1] >= table[i - 1][j])) {
      ops.push({
        type: 'add',
        content: newLines[j - 1],
        newLineNumber: j
      });
      j--;
    } else if (i > 0) {
      ops.push({
        type: 'remove',
        content: oldLines[i - 1],
        oldLineNumber: i
      });
      i--;
    }
  }

  // 反转（因为是从后往前收集的）
  ops.reverse();

  // 合并连续行号
  let oldLine = 1;
  let newLine = 1;
  for (const op of ops) {
    const line: DiffLine = { ...op };
    if (line.type === 'context') {
      line.oldLineNumber = oldLine;
      line.newLineNumber = newLine;
      oldLine++;
      newLine++;
    } else if (line.type === 'remove') {
      line.oldLineNumber = oldLine;
      oldLine++;
    } else if (line.type === 'add') {
      line.newLineNumber = newLine;
      newLine++;
    }
    result.push(line);
  }

  return result;
}

// ============================================================
// 3. structuredPatch — 生成结构化 diff
// ============================================================

/**
 * structuredPatch — 从旧内容和新内容生成结构化 patch
 *
 * @param oldFileName 旧文件名
 * @param newFileName 新文件名
 * @param oldContent 旧文件内容
 * @param newContent 新文件内容
 * @param contextLines 上下文行数（默认3）
 */
export function structuredPatch(
  oldFileName: string,
  newFileName: string,
  oldContent: string,
  newContent: string,
  contextLines: number = 3
): StructuredPatch {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');

  const lcsTable = computeLcsTable(oldLines, newLines);
  const diffLines = backtrackLcs(lcsTable, oldLines, newLines);

  // 将 diff lines 分组为 hunks
  const hunks = groupDiffLinesIntoHunks(diffLines, contextLines);

  return {
    oldFileName,
    newFileName,
    hunks
  };
}

/**
 * 将 diff 行分组为 hunks
 *
 * 规则：
 *
 * - 连续的 add/remove 行形成一个变更区域
 * - 每个变更区域前后添加 contextLines 行的上下文
 * - 相邻变更区域的上下文重叠时合并为一个 hunk
 */
function groupDiffLinesIntoHunks(diffLines: DiffLine[], contextLines: number): DiffHunk[] {
  if (diffLines.length === 0) return [];

  // 找出所有变更区域（add/remove 行的连续段）
  const changeRanges: { start: number; end: number }[] = [];
  let inChange = false;
  let changeStart = 0;

  for (let i = 0; i < diffLines.length; i++) {
    const line = diffLines[i];
    if (line.type === 'add' || line.type === 'remove') {
      if (!inChange) {
        changeStart = i;
        inChange = true;
      }
    } else if (inChange) {
      changeRanges.push({ start: changeStart, end: i - 1 });
      inChange = false;
    }
  }
  if (inChange) {
    changeRanges.push({ start: changeStart, end: diffLines.length - 1 });
  }

  if (changeRanges.length === 0) return [];

  // 为每个变更区域扩展上下文并合并重叠的 hunks
  const hunks: DiffHunk[] = [];
  let currentHunkStart = Math.max(0, changeRanges[0].start - contextLines);
  let currentHunkEnd = Math.min(diffLines.length - 1, changeRanges[0].end + contextLines);

  // 计算旧/新文件的起始行号
  let oldStart = 0;
  let newStart = 0;

  // 找到 hunk 起始位置的行号
  for (let i = 0; i < currentHunkStart; i++) {
    const line = diffLines[i];
    if (line.type === 'context' || line.type === 'remove') oldStart++;
    if (line.type === 'context' || line.type === 'add') newStart++;
  }
  oldStart += 1;
  newStart += 1;

  for (let r = 1; r < changeRanges.length; r++) {
    const rangeStart = Math.max(0, changeRanges[r].start - contextLines);
    const rangeEnd = Math.min(diffLines.length - 1, changeRanges[r].end + contextLines);

    // 如果与当前 hunk 重叠 → 合并
    if (rangeStart <= currentHunkEnd + 1) {
      currentHunkEnd = rangeEnd;
    } else {
      // 不重叠 → 提交当前 hunk，开始新 hunk
      hunks.push(buildHunk(diffLines, currentHunkStart, currentHunkEnd, oldStart, newStart));

      // 计算新 hunk 的行号偏移
      let oldCount = 0;
      let newCount = 0;
      for (let i = currentHunkEnd + 1; i < rangeStart; i++) {
        const line = diffLines[i];
        if (line.type === 'context' || line.type === 'remove') oldCount++;
        if (line.type === 'context' || line.type === 'add') newCount++;
      }
      oldStart += oldCount;
      newStart += newCount;

      // 还需要加上前一个 hunk 内的变更行数偏移
      // prevHunk = hunks[hunks.length - 1]; // 保留偏移逻辑
      oldStart = 1;
      newStart = 1;
      // 从 diffLines 开头到 rangeStart 重新计数
      for (let i = 0; i < rangeStart; i++) {
        const line = diffLines[i];
        if (line.type === 'context' || line.type === 'remove') oldStart++;
        if (line.type === 'context' || line.type === 'add') newStart++;
      }

      currentHunkStart = rangeStart;
      currentHunkEnd = rangeEnd;
    }
  }

  // 提交最后一个 hunk
  hunks.push(buildHunk(diffLines, currentHunkStart, currentHunkEnd, oldStart, newStart));

  return hunks;
}

/** 从 diff lines 范围构建一个 hunk */
function buildHunk(
  diffLines: DiffLine[],
  startIdx: number,
  endIdx: number,
  oldStart: number,
  newStart: number
): DiffHunk {
  const lines = diffLines.slice(startIdx, endIdx + 1);
  const oldLines = lines.filter(l => l.type === 'context' || l.type === 'remove').length;
  const newLines = lines.filter(l => l.type === 'context' || l.type === 'add').length;

  // 重新编号
  let ol = oldStart;
  let nl = newStart;
  const renumberedLines: DiffLine[] = lines.map(l => ({
    ...l,
    oldLineNumber: l.type === 'context' || l.type === 'remove' ? ol++ : undefined,
    newLineNumber: l.type === 'context' || l.type === 'add' ? nl++ : undefined
  }));

  return {
    oldStart,
    oldLines,
    newStart,
    newLines,
    lines: renumberedLines
  };
}

// ============================================================
// 4. getPatchForEdit — 从字符串替换生成 diff
// ============================================================

/**
 * getPatchForEdit — 从 oldString/newString 替换生成 diff patch
 *
 * 专门用于 FileEdit 工具的场景： 找到 oldString 在 oldContent 中的位置，生成只包含该替换区域的 patch。
 *
 * @param filePath 文件路径
 * @param oldContent 编辑前的完整文件内容
 * @param oldString 要替换的旧字符串
 * @param newString 替换的新字符串
 * @param replaceAll 是否全部替换
 */
export function getPatchForEdit(
  filePath: string,
  oldContent: string,
  oldString: string,
  newString: string,
  replaceAll: boolean = false
): StructuredPatch {
  if (replaceAll) {
    // 全部替换 → 直接对比 oldContent 和 newContent
    const newContent = oldContent.replaceAll(oldString, newString);
    return structuredPatch(filePath, filePath, oldContent, newContent);
  }

  // 单次替换 → 找到位置后生成局部 diff
  const newContent = oldContent.replace(oldString, newString);
  return structuredPatch(filePath, filePath, oldContent, newContent);
}

// ============================================================
// 5. getSnippet — 从 patch 提取上下文片段
// ============================================================

/**
 * getSnippet — 从 patch 中提取指定行号范围的上下文片段
 *
 * @param patch 结构化 patch
 * @param startLine 起始行号（旧文件）
 * @param endLine 结束行号（旧文件）
 * @param contextLines 上下文行数（默认3）
 */
export function getSnippet(
  patch: StructuredPatch,
  startLine: number,
  endLine: number,
  contextLines: number = 3
): DiffSnippet {
  // 找到包含指定行号范围的 hunk
  let snippetLines: DiffLine[] = [];
  let snippetOldStart = startLine;
  let snippetNewStart = startLine;
  let hasMoreAbove = false;
  let hasMoreBelow = false;

  for (const hunk of patch.hunks) {
    // 检查 hunk 是否包含指定范围
    const hunkOldEnd = hunk.oldStart + hunk.oldLines - 1;
    if (hunk.oldStart <= endLine && hunkOldEnd >= startLine) {
      // 找到重叠的 hunk → 提取上下文

      // 添加上下文行
      const hunkStartIdx = hunk.lines.findIndex(
        l => l.oldLineNumber === startLine || (l.type === 'add' && l.newLineNumber !== undefined)
      );

      const ctxStart = Math.max(0, hunkStartIdx - contextLines);
      const ctxEnd = Math.min(
        hunk.lines.length - 1,
        hunkStartIdx + (endLine - startLine) + contextLines
      );

      snippetLines = hunk.lines.slice(ctxStart, ctxEnd + 1);
      snippetOldStart = snippetLines[0]?.oldLineNumber ?? hunk.oldStart;
      snippetNewStart = snippetLines[0]?.newLineNumber ?? hunk.newStart;
      hasMoreAbove = ctxStart > 0;
      hasMoreBelow = ctxEnd < hunk.lines.length - 1;

      break;
    }
  }

  const snippetOldEnd =
    snippetLines.filter(l => l.oldLineNumber !== undefined).pop()?.oldLineNumber ?? startLine;
  const snippetNewEnd =
    snippetLines.filter(l => l.newLineNumber !== undefined).pop()?.newLineNumber ?? startLine;

  return {
    oldStart: snippetOldStart,
    oldEnd: snippetOldEnd,
    newStart: snippetNewStart,
    newEnd: snippetNewEnd,
    lines: snippetLines,
    hasMoreAbove,
    hasMoreBelow
  };
}

// ============================================================
// 6. formatPatch — 格式化 patch 为可读文本
// ============================================================

/**
 * formatPatch — 将结构化 patch 格式化为 unified diff 格式文本
 *
 * 输出格式（与 git diff 一致）:
 *
 * --- oldFileName +++ newFileName
 *
 * @@ -oldStart,oldLines +newStart,newLines @@
 *  context line
 * -removed line
 * +added line
 */
export function formatPatch(patch: StructuredPatch): string {
  const lines: string[] = [];

  lines.push(`--- ${patch.oldFileName}`);
  lines.push(`+++ ${patch.newFileName}`);

  for (const hunk of patch.hunks) {
    lines.push(`@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`);

    for (const line of hunk.lines) {
      if (line.type === 'context') {
        lines.push(` ${line.content}`);
      } else if (line.type === 'remove') {
        lines.push(`-${line.content}`);
      } else if (line.type === 'add') {
        lines.push(`+${line.content}`);
      }
    }
  }

  return lines.join('\n');
}

// ============================================================
// 7. applyPatch — 将 patch 应用到原始内容
// ============================================================

/**
 * applyPatch — 将结构化 patch 应用到原始内容
 *
 * @param originalContent 原始文件内容
 * @param patch 结构化 patch
 * @returns 应用后的新内容
 */
export function applyPatch(originalContent: string, patch: StructuredPatch): string {
  const originalLines = originalContent.split('\n');
  const resultLines: string[] = [];

  let currentOldLine = 1;

  for (const hunk of patch.hunks) {
    // 复制 hunk 前的上下文行
    while (currentOldLine < hunk.oldStart) {
      resultLines.push(originalLines[currentOldLine - 1]);
      currentOldLine++;
    }

    // 应用 hunk 内的行
    for (const line of hunk.lines) {
      if (line.type === 'context') {
        resultLines.push(originalLines[currentOldLine - 1]);
        currentOldLine++;
      } else if (line.type === 'remove') {
        currentOldLine++;
      } else if (line.type === 'add') {
        resultLines.push(line.content);
      }
    }
  }

  // 复制最后一个 hunk 后的剩余行
  while (currentOldLine <= originalLines.length) {
    resultLines.push(originalLines[currentOldLine - 1]);
    currentOldLine++;
  }

  return resultLines.join('\n');
}

// ============================================================
// 8. reversePatch — 反转 patch（用于回滚）
// ============================================================

/**
 * reversePatch — 反转 patch（swap add/remove，swap old/new 行号）
 *
 * 用于 undo 回滚：将 "old→new" 的 patch 反转为 "new→old"
 */
export function reversePatch(patch: StructuredPatch): StructuredPatch {
  return {
    oldFileName: patch.newFileName,
    newFileName: patch.oldFileName,
    hunks: patch.hunks.map(hunk => ({
      oldStart: hunk.newStart,
      oldLines: hunk.newLines,
      newStart: hunk.oldStart,
      newLines: hunk.oldLines,
      lines: hunk.lines.map(line => {
        if (line.type === 'add') {
          return {
            type: 'remove',
            content: line.content,
            oldLineNumber: line.newLineNumber,
            newLineNumber: undefined
          };
        }
        if (line.type === 'remove') {
          return {
            type: 'add',
            content: line.content,
            oldLineNumber: undefined,
            newLineNumber: line.oldLineNumber
          };
        }
        return line;
      })
    }))
  };
}
