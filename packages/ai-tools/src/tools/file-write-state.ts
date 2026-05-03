/**
 * FileWriteState — 文件读写状态管理 + 编码检测
 *
 * 对齐 Claude Code FileEditTool/FileWriteTool 的安全读写机制:
 *
 * 1. mtime一致性检查 — 防止覆盖外部修改（文件在Read后被外部编辑）
 * 2. 编码检测 — UTF-16LE BOM检测、原编码写回、CRLF/LF行尾风格保持
 * 3. FileWrite读写状态强制 — 文件必须先被Read才能Write（新文件除外）
 *
 * 参考 Claude Code src/utils/fs/encoding.ts + fileWriteState.ts
 */

// ============================================================
// 1. 编码检测
// ============================================================

/** 检测到的文件编码 */
export interface FileEncodingInfo {
  /** 编码名称 */
  readonly encoding: 'utf-8' | 'utf-16le' | 'utf-16be' | 'ascii' | 'latin1' | 'unknown';
  /** 是否有BOM标记 */
  readonly hasBOM: boolean;
  /** BOM字节 */
  readonly bomBytes: readonly number[];
  /** 行尾风格 */
  readonly lineEnding: 'lf' | 'crlf' | 'mixed';
  /** CRLF比例(用于判断主要行尾风格) */
  readonly crlfRatio: number;
}

/**
 * detectFileEncoding — 检测文件编码和BOM标记
 *
 * 检测逻辑:
 *
 * 1. UTF-16LE BOM: 0xFF 0xFE
 * 2. UTF-16BE BOM: 0xFE 0xFF
 * 3. UTF-8 BOM: 0xEF 0xBB 0xBF
 * 4. 无BOM → 默认UTF-8
 *
 * @param content 文件内容（原始字节或字符串）
 */
export function detectFileEncoding(content: string | Buffer): FileEncodingInfo {
  // 如果是字符串 → 默认UTF-8，只需检测行尾
  if (typeof content === 'string') {
    return {
      encoding: 'utf-8',
      hasBOM: false,
      bomBytes: [],
      lineEnding: detectLineEnding(content),
      crlfRatio: computeCrlfRatio(content)
    };
  }

  // Buffer → 检测BOM
  if (content.length >= 2) {
    const byte0 = content[0];
    const byte1 = content[1];

    // UTF-16LE BOM: FF FE
    if (byte0 === 0xff && byte1 === 0xfe) {
      return {
        encoding: 'utf-16le',
        hasBOM: true,
        bomBytes: [0xff, 0xfe],
        lineEnding: 'lf', // UTF-16LE内部使用LF或CRLF（转换为字符串后检测）
        crlfRatio: 0
      };
    }

    // UTF-16BE BOM: FE FF
    if (byte0 === 0xfe && byte1 === 0xff) {
      return {
        encoding: 'utf-16be',
        hasBOM: true,
        bomBytes: [0xfe, 0xff],
        lineEnding: 'lf',
        crlfRatio: 0
      };
    }

    // UTF-8 BOM: EF BB BF
    if (content.length >= 3 && byte0 === 0xef && byte1 === 0xbb && content[2] === 0xbf) {
      const text = content.toString('utf-8');
      return {
        encoding: 'utf-8',
        hasBOM: true,
        bomBytes: [0xef, 0xbb, 0xbf],
        lineEnding: detectLineEnding(text),
        crlfRatio: computeCrlfRatio(text)
      };
    }
  }

  // 无BOM → 假设UTF-8
  const text = content.toString('utf-8');
  return {
    encoding: 'utf-8',
    hasBOM: false,
    bomBytes: [],
    lineEnding: detectLineEnding(text),
    crlfRatio: computeCrlfRatio(text)
  };
}

/**
 * detectLineEnding — 检测文件主要行尾风格
 *
 * - 纯LF → 'lf'
 * - 纯CRLF → 'crlf'
 * - 混合 → 'mixed'
 */
export function detectLineEnding(content: string): 'lf' | 'crlf' | 'mixed' {
  const crlfCount = (content.match(/\r\n/g) ?? []).length;
  const lfOnlyCount = (content.match(/\n/g) ?? []).length - crlfCount;

  if (crlfCount === 0 && lfOnlyCount > 0) return 'lf';
  if (lfOnlyCount === 0 && crlfCount > 0) return 'crlf';
  if (crlfCount > 0 && lfOnlyCount > 0) return 'mixed';
  return 'lf'; // 无换行符 → 默认lf
}

/** computeCrlfRatio — 计算CRLF占比 */
function computeCrlfRatio(content: string): number {
  const totalNewlines = (content.match(/\n/g) ?? []).length;
  if (totalNewlines === 0) return 0;
  const crlfCount = (content.match(/\r\n/g) ?? []).length;
  return crlfCount / totalNewlines;
}

/**
 * preserveLineEnding — 保持原有行尾风格
 *
 * 将内容写入文件时，根据原文件的行尾风格转换:
 *
 * - 原文件CRLF → 将LF转换为CRLF
 * - 原文件LF → 保持LF
 * - 混合 → 保持LF（统一风格）
 */
