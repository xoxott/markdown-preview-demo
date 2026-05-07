/**
 * AttributionSnapshot — commit attribution 状态域
 *
 * N41: 追踪 git commit 的归属信息
 */

export interface AttributionSnapshot {
  readonly commitSha: string;
  readonly author: string;
  readonly timestamp: number;
  readonly filesChanged: readonly string[];
  readonly message: string;
}
