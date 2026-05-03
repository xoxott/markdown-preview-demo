/**
 * FileRead安全验证 — 设备保护+二进制拒绝+UNC路径+大小预检
 *
 * 对齐 Claude Code FileReadTool 安全验证层:
 *
 * 1. BLOCKED_DEVICE_PATHS — 不允许读取设备文件(/dev/zero等)
 * 2. hasBinaryExtension — 检测二进制文件扩展名，拒绝读取
 * 3. UNC路径安全 — 拒绝Windows UNC路径(\\server\path)
 * 4. 文件大小预检 — 超大文件警告或拒绝
 *
 * 参考 Claude Code src/utils/fs/blockedPaths.ts + binaryExtensions.ts
 */

import { BLOCKED_DEVICE_PATHS } from './bash-security';

// ============================================================
// 1. 二进制文件扩展名检测
// ============================================================

/**
 * 二进制文件扩展名列表 — 这些文件不应该用FileRead读取（内容不可读）
 *
 * 参考 Claude Code BINARY_EXTENSIONS:
 * - 图片: jpg/png/gif/bmp/svg等
 * - 音频: mp3/wav/flac等
 * - 视频: mp4/avi/mov等
 * - 压缩: zip/tar/gz/rar/7z等
 * - 可执行: exe/dll/so/bin等
 * - 数据库: db/sqlite等
 * - 其他: pdf/doc/xls/ppt等
 */
const BINARY_EXTENSIONS: readonly string[] = [
  // 图片
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.tif', '.tiff', '.webp', '.heic', '.heif', '.raw',
  // 音频
  '.mp3', '.wav', '.flac', '.ogg', '.aac', '.m4a', '.wma', '.opus',
  // 视频
  '.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm', '.m4v',
  // 压缩/归档
  '.zip', '.tar', '.gz', '.bz2', '.xz', '.rar', '.7z', '.lz', '.lzma', '.zst',
  // 可执行/库
  '.exe', '.dll', '.so', '.dylib', '.bin', '.o', '.obj', '.a', '.lib',
  '.msi', '.dmg', '.iso', '.img',
  // 数据库
  '.db', '.sqlite', '.sqlite3', '.mdb',
  // 文档（二进制格式）
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp',
  // 字体
  '.ttf', '.otf', '.woff', '.woff2', '.eot',
  // Java/编译
  '.class', '.jar', '.war', '.pyc', '.pyd', '.nib',
  // 其他二进制
  '.swf', '.app', '.deb', '.rpm', '.crx',
  // 编码文件
  '.p12', '.pfx', '.der', '.crt', '.key', '.pem'
];

/**
 * hasBinaryExtension — 检测文件路径是否为二进制文件扩展名
 *
 * 二进制文件不应该用文本FileRead读取，应使用专用工具（图片/PDF等）
 *
 * @param filePath 文件路径
 * @returns true if 文件扩展名在二进制列表中
 */
export function hasBinaryExtension(filePath: string): boolean {
  const lower = filePath.toLowerCase();

  for (const ext of BINARY_EXTENSIONS) {
    if (lower.endsWith(ext)) {
      return true;
    }
  }

  return false;
}

// ============================================================
// 2. 设备文件路径保护
// ============================================================

/**
 * isBlockedDevicePath — 检测路径是否为被阻止的设备文件
 *
 * 设备文件(/dev/zero等)不应被FileRead读取 — 可能导致无限读取
 *
 * @param filePath 文件路径
 * @returns true if 路径匹配被阻止的设备文件
 */
export function isBlockedDevicePath(filePath: string): boolean {
  for (const blocked of BLOCKED_DEVICE_PATHS) {
    if (filePath === blocked || filePath.startsWith(blocked + '/')) {
      return true;
    }
  }
  return false;
}

// ============================================================
// 3. UNC路径安全
// ============================================================

/**
 * isUncPath — 检测是否为Windows UNC路径
 *
 * UNC路径(\\server\share\path)可能指向网络共享资源，
 * 在安全环境中不应允许读取。
 *
 * @param filePath 文件路径
 * @returns true if 路径是UNC路径
 */
export function isUncPath(filePath: string): boolean {
  return filePath.startsWith('\\\\') || filePath.startsWith('//');
}

// ============================================================
// 4. 文件大小预检
// ============================================================

/** 最大允许读取的文件大小（10MB） */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** 大文件警告阈值（1MB） */
const LARGE_FILE_WARNING_BYTES = 1 * 1024 * 1024;

