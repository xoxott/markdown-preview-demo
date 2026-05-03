/**
 * Bash输出截断策略升级 — 尾部保留+磁盘持久化+搜索命令折叠
 *
 * 对齐 Claude Code BashTool 输出截断:
 *
 * 1. EndTruncatingAccumulator — 双段截断（头部+尾部保留，中间省略）
 *
 *    - 命令输出通常最关键的信息在开头（错误/状态）和结尾（最终结果）
 *    - 中间的大量日志/进度条可以省略
 * 2. toolResultStorage — 大输出磁盘持久化（避免内存溢出）
 *
 *    - 超过阈值时写入临时文件，只保留引用路径在结果中
 * 3. 搜索命令折叠 — grep/find/rg 等搜索命令结果自动折叠
 *
 *    - 搜索结果通常很大，只保留匹配摘要+行数统计
 *
 * 参考 Claude Code src/utils/bash/EndTruncatingAccumulator.ts
 */

// ============================================================
// 1. 双段截断（头部+尾部保留）
// ============================================================

/** 双段截断结果 */
export interface EndTruncateResult {
  /** 截断后的内容 */
  readonly content: string;
  /** 是否截断 */
  readonly truncated: boolean;
  /** 原始大小 */
  readonly originalSize: number;
  /** 保留的头部大小 */
  readonly headSize: number;
  /** 保留的尾部大小 */
  readonly tailSize: number;
  /** 省略的中间大小 */
  readonly omittedSize: number;
}

/**
 * truncateOutputWithTail — 双段截断（头部+尾部保留）
 *
 * 策略:
 *
 * - 总大小 <= maxSize → 不截断
 * - 总大小 > maxSize → 保留头部 headChars + 尾部 tailChars 中间省略，插入 "... (N lines omitted) ..."
 *
 * 对齐 Claude Code EndTruncatingAccumulator:
 *
 * - 默认 headChars = 70% maxSize, tailChars = 30% maxSize
 * - 尾部信息通常更重要（最终结果、错误提示）
 *
 * @param output 原始输出
 * @param maxSize 最大字符数
 * @param headRatio 头部保留比例(0-1, 默认0.7)
 */
export function truncateOutputWithTail(
  output: string,
  maxSize: number,
  headRatio = 0.7
): EndTruncateResult {
  const originalSize = output.length;

  if (originalSize <= maxSize) {
    return {
      content: output,
      truncated: false,
      originalSize,
      headSize: originalSize,
      tailSize: 0,
      omittedSize: 0
    };
  }

  // 计算头部和尾部保留大小
  const headChars = Math.floor(maxSize * headRatio);
  const tailChars = maxSize - headChars;

  // 中间省略提示
  const omittedSize = originalSize - headChars - tailChars;
  const omittedLines = estimateLineCount(output, headChars, originalSize - tailChars);

  const omittedNotice =
    omittedLines > 0
      ? `\n\n... (${omittedLines} lines omitted, ${omittedSize} chars total) ...\n\n`
      : `\n\n... (${omittedSize} chars omitted) ...\n\n`;

  // 调整可用空间（减去提示长度）
  const noticeLen = omittedNotice.length;
  const adjustedHead = Math.max(0, headChars - Math.floor(noticeLen * headRatio));
  const adjustedTail = Math.max(0, tailChars - Math.ceil(noticeLen * (1 - headRatio)));

  const headContent = output.substring(0, adjustedHead);
  const tailContent = output.substring(originalSize - adjustedTail);

  const content = headContent + omittedNotice + tailContent;

  return {
    content,
    truncated: true,
    originalSize,
    headSize: adjustedHead,
    tailSize: adjustedTail,
    omittedSize
  };
}

/** 估算省略区域的行数 */
function estimateLineCount(text: string, start: number, end: number): number {
  const slice = text.substring(start, Math.min(end, start + 200)); // 只看开头200字符估算
  const newlines = (slice.match(/\n/g) ?? []).length;
  const totalSliceChars = end - start;
  // 用开头200字符的换行密度估算整个区域
  if (slice.length === 0) return 0;
  const density = newlines / slice.length;
  return Math.round(density * totalSliceChars);
}

// ============================================================
// 2. 磁盘持久化（大输出暂存）
// ============================================================

/** 持久化阈值 — 超过此大小写入磁盘而非内存 */
const PERSIST_THRESHOLD_CHARS = 500_000; // 500KB

/** 持久化结果 */
export interface PersistResult {
  /** 截断后的摘要内容（含持久化引用提示） */
  readonly content: string;
  /** 是否持久化到磁盘 */
  readonly persisted: boolean;
  /** 原始大小 */
  readonly originalSize: number;
}

