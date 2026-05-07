/**
 * Team Memory Secret Guard — 写入团队内存前的拦截
 *
 * 对齐 CC services/teamMemorySync/teamMemSecretGuard.ts。在 FileWrite/FileEdit 工具 的 validateInput
 * 阶段调用，检查目标路径是否为团队内存路径，是的话扫描内容是否包含 secret，命中则返回错误信息阻止写入。
 *
 * 团队内存会同步给所有 repo 协作者，因此必须在客户端阻止 secret 上传。
 */

import { scanForSecrets } from './secret-scanner';

// ============================================================
// 类型
// ============================================================

/** 团队内存路径检测器（由宿主提供，因为路径规则可能与项目相关） */
export interface TeamMemPathChecker {
  /** 判断给定路径是否在团队内存目录下 */
  isTeamMemPath(filePath: string): boolean;
}

/** Guard 选项 */
export interface TeamMemSecretGuardOptions {
  /** 路径检测器 */
  readonly pathChecker: TeamMemPathChecker;
  /** 团队内存功能是否启用（feature flag） */
  readonly enabled?: boolean;
}

// ============================================================
// 主校验
// ============================================================

/**
 * 检查写入或编辑操作是否会向团队内存路径写入 secret
 *
 * @returns 错误消息（命中 secret），或 null（安全/不在团队路径下/功能未启用）
 */
export function checkTeamMemSecrets(
  filePath: string,
  content: string,
  options: TeamMemSecretGuardOptions
): string | null {
  if (options.enabled === false) return null;
  if (!options.pathChecker.isTeamMemPath(filePath)) return null;

  const matches = scanForSecrets(content);
  if (matches.length === 0) return null;

  const labels = [...new Set(matches.map(m => m.label))].join(', ');
  return (
    `Content contains potential secrets (${labels}) and cannot be written to team memory. ` +
    'Team memory is shared with all repository collaborators. ' +
    'Remove the sensitive content and try again.'
  );
}

/** 简单的路径检测器：basedir 下的所有文件都视为团队内存 */
export class BasedirTeamMemPathChecker implements TeamMemPathChecker {
  private readonly normalizedBaseDir: string;

  constructor(baseDir: string) {
    const normalized = baseDir.replace(/\\/g, '/');
    this.normalizedBaseDir = normalized.endsWith('/') ? normalized : `${normalized}/`;
  }

  isTeamMemPath(filePath: string): boolean {
    const normalized = filePath.replace(/\\/g, '/');
    return normalized.startsWith(this.normalizedBaseDir);
  }
}
