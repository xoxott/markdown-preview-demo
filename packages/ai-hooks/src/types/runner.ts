/** HookRunner 依赖注入接口定义 */

import type { HookDefinition, HookExecutionContext, HookResult, HookType } from './hooks';
import type { HookInput } from './input';

// ——— Runner 公共协议 ———

/**
 * HookRunner — 执行引擎公共协议
 *
 * 每种 HookType 对应一个 Runner 实现：
 *
 * - 'command' → CommandRunner（Shell 命令执行）
 * - 'prompt' → PromptRunner（LLM 单轮评估）
 * - 'http' → HttpRunner（HTTP POST 请求）
 * - 'agent' → AgentRunner（LLM 多轮验证）
 * - 'callback' → CallbackRunner（函数回调，type=undefined 的默认行为）
 */
export interface HookRunner {
  /** Runner 类型标识 */
  readonly runnerType: HookType | 'callback';

  /**
   * 执行单个 HookDefinition
   *
   * @param hook — Hook 定义（含 type、command/model/url 等配置）
   * @param input — Hook 输入（判别联合 HookInput）
   * @param context — Hook 执行上下文（abortSignal + toolRegistry + meta）
   * @returns HookResult — 与 handler 回调返回值结构完全一致
   */
  run(hook: HookDefinition, input: HookInput, context: HookExecutionContext): Promise<HookResult>;
}

/** RunnerRegistry — Runner 工厂 + 查找 */
export interface RunnerRegistry {
  /** 注册 Runner 实现 */
  register(runner: HookRunner): void;

  /**
   * 根据 HookDefinition.type 查找 Runner
   *
   * - undefined → 'callback'（CallbackRunner）
   * - 'command' → CommandRunner
   * - 其他 → 对应 Runner，找不到 → CallbackRunner fallback
   */
  resolve(type: HookType | undefined): HookRunner;
}

// ——— CommandRunner 依赖注入 ———

/** ShellExecutor — shell 命令执行能力（由宿主环境注入） */
export interface ShellExecutor {
  execute(command: string, options: ShellExecuteOptions): Promise<ShellResult>;
}

export interface ShellExecuteOptions {
  /** 是否使用 shell 模式执行 */
  shell?: boolean;
  /** 额外环境变量注入 */
  env?: Record<string, string>;
  /** 中断信号 */
  signal?: AbortSignal;
  /** 超时（ms） */
  timeout?: number;
  /** 工作目录 */
  cwd?: string;
}

export interface ShellResult {
  /** 退出码（0=成功, 2=blocking, 其他=error） */
  exitCode: number;
  /** 标准输出 */
  stdout: string;
  /** 标准错误 */
  stderr: string;
}

// ——— HttpRunner 依赖注入 ———

/** HttpClient — HTTP 请求能力（由宿主环境注入） */
export interface HttpClient {
  post(url: string, body: unknown, options: HttpPostOptions): Promise<HttpResponse>;
}

export interface HttpPostOptions {
  /** 自定义请求头 */
  headers?: Record<string, string>;
  /** 中断信号 */
  signal?: AbortSignal;
  /** 超时（ms） */
  timeout?: number;
}

export interface HttpResponse {
  /** HTTP 状态码 */
  statusCode: number;
  /** 响应体 */
  body: unknown;
  /** 错误信息 */
  error?: string;
}

// ——— 安全防护依赖注入 ———

/** SsrfGuard — SSRF 防护（私有 IP 阻断） */
export interface SsrfGuard {
  /** 检查 hostname 是否为私有 IP 地址 */
  isPrivateIp(hostname: string): boolean;
}

/** EnvProvider — 环境变量读取（由宿主环境注入） */
export interface EnvProvider {
  /** 获取环境变量值 */
  getEnv(key: string): string | undefined;
}

// ——— 异步 Hook ———

/**
 * AsyncRewakeCallback — 异步 Hook 完成后的回调
 *
 * 异步 Hook 启动后立即返回占位结果，实际执行在后台继续。 后台完成后通过此回调通知宿主环境。
 */
export type AsyncRewakeCallback = (hookName: string, result: HookResult) => void;

// ——— Runner 依赖注入集合 ———

/**
 * HookRunnerDeps — Runner 构造器所需的依赖集合
 *
 * 各 Runner 通过构造器注入不同的 deps 子集。 宿主环境组装 deps 后通过 createFullHookExecutor() 传入。
 */
export interface HookRunnerDeps {
  /** Shell 命令执行能力（CommandRunner 必需） */
  readonly shellExecutor?: ShellExecutor;
  /** LLM 查询能力（PromptRunner/AgentRunner 必需） */
  readonly llmProvider?: unknown; // LLMProvider — 避免循环依赖，实际类型由宿主环境保证
  /** HTTP 请求能力（HttpRunner 必需） */
  readonly httpClient?: HttpClient;
  /** SSRF 防护（HttpRunner 必需） */
  readonly ssrfGuard?: SsrfGuard;
  /** 环境变量读取（HttpRunner env 插值需要） */
  readonly envProvider?: EnvProvider;
}

/** HookExecutorDeps — HookExecutor 构造器依赖 */
export interface HookExecutorDeps {
  /** Hook 注册表 */
  readonly registry: import('../registry/HookRegistry').HookRegistry;
  /** Runner 注册表 */
  readonly runnerRegistry: RunnerRegistry;
  /** 会话级 Hook 存储（可选，未提供则跳过 FunctionHook 合并） */
  readonly sessionStore?: import('../types/session').SessionHookStore;
}
