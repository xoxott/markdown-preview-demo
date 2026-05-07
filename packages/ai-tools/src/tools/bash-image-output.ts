/**
 * bashImageOutput — Bash命令图像输出检测与处理
 *
 * 对齐 Claude Code BashTool 图像输出支持:
 *
 * 1. Sixel 图像协议检测 — 检测 DCS 序列 (ESC P ... ESC )
 * 2. iTerm2 图像协议检测 — 检测 OSC 1337 序列
 * 3. 图像输出提取 — 从 bash 输出中提取图像数据
 * 4. 图像输出清理 — 清除终端图像序列，保留可读文本
 *
 * 注: 这是检测/提取层，实际渲染由宿主 UI 层处理。
 */

// ============================================================
// 类型定义
// ============================================================

/** 终端图像协议类型 */
export type TerminalImageProtocol = 'sixel' | 'iterm2';

/** 检测到的图像输出 */
export interface DetectedImageOutput {
  /** 图像协议类型 */
  readonly protocol: TerminalImageProtocol;
  /** 原始序列在输出中的起始位置 */
  readonly startOffset: number;
  /** 原始序列在输出中的结束位置 */
  readonly endOffset: number;
  /** 图像数据（base64编码，仅 iTerm2） */
  readonly imageData?: string;
  /** 图像宽度（像素，仅 iTerm2） */
  readonly width?: number;
  /** 图像高度（像素，仅 iTerm2） */
  readonly height?: number;
}

/** 图像检测结果 */
export interface ImageDetectionResult {
  /** 是否检测到图像输出 */
  readonly hasImage: boolean;
  /** 检测到的图像列表 */
  readonly images: readonly DetectedImageOutput[];
  /** 清理后的文本输出（去除图像序列） */
  readonly cleanText: string;
}

// ============================================================
// Sixel 图像检测
// ============================================================

/**
 * Sixel 图像协议:
 *
 * DCS (Device Control String) 序列格式: ESC P q ; ... ; ESC \
 *
 * ESC = \x1b, P = \x1bP 或 \x90 (DCS) 结束符 = ESC \ 或 \x9c (ST)
 */

/**
 * detectSixelImages — 检测 Sixel 图像输出
 *
 * 查找 ESC P ... ESC \ 序列
 */
export function detectSixelImages(output: string): readonly DetectedImageOutput[] {
  const images: DetectedImageOutput[] = [];

  // 查找所有 Sixel DCS 起始位置
  const startRegex = /\x1BP[\d;]*q/g;
  let match: RegExpExecArray | null;

  while ((match = startRegex.exec(output)) !== null) {
    const startOffset = match.index;
    // 查找对应的结束序列 ESC \ (ST)
    const endSequence = '\x1B\\';
    const endOffset = output.indexOf(endSequence, startOffset + match[0].length);

    if (endOffset >= 0) {
      images.push({
        protocol: 'sixel',
        startOffset,
        endOffset: endOffset + endSequence.length
      });
    }
  }

  return images;
}

// ============================================================
// iTerm2 图像检测
// ============================================================

/**
 * iTerm2 图像协议:
 *
 * OSC 1337 序列格式: ESC ] 1337;File=inline=1;size=N;width=W;height=H;base64 DATA ESC \
 *
 * 关键参数:
 *
 * - inline=1: 内联显示
 * - size: 文件大小（字节）
 * - width/height: 显示尺寸
 * - base64: 数据为 base64 编码
 */

/**
 * detectIterm2Images — 检测 iTerm2 图像输出
 *
 * 查找 ESC ] 1337;File= ... ESC \ 序列
 */
