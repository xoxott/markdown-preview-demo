/** FileEditLog — 文件编辑历史记录接口 */

/** 编辑记录条目 — 保存每次 FileEdit/FileWrite 操作的前后完整内容 */
export interface FileEditLogEntry {
  /** 唯一编辑 ID */
  readonly editId: string;
  /** 文件路径 */
  readonly filePath: string;
  /** 编辑前的完整文件内容 */
  readonly oldContent: string;
  /** 编辑后的完整文件内容 */
  readonly newContent: string;
  /** 替换的旧字符串（仅 FileEdit） */
  readonly oldString: string;
  /** 替换的新字符串（仅 FileEdit） */
  readonly newString: string;
  /** 是否全部替换 */
  readonly replaceAll: boolean;
  /** 时间戳（毫秒） */
  readonly timestamp: number;
}

/**
 * FileEditLogProvider — 文件编辑历史记录接口
 *
 * - record: 记录一次编辑操作（FileEdit/FileWrite）
 * - getRecentEdits: 获取指定文件的最近 N 条编辑记录
 * - getEditById: 获取指定 editId 的记录
 * - revert: 撤销指定编辑（恢复 oldContent）— 返回是否成功
 * - size: 获取所有编辑记录数量
 * - reset: 清空记录
 */
export interface FileEditLogProvider {
  /** 记录一次编辑操作 */
  record(entry: FileEditLogEntry): void;
  /** 获取指定文件的最近 N 条编辑记录（按时间倒序） */
  getRecentEdits(filePath: string, limit?: number): readonly FileEditLogEntry[];
  /** 获取指定 editId 的记录 */
  getEditById(editId: string): FileEditLogEntry | undefined;
  /** 获取最近一条编辑记录（全局） */
  getLatestEdit(): FileEditLogEntry | undefined;
  /** 撤销指定编辑（恢复 oldContent 到文件）— 返回是否成功 */
  revert(editId: string): Promise<boolean>;
  /** 获取所有编辑记录数量 */
  size(): number;
  /** 清空记录 */
  reset(): void;
}
