/** ContentReplacementState — ToolResultBudget 的冻结状态跟踪器 */

import type { CompressedToolResultContent, ContentReplacementTracker } from '../types/compressor';

/** 创建 ContentReplacementTracker 实例 */
export function createContentReplacementTracker(): ContentReplacementTracker {
  const seenIds = new Set<string>();
  const replacements = new Map<string, CompressedToolResultContent>();
  let frozen = false;

  return {
    get seenIds() { return seenIds; },
    get replacements() { return replacements; },
    get frozen() { return frozen; },

    markSeen(id: string): void {
      if (frozen) return;
      seenIds.add(id);
    },

    recordReplacement(id: string, content: CompressedToolResultContent): void {
      if (frozen) return;
      seenIds.add(id);
      replacements.set(id, content);
    },

    classify(id: string): 'mustReapply' | 'frozen' | 'fresh' {
      if (replacements.has(id)) return 'mustReapply';
      if (seenIds.has(id)) {
        // 已见过且 frozen → 不可替换; 未冻结 → 仍可替换
        return frozen ? 'frozen' : 'fresh';
      }
      return 'fresh';
    },

    freeze(): void {
      frozen = true;
    }
  };
}