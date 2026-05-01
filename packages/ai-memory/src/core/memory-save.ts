/** 记忆保存验证 — 排除规则 + 内容规范化 */

import type { MemoryType } from '../types/memory-type';
import type { SaveExclusion, SaveValidationResult } from '../types/memory-save';
import { WHAT_NOT_TO_SAVE_PATTERNS } from '../types/memory-save';

/**
 * 检查内容是否包含排除模式 — 返回首个匹配或 null
 *
 * 1. 先在原始内容中搜索（匹配 markdown 格式标记如 ```、`function`）
 * 2. 再在纯文本中搜索（移除反引号/粗体后，匹配裸文本如 function、class）
 */
export function containsExcludedPattern(content: string): SaveExclusion | null {
  const lowerContent = content.toLowerCase();
  // 第1步：原始内容搜索（含 markdown 标记）
  for (const exclusion of WHAT_NOT_TO_SAVE_PATTERNS) {
    if (lowerContent.includes(exclusion.pattern.toLowerCase())) {
      return exclusion;
    }
  }
  // 第2步：纯文本搜索（移除 inline code 反引号 + 粗体星号）
  const plainText = content
    .replace(/`([^`]+)`/g, '$1') // `code` → code
    .replace(/\*\*([^*]+)\*\*/g, '$1') // **bold** → bold
    .toLowerCase();
  for (const exclusion of WHAT_NOT_TO_SAVE_PATTERNS) {
    if (plainText.includes(exclusion.pattern.toLowerCase())) {
      return exclusion;
    }
  }
  return null;
}

/** 保存验证 — 检查内容是否应保存 'save': 正常保存 'skip': 排除（含代码/git/debug/文档/临时模式） 'normalize': 需要规范化后再保存 */
export function shouldSave(content: string, type: MemoryType): SaveValidationResult {
  const exclusion = containsExcludedPattern(content);
  if (exclusion) {
    return { decision: 'skip', exclusion };
  }

  // feedback/project 类型需要 Why + HowToApply 结构
  if (type === 'feedback' || type === 'project') {
    const normalized = normalizeMemoryContent(content, type);
    if (normalized !== content) {
      return { decision: 'normalize', normalizedContent: normalized };
    }
  }

  return { decision: 'save' };
}

/** 规范化记忆内容 — 按类型添加结构化段落 feedback/project: 确保 Why + HowToApply 段落存在 user: 移除多余代码块 reference: 确保事实性格式 */
export function normalizeMemoryContent(content: string, type: MemoryType): string {
  if (type === 'feedback' || type === 'project') {
    return ensureBodySections(content, ['Why', 'HowToApply']);
  }
  if (type === 'user') {
    // 移除包裹整个内容的代码块
    return content.replace(/^```\n/, '').replace(/\n```$/m, '');
  }
  // reference: 不额外规范化
  return content;
}

/** 解析主体段落 — 提取 **Why**:, **HowToApply**:, **Context**:, **Note**: 等段落 */
export function extractBodySections(content: string): Record<string, string> {
  const sections: Record<string, string> = {};
  // 用 global regex 找到所有段落标记位置
  const allMatches = [
    ...content.matchAll(/\*\*(Why|HowToApply|How to apply|Context|Note)\*\*:\s*/gi)
  ];

  for (let i = 0; i < allMatches.length; i++) {
    const match = allMatches[i];
    // 标准化标记名
    const sectionName = match[1] === 'How to apply' ? 'HowToApply' : match[1];
    // 段落内容：从标记结束到下一个标记开始（或到字符串末尾）
    const startOffset = match.index + match[0].length;
    const endOffset = i + 1 < allMatches.length ? allMatches[i + 1].index : content.length;
    const sectionContent = content.slice(startOffset, endOffset).trim();

    // 如果同一标记名多次出现，取最后一次（覆盖）
    sections[sectionName] = sectionContent;
  }

  return sections;
}

/** 确保主体段落存在 — 添加缺失的段落标题 */
export function ensureBodySections(content: string, requiredSections: string[]): string {
  const existingSections = extractBodySections(content);
  const normalizedKeys = Object.keys(existingSections).map(k => k.toLowerCase());
  const missing = requiredSections.filter(s => !normalizedKeys.includes(s.toLowerCase()));

  if (missing.length === 0) return content;

  let result = content.trimEnd();
  for (const section of missing) {
    result += `\n\n**${section}**: `;
  }
  return result;
}
