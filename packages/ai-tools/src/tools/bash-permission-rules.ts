/**
 * Bash权限规则引擎 — deny/ask/allow判定优先级 + SAFE_ENV_VARS + 扩展检测
 *
 * 对齐 Claude Code BashPermissionRules:
 *
 * 1. SAFE_ENV_VARS — 40+环境变量白名单（安全环境变量判定）
 * 2. containsUnquotedExpansion — 引号状态跟踪+变量展开+glob检测
 * 3. BashPermissionRule — 7层优先级(deny>ask>allow)
 * 4. matchBashPermissionRule — 规则匹配引擎
 *
 * 参考 Claude Code src/utils/bashPermissions.ts + readOnlyValidation.ts
 */

// ============================================================
// 1. SAFE_ENV_VARS — 环境变量安全白名单
// ============================================================

/**
 * 安全环境变量白名单 — 这些变量可以在命令前缀中安全设置
 *
 * 参考 Claude Code SAFE_ENV_VARS:
 *
 * - PATH/HOME/USER 等标准 POSIX 变量
 * - LANG/LC_* 等locale变量
 * - TERM/DISPLAY 等终端变量
 * - NODE/PYTHON/RUBY 等语言特定变量
 * - npm/yarn/bazel 等构建工具变量
 */
export const SAFE_ENV_VARS: readonly string[] = [
  // POSIX标准变量
  'PATH',
  'HOME',
  'USER',
  'LOGNAME',
  'SHELL',
  'PWD',
  'OLDPWD',
  'HOSTNAME',
  'TERM',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'LC_COLLATE',
  'LC_MESSAGES',
  'LC_TIME',
  'LC_NUMERIC',
  'LC_MONETARY',
  'TZ',
  'MAIL',
  'MAILCHECK',
  'MAILPATH',
  'PAGER',
  'EDITOR',
  'VISUAL',
  'TERM_PROGRAM',
  'TERM_PROGRAM_VERSION',
  'DISPLAY',
  'DBUS_SESSION_BUS_ADDRESS',
  'XDG_RUNTIME_DIR',
  'XDG_SESSION_ID',
  'XDG_SESSION_TYPE',
  'XDG_SESSION_DESKTOP',
  'XDG_CONFIG_HOME',
  'XDG_DATA_HOME',
  'XDG_CACHE_HOME',
  'XDG_STATE_HOME',
  'XDG_BIN_HOME',
  'XDG_DOCUMENTS_DIR',
  'XDG_DOWNLOAD_DIR',
  'XDG_MUSIC_DIR',
  'XDG_PICTURES_DIR',
  'XDG_VIDEOS_DIR',

  // 语言特定变量
  'NODE_PATH',
  'NODE_OPTIONS',
  'NODE_ENV',
  'NPM_CONFIG_PREFIX',
  'NPM_CONFIG_REGISTRY',
  'NPM_CONFIG_CACHE',
  'NPM_CONFIG_LOGLEVEL',
  'PYTHONPATH',
  'PYTHONHOME',
  'PYTHONIOENCODING',
  'PYTHONUNBUFFERED',
  'PIP_INDEX_URL',
  'PIP_CACHE_DIR',
  'VIRTUAL_ENV',
  'RUBYLIB',
  'GEM_HOME',
  'GEM_PATH',
  'BUNDLE_GEMFILE',
  'GOPATH',
  'GOBIN',
  'GOROOT',
  'GOFLAGS',
  'GONOSUMCHECK',
  'JAVA_HOME',
  'JAVAPATH',
  'CLASSPATH',
  'RUSTUP_HOME',
  'CARGO_HOME',

  // 构建工具变量
  'BAZEL_HOME',
  'GRADLE_HOME',
  'MAVEN_HOME',
  'ANT_HOME',
  'MAKEFLAGS',
  'CMAKE_BUILD_TYPE',
  'CMAKE_PREFIX_PATH',
  'CC',
  'CXX',
  'LD_LIBRARY_PATH',
  'PKG_CONFIG_PATH',

  // CI/CD变量
  'CI',
  'CI_COMMIT_SHA',
  'CI_COMMIT_REF_NAME',
  'CI_JOB_ID',
  'CI_PIPELINE_ID',
  'CI_PROJECT_DIR',
  'CI_REPO_URL',
  'GITHUB_ACTIONS',
  'GITHUB_REPOSITORY',
  'GITHUB_REF',
  'GITHUB_SHA',
  'GITHUB_WORKSPACE',
  'GITLAB_CI',
  'JENKINS_HOME',
  'TRAVIS',
  'BUILDKITE',

  // 其他安全变量
  'DOCKER_HOST',
  'DOCKER_TLS_VERIFY',
  'DOCKER_CERT_PATH',
  'KUBECONFIG',
  'AWS_PROFILE',
  'AWS_REGION',
  'AWS_DEFAULT_REGION',
  'HOMEBREW_PREFIX',
  'HOMEBREW_CELLAR',
  'HOMEBREW_REPOSITORY',
  'COLUMNS',
  'LINES',
  'BASH_VERSION',
  'ZSH_VERSION',
  'SHLVL',
  'PS1',
  'PS2',
  'PROMPT_COMMAND',
  'HISTFILE',
  'HISTSIZE',
  'HISTFILESIZE',
  'HISTCONTROL',
  'LESS',
  'MORE',
  'MANPATH',
  'INFOPATH',
  'TMPDIR',
  'TEMP',
  'TMP',
  'TEMPDIR'
];

