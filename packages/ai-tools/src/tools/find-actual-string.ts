/**
 * findActualString — FileEdit 核心查找逻辑
 *
 * 对齐 Claude Code FileEditTool 的查找策略:
 *
 * 1. 先精确匹配 oldString in content
 * 2. 失败后 normalizeQuotes (弯→直引号) 再试
 * 3. 成功后 preserveQuoteStyle — 保持文件原有引号风格
 *
 * 多匹配检测:
 * - replace_all=false 且 oldString 出现多次 → 拒绝，要求更多上下文
 *
 * 参考 Claude Code src/utils/fs/findActualString.ts
 */

import { normalizeCurlyQuotes } from '../utils/path-normalize';

/** 查找结果 */
export interface FindActualStringResult {
  /** 是否找到匹配 */
  readonly found: boolean;
  /** 实际匹配的字符串（可能经过引号规范化） */
  readonly actualOldString: string;
  /** 匹配次数 */
  readonly matchCount: number;
  /** 是否经过引号规范化 */
  readonly normalizedQuotes: boolean;
  /** 错误信息（未找到或多匹配） */
  readonly error?: string;
}

/**
 * findActualString — 在文件内容中查找 oldString
 *
 * 策略:
 * 1. 精确匹配 → 如果唯一匹配，直接返回
 * 2. 精确匹配失败 → normalizeQuotes（弯→直）再试
 * 3. 规范化匹配成功 → preserveQuoteStyle 保持文件原风格
 * 4. 多匹配检测 — replace_all=false 时拒绝多次匹配
 *
 * @param content 文件完整内容
 * @param oldString 要查找的字符串
 * @param replaceAll 是否全局替换（多匹配时允许）
 */
export function findActualString(
  content: string,
  oldString: string,
  replaceAll?: boolean
): FindActualStringResult {
  // === Step 1: 精确匹配 ===
  const exactCount = countOccurrences(content, oldString);

  if (exactCount === 1) {
    // 精确唯一匹配 → 直接返回
    return {
      found: true,
      actualOldString: oldString,
      matchCount: 1,
      normalizedQuotes: false
    };
  }

  if (exactCount > 1 && replaceAll) {
    // 精确多匹配 + replaceAll → 允许
    return {
      found: true,
      actualOldString: oldString,
      matchCount: exactCount,
      normalizedQuotes: false
    };
  }

  if (exactCount > 1 && !replaceAll) {
    // 精确多匹配 + 非replaceAll → 拒绝，要求更多上下文
    return {
      found: false,
      actualOldString: oldString,
      matchCount: exactCount,
      normalizedQuotes: false,
      error: `oldString appears ${exactCount} times in file — provide more context to make it unique, or use replaceAll`
    };
  }

  // === Step 2: 规范化匹配 ===
  // 规范化 BOTH sides: 文件中的弯引号→直引号, oldString中的弯引号→直引号
  // 这样无论哪一边有弯引号都能匹配
  const normalizedOld = normalizeCurlyQuotes(oldString);
  const normalizedContent = normalizeCurlyQuotes(content);

  // 如果两边规范化后都与原文相同 → 精确匹配已失败且规范化无帮助
  if (normalizedOld === oldString && normalizedContent === content) {
    return {
      found: false,
      actualOldString: oldString,
      matchCount: 0,
      normalizedQuotes: false,
      error: 'oldString not found in file'
    };
  }

  // 如果规范化后oldString与原文相同但内容不同 → 文件有弯引号，oldString是直引号
  // 规范化内容后变成直引号 → 在规范化内容中搜索oldString
  const needsNormalization = normalizedOld !== oldString || normalizedContent !== content;

  // 在规范化后的内容中查找（使用规范化后的oldString）
  const normalizedCount = countOccurrences(normalizedContent, normalizedOld);

  if (normalizedCount === 0) {
    // 规范化也找不到 → 无匹配
    return {
      found: false,
      actualOldString: oldString,
      matchCount: 0,
      normalizedQuotes: false,
      error: 'oldString not found in file (even after quote normalization)'
    };
  }

  if (normalizedCount > 1 && !replaceAll) {
    // 规范化多匹配 + 非replaceAll → 拒绝
    return {
      found: false,
      actualOldString: oldString,
      matchCount: normalizedCount,
      normalizedQuotes: true,
      error: `oldString (after quote normalization) appears ${normalizedCount} times — provide more context or use replaceAll`
    };
  }

  // === Step 3: preserveQuoteStyle ===
  // 找到规范化匹配 → 从原内容中提取实际匹配的字符串（保留原引号风格）
  const actualOldString = extractOriginalMatch(content, normalizedContent, normalizedOld, normalizedCount);

  if (!actualOldString) {
    return {
      found: false,
      actualOldString: oldString,
      matchCount: 0,
      normalizedQuotes: true,
      error: 'oldString not found in file (quote normalization match failed to extract original)'
    };
  }

  return {
    found: true,
    actualOldString,
    matchCount: normalizedCount,
    normalizedQuotes: true
  };
}

/**
 * preserveQuoteStyle — 从原内容中提取实际匹配的字符串
 *
 * 在规范化内容中定位匹配位置，然后在原内容中提取相同位置的字符串，
 * 从而保持文件原有的引号风格。
 *
 * 替换时使用 actualOldString 而非 oldString，确保替换的是文件中的实际文本。
 */
function extractOriginalMatch(
  originalContent: string,
  normalizedContent: string,
  normalizedOld: string,
  matchCount: number
): string | null {
  if (matchCount === 1) {
    // 单次匹配 — 定位并提取
    const normalizedIdx = normalizedContent.indexOf(normalizedOld);
    if (normalizedIdx === -1) return null;

    // 在原内容中取相同位置和长度的字符串
    // 注意: 由于弯引号→直引号是等长替换（都是1字符），位置不变
    return originalContent.substring(normalizedIdx, normalizedIdx + normalizedOld.length);
  }

  // 多次匹配（replaceAll模式） — 提取所有匹配的原文
  // 返回第一个匹配的原文即可（replaceAll模式中所有匹配长度相同）
  const firstIdx = normalizedContent.indexOf(normalizedOld);
  if (firstIdx === -1) return null;
  return originalContent.substring(firstIdx, firstIdx + normalizedOld.length);
}

/** 计算字符串出现次数 */
function countOccurrences(content: string, search: string): number {
  if (search.length === 0) return 0;
  let count = 0;
  let idx = 0;
  while ((idx = content.indexOf(search, idx)) !== -1) {
    count++;
    idx += search.length;
  }
  return count;
}