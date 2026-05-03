/**
 * FileRead多模态 — 图片/PDF/notebook解析
 *
 * 对齐 Claude Code FileReadTool 多模态读取:
 *
 * 1. 图片读取 — resize/compress + base64编码（面向LLM多模态输入）
 * 2. PDF页提取 — 按页范围读取PDF内容
 * 3. Notebook(.ipynb)解析 — 提取cell内容+输出
 *
 * 注: 图片resize依赖宿主提供的sharp库（可选）， PDF依赖poppler-utils（可选），不依赖时返回原始base64/文本。
 *
 * 参考 Claude Code src/utils/fs/image.ts + pdf.ts + notebook.ts
 */

// ============================================================
// 1. 图片读取
// ============================================================

/** 图片读取结果 */
export interface ImageReadResult {
  /** base64编码的图片数据 */
  readonly base64: string;
  /** 图片MIME类型 */
  readonly mimeType: string;
  /** 原始宽度 */
  readonly width: number;
  /** 原始高度 */
  readonly height: number;
  /** 是否经过resize */
  readonly resized: boolean;
  /** resize后宽度（如未resize=null） */
  readonly resizedWidth?: number;
  /** resize后高度（如未resize=null） */
  readonly resizedHeight?: number;
  /** 数据大小(bytes) */
  readonly byteSize: number;
}

/** 图片resize选项 */
export interface ImageResizeOptions {
  /** 最大宽度（超过则缩放） */
  readonly maxWidth?: number;
  /** 最大高度（超过则缩放） */
  readonly maxHeight?: number;
  /** 目标质量(1-100, 仅JPEG) */
  readonly quality?: number;
  /** 输出格式（默认保持原格式） */
  readonly format?: 'png' | 'jpeg' | 'webp';
}

/**
 * readImageFile — 读取图片文件并返回base64编码
 *
 * 支持格式: jpg/jpeg/png/gif/bmp/webp/ico/tiff/svg resize逻辑: 如果图片超过maxWidth/maxHeight，自动缩放
 *
 * 注: resize依赖宿主注入的resizeProvider，不提供时返回原始base64
 *
 * @param filePath 图片文件路径
 * @param buffer 图片原始Buffer
 * @param mimeType 图片MIME类型
 * @param resizeOptions resize选项（可选）
 * @param resizeProvider resize函数（可选，宿主注入）
 */
export function readImageFile(
  filePath: string,
  buffer: Buffer,
  mimeType: string,
  resizeOptions?: ImageResizeOptions,
  resizeProvider?: ImageResizeProvider
): ImageReadResult {
  const base64 = buffer.toString('base64');
  const byteSize = buffer.length;

  // 原始结果（无resize）
  const result: ImageReadResult = {
    base64,
    mimeType,
    width: 0, // 需要宿主注入尺寸检测
    height: 0,
    resized: false,
    byteSize
  };

  // 如果有resizeProvider且超过限制 → resize
  if (resizeProvider && resizeOptions) {
    const resized = resizeProvider(buffer, mimeType, resizeOptions);
    if (resized) {
      return {
        ...result,
        base64: resized.base64,
        mimeType: resized.mimeType ?? mimeType,
        resized: true,
        resizedWidth: resized.width,
        resizedHeight: resized.height,
        byteSize: resized.byteSize
      };
    }
  }

  return result;
}

/** 图片resize提供者接口 — 宿主注入（如使用sharp库） */
export interface ImageResizeProvider {
  (
    buffer: Buffer,
    mimeType: string,
    options: ImageResizeOptions
  ): { base64: string; mimeType?: string; width: number; height: number; byteSize: number } | null;
}

// ============================================================
// 2. PDF页提取
// ============================================================

/** PDF读取结果 */
export interface PdfReadResult {
  /** 提取的文本内容（每页） */
  readonly pages: readonly PdfPage[];
  /** 总页数 */
  readonly totalPages: number;
  /** 是否经过页范围限制 */
  readonly pageRangeApplied: boolean;
}

