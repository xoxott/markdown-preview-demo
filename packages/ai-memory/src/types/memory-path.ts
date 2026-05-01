/** 记忆路径类型 — 配置注入，无 env var 依赖 */

/** 记忆路径配置 — 由宿主注入 */
export interface MemoryPathConfig {
  readonly baseDir: string; // e.g., '<home>/projects/'
  readonly projectRoot: string; // e.g., '/Users/dev/my-project'
  readonly sanitizedGitRoot?: string; // 预计算的 sanitized 项目名
}

/** 记忆路径集合 — 由 computeMemoryPaths() 生成 */
export interface MemoryPaths {
  readonly autoMemPath: string; // <base>/projects/<sanitized>/memory/
  readonly entrypointPath: string; // <autoMemPath>/MEMORY.md
  readonly teamDir: string; // <autoMemPath>/team/
  readonly privateDir: string; // <autoMemPath>/ (individual memory root)
}
