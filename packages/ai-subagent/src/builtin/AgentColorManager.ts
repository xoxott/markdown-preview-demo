/**
 * AgentColorManager — 内置/自定义 Agent 颜色分配
 *
 * 对齐 CC tools/AgentTool/agentColorManager.ts，从固定颜色池中为每个 agentType 分配颜色， 用于 UI 区分不同的
 * sub-agent。general-purpose 类型不分配颜色（默认色）。
 */

/** 可用的 Agent 颜色（与 CC 一致） */
export type AgentColorName =
  | 'red'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'purple'
  | 'orange'
  | 'pink'
  | 'cyan';

/** 全部颜色 — 用于轮询分配 */
export const AGENT_COLORS: readonly AgentColorName[] = [
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
  'orange',
  'pink',
  'cyan'
] as const;

/**
 * AgentColorManager — 颜色分配管理器
 *
 * 宿主可创建实例并跨 session 持久化分配状态。SDK / 测试 场景使用 InMemory 实现。
 */
export class AgentColorManager {
  private readonly colorMap: Map<string, AgentColorName>;
  private nextIndex: number;

  constructor(initial?: ReadonlyMap<string, AgentColorName>) {
    this.colorMap = new Map(initial ?? []);
    this.nextIndex = this.colorMap.size % AGENT_COLORS.length;
  }

  /** 获取 agentType 的颜色。如果未分配，返回 undefined。 general-purpose 类型不分配颜色（返回 undefined）。 */
  getColor(agentType: string): AgentColorName | undefined {
    if (agentType === 'general-purpose') return undefined;
    return this.colorMap.get(agentType);
  }

  /** 自动为 agentType 分配下一个可用颜色。 如果已分配则返回已有颜色。 */
  assignColor(agentType: string): AgentColorName | undefined {
    if (agentType === 'general-purpose') return undefined;

    const existing = this.colorMap.get(agentType);
    if (existing) return existing;

    const color = AGENT_COLORS[this.nextIndex % AGENT_COLORS.length] ?? 'blue';
    this.colorMap.set(agentType, color);
    this.nextIndex += 1;
    return color;
  }

  /** 显式设置 agentType 的颜色（覆盖分配） */
  setColor(agentType: string, color: AgentColorName | undefined): void {
    if (!color) {
      this.colorMap.delete(agentType);
      return;
    }
    if (AGENT_COLORS.includes(color)) {
      this.colorMap.set(agentType, color);
    }
  }

  /** 序列化为 plain object 以便持久化 */
  toJSON(): Record<string, AgentColorName> {
    return Object.fromEntries(this.colorMap);
  }

  /** 从 plain object 反序列化 */
  static fromJSON(obj: Record<string, AgentColorName>): AgentColorManager {
    return new AgentColorManager(new Map(Object.entries(obj)));
  }
}