/** 持久化引用 — 大输出写入临时文件后的引用 */
export interface PersistentRef {
  readonly type: 'persistent_ref';
  readonly filePath: string;
  readonly originalSize: number;
  readonly lineCount: number;
}

/**
 * persistLargeOutput — 大输出磁盘持久化
 *
 * 当输出超过阈值时，写入临时文件并返回引用路径， 避免将500KB+的字符串直接放在结果对象中占用内存。
 *
 * 注: 实际文件写入由宿主的 fsProvider 完成， 此函数只决定是否需要持久化并提供摘要。
 *
 * @param output 原始输出
 * @param threshold 持久化阈值(默认500KB)
 * @param truncateSize 截断后保留在内存中的大小(默认100KB)
 */
export function persistLargeOutput(
  output: string,
  threshold = PERSIST_THRESHOLD_CHARS,
  truncateSize = 100_000
): PersistResult {
  if (output.length <= threshold) {
    return {
      content: output,
      persisted: false,
      originalSize: output.length
    };
  }

  // 超过阈值 → 截断为摘要 + 持久化引用
  const lineCount = (output.match(/\n/g) ?? []).length + 1;
  const truncated = truncateOutputWithTail(output, truncateSize, 0.8);

  // 在截断结果中添加持久化引用信息
  const refInfo = `\n\n[Full output persisted to temp file. ${output.length} chars, ${lineCount} lines total]`;

  const content = truncated.content + refInfo;

  return {
    content,
    persisted: true,
    originalSize: output.length
  };
}

// ============================================================
// 3. 搜索命令折叠
// ============================================================

/** 搜索命令类型 — 这些命令的输出需要折叠 */
const SEARCH_COMMANDS = ['grep', 'rg', 'find', 'ag', 'ack', 'glob', 'fd', 'locate'];

/** 搜索命令折叠结果 */
export interface SearchFoldResult {
  /** 投折叠的内容 */
  readonly content: string;
  /** 是否折叠 */
  readonly folded: boolean;
  /** 匹配行数 */
  readonly matchCount: number;
  /** 保留的头部行数 */
  readonly headLines: number;
  /** 保留的尾部行数 */
  readonly tailLines: number;
  /** 总行数 */
  readonly totalLines: number;
}

/**
 * foldSearchOutput — 搜索命令输出折叠
 *
 * 搜索命令(grep/find/rg等)通常输出大量行，但用户主要关心:
 *
 * - 前几行匹配（看上下文/模式）
 * - 总匹配数（判断搜索范围）
 * - 最后几行（看是否有重要结果在尾部）
 *
 * 投折策略:
 *
 * - 总行数 <= maxLines → 不折叠
 * - 总行数 > maxLines → 保留头部headLines + 尾部tailLines 中间省略，插入 "... N more matches ..."
 *
 * @param command 执行的命令（用于检测是否为搜索命令）
 * @param output 原始输出
 * @param maxLines 最大保留行数(默认50)
 * @param headLines 保留头部行数(默认20)
 * @param tailLines 保留尾部行数(默认10)
 */
export function foldSearchOutput(
  command: string,
  output: string,
  maxLines = 50,
  headLines = 20,
  tailLines = 10
): SearchFoldResult {
  // 检测是否为搜索命令
  const cmdName = command.trim().split(/\s+/)[0];
  const isSearch = SEARCH_COMMANDS.includes(cmdName);

  if (!isSearch) {
    return {
      content: output,
      folded: false,
      matchCount: 0,
      headLines: 0,
      tailLines: 0,
      totalLines: 0
    };
  }

  const lines = output.split('\n');
  const totalLines = lines.length;

  if (totalLines <= maxLines) {
    return {
      content: output,
      folded: false,
      matchCount: totalLines,
      headLines: totalLines,
      tailLines: 0,
      totalLines
    };
  }

  // 投折 — 保留头部+尾部
  const head = lines.slice(0, headLines);
  const tail = lines.slice(-tailLines);
  const omitted = totalLines - headLines - tailLines;

  const foldedContent = [...head, '', `... (${omitted} more matches omitted) ...`, ''];

  // 如果尾部有重要信息（如统计行）→ 也保留
  if (tailLines > 0 && tail.length > 0) {
    foldedContent.push(...tail);
  }

  return {
    content: foldedContent.join('\n'),
    folded: true,
    matchCount: totalLines,
    headLines,
    tailLines: tail.length > 0 ? tailLines : 0,
    totalLines
  };
}