/**
 * isSafeEnvVar — 判定环境变量是否在安全白名单中
 *
 * 安全变量可在命令前缀中设置而不影响权限判定:
 *
 * - FOO=bar ls → ls (FOO在白名单) → 只读判定时去除
 * - SECRET_KEY=abc curl → curl (SECRET_KEY不在白名单) → 需审核
 */
export function isSafeEnvVar(varName: string): boolean {
  return SAFE_ENV_VARS.includes(varName.toUpperCase());
}

/**
 * hasUnsafeEnvVars — 检查命令中是否有不安全的环境变量设置
 *
 * "PATH=/usr/bin ls" → false (PATH is safe) "SECRET=abc curl" → true (SECRET is not safe)
 */
export function hasUnsafeEnvVars(command: string): boolean {
  const envPattern = /^([A-Za-z_][A-Za-z0-9_]*)=\S+\s+/;
  let remaining = command.trim();

  while (envPattern.test(remaining)) {
    const match = remaining.match(envPattern);
    if (match) {
      const varName = match[1];
      if (!isSafeEnvVar(varName)) {
        return true;
      }
      remaining = remaining.replace(envPattern, '');
    }
  }

  // 检查最后的 VAR=value（无后续命令）
  const lastMatch = remaining.match(/^([A-Za-z_][A-Za-z0-9_]*)=\S*$/);
  if (lastMatch) {
    return !isSafeEnvVar(lastMatch[1]);
  }

  return false;
}

// ============================================================
// 2. containsUnquotedExpansion — 引号状态跟踪
// ============================================================

/**
 * containsUnquotedExpansion — 检测命令中的未引用变量展开和glob
 *
 * 参考 Claude Code readOnlyValidation.ts containsUnquotedExpansion: 逐字符遍历命令字符串，跟踪单引号/双引号状态:
 *
 * - 单引号内: 所有字符为literal
 * - 双引号内: $仍展开但glob为literal，反斜杠转义
 * - 无引号: $和glob字符均展开
 *
 * 检测:
 *
 * - $VAR, $_, $@, $*, $#, $?, $!, $$, $0-$9 等变量展开
 * - ? * [ ] glob字符
 * - {} 花括号展开
 */
export interface ExpansionCheckResult {
  /** 是否包含未引用展开 */
  readonly hasExpansion: boolean;
  /** 检测到的展开类型列表 */
  readonly expansions: readonly { type: string; position: number; description: string }[];
}

