/**
 * sandboxTypes.ts — Sandbox配置类型
 *
 * 对齐Claude Code的SandboxSettings + 网络/文件系统配置。
 */

/** Sandbox网络配置 */
export interface SandboxNetworkConfig {
  /** 允许出站的域名列表 */
  readonly allow?: readonly string[];
  /** 禁止出站的域名列表 */
  readonly deny?: readonly string[];
}

/** Sandbox文件系统配置 */
export interface SandboxFilesystemConfig {
  /** 允许读写的路径列表 */
  readonly allow?: readonly string[];
  /** 禁止读写的路径列表 */
  readonly deny?: readonly string[];
}

/** Sandbox违规忽略配置 */
export interface SandboxIgnoreViolations {
  /** 忽略的网络违规 */
  readonly network?: readonly string[];
  /** 忽略的文件系统违规 */
  readonly filesystem?: readonly string[];
}

/** Sandbox完整配置 */
export interface SandboxSettings {
  /** 网络沙箱配置 */
  readonly network?: SandboxNetworkConfig;
  /** 文件系统沙箱配置 */
  readonly filesystem?: SandboxFilesystemConfig;
  /** 违规忽略规则 */
  readonly ignoreViolations?: SandboxIgnoreViolations;
  /** 排除沙箱的命令列表（便利功能，非安全边界） */
  readonly excludedCommands?: readonly string[];
}
