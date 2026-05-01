/** 文件过时检测 — 比较两次读取间的 mtime 变化 */

/**
 * 检测文件是否过时 — 文件在两次读取间被修改
 *
 * 参考 Claude Code 的 FileReadTool/FileEditTool staleness check： 记录每次读取文件的 mtime，后续操作前检查 mtime 是否变化。
 * 若变化则文件"过时"，可能需要重新读取。
 *
 * @param previousMtimeMs 上次读取时的 mtime（毫秒时间戳）
 * @param currentMtimeMs 当前文件的 mtime（毫秒时间戳）
 * @returns 是否过时（mtime 不同则过时）
 */
export function isStale(
  previousMtimeMs: number | undefined,
  currentMtimeMs: number | undefined
): boolean {
  // 无之前记录 → 不是过时（首次读取）
  if (previousMtimeMs === undefined) return false;
  // 无法获取当前 mtime → 无法判断，保守返回过时
  if (currentMtimeMs === undefined) return true;
  // mtime 不同 → 过时
  return previousMtimeMs !== currentMtimeMs;
}
