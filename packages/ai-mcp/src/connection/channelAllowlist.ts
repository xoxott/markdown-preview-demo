/**
 * MCP Channel Allowlist — 频道插件白名单校验
 *
 * 对齐 CC services/mcp/channelAllowlist.ts。--channels plugin:name@marketplace 条目仅在白名单中才会注册。白名单从远程
 * GrowthBook (tengu_harbor_ledger) 加载， 使得无需发版即可更新允许的插件。
 *
 * 粒度：插件级（不到 server 级）。一个被批准的插件，其所有 channel server 都被批准。
 */

import { z } from 'zod';

// ============================================================
// 类型与 Schema
// ============================================================

/** 白名单条目：marketplace + plugin */
export interface ChannelAllowlistEntry {
  readonly marketplace: string;
  readonly plugin: string;
}

export const ChannelAllowlistEntrySchema = z.object({
  marketplace: z.string(),
  plugin: z.string()
});

export const ChannelAllowlistSchema = z.array(ChannelAllowlistEntrySchema);

// ============================================================
// Provider — 由宿主提供
// ============================================================

/** 远程白名单加载器（GrowthBook/REST） */
export interface ChannelAllowlistProvider {
  /** 获取当前白名单（缓存策略由实现决定） */
  getAllowlist(): readonly ChannelAllowlistEntry[];
  /** 频道功能总开关（tengu_harbor） */
  isChannelsEnabled(): boolean;
  /** 频道权限转发开关（tengu_harbor_permissions） */
  isChannelPermissionRelayEnabled(): boolean;
}

/** 内存版 Provider（默认/测试用） */
export class InMemoryChannelAllowlistProvider implements ChannelAllowlistProvider {
  constructor(
    private allowlist: readonly ChannelAllowlistEntry[] = [],
    private channelsEnabled: boolean = false,
    private permissionsEnabled: boolean = false
  ) {}

  getAllowlist(): readonly ChannelAllowlistEntry[] {
    return this.allowlist;
  }

  isChannelsEnabled(): boolean {
    return this.channelsEnabled;
  }

  isChannelPermissionRelayEnabled(): boolean {
    return this.permissionsEnabled;
  }

  setAllowlist(entries: readonly ChannelAllowlistEntry[]): void {
    this.allowlist = entries;
  }

  setChannelsEnabled(enabled: boolean): void {
    this.channelsEnabled = enabled;
  }

  setChannelPermissionRelayEnabled(enabled: boolean): void {
    this.permissionsEnabled = enabled;
  }
}

// ============================================================
// 工具函数
// ============================================================

/** 从插件来源标识符（如 `plugin:telegram@marketplace.com`）解析 plugin/marketplace */
export function parsePluginIdentifier(pluginSource: string): {
  name: string;
  marketplace?: string;
} {
  const atIdx = pluginSource.indexOf('@');
  if (atIdx === -1) {
    const colonIdx = pluginSource.indexOf(':');
    const name = colonIdx === -1 ? pluginSource : pluginSource.slice(colonIdx + 1);
    return { name };
  }
  const before = pluginSource.slice(0, atIdx);
  const marketplace = pluginSource.slice(atIdx + 1);
  const colonIdx = before.indexOf(':');
  const name = colonIdx === -1 ? before : before.slice(colonIdx + 1);
  return { name, marketplace };
}

/**
 * 纯函数白名单检查 — 用于 UI 预过滤（决定是否显示 "Enable channel?" 选项）
 *
 * **不是安全边界**：channel_enable 时仍会跑完整的 gate 校验。
 *
 * @returns true 当 pluginSource 在白名单中
 */
export function isChannelAllowlisted(
  pluginSource: string | undefined,
  provider: ChannelAllowlistProvider
): boolean {
  if (!pluginSource) return false;
  const { name, marketplace } = parsePluginIdentifier(pluginSource);
  if (!marketplace) return false;
  return provider.getAllowlist().some(e => e.plugin === name && e.marketplace === marketplace);
}

/** 校验从白名单加载的原始数据 */
export function validateChannelAllowlist(raw: unknown): ChannelAllowlistEntry[] {
  const result = ChannelAllowlistSchema.safeParse(raw);
  return result.success ? [...result.data] : [];
}