/** 文件大小检查结果 */
export interface FileSizeCheckResult {
  /** 是否允许读取 */
  readonly allowed: boolean;
  /** 文件大小（字节） */
  readonly fileSize: number;
  /** 是否为大文件 */
  readonly isLarge: boolean;
  /** 警告消息 */
  readonly warning?: string;
  /** 拒绝消息 */
  readonly denial?: string;
}

/**
 * checkFileSize — 检查文件大小是否在允许范围内
 *
 * - 超过10MB → 拒绝读取
 * - 超过1MB → 警告（大文件）
 * - 其他 → 允许
 *
 * @param fileSize 文件大小（字节）
 */
export function checkFileSize(fileSize: number): FileSizeCheckResult {
  if (fileSize > MAX_FILE_SIZE_BYTES) {
    return {
      allowed: false,
      fileSize,
      isLarge: true,
      denial: `File too large (${formatSize(fileSize)}) — maximum allowed size is ${formatSize(MAX_FILE_SIZE_BYTES)}. Use a more specific read range or search instead.`
    };
  }

  if (fileSize > LARGE_FILE_WARNING_BYTES) {
    return {
      allowed: true,
      fileSize,
      isLarge: true,
      warning: `Large file (${formatSize(fileSize)}) — consider using a specific line range or search to avoid reading the entire file.`
    };
  }

  return {
    allowed: true,
    fileSize,
    isLarge: false
  };
}

/** 格式化文件大小 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${Math.round(bytes / (1024 * 1024))}MB`;
}

// ============================================================
// 5. 综合FileRead安全验证
// ============================================================

/** FileRead安全验证结果 */
export interface FileReadSecurityResult {
  /** 是否安全（通过所有检查） */
  readonly safe: boolean;
  /** 被阻止的原因 */
  readonly blockedReason?: string;
  /** 安全警告列表 */
  readonly warnings: readonly string[];
  /** 检查类型列表 */
  readonly checks: readonly { type: string; passed: boolean; message?: string }[];
}

/**
 * validateFileReadSecurity — 综合FileRead安全验证
 *
 * 4步检查:
 * 1. 设备文件路径保护（/dev/zero等）
 * 2. 二进制文件扩展名拒绝
 * 3. UNC路径安全
 * 4. 文件大小预检（需要fileSize参数）
 *
 * @param filePath 文件路径
 * @param fileSize 文件大小（可选，不提供时跳过大小检查）
 */
export function validateFileReadSecurity(
  filePath: string,
  fileSize?: number
): FileReadSecurityResult {
  const checks: { type: string; passed: boolean; message?: string }[] = [];
  const warnings: string[] = [];
  let blockedReason: string | undefined;

  // Step 1: 设备文件路径
  const blockedDevice = isBlockedDevicePath(filePath);
  checks.push({
    type: 'device_path',
    passed: !blockedDevice,
    message: blockedDevice ? `Blocked device path: ${filePath}` : undefined
  });
  if (blockedDevice) {
    blockedReason = `Cannot read device file: ${filePath} — device files may cause infinite reads`;
  }

  // Step 2: 二进制文件扩展名
  const binaryExt = hasBinaryExtension(filePath);
  checks.push({
    type: 'binary_extension',
    passed: !binaryExt,
    message: binaryExt ? `Binary file extension: ${filePath}` : undefined
  });
  if (binaryExt && !blockedReason) {
    blockedReason = `Cannot read binary file: ${filePath} — use a specialized tool for this file type`;
  }

  // Step 3: UNC路径
  const uncPath = isUncPath(filePath);
  checks.push({
    type: 'unc_path',
    passed: !uncPath,
    message: uncPath ? `UNC path: ${filePath}` : undefined
  });
  if (uncPath && !blockedReason) {
    blockedReason = `Cannot read UNC path: ${filePath} — network paths are not allowed`;
  }

  // Step 4: 文件大小预检
  if (fileSize !== undefined) {
    const sizeCheck = checkFileSize(fileSize);
    checks.push({
      type: 'file_size',
      passed: sizeCheck.allowed,
      message: sizeCheck.warning ?? sizeCheck.denial
    });
    if (!sizeCheck.allowed && !blockedReason) {
      blockedReason = sizeCheck.denial;
    }
    if (sizeCheck.warning) {
      warnings.push(sizeCheck.warning);
    }
  }

  return {
    safe: !blockedReason,
    blockedReason,
    warnings,
    checks
  };
}