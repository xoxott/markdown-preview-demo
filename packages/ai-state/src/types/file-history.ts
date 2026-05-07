/**
 * FileHistoryState — 文件修改历史追踪
 *
 * N44: 追踪文件修改历史和快照
 */

export interface FileHistorySnapshot {
  readonly filePath: string;
  readonly snapshots: readonly {
    readonly sha: string;
    readonly timestamp: number;
    readonly author: string;
  }[];
  readonly currentSha?: string;
}
