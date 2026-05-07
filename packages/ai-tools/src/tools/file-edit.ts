/** FileEditTool — 文件精确编辑工具 */

import { buildTool } from '@suga/ai-tool-core';
import type {
  PermissionResult,
  SafetyLabel,
  ToolResult,
  ValidationResult
} from '@suga/ai-tool-core';
import type { ExtendedToolUseContext } from '../context-merge';
import type { FileEditInput } from '../types/tool-inputs';
import type { FileEditOutput } from '../types/tool-outputs';
import { FileEditInputSchema } from '../types/tool-inputs';
import { normalizeContent } from '../utils/path-normalize';
import { generateEditId } from '../provider/InMemoryFileEditLog';
import { detectFileEncoding, encodeContentForWrite, preserveLineEnding } from './file-write-state';
import type { FileEncodingInfo } from './file-write-state';
import { containsSanitizedMarkers, desanitizeContent } from './file-desanitize';

// ============================================================
// G30: preserveQuoteStyle — 在new_string中保持old_string的引号风格
// ============================================================

/**
 * preserveQuoteStyle — 如果 old_string 用弯引号('' "")， 在 new_string 中将直引号转为对应弯引号风格
 *
 * 对齐 CC FileEdit 的 preserveQuoteStyle 行为:
 *
 * - old_string 含弯单引号 → new_string 中的直单引号转为弯单引号
 * - old_string 含弯双引号 → new_string 中的直双引号转为弯双引号
 * - 无弯引号 → 不转换
 */
