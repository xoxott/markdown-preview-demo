/**
 * BundledSkill — CLI 内置随包发布的 skill 注册框架
 *
 * 对齐 CC src/skills/bundledSkills.ts。BundledSkill 是编译进 CLI 二进制的 skill， 启动时通过 register()
 * 注册到全局注册表中，模型/用户可以通过 `/<name>` 调用。
 *
 * 与磁盘上 SKILL.md 的区别：bundled skill 是声明式 + 函数式的（getPromptForCommand）， 不需要文件系统读取，启动延迟为 0。
 */

/** Hooks 配置（不强制具体形态，由宿主 hooks 系统定义） */
export type BundledSkillHooks = Readonly<Record<string, unknown>>;

// ============================================================
// 类型定义
// ============================================================

/** Bundled skill 上下文回调接收的最小 toolUseContext 接口 */
export interface BundledSkillContext {
  /** 当前会话 ID */
  readonly sessionId?: string;
  /** 当前工作目录 */
  readonly cwd?: string;
  /** 用户类型 / 环境变量 — 由宿主提供 */
  readonly env?: Readonly<Record<string, string | undefined>>;
  /** 任意附加上下文 */
  readonly [key: string]: unknown;
}

/** Skill 调用返回的内容块 */
export interface BundledSkillContentBlock {
  readonly type: 'text';
  readonly text: string;
}

/** Bundled skill 定义 */
export interface BundledSkillDefinition {
  /** Skill 名称（slash command 名，如 `/loop`） */
  readonly name: string;
  /** 简短描述（一行） */
  readonly description: string;
  /** 可选别名 */
  readonly aliases?: readonly string[];
  /** 详细说明：何时使用 */
  readonly whenToUse?: string;
  /** 参数提示（用户输入提示） */
  readonly argumentHint?: string;
  /** 限制此 skill 可用的工具集 */
  readonly allowedTools?: readonly string[];
  /** 指定模型 */
  readonly model?: string;
  /** 是否禁止模型自动调用（仅用户显式 `/name` 触发） */
  readonly disableModelInvocation?: boolean;
  /** 是否允许用户调用（默认 true） */
  readonly userInvocable?: boolean;
  /** 动态启用判定（如 feature flag） */
  readonly isEnabled?: () => boolean;
  /** 与此 skill 关联的 hooks 配置 */
  readonly hooks?: BundledSkillHooks;
  /** 上下文模式：inline（在主对话注入）/ fork（fork 子对话） */
  readonly context?: 'inline' | 'fork';
  /** 关联的 sub-agent type */
  readonly agent?: string;
  /**
   * 额外的参考文件 — 首次调用时落盘 key 是相对路径（不含 `..`），value 是文件内容 设置后 prompt 会自动加上 "Base directory for this
   * skill: <dir>" 前缀
   */
  readonly files?: Readonly<Record<string, string>>;
  /** 调用回调 — 接收用户参数 + 上下文，返回 prompt content blocks */
  readonly getPromptForCommand: (
    args: string,
    context: BundledSkillContext
  ) => Promise<readonly BundledSkillContentBlock[]>;
}

// ============================================================
// 注册表
// ============================================================

/**
 * BundledSkillRegistry — 全局 bundled skill 注册中心
 *
 * 所有 skill 必须在启动初始化阶段注册（同步执行 register() 调用）。 注册后通过 list() / get() 查询。
 */
export class BundledSkillRegistry {
  private readonly skills = new Map<string, BundledSkillDefinition>();

  /**
   * 注册一个 bundled skill
   *
   * @throws 重复注册时抛出（同名 skill 已存在）
   */
  register(skill: BundledSkillDefinition): void {
    if (!skill.name) {
      throw new Error('BundledSkill must have a name');
    }
    if (this.skills.has(skill.name)) {
      throw new Error(`BundledSkill '${skill.name}' already registered`);
    }
    this.skills.set(skill.name, skill);
    if (skill.aliases) {
      for (const alias of skill.aliases) {
        if (this.skills.has(alias)) {
          throw new Error(`BundledSkill alias '${alias}' already registered`);
        }
        this.skills.set(alias, skill);
      }
    }
  }

  /** 取消注册 */
  unregister(name: string): boolean {
    const skill = this.skills.get(name);
    if (!skill) return false;
    this.skills.delete(skill.name);
    if (skill.aliases) {
      for (const alias of skill.aliases) {
        this.skills.delete(alias);
      }
    }
    return true;
  }

  /** 按名称获取 skill 定义 */
  get(name: string): BundledSkillDefinition | undefined {
    return this.skills.get(name);
  }

  /** 列出所有已注册（按主名去重） */
  list(): readonly BundledSkillDefinition[] {
    const unique = new Map<string, BundledSkillDefinition>();
    for (const skill of this.skills.values()) {
      unique.set(skill.name, skill);
    }
    return [...unique.values()];
  }

  /** 列出当前启用的 skill（执行 isEnabled 校验） */
  listEnabled(): readonly BundledSkillDefinition[] {
    return this.list().filter(s => !s.isEnabled || s.isEnabled());
  }

  /** 清空（测试用） */
  clear(): void {
    this.skills.clear();
  }

  /** 已注册的 skill 数量 */
  get size(): number {
    const unique = new Set<string>();
    for (const skill of this.skills.values()) {
      unique.add(skill.name);
    }
    return unique.size;
  }
}

// ============================================================
// 全局单例（供 register*Skill 等便利函数使用）
// ============================================================

let globalRegistry: BundledSkillRegistry | null = null;

/** 获取/创建全局 BundledSkillRegistry 单例 */
export function getGlobalBundledSkillRegistry(): BundledSkillRegistry {
  if (!globalRegistry) {
    globalRegistry = new BundledSkillRegistry();
  }
  return globalRegistry;
}

/** 重置全局单例（测试用） */
export function resetGlobalBundledSkillRegistry(): void {
  globalRegistry = null;
}

/** 便利函数：注册到全局 registry */
export function registerBundledSkill(skill: BundledSkillDefinition): void {
  getGlobalBundledSkillRegistry().register(skill);
}
