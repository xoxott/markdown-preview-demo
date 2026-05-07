/**
 * PowerShellTool 类型定义
 *
 * N34: Windows PowerShell 工具类型层。 跨平台库应覆盖 Windows，但完整实现复杂度高，先定义类型。
 */

/** PowerShell 安全验证级别 */
export type PowerShellSafetyLevel = 'safe' | 'caution' | 'dangerous';

/** PowerShell 命令分类 */
export type PowerShellCommandCategory =
  | 'file_operation'
  | 'process_management'
  | 'system_admin'
  | 'network'
  | 'registry'
  | 'security'
  | 'environment'
  | 'unknown';

/** PowerShell 权限规则 */
export interface PowerShellPermissionRule {
  readonly pattern: string;
  readonly category: PowerShellCommandCategory;
  readonly safetyLevel: PowerShellSafetyLevel;
  readonly allowInAutoMode: boolean;
}

/** PowerShell 工具配置 */
export interface PowerShellToolConfig {
  readonly enabled: boolean;
  readonly platform: 'win32';
  readonly defaultSafetyLevel: PowerShellSafetyLevel;
  readonly timeoutMs: number;
}

/** 默认 PowerShell 工具配置 */
export const DEFAULT_POWERSHELL_CONFIG: PowerShellToolConfig = {
  enabled: false,
  platform: 'win32',
  defaultSafetyLevel: 'caution',
  timeoutMs: 30000
};

/** 判断 PowerShell 是否可用（仅 Windows） */
export function isPowerShellAvailable(): boolean {
  return process.platform === 'win32';
}
