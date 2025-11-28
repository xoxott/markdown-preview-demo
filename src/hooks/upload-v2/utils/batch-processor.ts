/**
 * 批量处理工具函数
 */

/**
 * 批量处理配置
 */
export interface BatchProcessConfig<T, R> {
  items: T[];
  batchSize?: number;
  processor: (item: T, index: number) => Promise<R | null>;
  onProgress?: (processed: number, total: number) => void;
  signal?: AbortSignal;
  delayBetweenBatches?: number;
}

/**
 * 批量处理结果
 */
export interface BatchProcessResult<R> {
  results: R[];
  failed: number;
  total: number;
}

/**
 * 批量处理函数
 */
export async function batchProcess<T, R>(
  config: BatchProcessConfig<T, R>
): Promise<BatchProcessResult<R>> {
  const {
    items,
    batchSize = 5,
    processor,
    onProgress,
    signal,
    delayBetweenBatches = 10
  } = config;

  const results: R[] = [];
  const total = items.length;

  for (let i = 0; i < items.length; i += batchSize) {
    if (signal?.aborted) {
      break;
    }

    const batch = items.slice(i, i + batchSize);
    const batchPromises = batch.map((item, batchIndex) =>
      processor(item, i + batchIndex)
    );

    const batchResults = await Promise.all(batchPromises);
    // 过滤掉 null 值，并确保类型正确
    const validResults = batchResults.filter((r): r is Awaited<R> => r !== null) as R[];
    results.push(...validResults);

    if (onProgress) {
      onProgress(results.length, total);
    }

    // 批次间延迟
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }

  return {
    results,
    failed: total - results.length,
    total
  };
}

