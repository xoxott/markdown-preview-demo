/**
 * Plugin 类型体系
 *
 * N35: 对齐 CC types/plugin.ts 定义完整的插件生命周期类型。
 */

/** Plugin Manifest — 插件元数据 */
export interface PluginManifest {
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly author?: string;
  readonly homepage?: string;
  readonly license?: string;
  readonly entryPoint: string;
  readonly permissions?: readonly string[];
  readonly dependencies?: readonly string[];
}

/** Builtin Plugin Definition — 内置插件 */
export interface BuiltinPluginDefinition {
  readonly name: string;
  readonly enabledByDefault: boolean;
  readonly description: string;
  readonly hooks?: readonly string[];
  readonly tools?: readonly string[];
}

/** Loaded Plugin — 已加载的插件实例 */
export interface LoadedPlugin {
  readonly manifest: PluginManifest;
  readonly status: 'loaded' | 'error' | 'disabled';
  readonly loadedAt: number;
  readonly error?: string;
}

/** Plugin Repository — 插件仓库 */
export interface PluginRepository {
  readonly name: string;
  readonly url: string;
  readonly type: 'npm' | 'github' | 'local';
  readonly trusted: boolean;
}

/** Plugin Config — 插件配置 */
export interface PluginConfig {
  readonly enabledPlugins: readonly string[];
  readonly disabledPlugins: readonly string[];
  readonly repositories: readonly PluginRepository[];
}
