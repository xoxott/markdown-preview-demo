/**
 * MultiAgentSpawner — 多代理（teammate）启动抽象
 *
 * 对齐 CC tools/shared/spawnMultiAgent.ts，提供 SDK 级别的多代理启动抽象。 真实的进程/tmux/inProcess 启动由宿主提供
 * `MultiAgentBackend` 实现。
 */

import type { SubagentDefinition } from '@suga/ai-subagent';

// ============================================================
// 类型定义
// ============================================================

/** 代理后端类型 */
export type MultiAgentBackendType = 'tmux' | 'in-process' | 'remote' | 'worktree' | 'subprocess';

/** Spawn 配置 */
export interface MultiAgentSpawnConfig {
  /** 代理实例名（用户友好） */
  readonly name: string;
  /** 代理类型（关联 SubagentDefinition） */
  readonly agentType: string;
  /** 模型（'inherit' 表示继承 leader） */
  readonly model?: string;
  /** 初始提示 */
  readonly initialPrompt?: string;
  /** cwd */
  readonly cwd?: string;
  /** 颜色（UI 区分） */
  readonly color?: string;
  /** 后端首选（不指定则由 backend 自动检测） */
  readonly preferredBackend?: MultiAgentBackendType;
  /** 权限模式 */
  readonly permissionMode?: 'default' | 'plan' | 'acceptEdits' | 'bypassPermissions' | 'dontAsk';
  /** 自定义环境变量 */
  readonly env?: Readonly<Record<string, string>>;
  /** 后台模式（不阻塞 leader） */
  readonly background?: boolean;
}

/** Spawn 结果 */
export interface MultiAgentSpawnResult {
  /** 任务 id */
  readonly taskId: string;
  /** 代理 id */
  readonly agentId: string;
  /** 实际使用的后端 */
  readonly backend: MultiAgentBackendType;
  /** 代理实例名 */
  readonly name: string;
  /** 代理类型 */
  readonly agentType: string;
  /** 是否后台运行 */
  readonly background: boolean;
  /** 初始 cwd */
  readonly cwd: string;
  /** 解析后的模型 */
  readonly model: string;
  /** 输出文件路径（若使用磁盘隔离） */
  readonly outputFile?: string;
  /** 备选 backend 触发（如 tmux 不可用回退 in-process） */
  readonly fallback?: { from: MultiAgentBackendType; to: MultiAgentBackendType; reason: string };
}

/** Spawn 错误 */
export class MultiAgentSpawnError extends Error {
  constructor(
    public readonly code:
      | 'no_backend'
      | 'backend_unavailable'
      | 'definition_missing'
      | 'invalid_config'
      | 'launch_failed',
    message: string
  ) {
    super(message);
    this.name = 'MultiAgentSpawnError';
  }
}

/** 多代理后端 — 由宿主实现 */
export interface MultiAgentBackend {
  /** 后端类型 */
  readonly type: MultiAgentBackendType;
  /** 是否可用 */
  isAvailable(): Promise<boolean>;
  /** 启动代理实例 */
  spawn(
    config: MultiAgentSpawnConfig,
    definition: SubagentDefinition
  ): Promise<MultiAgentSpawnResult>;
}

/** Spawner 选项 */
export interface MultiAgentSpawnerOptions {
  /** 候选后端（按优先级，第一个可用的会被使用） */
  readonly backends: readonly MultiAgentBackend[];
  /** SubagentDefinition 解析器 */
  readonly resolveDefinition: (agentType: string) => Promise<SubagentDefinition | null>;
  /** Leader 模型（当 config.model='inherit' 时使用） */
  readonly leaderModel?: string;
  /** 默认模型（fallback） */
  readonly defaultModel?: string;
}

// ============================================================
// 模型解析
// ============================================================

/** 解析代理模型 — 处理 'inherit' 别名 */
export function resolveAgentModel(
  configModel: string | undefined,
  leaderModel: string | undefined,
  defaultModel: string = 'sonnet'
): string {
  if (configModel === 'inherit') {
    return leaderModel ?? defaultModel;
  }
  return configModel ?? leaderModel ?? defaultModel;
}

/** 清理代理实例名（避免与 backend 冲突的字符） */
export function sanitizeAgentName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/^-+|-+$/g, '');
}

// ============================================================
// Spawner
// ============================================================

/**
 * MultiAgentSpawner — 多代理启动器
 *
 * 流程：
 *
 * 1. 解析 agentType -> SubagentDefinition
 * 2. 选择 backend（preferredBackend 优先；不可用则按 backends 顺序选第一个可用）
 * 3. 调用 backend.spawn 真实启动
 *
 * @throws MultiAgentSpawnError 失败时抛出
 */
export class MultiAgentSpawner {
  private readonly options: MultiAgentSpawnerOptions;

  constructor(options: MultiAgentSpawnerOptions) {
    if (options.backends.length === 0) {
      throw new MultiAgentSpawnError('no_backend', 'At least one backend required');
    }
    this.options = options;
  }

  async spawn(config: MultiAgentSpawnConfig): Promise<MultiAgentSpawnResult> {
    const definition = await this.options.resolveDefinition(config.agentType);
    if (!definition) {
      throw new MultiAgentSpawnError(
        'definition_missing',
        `Agent definition not found: ${config.agentType}`
      );
    }

    const resolvedModel = resolveAgentModel(
      config.model ?? definition.model,
      this.options.leaderModel,
      this.options.defaultModel
    );

    const finalConfig: MultiAgentSpawnConfig = {
      ...config,
      name: sanitizeAgentName(config.name),
      model: resolvedModel
    };

    const backend = await this.selectBackend(config.preferredBackend);
    if (!backend) {
      throw new MultiAgentSpawnError('backend_unavailable', 'No available backend found');
    }

    let fallback: MultiAgentSpawnResult['fallback'];
    if (config.preferredBackend && config.preferredBackend !== backend.type) {
      fallback = {
        from: config.preferredBackend,
        to: backend.type,
        reason: `Preferred backend '${config.preferredBackend}' is not available`
      };
    }

    try {
      const result = await backend.spawn(finalConfig, definition);
      return fallback ? { ...result, fallback } : result;
    } catch (err) {
      throw new MultiAgentSpawnError(
        'launch_failed',
        `Backend ${backend.type} failed: ${(err as Error).message}`
      );
    }
  }

  private async selectBackend(
    preferred?: MultiAgentBackendType
  ): Promise<MultiAgentBackend | null> {
    if (preferred) {
      const candidate = this.options.backends.find(b => b.type === preferred);
      if (candidate && (await candidate.isAvailable())) return candidate;
    }
    for (const backend of this.options.backends) {
      if (await backend.isAvailable()) return backend;
    }
    return null;
  }
}