export function preserveQuoteStyle(oldString: string, newString: string): string {
  const hasLeftSingle = oldString.includes('\u2018'); // '
  const hasRightSingle = oldString.includes('\u2019'); // '
  const hasLeftDouble = oldString.includes('\u201C'); // "
  const hasRightDouble = oldString.includes('\u201D'); // "

  if (!hasLeftSingle && !hasRightSingle && !hasLeftDouble && !hasRightDouble) return newString;

  let result = newString;

  // 替换直单引号为弯单引号
  if (hasLeftSingle || hasRightSingle) {
    // 先将所有直单引号替换为右弯引号
    result = result.replace(/'/g, '\u2019');
    // 如果 old_string 有左弯引号，将单词开头的弯引号改为左弯引号
    if (hasLeftSingle) {
      result = result.replace(/\u2019(?=\w)/g, '\u2018');
    }
  }

  // 替换直双引号为弯双引号
  if (hasLeftDouble || hasRightDouble) {
    result = result.replace(/"/g, '\u201D');
    if (hasLeftDouble) {
      result = result.replace(/\u201D(?=\w)/g, '\u201C');
    }
  }

  return result;
}

/**
 * FileEditTool — 精确字符串替换编辑文件
 *
 * - isReadOnly: false — 写操作
 * - isConcurrencySafe: false — 编辑有副作用
 * - safetyLabel: 'destructive' — 修改性标签
 * - isDestructive: false — 编辑保留内容（修改而非销毁）
 * - checkPermissions: ask — 需要用户确认
 * - validateInput: 路径+空oldString+双字符串弯引号/LF规范化
 */
export const fileEditTool = buildTool<FileEditInput, FileEditOutput>({
  name: 'file-edit',

  inputSchema: FileEditInputSchema,

  description: async input => {
    const scope = input.replaceAll ? 'all occurrences' : 'one occurrence';
    const oldPreview = input.oldString.substring(0, 50);
    const newPreview = input.newString.substring(0, 50);
    return `Edit file ${input.filePath}: replace ${scope} of "${oldPreview}" with "${newPreview}"`;
  },

  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  safetyLabel: () => 'destructive' as SafetyLabel,
  isDestructive: () => false,

  validateInput: (input: FileEditInput): ValidationResult => {
    if (input.filePath === '') {
      return { behavior: 'deny', message: 'File path must not be empty', reason: 'empty_path' };
    }

    if (!input.filePath.startsWith('/')) {
      return { behavior: 'deny', message: 'File path must be absolute', reason: 'relative_path' };
    }

    // G29: Jupyter notebook (.ipynb) → 拒绝编辑，建议使用 NotebookEdit
    if (input.filePath.endsWith('.ipynb')) {
      return {
        behavior: 'deny',
        message: 'Cannot edit .ipynb files with file-edit. Use the notebook-edit tool instead.',
        reason: 'jupyter_file_edit_blocked'
      };
    }

    if (input.oldString === '') {
      return {
        behavior: 'deny',
        message: 'oldString must not be empty',
        reason: 'empty_old_string'
      };
    }

    // 双字符串规范化: 弯引号 + LF 行尾
    const normalizedOld = normalizeContent(input.oldString);
    const normalizedNew = normalizeContent(input.newString);

    if (normalizedOld !== input.oldString || normalizedNew !== input.newString) {
      return {
        behavior: 'allow',
        updatedInput: {
          ...input,
          oldString: normalizedOld,
          newString: normalizedNew
        }
      };
    }

    return { behavior: 'allow' };
  },

  checkPermissions: (input: FileEditInput): PermissionResult => {
    return {
      behavior: 'ask',
      message: `Edit file "${input.filePath}"?`
    };
  },

  call: async (
    input: FileEditInput,
    context: ExtendedToolUseContext
  ): Promise<ToolResult<FileEditOutput>> => {
    // 检查文件是否存在
    const stat = await context.fsProvider.stat(input.filePath);
    if (!stat.exists) {
      // G28: 文件未找到建议 — 搜索相似文件名
      let suggestion: string | undefined;
      try {
        const dir = input.filePath.substring(0, input.filePath.lastIndexOf('/')) || '/';
        const basename = input.filePath.substring(input.filePath.lastIndexOf('/') + 1);
        const entries = await context.fsProvider.ls(dir);
        // 简单相似度: 相同前缀(3+字符) 或 相同扩展名
        const similar = entries
          .filter(
            e =>
              e.type === 'file' &&
              (e.name.startsWith(basename.substring(0, 3)) ||
                (basename.includes('.') && e.name.endsWith(basename.split('.').pop()!)))
          )
          .map(e => `${dir}/${e.name}`)
          .slice(0, 3);
        if (similar.length > 0) {
          suggestion = `Similar files found: ${similar.join(', ')}`;
        }
      } catch {
        // 搜索失败不影响主流程
      }

      return {
        data: {
          applied: false,
          replacementCount: 0,
          error: `File "${input.filePath}" does not exist${suggestion ? `. ${suggestion}` : ''}`
        },
        error: `File "${input.filePath}" does not exist${suggestion ? `. ${suggestion}` : ''}`
      };
    }

    // G4: read-before-edit强制 — 文件必须先被Read才能Edit
    if (context.fileWriteStateTracker) {
      const writeValidation = context.fileWriteStateTracker.validateWriteRequirement(
        input.filePath,
        false // 已存在的文件，不是新文件
      );
      if (!writeValidation.allowed) {
        return {
          data: {
            applied: false,
            replacementCount: 0,
            error: writeValidation.reason ?? 'File must be read before editing'
          },
          error: writeValidation.reason ?? 'File must be read before editing',
          newMessages: [
            {
              role: 'assistant',
              content: writeValidation.reason ?? 'File must be read before editing'
            }
          ]
        };
      }
    }

    // G3: mtime一致性检查 — 防止覆盖外部修改
    if (context.fileWriteStateTracker) {
      const mtimeResult = context.fileWriteStateTracker.checkMtime(input.filePath, stat.mtimeMs);
      if (mtimeResult && !mtimeResult.consistent) {
        return {
          data: {
            applied: false,
            replacementCount: 0,
            error: mtimeResult.warning ?? 'File has been modified externally'
          },
          error: mtimeResult.warning ?? 'File has been modified externally',
          newMessages: [
            {
              role: 'assistant',
              content:
                mtimeResult.warning ??
                'File has been modified externally. Re-read the file before editing.'
            }
          ]
        };
      }
    }

    // P100: 编辑前先读取旧内容（供 fileEditLogProvider 记录）
    // G26+G27: 同时检测编码和行尾风格
    let oldContent: string | undefined;
    let encodingInfo: FileEncodingInfo | undefined;
    if (context.fileEditLogProvider || context.fileWriteStateTracker) {
      try {
        const contentResult = await context.fsProvider.readFile(input.filePath);
        oldContent = contentResult.content;
        // G26: 编码检测（UTF-16LE/UTF-8+BOM等）
        encodingInfo = detectFileEncoding(oldContent);
      } catch {
        // 读取失败不影响编辑流程
      }
    }

    // G31: desanitize — 处理API sanitized标记(<fnr>等)
    // 如果 input.oldString 含 sanitized 标记，需要先还原再匹配
    let effectiveOldString = input.oldString;
    let effectiveNewString = input.newString;
    if (containsSanitizedMarkers(input.oldString)) {
      effectiveOldString = desanitizeContent(input.oldString);
      effectiveNewString = desanitizeContent(input.newString);
      // 如果文件内容已读取且含sanitized标记，也需要还原
      if (oldContent !== undefined && containsSanitizedMarkers(oldContent)) {
        const desanitizedContent = desanitizeContent(oldContent);
        try {
          await context.fsProvider.writeFile(input.filePath, desanitizedContent);
          oldContent = desanitizedContent;
        } catch {
          // 写回失败不影响编辑流程，匹配可能失败但这是预期行为
        }
      }
    }

    // G30: preserveQuoteStyle — 如果 oldString 用弯引号，在 newString 中保持风格
    effectiveNewString = preserveQuoteStyle(effectiveOldString, effectiveNewString);

    // 执行编辑
    let result = await context.fsProvider.editFile(
      input.filePath,
      effectiveOldString,
      effectiveNewString,
      input.replaceAll
    );

    if (!result.applied) {
      return {
        data: result,
        error: result.error ?? 'Edit failed: oldString not found or not unique'
      };
    }

    // P100: 编辑成功后记录到 fileEditLogProvider
    if (context.fileEditLogProvider && oldContent !== undefined) {
      const newContent =
        result.newContent ??
        oldContent.replace(input.replaceAll ? input.oldString : input.oldString, input.newString);
      context.fileEditLogProvider.record({
        editId: generateEditId(),
        filePath: input.filePath,
        oldContent,
        newContent: result.newContent ?? newContent,
        oldString: input.oldString,
        newString: input.newString,
        replaceAll: input.replaceAll ?? false,
        timestamp: Date.now()
      });
    }

    // G32: stripTrailingWhitespace — 去除每行尾部空白（跳过 .md 文件）
    // 在编辑结果写入后，如果文件不是 markdown，去除行尾空白
    if (result.newContent && !input.filePath.endsWith('.md')) {
      const strippedContent = result.newContent.replace(/[ \t]+$/gm, '');
      if (strippedContent !== result.newContent) {
        // 有变化 → 需要写回
        try {
          await context.fsProvider.writeFile(input.filePath, strippedContent);
          // 更新 result 的 newContent（逻辑上）
          result = { ...result, newContent: strippedContent };
        } catch {
          // 写回失败不影响主流程
        }
      }
    }

    // G26+G27: 行尾保留 + 编码写回
    // 如果编辑后返回了 newContent，按原文件行尾风格转换后再写回
    if (result.newContent && encodingInfo) {
      // G27: 保留原行尾风格
      const preservedContent = preserveLineEnding(result.newContent, encodingInfo.lineEnding);
      // G26: 按原编码写回（UTF-16LE等需要特殊处理）
      const encodedContent = encodeContentForWrite(preservedContent, encodingInfo);
      if (typeof encodedContent !== 'string' || encodedContent !== result.newContent) {
        // 需要特殊编码写回 → 通过 fsProvider.writeFile 写入
        try {
          await context.fsProvider.writeFile(
            input.filePath,
            typeof encodedContent === 'string' ? encodedContent : preservedContent
          );
        } catch {
          // 写回失败不影响主流程（editFile已经成功）
        }
      }
    }

    // G3+G4: 编辑成功后更新 fileWriteStateTracker 的状态
    if (context.fileWriteStateTracker) {
      context.fileWriteStateTracker.clearReadState(input.filePath);
    }

    return { data: result };
  },

  toAutoClassifierInput: (input: FileEditInput) => ({
    toolName: 'file-edit',
    input,
    safetyLabel: 'destructive',
    isReadOnly: false,
    isDestructive: false
  }),

  maxResultSizeChars: 100_000
});