export function preserveLineEnding(
  newContent: string,
  originalLineEnding: 'lf' | 'crlf' | 'mixed'
): string {
  if (originalLineEnding === 'crlf') {
    // 将纯LF替换为CRLF（但不替换已有的CRLF）
    return newContent.replace(/(?<!\r)\n/g, '\r\n');
  }
  // LF或mixed → 保持LF
  return newContent.replace(/\r\n/g, '\n');
}

/**
 * encodeContentWithBOM — 按原编码和BOM写回内容
 *
 * - UTF-8 with BOM → 添加BOM前缀
 * - UTF-8 without BOM → 直接写
 * - UTF-16LE → 写回为UTF-16LE with BOM
 */
export function encodeContentForWrite(
  content: string,
  encodingInfo: FileEncodingInfo
): Buffer | string {
  if (encodingInfo.encoding === 'utf-16le') {
    // UTF-16LE → 写回为Buffer（含BOM）
    const bom = Buffer.from([0xff, 0xfe]);
    const contentBuf = Buffer.from(content, 'utf-16le');
    return Buffer.concat([bom, contentBuf]);
  }

  if (encodingInfo.encoding === 'utf-16be') {
    // Node.js Buffer不支持utf-16be编码 → 使用ucs2(utf-16le)然后字节交换
    const bom = Buffer.from([0xfe, 0xff]);
    const leBuf = Buffer.from(content, 'ucs2');
    // 字节交换: 每对字节 [lo, hi] → [hi, lo]
    for (let i = 0; i < leBuf.length; i += 2) {
      const lo = leBuf[i];
      const hi = leBuf[i + 1];
      leBuf[i] = hi;
      leBuf[i + 1] = lo;
    }
    return Buffer.concat([bom, leBuf]);
  }

  // UTF-8 → 可能需要添加BOM
  if (encodingInfo.hasBOM && encodingInfo.bomBytes.length === 3) {
    const bom = Buffer.from(encodingInfo.bomBytes);
    const contentBuf = Buffer.from(content, 'utf-8');
    return Buffer.concat([bom, contentBuf]);
  }

  // UTF-8 without BOM → 直接返回字符串
  return content;
}

// ============================================================
// 2. mtime一致性检查
// ============================================================

/** 文件读写状态记录 */
export interface FileReadState {
  /** 文件路径 */
  readonly filePath: string;
  /** Read时的mtime（ms） */
  readonly mtimeMs: number;
  /** Read时的时间戳 */
  readonly readAt: number;
  /** Read时的文件大小 */
  readonly fileSize?: number;
}

/** mtime检查结果 */
export interface MtimeCheckResult {
  /** 是否一致（文件未被外部修改） */
  readonly consistent: boolean;
  /** 原始mtime */
  readonly originalMtimeMs: number;
  /** 当前mtime */
  readonly currentMtimeMs: number;
  /** 不一致时的警告消息 */
  readonly warning?: string;
}

/**
 * checkMtimeConsistency — 检查文件mtime是否与Read时一致
 *
 * 如果文件在Read后被外部修改（mtime变化），Edit/Write操作应拒绝， 防止覆盖外部修改。
 *
 * @param readState Read时记录的状态
 * @param currentMtimeMs 当前文件的mtime
 */
export function checkMtimeConsistency(
  readState: FileReadState,
  currentMtimeMs: number
): MtimeCheckResult {
  // mtime完全一致 → 安全
  if (readState.mtimeMs === currentMtimeMs) {
    return {
      consistent: true,
      originalMtimeMs: readState.mtimeMs,
      currentMtimeMs
    };
  }

  // mtime不一致 → 文件被外部修改
  return {
    consistent: false,
    originalMtimeMs: readState.mtimeMs,
    currentMtimeMs,
    warning: `File has been modified since last read (mtime changed from ${readState.mtimeMs} to ${currentMtimeMs}). Re-read the file before editing.`
  };
}

// ============================================================
// 3. FileWrite读写状态强制
// ============================================================

/** 文件读写状态跟踪器 */
export class FileWriteStateTracker {
  private readonly readStates: Map<string, FileReadState> = new Map();

  /** 记录文件Read状态 */
  recordRead(filePath: string, mtimeMs: number, fileSize?: number): void {
    this.readStates.set(filePath, {
      filePath,
      mtimeMs,
      readAt: Date.now(),
      fileSize
    });
  }

  /** 获取文件的Read状态 */
  getReadState(filePath: string): FileReadState | undefined {
    return this.readStates.get(filePath);
  }

  /** 检查文件是否已被Read */
  hasBeenRead(filePath: string): boolean {
    return this.readStates.has(filePath);
  }

  /** 清除文件的Read状态（Write成功后） */
  clearReadState(filePath: string): void {
    this.readStates.delete(filePath);
  }

  /** 检查mtime一致性 */
  checkMtime(filePath: string, currentMtimeMs: number): MtimeCheckResult | null {
    const state = this.readStates.get(filePath);
    if (!state) return null;
    return checkMtimeConsistency(state, currentMtimeMs);
  }

  /** 验证Write操作 — 文件必须先被Read */
  validateWriteRequirement(
    filePath: string,
    isNewFile: boolean
  ): { allowed: boolean; reason?: string } {
    if (isNewFile) {
      // 新文件 → 不需要先Read
      return { allowed: true };
    }

    if (this.hasBeenRead(filePath)) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: `File "${filePath}" must be read before writing. Use the Read tool first to prevent accidental overwrites.`
    };
  }
}
