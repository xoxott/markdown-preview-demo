/**
 * bypass-immune 安全检查（Safety Check）
 *
 * P41: 参考 Claude Code 的 filesystem.ts DANGEROUS_FILES / DANGEROUS_DIRECTORIES， 精简版实现 — 即使在
 * bypassPermissions 模式下也不自动 allow 这些危险文件/目录。
 *
 * 设计原则:
 *
 * - bypass-immune: bypassPermissions 不能覆盖此检查
 * - 安全优先: 涉及危险文件/目录 → ask（强制用户确认）
 * - 纯函数: 所有检查函数都是纯函数，便于测试
 * - 工具输入检测: 从工具名+输入参数推断是否涉及危险路径
 */

/** 危险文件列表 — bypass-immune，参考 Claude Code filesystem.ts */
export const DANGEROUS_FILES: readonly string[] = [
  '.gitconfig',
  '.bashrc',
  '.bash_profile',
  '.zshrc',
  '.zprofile',
  '.profile',
  '.mcp.json',
  '.claude.json',
  '.claude/settings.json',
  '.env'
];

/** 危险目录列表 — bypass-immune，参考 Claude Code filesystem.ts */
export const DANGEROUS_DIRECTORIES: readonly string[] = [
  '.git',
  '.vscode',
  '.idea',
  '.claude',
  '.ssh'
];

/** 安全检查结果 */
export interface SafetyCheckResult {
  /** 是否涉及危险文件/目录 */
  readonly isDangerous: boolean;
  /** 匹配的危险项（文件名或目录名） */
  readonly matchedItem?: string;
  /** 匹配类型 */
  readonly matchType?: 'file' | 'directory';
  /** 安全检查原因 */
  readonly reason?: string;
}

/**
 * 检查文件路径是否涉及危险文件
 *
 * 匹配规则: 路径的 basename 或最后一个组件匹配 DANGEROUS_FILES 中的任一项。 支持 /path/to/.bashrc 和 .bashrc 两种格式。
 *
 * @param filePath 文件路径
 * @returns 是否匹配危险文件
 */
export function isDangerousFilePath(filePath: string): boolean {
  if (!filePath) return false;
  // 提取 basename: /path/to/.bashrc → .bashrc
  const basename = filePath.split('/').pop() ?? filePath;
  return DANGEROUS_FILES.includes(basename);
}

/**
 * 检查路径是否位于危险目录中
 *
 * 匹配规则: 路径中任一目录组件匹配 DANGEROUS_DIRECTORIES 中的项。 支持 /path/to/.git/config 和 .git/hooks/pre-commit
 * 两种格式。
 *
 * @param dirPath 目录路径（或包含目录的完整路径）
 * @returns 是否匹配危险目录
 */
export function isDangerousDirectoryPath(dirPath: string): boolean {
  if (!dirPath) return false;
  const components = dirPath.split('/');
  return components.some(c => DANGEROUS_DIRECTORIES.includes(c));
}

/**
 * 检查工具输入是否涉及危险文件/目录
 *
 * 从工具名 + 输入参数推断路径，对 file-write/file-read/bash 等工具检测。
 *
 * @param toolName 工具名称
 * @param input 工具输入参数
 * @returns 安全检查结果
 */
export function isDangerousToolInput(toolName: string, input: unknown): SafetyCheckResult {
  if (!input || typeof input !== 'object') return { isDangerous: false };

  const inputObj = input as Record<string, unknown>;

  // 提取路径字段 — 支持 path/file_path/file/filePath/command 等常见字段名
  const pathValue = extractPathFromInput(toolName, inputObj);
  if (!pathValue) return { isDangerous: false };

  // 检查危险文件
  if (isDangerousFilePath(pathValue)) {
    const matchedItem = pathValue.split('/').pop() ?? pathValue;
    return {
      isDangerous: true,
      matchedItem,
      matchType: 'file',
      reason: `危险文件 "${matchedItem}" 在 bypass-immune 列表中`
    };
  }

  // 检查危险目录
  if (isDangerousDirectoryPath(pathValue)) {
    const components = pathValue.split('/');
    const matchedDir = DANGEROUS_DIRECTORIES.find(dd => components.includes(dd)) ?? '';
    return {
      isDangerous: true,
      matchedItem: matchedDir,
      matchType: 'directory',
      reason: `危险目录 "${matchedDir}" 在 bypass-immune 列表中`
    };
  }

  return { isDangerous: false };
}

/**
 * 从工具输入提取路径值
 *
 * 不同工具使用不同的字段名:
 *
 * - file-write/file-read/file-search → path / file_path / filePath
 * - bash → command (解析其中的文件路径)
 * - edit → file_path / filePath
 *
 * @param toolName 工具名
 * @param inputObj 输入对象
 * @returns 提取的路径字符串，或 undefined
 */
function extractPathFromInput(
  toolName: string,
  inputObj: Record<string, unknown>
): string | undefined {
  // 文件类工具: 直接提取路径字段
  const pathKeys = ['path', 'file_path', 'filePath', 'file'];
  for (const key of pathKeys) {
    if (typeof inputObj[key] === 'string') {
      return inputObj[key] as string;
    }
  }

  // bash 工具: 从 command 中提取文件路径
  if (toolName === 'bash' && typeof inputObj.command === 'string') {
    return extractPathsFromBashCommand(inputObj.command as string);
  }

  return undefined;
}

/**
 * 从 Bash 命令字符串中提取最可能的危险路径
 *
 * 简化策略: 检查命令是否包含危险文件名或目录名作为路径组件。 不做完整路径提取（Bash 命令语法太复杂），而是做 substring 匹配。
 *
 * @param command Bash 命令
 * @returns 如果命令涉及危险路径，返回最可能的路径；否则 undefined
 */
function extractPathsFromBashCommand(command: string): string | undefined {
  // 检查危险文件名出现在命令中
  for (const df of DANGEROUS_FILES) {
    if (command.includes(df)) {
      return df;
    }
  }

  // 检查危险目录名出现在命令中
  for (const dd of DANGEROUS_DIRECTORIES) {
    // 匹配 /path/.git/ 或 .git/ 格式
    if (command.includes(`/${dd}/`) || command.includes(`${dd}/`) || command.includes(`/${dd}`)) {
      return dd;
    }
  }

  return undefined;
}
