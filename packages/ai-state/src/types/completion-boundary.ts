/** CompletionBoundary — turn完成/工具完成/权限拒绝追踪 */

export type CompletionBoundaryType =
  | 'complete' // 正常完成
  | 'bash_complete' // bash命令完成
  | 'edit_complete' // file-edit完成
  | 'tool_complete' // 通用工具完成
  | 'denied_tool'; // 权限拒绝

export interface CompletionBoundary {
  readonly type: CompletionBoundaryType;
  readonly toolName?: string;
  readonly timestamp: number;
  readonly turnIndex: number;
}