export function containsUnquotedExpansion(command: string): ExpansionCheckResult {
  const expansions: { type: string; position: number; description: string }[] = [];
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let i = 0;

  while (i < command.length) {
    const ch = command[i];

    // 引号状态切换
    if (ch === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      i++;
      continue;
    }

    if (ch === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      i++;
      continue;
    }

    // 反斜杠处理
    if (ch === '\\' && !inSingleQuote) {
      // 双引号内反斜杠转义下一字符，单引号内反斜杠为literal
      if (inDoubleQuote) {
        i += 2; // 跳过转义序列
      } else {
        i += 2; // 无引号下也跳过
      }
      continue;
    }

    // === 在单引号内: 所有字符为literal，不检测 ===
    if (inSingleQuote) {
      i++;
      continue;
    }

    // === 在双引号内: $展开，glob不展开 ===
    if (inDoubleQuote) {
      if (ch === '$') {
        const next = command[i + 1];
        if (next && /[A-Za-z_@*#?!$0-9-]/.test(next)) {
          expansions.push({
            type: next === '(' ? 'command_substitution' : 'variable_expansion',
            position: i,
            description: next === '(' ? `$() 命令替换(双引号内)` : `变量展开 $${next}(双引号内)`
          });
        }
      }
      i++;
      continue;
    }

    // === 无引号: $展开 + glob展开 ===
    if (ch === '$') {
      const next = command[i + 1];
      if (next === '(') {
        expansions.push({
          type: 'command_substitution',
          position: i,
          description: '$() 命令替换'
        });
      } else if (next === '{') {
        expansions.push({
          type: 'parameter_expansion',
          position: i,
          description: '${} 参数展开'
        });
      } else if (next === '[') {
        expansions.push({
          type: 'arithmetic_expansion',
          position: i,
          description: '$[] 算术展开'
        });
      } else if (next && /[A-Za-z_@*#?!$0-9-]/.test(next)) {
        expansions.push({
          type: 'variable_expansion',
          position: i,
          description: `变量展开 $${next}`
        });
      }
      i++;
      continue;
    }

    // Glob字符检测(无引号)
    if (ch === '?' || ch === '*' || ch === '[' || ch === ']') {
      expansions.push({
        type: 'glob',
        position: i,
        description: `glob字符 ${ch}`
      });
      i++;
      continue;
    }

    // 花括号展开(无引号) — 检查 {..} 或 {,...} 模式
    // 在整个未引用文本中查找花括号展开
    if (ch === '{' && !inDoubleQuote && !inSingleQuote) {
      // 查找花括号内的逗号或双点
      const closeIdx = command.indexOf('}', i);
      if (closeIdx > i) {
        const inner = command.substring(i + 1, closeIdx);
        if (inner.includes(',') || inner.includes('..')) {
          expansions.push({
            type: 'brace_expansion',
            position: i,
            description: inner.includes('..') ? '花括号范围展开 {..}' : '花括号展开 {,...}'
          });
        }
      }
      i++;
      continue;
    }

    i++;
  }

  return {
    hasExpansion: expansions.length > 0,
    expansions
  };
}

// ============================================================
// 3. Bash权限规则 — 7层优先级
// ============================================================

/**
 * Bash权限规则 — 每条规则定义命令模式匹配和权限行为
 *
 * 参考 Claude Code bashPermissions 规则格式:
 *
 * - pattern: 命令匹配模式（prefix/exact/wildcard/regex）
 * - behavior: 权限行为（deny/ask/allow）
 * - severity: 规则严重性（影响优先级排序）
 *
 * 优先级规则（与 Claude Code 一致）: deny > ask > allow 同行为中: 更精确的匹配(exact>prefix>wildcard)优先
 */
export interface BashPermissionRule {
  /** 规则ID（用于日志和去重） */
  readonly ruleId?: string;
  /** 匹配模式 */
  readonly pattern: string;
  /** 模式类型 */
  readonly patternType: 'exact' | 'prefix' | 'wildcard' | 'regex';
  /** 权限行为 */
  readonly behavior: 'deny' | 'ask' | 'allow';
  /** 规则来源 */
  readonly source?: 'settings' | 'session' | 'default' | 'hook';
  /** 描述（面向用户） */
  readonly description?: string;
}

/** 权限规则匹配结果 */
export interface BashPermissionMatchResult {
  /** 匹配的规则（null=无匹配→使用默认行为ask） */
  readonly matchedRule: BashPermissionRule | null;
  /** 所有匹配的规则（按优先级排序） */
  readonly allMatches: readonly BashPermissionRule[];
  /** 最终权限行为 */
  readonly behavior: 'deny' | 'ask' | 'allow';
  /** 判定理由 */
  readonly reason: string;
}

/**
 * matchBashPermissionRule — 匹配Bash权限规则
 *
 * 按优先级排序规则并返回最高优先级匹配:
 *
 * 1. deny规则 > ask规则 > allow规则
 * 2. 同行为中: exact > prefix > wildcard > regex
 * 3. 无匹配 → 默认ask（需要用户确认）
 *
 * @param command Bash命令
 * @param rules 权限规则列表
 */
export function matchBashPermissionRule(
  command: string,
  rules: readonly BashPermissionRule[]
): BashPermissionMatchResult {
  const trimmed = command.trim();

  // 收集所有匹配的规则
  const matches: BashPermissionRule[] = [];

  for (const rule of rules) {
    if (matchesRule(trimmed, rule)) {
      matches.push(rule);
    }
  }

  // 按优先级排序: deny > ask > allow, 同行为中 exact > prefix > wildcard > regex
  const behaviorPriority: Record<string, number> = { deny: 0, ask: 1, allow: 2 };
  const typePriority: Record<string, number> = { exact: 0, prefix: 1, wildcard: 2, regex: 3 };

  matches.sort((a, b) => {
    const behDiff = behaviorPriority[a.behavior] - behaviorPriority[b.behavior];
    if (behDiff !== 0) return behDiff;
    return typePriority[a.patternType] - typePriority[b.patternType];
  });

  if (matches.length === 0) {
    return {
      matchedRule: null,
      allMatches: [],
      behavior: 'ask',
      reason: 'No matching rule → default ask (requires user confirmation)'
    };
  }

  const topRule = matches[0];
  return {
    matchedRule: topRule,
    allMatches: matches,
    behavior: topRule.behavior,
    reason:
      topRule.description ??
      `Rule '${topRule.pattern}' (${topRule.patternType}/${topRule.behavior})`
  };
}

/** 匹配单条规则 */
function matchesRule(command: string, rule: BashPermissionRule): boolean {
  switch (rule.patternType) {
    case 'exact':
      return command === rule.pattern;
    case 'prefix':
      return command === rule.pattern || command.startsWith(`${rule.pattern} `);
    case 'wildcard':
      return wildcardMatch(rule.pattern, command);
    case 'regex':
      try {
        return new RegExp(rule.pattern).test(command);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

/** 通配符匹配（支持 * 和 ?） */
function wildcardMatch(pattern: string, str: string): boolean {
  const regexStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${regexStr}$`).test(str);
}

// ============================================================
// 4. 默认规则集
// ============================================================

/**
 * 默认Bash权限规则 — 提供基础安全防护
 *
 * 参考 Claude Code 默认权限规则:
 *
 * - 破坏性命令 → deny
 * - 读写命令 → ask
 * - 只读命令 → allow（通过readOnlyValidation判定）
 */
export const DEFAULT_BASH_PERMISSION_RULES: readonly BashPermissionRule[] = [
  // === Deny规则 ===
  {
    ruleId: 'deny_rm_rf',
    pattern: 'rm -rf',
    patternType: 'prefix',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: 递归强制删除'
  },
  {
    ruleId: 'deny_rm_root',
    pattern: 'rm * /',
    patternType: 'regex',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: 删除根目录路径'
  },
  {
    ruleId: 'deny_mkfs',
    pattern: 'mkfs',
    patternType: 'prefix',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: 格式化磁盘'
  },
  {
    ruleId: 'deny_dd_device',
    pattern: 'dd * of=/dev/',
    patternType: 'regex',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: dd写入设备文件'
  },
  {
    ruleId: 'deny_drop_table',
    pattern: 'DROP TABLE',
    patternType: 'prefix',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: 删除数据库表'
  },
  {
    ruleId: 'deny_terraform_destroy',
    pattern: 'terraform destroy',
    patternType: 'exact',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: 销毁基础设施'
  },

  // === Ask规则（需要用户确认） ===
  {
    ruleId: 'ask_git_push_force',
    pattern: 'git push --force',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: 强制推送(git push --force)'
  },
  {
    ruleId: 'ask_git_reset_hard',
    pattern: 'git reset --hard',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: 硬重置(git reset --hard)'
  },
  {
    ruleId: 'ask_npm_install',
    pattern: 'npm install',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: 安装包(npm install)'
  },
  {
    ruleId: 'ask_sudo',
    pattern: 'sudo',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: sudo命令'
  },
  {
    ruleId: 'ask_docker_rm',
    pattern: 'docker rm',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: 删除Docker容器'
  },
  {
    ruleId: 'ask_kubectl_delete',
    pattern: 'kubectl delete',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: 删除K8s资源'
  }

  // === Allow规则（只读命令自动允许） ===
  // 注: allow规则不在此处定义，由bash-security.ts isReadOnlyCommand判定
  // 实际优先级: deny > ask > allow(只读判定)，只读判定通过matchBashPermissionRule + isReadOnlyCommand组合实现
];
