/** 记忆提示构建器 — individual/combined/async 入口 */

import type { MemoryPromptConfig, MemoryPromptResult } from '../types/memory-prompt';
import type { MemoryPaths } from '../types/memory-path';
import type { MemoryStorageProvider } from '../types/memory-storage';
import { MAX_ENTRYPOINT_BYTES, MAX_ENTRYPOINT_LINES } from '../types/memory-index';
import { loadAndTruncateEntrypoint } from './memory-index';
import {
  buildTrustingRecallSection,
  buildTypesSection,
  buildTypesSectionCombined,
  buildWhatNotToSaveSection,
  buildWhenToAccessSection
} from './memory-type';

/** 默认提示配置 */
const DEFAULT_PROMPT_CONFIG: MemoryPromptConfig = {
  mode: 'individual',
  includeStaleness: true,
  includeTypes: true,
  includeSaveRules: true,
  maxContentLines: MAX_ENTRYPOINT_LINES,
  maxContentBytes: MAX_ENTRYPOINT_BYTES
};

/** 构建 individual 模式提示行 — 单目录无 scope 标签 返回提示段落的字符串数组 */
export function buildMemoryLines(content: string, config?: Partial<MemoryPromptConfig>): string[] {
  const fullConfig = { ...DEFAULT_PROMPT_CONFIG, ...config };
  const lines: string[] = [];

  lines.push(`## Memory`);
  lines.push('');
  lines.push(`You have a set of memory files stored in a dedicated directory.`);
  lines.push('');

  if (fullConfig.includeTypes) {
    lines.push(buildTypesSection());
  }

  if (fullConfig.includeSaveRules) {
    lines.push(buildWhatNotToSaveSection());
  }

  lines.push('');
  lines.push('## How to save memories');
  lines.push('');
  lines.push(
    '1. Write the content to a new file in the memory directory with appropriate frontmatter.'
  );
  lines.push(
    '2. Add a pointer to that file in the MEMORY.md index: `- [Title](file.md) — one-line hook`'
  );
  lines.push('');

  if (fullConfig.includeStaleness) {
    lines.push(buildWhenToAccessSection());
    lines.push('');
    lines.push(buildTrustingRecallSection());
  }

  // 内容段落
  lines.push('');
  lines.push('## MEMORY.md');
  lines.push('');
  lines.push(content || 'Your MEMORY.md is currently empty.');

  return lines;
}

/** 构建 combined 模式提示 — 私有 + team 双目录含 scope 标签 */
export function buildCombinedMemoryPrompt(
  privateContent: string,
  teamContent: string,
  config?: Partial<MemoryPromptConfig>
): string {
  const fullConfig = { ...DEFAULT_PROMPT_CONFIG, ...config };
  const lines: string[] = [];

  lines.push('## Memory');
  lines.push('');
  lines.push('You have two memory directories:');
  lines.push('- Private: personal memories (only you can see)');
  lines.push('- Team: shared memories (visible to team members)');
  lines.push('');

  lines.push('## Memory scope');
  lines.push('');
  lines.push('When saving memories, choose the directory based on scope:');
  lines.push('- Private directory: for personal preferences and individual knowledge');
  lines.push('- Team directory: for project conventions and team-shared reference');
  lines.push('');

  if (fullConfig.includeTypes) {
    lines.push(buildTypesSectionCombined());
  }

  if (fullConfig.includeSaveRules) {
    lines.push(buildWhatNotToSaveSection());
    lines.push('');
    lines.push(
      'For team memories, be especially careful about sensitive data — avoid saving credentials, private keys, or personal information in team-visible files.'
    );
  }

  lines.push('');
  lines.push('## How to save memories');
  lines.push('');
  lines.push(
    '1. Write the content to a new file in the chosen directory with appropriate frontmatter.'
  );
  lines.push("2. Add a pointer to that directory's own MEMORY.md index.");
  lines.push('');

  if (fullConfig.includeStaleness) {
    lines.push(buildWhenToAccessSection());
    lines.push('');
    lines.push(buildTrustingRecallSection());
  }

  // 内容段落
  lines.push('');
  lines.push('## Private MEMORY.md');
  lines.push('');
  lines.push(privateContent || '(empty)');
  lines.push('');
  lines.push('## Team MEMORY.md');
  lines.push('');
  lines.push(teamContent || '(empty)');

  return lines.join('\n');
}

/** 异步构建完整记忆提示 — 主入口 读取 MEMORY.md → 截断 → 构建提示段落 mode=none → 返回空提示 */
export async function buildMemoryPrompt(
  provider: MemoryStorageProvider,
  paths: MemoryPaths,
  config?: Partial<MemoryPromptConfig>
): Promise<MemoryPromptResult> {
  const fullConfig = { ...DEFAULT_PROMPT_CONFIG, ...config };

  if (fullConfig.mode === 'none') {
    return {
      promptSections: [],
      fullPrompt: '',
      loadedFiles: []
    };
  }

  if (fullConfig.mode === 'combined') {
    // 加载私有 + team MEMORY.md
    const privateResult = await loadAndTruncateEntrypoint(provider, paths.entrypointPath, {
      maxLines: fullConfig.maxContentLines,
      maxBytes: fullConfig.maxContentBytes
    });
    const teamEntrypoint = `${paths.teamDir}MEMORY.md`;
    const teamResult = await loadAndTruncateEntrypoint(provider, teamEntrypoint, {
      maxLines: fullConfig.maxContentLines,
      maxBytes: fullConfig.maxContentBytes
    });

    const fullPrompt = buildCombinedMemoryPrompt(
      privateResult.content,
      teamResult.content,
      fullConfig
    );

    return {
      promptSections: [fullPrompt],
      fullPrompt,
      truncationResult: privateResult.wasTruncated ? privateResult : undefined,
      loadedFiles: [paths.entrypointPath, teamEntrypoint]
    };
  }

  // individual 模式
  const result = await loadAndTruncateEntrypoint(provider, paths.entrypointPath, {
    maxLines: fullConfig.maxContentLines,
    maxBytes: fullConfig.maxContentBytes
  });

  const lines = buildMemoryLines(result.content, fullConfig);
  const fullPrompt = lines.join('\n');

  return {
    promptSections: lines,
    fullPrompt,
    truncationResult: result.wasTruncated ? result : undefined,
    loadedFiles: [paths.entrypointPath]
  };
}