export function detectIterm2Images(output: string): readonly DetectedImageOutput[] {
  const images: DetectedImageOutput[] = [];

  const startRegex = /\x1B]1337;File=/g;
  let match: RegExpExecArray | null;

  while ((match = startRegex.exec(output)) !== null) {
    const startOffset = match.index;
    // 查找结束序列 ESC \
    const endSequence = '\x07'; // BEL 也可作为 OSC 结束符
    const endSequence2 = '\x1B\\'; // ST

    // 先找 BEL 终止
    let endOffset = output.indexOf(endSequence, startOffset + match[0].length);
    let endLen = 1;

    // 如果找不到 BEL，找 ST 终止
    if (endOffset < 0) {
      endOffset = output.indexOf(endSequence2, startOffset + match[0].length);
      endLen = endSequence2.length;
    }

    if (endOffset >= 0) {
      // 提取参数部分（从 File= 到 :DATA 或到 base64 数据开始）
      const paramSection = output.slice(startOffset + match[0].length, endOffset);

      // 解析参数
      const widthMatch = paramSection.match(/width=(\d+)/);
      const heightMatch = paramSection.match(/height=(\d+)/);
      const base64Match = paramSection.match(/base64[^;]*;([^\\]+)/);

      images.push({
        protocol: 'iterm2',
        startOffset,
        endOffset: endOffset + endLen,
        imageData: base64Match?.[1],
        width: widthMatch ? Number.parseInt(widthMatch[1], 10) : undefined,
        height: heightMatch ? Number.parseInt(heightMatch[1], 10) : undefined
      });
    }
  }

  return images;
}

// ============================================================
// 综合检测
// ============================================================

/**
 * detectImageOutput — 综合检测 bash 输出中的图像内容
 *
 * 依次检测 Sixel 和 iTerm2 图像序列， 返回检测结果和清理后的文本输出。
 */
export function detectImageOutput(output: string): ImageDetectionResult {
  const sixelImages = detectSixelImages(output);
  const iterm2Images = detectIterm2Images(output);

  const allImages = [...sixelImages, ...iterm2Images];

  if (allImages.length === 0) {
    return {
      hasImage: false,
      images: [],
      cleanText: output
    };
  }

  // 清理图像序列 — 从输出中移除所有图像序列
  const cleanText = cleanImageSequences(output, allImages);

  return {
    hasImage: true,
    images: allImages,
    cleanText
  };
}

/**
 * cleanImageSequences — 从输出中移除所有终端图像序列
 *
 * 将图像序列替换为占位文本 "[image]" 以保持文本结构
 */
export function cleanImageSequences(
  output: string,
  images: readonly DetectedImageOutput[]
): string {
  if (images.length === 0) return output;

  // 按位置排序
  const sorted = [...images].sort((a, b) => a.startOffset - b.startOffset);

  let result = '';
  let lastEnd = 0;

  for (const img of sorted) {
    // 添加图像前的文本
    result += output.slice(lastEnd, img.startOffset);
    // 添加占位文本
    const label = img.protocol === 'sixel' ? '[sixel image]' : '[iterm2 image]';
    result += label;
    lastEnd = img.endOffset;
  }

  // 添加最后一个图像后的文本
  result += output.slice(lastEnd);

  return result;
}

/**
 * hasImageProtocolSupport — 判断终端是否支持图像协议
 *
 * 通过 TERM_PROGRAM 环境变量检测:
 *
 * - iTerm2: 支持 iTerm2 协议
 * - xterm: 可能支持 Sixel（需查询 DECSD）
 */
export function hasImageProtocolSupport(
  termProgram?: string,
  term?: string
): { supported: boolean; protocols: readonly TerminalImageProtocol[] } {
  const protocols: TerminalImageProtocol[] = [];

  if (termProgram === 'iTerm.app' || termProgram === 'iTerm2') {
    protocols.push('iterm2');
  }

  // VT340/VT382 和某些 xterm 变体支持 Sixel
  if (term?.includes('vt340') || term?.includes('vt382')) {
    protocols.push('sixel');
  }

  // libvte (GNOME Terminal) 和 mintty 也可支持 Sixel
  if (termProgram === 'gnome-terminal' || termProgram === 'mintty') {
    protocols.push('sixel');
  }

  return {
    supported: protocols.length > 0,
    protocols
  };
}
