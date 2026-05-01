/** CommandRunner — type='command' 的 Shell 命令执行 Runner */

import type { HookRunner, ShellExecutor } from '../types/runner';
import type { HookDefinition, HookExecutionContext, HookResult } from '../types/hooks';
import type { HookInput } from '../types/input';
import { DEFAULT_COMMAND_TIMEOUT } from '../constants';
import { parseCommandOutput } from '../utils/parseCommandOutput';

/**
 * CommandRunner — Shell 命令执行 Runner
 *
 * 根据 HookDefinition.command 执行 shell 命令：
 *
 * 1. 读取 hook.command 命令字符串
 * 2. 变量替换: ${SUGA_PLUGIN_ROOT} → context.meta.pluginRoot 等
 * 3. 环境变量注入
 * 4. 通过 ShellExecutor 执行
 * 5. parseCommandOutput 解析结果（exit code 0/2/其他 + JSON输出/fallback纯文本）
 */
export class CommandRunner implements HookRunner {
  readonly runnerType = 'command' as const;
  private readonly shellExecutor: ShellExecutor;

  constructor(shellExecutor: ShellExecutor) {
    this.shellExecutor = shellExecutor;
  }

  async run(
    hook: HookDefinition,
    _input: HookInput,
    context: HookExecutionContext
  ): Promise<HookResult> {
    const command = hook.command!;
    const timeout = hook.timeout ?? DEFAULT_COMMAND_TIMEOUT;

    // 变量替换
    const resolvedCommand = this.replaceVariables(command, context);

    // 环境变量注入
    const env: Record<string, string> = {};
    if (context.meta.projectDir) {
      env.SUGA_PROJECT_DIR = String(context.meta.projectDir);
    }

    // 执行 shell 命令
    const result = await this.shellExecutor.execute(resolvedCommand, {
      shell: true,
      env,
      signal: context.abortSignal,
      timeout,
      cwd: context.meta.projectDir as string | undefined
    });

    // 解析输出 → HookResult
    return parseCommandOutput(result.stdout, result.stderr, result.exitCode);
  }

  /** 变量替换 */
  private replaceVariables(command: string, context: HookExecutionContext): string {
    let resolved = command;

    // ${SUGA_PLUGIN_ROOT} → context.meta.pluginRoot
    if (context.meta.pluginRoot) {
      resolved = resolved.replace(/\$\{SUGA_PLUGIN_ROOT\}/g, String(context.meta.pluginRoot));
    }

    // ${SUGA_PROJECT_DIR} → context.meta.projectDir
    if (context.meta.projectDir) {
      resolved = resolved.replace(/\$\{SUGA_PROJECT_DIR\}/g, String(context.meta.projectDir));
    }

    return resolved;
  }
}
