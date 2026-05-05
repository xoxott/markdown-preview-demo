/**
 * MCP Server Builder — Builder 模式简化 MCP Server 创建和注册
 *
 * 用法：
 *
 * ```ts
 * const host = await McpServerBuilder.create('my-server', '1.0.0')
 *   .withTool(
 *     'echo',
 *     { description: 'Echo input', inputSchema: { message: z.string() } },
 *     async args => ({
 *       content: [{ type: 'text', text: args.message }]
 *     })
 *   )
 *   .withResource(
 *     'config',
 *     'file:///config.json',
 *     { mimeType: 'application/json' },
 *     async uri => ({
 *       contents: [{ uri: uri.toString(), mimeType: 'application/json', text: '{}' }]
 *     })
 *   )
 *   .withPrompt(
 *     'greet',
 *     { description: 'Greet someone', argsSchema: { name: z.string() } },
 *     async args => ({
 *       messages: [{ role: 'user', content: { type: 'text', text: `Hello, ${args.name}!` } }]
 *     })
 *   )
 *   .connect(new StdioServerTransport());
 * ```
 */

import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { Implementation } from '@modelcontextprotocol/sdk/types.js';
import type { ServerOptions } from '@modelcontextprotocol/sdk/server/index.js';
import { McpServerHost } from './McpServerHost';
import type {
  McpPromptCallback,
  McpPromptConfig,
  McpResourceConfig,
  McpResourceReadCallback,
  McpToolCallback,
  McpToolConfig
} from './McpServerHost';

/** 工具注册条目 */
interface ToolEntry {
  readonly config: McpToolConfig;
  readonly callback: McpToolCallback;
}

/** 资源注册条目 */
interface ResourceEntry {
  readonly config: McpResourceConfig;
  readonly readCallback: McpResourceReadCallback;
}

/** 提示注册条目 */
interface PromptEntry {
  readonly config: McpPromptConfig;
  readonly callback: McpPromptCallback;
}

/** MCP Server Builder — 逐步构建和注册工具/资源/提示，最终连接传输 */
export class McpServerBuilder {
  private readonly serverInfo: Implementation;
  private readonly serverOptions?: ServerOptions;
  private readonly toolEntries: ToolEntry[] = [];
  private readonly resourceEntries: ResourceEntry[] = [];
  private readonly promptEntries: PromptEntry[] = [];
  private instructions?: string;

  private constructor(serverInfo: Implementation, options?: ServerOptions) {
    this.serverInfo = serverInfo;
    this.serverOptions = options;
  }

  /**
   * 创建 Builder 实例
   *
   * @param name 服务器名称
   * @param version 服务器版本
   * @param options Server 选项
   */
  static create(name: string, version: string, options?: ServerOptions): McpServerBuilder {
    return new McpServerBuilder({ name, version }, options);
  }

  /** 设置服务器 instructions */
  withInstructions(instructions: string): McpServerBuilder {
    this.instructions = instructions;
    return this;
  }

  /**
   * 添加工具注册
   *
   * @param name 工具名称
   * @param config 工具配置（description、inputSchema、annotations）
   * @param callback 工具回调
   */
  withTool(
    name: string,
    config: Omit<McpToolConfig, 'name'>,
    callback: McpToolCallback
  ): McpServerBuilder {
    this.toolEntries.push({
      config: { name, ...config },
      callback
    });
    return this;
  }

  /**
   * 添加资源注册
   *
   * @param name 资源名称
   * @param uri 资源 URI
   * @param metadata 资源元数据（description、mimeType）
   * @param readCallback 资源读取回调
   */
  withResource(
    name: string,
    uri: string,
    metadata: Omit<McpResourceConfig, 'name' | 'uri'>,
    readCallback: McpResourceReadCallback
  ): McpServerBuilder {
    this.resourceEntries.push({
      config: { name, uri, ...metadata },
      readCallback
    });
    return this;
  }

  /**
   * 添加提示注册
   *
   * @param name 提示名称
   * @param config 提示配置（description、argsSchema）
   * @param callback 提示回调
   */
  withPrompt(
    name: string,
    config: Omit<McpPromptConfig, 'name'>,
    callback: McpPromptCallback
  ): McpServerBuilder {
    this.promptEntries.push({
      config: { name, ...config },
      callback
    });
    return this;
  }

  /**
   * 构建 McpServerHost（注册所有工具/资源/提示）
   *
   * @returns 未连接的 McpServerHost
   */
  build(): McpServerHost {
    const host = new McpServerHost({
      serverInfo: this.serverInfo,
      options: {
        ...this.serverOptions,
        instructions: this.instructions
      }
    });

    // 注册所有工具
    for (const entry of this.toolEntries) {
      host.registerTool(entry.config, entry.callback);
    }

    // 注册所有资源
    for (const entry of this.resourceEntries) {
      host.registerResource(entry.config, entry.readCallback);
    }

    // 注册所有提示
    for (const entry of this.promptEntries) {
      host.registerPrompt(entry.config, entry.callback);
    }

    return host;
  }

  /**
   * 构建 + 连接传输 — 一站式完成
   *
   * @param transport MCP 传输实例
   * @returns 已连接的 McpServerHost
   */
  async connect(transport: Transport): Promise<McpServerHost> {
    const host = this.build();
    await host.connect(transport);
    return host;
  }
}