/** PDF单页内容 */
export interface PdfPage {
  /** 页码(1-based) */
  readonly pageNumber: number;
  /** 页面文本内容 */
  readonly text: string;
  /** 页面宽度(pt) */
  readonly width?: number;
  /** 页面高度(pt) */
  readonly height?: number;
}

/**
 * parsePdfPages — 解析PDF页范围
 *
 * 支持格式: "1-5", "3", "10-20", "1,3,5", "1-5,8,10-12"
 *
 * @param pagesStr 页范围字符串
 * @param totalPages PDF总页数
 * @returns 解析后的页码列表(1-based, 去重排序)
 */
export function parsePdfPageRange(pagesStr: string, totalPages: number): number[] {
  const pages: Set<number> = new Set();

  const parts = pagesStr
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const part of parts) {
    // 单页: "3"
    if (/^\d+$/.test(part)) {
      const num = Number.parseInt(part, 10);
      if (num >= 1 && num <= totalPages) {
        pages.add(num);
      }
      continue;
    }

    // 范围: "1-5"
    const rangeMatch = /^(\d+)-(\d+)$/.exec(part);
    if (rangeMatch) {
      const start = Math.max(1, Number.parseInt(rangeMatch[1], 10));
      const end = Math.min(totalPages, Number.parseInt(rangeMatch[2], 10));
      for (let i = start; i <= end; i++) {
        pages.add(i);
      }
      continue;
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

/**
 * readPdfFile — 读取PDF文件内容
 *
 * 注: PDF文本提取依赖宿主注入的pdfProvider（如pdftotext）， 不提供时返回页面元数据（页数等）但text为空。
 *
 * @param buffer PDF文件Buffer
 * @param pageRange 页范围字符串（如 "1-5"）
 * @param totalPages 总页数（需要宿主提供）
 * @param pdfProvider PDF文本提取提供者（可选）
 */
export function readPdfFile(
  buffer: Buffer,
  pageRange?: string,
  totalPages: number = 0,
  pdfProvider?: PdfTextProvider
): PdfReadResult {
  // 如果宿主提供了总页数和提取器 → 完整读取
  const targetPages = pageRange
    ? parsePdfPageRange(pageRange, totalPages)
    : Array.from({ length: totalPages }, (_, i) => i + 1);

  const pageRangeApplied = pageRange !== undefined && pageRange !== '';

  if (pdfProvider) {
    const pages = pdfProvider(buffer, targetPages);
    return { pages, totalPages, pageRangeApplied };
  }

  // 无pdfProvider → 返回空文本但保留页码信息
  const pages: PdfPage[] = targetPages.map(num => ({
    pageNumber: num,
    text: '[PDF text extraction requires pdfProvider — install poppler-utils]'
  }));

  return { pages, totalPages, pageRangeApplied };
}

/** PDF文本提取提供者接口 — 宿主注入（如使用pdftotext） */
export interface PdfTextProvider {
  (buffer: Buffer, pageNumbers: readonly number[]): readonly PdfPage[];
}

// ============================================================
// 3. Notebook(.ipynb)解析
// ============================================================

/** Notebook读取结果 */
export interface NotebookReadResult {
  /** 所有cell内容 */
  readonly cells: readonly NotebookCell[];
  /** notebook元数据 */
  readonly metadata?: Record<string, unknown>;
  /** kernel信息 */
  readonly kernelInfo?: { name?: string; language?: string };
  /** cell总数 */
  readonly totalCells: number;
}

/** Notebook单cell */
export interface NotebookCell {
  /** cell索引(0-based) */
  readonly index: number;
  /** cell类型 */
  readonly cellType: 'markdown' | 'code' | 'raw';
  /** cell源代码/文本 */
  readonly source: string;
  /** cell输出（仅code cell有） */
  readonly outputs?: readonly NotebookCellOutput[];
  /** 执行计数（仅code cell有） */
  readonly executionCount?: number | null;
}

/** Notebook cell输出 */
export interface NotebookCellOutput {
  /** 输出类型 */
  readonly outputType: 'stream' | 'display_data' | 'execute_result' | 'error';
  /** 文本输出 */
  readonly text?: string;
  /** 图片数据(base64) */
  readonly imageData?: string;
  /** 图片MIME类型 */
  readonly imageMimeType?: string;
  /** 错误名（error类型） */
  readonly errorName?: string;
  /** 错误值（error类型） */
  readonly errorValue?: string;
  /** 错误堆栈（error类型） */
  readonly traceback?: readonly string[];
}

/**
 * parseNotebook — 解析.ipynb文件内容
 *
 * 从JSON中提取cell内容、输出和元数据
 *
 * @param content notebook JSON字符串
 */
export function parseNotebook(content: string): NotebookReadResult {
  let nb: Record<string, unknown>;
  try {
    nb = JSON.parse(content);
  } catch {
    return {
      cells: [],
      metadata: {},
      totalCells: 0
    };
  }

  const rawCells = (nb.cells as readonly Record<string, unknown>[] | undefined) ?? [];
  const metadata = (nb.metadata as Record<string, unknown> | undefined) ?? {};
  const kernelspec = metadata.kernelspec as Record<string, unknown> | undefined;
  const kernelInfo = kernelspec
    ? {
        name: kernelspec.name as string | undefined,
        language: kernelspec.language as string | undefined
      }
    : undefined;

  const cells: NotebookCell[] = rawCells.map((cell, index) => {
    const cellType = ((cell.cell_type as string) ?? 'code') as 'markdown' | 'code' | 'raw';
    const source = Array.isArray(cell.source)
      ? (cell.source as readonly string[]).join('')
      : ((cell.source as string) ?? '');

    let outputs: NotebookCellOutput[] | undefined;
    let executionCount: number | null | undefined;

    if (cellType === 'code') {
      executionCount = cell.execution_count as number | null | undefined;
      const rawOutputs = (cell.outputs as readonly Record<string, unknown>[] | undefined) ?? [];
      outputs = rawOutputs.map(parseCellOutput);
    }

    return {
      index,
      cellType,
      source,
      outputs,
      executionCount
    };
  });

  return {
    cells,
    metadata,
    kernelInfo,
    totalCells: cells.length
  };
}

/** 解析单个cell输出 */
function parseCellOutput(raw: Record<string, unknown>): NotebookCellOutput {
  const outputType = ((raw.output_type as string) ?? 'stream') as NotebookCellOutput['outputType'];

  // stream输出
  if (outputType === 'stream') {
    const text = raw.text;
    const textStr = Array.isArray(text)
      ? (text as readonly string[]).join('')
      : ((text as string) ?? '');
    return { outputType, text: textStr };
  }

  // display_data / execute_result
  if (outputType === 'display_data' || outputType === 'execute_result') {
    const data = raw.data as Record<string, string | readonly string[]> | undefined;
    let text: string | undefined;
    let imageData: string | undefined;
    let imageMimeType: string | undefined;

    if (data) {
      if (data['text/plain']) {
        const tp = data['text/plain'];
        text =
          typeof tp === 'string'
            ? tp
            : Array.isArray(tp)
              ? (tp as readonly string[]).join('')
              : String(tp);
      }
      if (data['image/png']) {
        imageData = data['image/png'] as string;
        imageMimeType = 'image/png';
      } else if (data['image/jpeg']) {
        imageData = data['image/jpeg'] as string;
        imageMimeType = 'image/jpeg';
      }
    }
    return { outputType, text, imageData, imageMimeType };
  }

  // error输出
  if (outputType === 'error') {
    return {
      outputType,
      errorName: (raw.ename as string) ?? '',
      errorValue: (raw.evalue as string) ?? '',
      traceback: (raw.traceback as readonly string[] | undefined) ?? []
    };
  }

  return { outputType };
}
