/** Settings Enterprise 接口预留（Settings Drop-in & Enterprise） MDM/plist/remote/drop-in依赖注入接口 */

import type { SettingSource } from './settings-source';

/**
 * Drop-in 目录读取接口（enterprise 预留）
 *
 * 参考 Claude Code 的 managed-settings.d drop-in 机制: 基础文件 managed-settings.json 提供默认值， drop-in
 * 片段（按字母序叠加）覆盖定制。
 *
 * 不同团队可独立发布策略片段（如 10-otel.json、20-security.json） 而无需协调编辑同一个管理员文件。
 *
 * 此接口仅为预留，宿主按需实现。
 */
export interface DropInSettingsReader {
  /**
   * 读取 drop-in 目录中的所有 JSON 片段
   *
   * @param dirPath drop-in 目录路径
   * @returns 按字母序排列的配置源列表
   */
  readDropInDirectory(dirPath: string): Promise<SettingSource[]>;
}

/**
 * 跨平台管理设置目录路径接口（预留）
 *
 * 参考 Claude Code 的 managedPath.ts:
 *
 * - macOS: /Library/Application Support/ClaudeCode
 * - Windows: C:\Program Files\ClaudeCode
 * - Linux: /etc/claude-code
 *
 * 此接口仅为预留，宿主按需实现。
 */
export interface ManagedSettingsPath {
  /**
   * 获取当前平台的管理设置目录路径
   *
   * @returns 管理设置目录的绝对路径
   */
  getManagedPath(): string;
}

/**
 * macOS plist / Windows 注册表读取接口（预留）
 *
 * 参考 Claude Code 的 mdm/ 子模块: macOS: com.anthropic.claudecode plist Windows:
 * HKLM\SOFTWARE\Policies\ClaudeCode 注册表
 *
 * 此接口仅为预留，宿主按需实现。
 */
export interface PlistSettingsReader {
  /**
   * 读取平台管理设置（plist 或注册表）
   *
   * @returns 配置源，不存在时返回 null
   */
  readPlist(): Promise<SettingSource | null>;
}

/**
 * 远程设置读取接口（预留）
 *
 * 参考 Claude Code 的 remoteManagedSettings: 最高优先级的企业策略，通过 API 远程同步。 存储路径:
 * ~/.claude/remote-settings.json
 *
 * 此接口仅为预留，宿主按需实现。
 */
export interface RemoteSettingsReader {
  /**
   * 读取远程管理设置
   *
   * @returns 配置源，不存在时返回 null
   */
  readRemote(): Promise<SettingSource | null>;
}
