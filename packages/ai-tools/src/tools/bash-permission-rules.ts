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
 * 参考 Claude Code bashPermissions.ts 2600行规则库:
 *
 * - 破坏性命令 → deny（绝对禁止）
 * - 读写/修改命令 → ask（需用户确认）
 * - 只读命令 → allow（自动允许，但仍需安全评估）
 *
 * 规则按域分组: system/package/git/docker/k8s/database/network/file/misc
 */
export const DEFAULT_BASH_PERMISSION_RULES: readonly BashPermissionRule[] = [
  // ============================================================
  // Deny规则 — 绝对禁止（可能导致不可逆损害）
  // ============================================================

  // --- 系统级破坏 ---
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
    pattern: '^rm\\s.*\\s/\\s*$',
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
    pattern: '^dd\\s.*of=/dev/',
    patternType: 'regex',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: dd写入设备文件'
  },
  {
    ruleId: 'deny_shutdown',
    pattern: 'shutdown',
    patternType: 'prefix',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: 关闭系统'
  },
  {
    ruleId: 'deny_reboot',
    pattern: 'reboot',
    patternType: 'prefix',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: 重启系统'
  },
  {
    ruleId: 'deny_halt',
    pattern: 'halt',
    patternType: 'exact',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: 停机'
  },
  {
    ruleId: 'deny_poweroff',
    pattern: 'poweroff',
    patternType: 'exact',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: 关机'
  },
  {
    ruleId: 'deny_init_level',
    pattern: '^init\\s[06]',
    patternType: 'regex',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: 切换运行级别到关机/重启'
  },
  {
    ruleId: 'deny_iptables',
    pattern: 'iptables',
    patternType: 'prefix',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: 修改防火墙规则'
  },
  {
    ruleId: 'deny_kill_init',
    pattern: '^kill\\s+-9\\s+1$',
    patternType: 'regex',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: kill init进程'
  },
  {
    ruleId: 'deny_chmod_777',
    pattern: 'chmod 777',
    patternType: 'prefix',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: 全权限开放(777)'
  },
  {
    ruleId: 'deny_chown_root',
    pattern: '^chown\\s.*root',
    patternType: 'regex',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: 改为root所有'
  },
  {
    ruleId: 'deny_systemctl_stop',
    pattern: '^systemctl\\s+(stop|restart|disable)',
    patternType: 'regex',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: 停止/重启/禁用系统服务'
  },
  {
    ruleId: 'deny_launchctl_unload',
    pattern: 'launchctl unload',
    patternType: 'prefix',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: 卸载macOS服务'
  },

  // --- 网络写入 ---
  {
    ruleId: 'deny_curl_write',
    pattern: '^curl\\s.*>\\s',
    patternType: 'regex',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: curl下载写入文件'
  },
  {
    ruleId: 'deny_wget_write',
    pattern: '^wget\\s.*-O\\s',
    patternType: 'regex',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: wget写入文件'
  },

  // --- 数据库破坏 ---
  {
    ruleId: 'deny_drop_table',
    pattern: 'DROP TABLE',
    patternType: 'prefix',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: 删除数据库表'
  },
  {
    ruleId: 'deny_redis_shutdown',
    pattern: 'redis-cli shutdown',
    patternType: 'prefix',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: Redis关机'
  },
  {
    ruleId: 'deny_crontab_remove',
    pattern: 'crontab -r',
    patternType: 'exact',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: 删除crontab'
  },

  // --- 包发布 ---
  {
    ruleId: 'deny_npm_publish',
    pattern: 'npm publish',
    patternType: 'prefix',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: npm发布包'
  },
  {
    ruleId: 'deny_yarn_publish',
    pattern: 'yarn publish',
    patternType: 'prefix',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: yarn发布包'
  },

  // --- Docker破坏 ---
  {
    ruleId: 'deny_docker_prune_system',
    pattern: 'docker system prune',
    patternType: 'prefix',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: Docker全清理'
  },
  {
    ruleId: 'deny_docker_prune_volume',
    pattern: 'docker volume prune',
    patternType: 'prefix',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: Docker卷清理'
  },

  // --- 基础设施 ---
  {
    ruleId: 'deny_terraform_destroy',
    pattern: 'terraform destroy',
    patternType: 'exact',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: 销毁基础设施'
  },
  {
    ruleId: 'deny_find_delete',
    pattern: '^find\\s.*-delete',
    patternType: 'regex',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: find -delete删除文件'
  },

  // ============================================================
  // Ask规则 — 需用户确认（可能产生修改但可控）
  // ============================================================

  // --- git 操作 ---
  {
    ruleId: 'ask_git_push_force',
    pattern: 'git push --force',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: 强制推送(git push --force)'
  },
  {
    ruleId: 'ask_git_push',
    pattern: 'git push',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: git push'
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
    ruleId: 'ask_git_checkout',
    pattern: 'git checkout',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: git checkout切换分支'
  },
  {
    ruleId: 'ask_git_merge',
    pattern: 'git merge',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: git merge合并分支'
  },
  {
    ruleId: 'ask_git_rebase',
    pattern: 'git rebase',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: git rebase变基'
  },
  {
    ruleId: 'ask_git_stash',
    pattern: 'git stash',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: git stash保存/恢复工作区'
  },
  {
    ruleId: 'ask_git_branch_delete',
    pattern: '^git\\s+branch\\s+-[dD]',
    patternType: 'regex',
    behavior: 'ask',
    source: 'default',
    description: '审核: 删除git分支'
  },
  {
    ruleId: 'ask_git_tag_delete',
    pattern: '^git\\s+tag\\s+-d',
    patternType: 'regex',
    behavior: 'ask',
    source: 'default',
    description: '审核: 删除git标签'
  },

  // --- 包安装/管理 ---
  {
    ruleId: 'ask_sudo',
    pattern: 'sudo',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: sudo命令'
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
    ruleId: 'ask_npm_uninstall',
    pattern: 'npm uninstall',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: 卸载包(npm uninstall)'
  },
  {
    ruleId: 'ask_npm_run',
    pattern: 'npm run',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: 运行npm脚本'
  },
  {
    ruleId: 'ask_yarn_install',
    pattern: 'yarn install',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: yarn安装包'
  },
  {
    ruleId: 'ask_pnpm_install',
    pattern: 'pnpm install',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: pnpm安装包'
  },
  {
    ruleId: 'ask_pip_install',
    pattern: 'pip install',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: pip安装包'
  },
  {
    ruleId: 'ask_pip_uninstall',
    pattern: 'pip uninstall',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: pip卸载包'
  },
  {
    ruleId: 'ask_brew_install',
    pattern: 'brew install',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: Homebrew安装'
  },
  {
    ruleId: 'ask_brew_uninstall',
    pattern: 'brew uninstall',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: Homebrew卸载'
  },
  {
    ruleId: 'ask_apt_install',
    pattern: 'apt install',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: apt安装系统包'
  },
  {
    ruleId: 'ask_apt_get_install',
    pattern: 'apt-get install',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: apt-get安装系统包'
  },

  // --- 构建命令 ---
  {
    ruleId: 'ask_make',
    pattern: 'make',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: make构建'
  },
  {
    ruleId: 'ask_cargo_build',
    pattern: 'cargo build',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: Rust构建'
  },
  {
    ruleId: 'ask_go_build',
    pattern: 'go build',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: Go构建'
  },

  // --- Docker操作 ---
  {
    ruleId: 'ask_docker_rm',
    pattern: 'docker rm',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: 删除Docker容器'
  },
  {
    ruleId: 'ask_docker_run',
    pattern: 'docker run',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: 运行Docker容器'
  },
  {
    ruleId: 'ask_docker_build',
    pattern: 'docker build',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: 构建Docker镜像'
  },
  {
    ruleId: 'ask_docker_exec',
    pattern: 'docker exec',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: 在容器内执行命令'
  },
  {
    ruleId: 'ask_docker_stop',
    pattern: 'docker stop',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: 停止Docker容器'
  },

  // --- K8s操作 ---
  {
    ruleId: 'ask_kubectl_delete',
    pattern: 'kubectl delete',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: 删除K8s资源'
  },
  {
    ruleId: 'ask_kubectl_apply',
    pattern: 'kubectl apply',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: 应用K8s配置'
  },
  {
    ruleId: 'ask_kubectl_create',
    pattern: 'kubectl create',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: 创建K8s资源'
  },
  {
    ruleId: 'ask_kubectl_rollout',
    pattern: 'kubectl rollout',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: K8s滚动更新'
  },

  // --- 服务管理 ---
  {
    ruleId: 'ask_systemctl_start',
    pattern: 'systemctl start',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: 启动系统服务'
  },
  {
    ruleId: 'ask_launchctl_load',
    pattern: 'launchctl load',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: 加载macOS服务'
  },

  // --- 文件修改命令 ---
  {
    ruleId: 'ask_sed_inplace',
    pattern: '^sed\\s.*-i',
    patternType: 'regex',
    behavior: 'ask',
    source: 'default',
    description: '审核: sed原地修改文件'
  },
  {
    ruleId: 'ask_find_exec',
    pattern: '^find\\s.*-exec',
    patternType: 'regex',
    behavior: 'ask',
    source: 'default',
    description: '审核: find -exec执行命令'
  },
  {
    ruleId: 'ask_crontab',
    pattern: 'crontab',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: 修改crontab'
  },
  {
    ruleId: 'ask_tar_extract',
    pattern: '^tar\\s.*-[xX]',
    patternType: 'regex',
    behavior: 'ask',
    source: 'default',
    description: '审核: tar解压(可能覆盖文件)'
  },
  {
    ruleId: 'ask_unzip',
    pattern: 'unzip',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: unzip解压'
  },

  // --- 数据库操作 ---
  {
    ruleId: 'ask_psql_command',
    pattern: '^psql\\s.*-c\\s',
    patternType: 'regex',
    behavior: 'ask',
    source: 'default',
    description: '审核: PostgreSQL执行命令'
  },
  {
    ruleId: 'ask_mysql_command',
    pattern: '^mysql\\s.*-e\\s',
    patternType: 'regex',
    behavior: 'ask',
    source: 'default',
    description: '审核: MySQL执行命令'
  },
  {
    ruleId: 'ask_pg_ctl_stop',
    pattern: 'pg_ctl stop',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: PostgreSQL停止'
  },

  // ============================================================
  // Allow规则 — 自动允许（已知安全命令，但仍需安全评估兜底）
  // ============================================================

  // --- git 只读 ---
  {
    ruleId: 'allow_git_log',
    pattern: 'git log',
    patternType: 'prefix',
    behavior: 'allow',
    source: 'default',
    description: '允许: git log查看历史'
  },
  {
    ruleId: 'allow_git_status',
    pattern: 'git status',
    patternType: 'prefix',
    behavior: 'allow',
    source: 'default',
    description: '允许: git status查看状态'
  },
  {
    ruleId: 'allow_git_diff',
    pattern: 'git diff',
    patternType: 'prefix',
    behavior: 'allow',
    source: 'default',
    description: '允许: git diff查看差异'
  },
  {
    ruleId: 'allow_git_show',
    pattern: 'git show',
    patternType: 'prefix',
    behavior: 'allow',
    source: 'default',
    description: '允许: git show查看提交'
  },
  {
    ruleId: 'allow_git_rev_parse',
    pattern: 'git rev-parse',
    patternType: 'prefix',
    behavior: 'allow',
    source: 'default',
    description: '允许: git rev-parse'
  },
  {
    ruleId: 'allow_git_ls_files',
    pattern: 'git ls-files',
    patternType: 'prefix',
    behavior: 'allow',
    source: 'default',
    description: '允许: git ls-files列出文件'
  },
  {
    ruleId: 'allow_git_ls_tree',
    pattern: 'git ls-tree',
    patternType: 'prefix',
    behavior: 'allow',
    source: 'default',
    description: '允许: git ls-tree列出树'
  },

  // --- Docker只读 ---
  {
    ruleId: 'allow_docker_ps',
    pattern: 'docker ps',
    patternType: 'prefix',
    behavior: 'allow',
    source: 'default',
    description: '允许: docker ps查看容器'
  },
  {
    ruleId: 'allow_docker_images',
    pattern: 'docker images',
    patternType: 'prefix',
    behavior: 'allow',
    source: 'default',
    description: '允许: docker images查看镜像'
  },
  {
    ruleId: 'allow_docker_version',
    pattern: 'docker version',
    patternType: 'prefix',
    behavior: 'allow',
    source: 'default',
    description: '允许: docker version查看版本'
  },

  // --- K8s只读 ---
  {
    ruleId: 'allow_kubectl_get',
    pattern: 'kubectl get',
    patternType: 'prefix',
    behavior: 'allow',
    source: 'default',
    description: '允许: kubectl get查看资源'
  },

  // --- 版本查询 ---
  {
    ruleId: 'allow_node_version',
    pattern: 'node --version',
    patternType: 'exact',
    behavior: 'allow',
    source: 'default',
    description: '允许: node版本查询'
  },
  {
    ruleId: 'allow_npm_version',
    pattern: 'npm --version',
    patternType: 'exact',
    behavior: 'allow',
    source: 'default',
    description: '允许: npm版本查询'
  },
  {
    ruleId: 'allow_python_version',
    pattern: 'python --version',
    patternType: 'exact',
    behavior: 'allow',
    source: 'default',
    description: '允许: python版本查询'
  },
  {
    ruleId: 'allow_python3_version',
    pattern: 'python3 --version',
    patternType: 'exact',
    behavior: 'allow',
    source: 'default',
    description: '允许: python3版本查询'
  },
  {
    ruleId: 'allow_go_version',
    pattern: 'go version',
    patternType: 'exact',
    behavior: 'allow',
    source: 'default',
    description: '允许: go版本查询'
  },
  {
    ruleId: 'allow_rustc_version',
    pattern: 'rustc --version',
    patternType: 'exact',
    behavior: 'allow',
    source: 'default',
    description: '允许: rust版本查询'
  },
  {
    ruleId: 'allow_cargo_version',
    pattern: 'cargo --version',
    patternType: 'exact',
    behavior: 'allow',
    source: 'default',
    description: '允许: cargo版本查询'
  },

  // --- 版本查询补充 ---
  {
    ruleId: 'allow_git_ls_remote',
    pattern: 'git ls-remote',
    patternType: 'prefix',
    behavior: 'allow',
    source: 'default',
    description: '允许: git ls-remote查看远程引用'
  },

  // ============================================================
  // P81 新增规则 — 扩充覆盖(78→150+条)
  // ============================================================

  // --- Deny规则扩充(新增约10条) ---
  {
    ruleId: 'deny_npm_publish_force',
    pattern: 'npm publish --force',
    patternType: 'prefix',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: npm强制发布'
  },
  {
    ruleId: 'deny_pnpm_publish',
    pattern: 'pnpm publish',
    patternType: 'prefix',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: pnpm发布包'
  },
  {
    ruleId: 'deny_docker_image_prune',
    pattern: 'docker image prune',
    patternType: 'prefix',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: Docker镜像清理'
  },
  {
    ruleId: 'deny_docker_container_prune',
    pattern: 'docker container prune',
    patternType: 'prefix',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: Docker容器清理'
  },
  {
    ruleId: 'deny_docker_network_prune',
    pattern: 'docker network prune',
    patternType: 'prefix',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: Docker网络清理'
  },
  {
    ruleId: 'deny_kubectl_delete_force',
    pattern: 'kubectl delete --force',
    patternType: 'prefix',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: kubectl强制删除'
  },
  {
    ruleId: 'deny_github_cli_delete',
    pattern: '^gh\\s+.*delete',
    patternType: 'regex',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: GitHub CLI删除操作'
  },
  {
    ruleId: 'deny_drop_database',
    pattern: 'DROP DATABASE',
    patternType: 'prefix',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: 删除数据库'
  },
  {
    ruleId: 'deny_truncate_table',
    pattern: 'TRUNCATE TABLE',
    patternType: 'prefix',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: 清空数据库表'
  },
  {
    ruleId: 'deny_pip_install_user',
    pattern: 'pip install --user',
    patternType: 'prefix',
    behavior: 'deny',
    source: 'default',
    description: '拒绝: pip --user安装(不安全标志)'
  },

  // --- Ask规则扩充(新增约35条) ---

  // git 扩展
  {
    ruleId: 'ask_git_clean',
    pattern: 'git clean',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: git clean清除未追踪文件'
  },
  {
    ruleId: 'ask_git cherry_pick',
    pattern: 'git cherry-pick',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: git cherry-pick拣选提交'
  },
  {
    ruleId: 'ask_git_commit_amend',
    pattern: '^git\\s+commit\\s+.*--amend',
    patternType: 'regex',
    behavior: 'ask',
    source: 'default',
    description: '审核: git commit --amend修改提交'
  },
  {
    ruleId: 'ask_git_remote_add',
    pattern: 'git remote add',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: git remote add添加远程'
  },
  {
    ruleId: 'ask_git_remote_remove',
    pattern: 'git remote remove',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: git remote remove删除远程'
  },
  {
    ruleId: 'ask_git_fetch',
    pattern: 'git fetch',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: git fetch拉取远程'
  },
  {
    ruleId: 'ask_git_pull',
    pattern: 'git pull',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: git pull拉取合并'
  },
  {
    ruleId: 'ask_git_submodule',
    pattern: 'git submodule',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: git submodule操作'
  },
  {
    ruleId: 'ask_git_worktree',
    pattern: 'git worktree',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: git worktree工作树'
  },

  // npm/yarn/pnpm 扩展
  {
    ruleId: 'ask_npm_ci',
    pattern: 'npm ci',
    patternType: 'exact',
    behavior: 'ask',
    source: 'default',
    description: '审核: npm ci干净安装'
  },
  {
    ruleId: 'ask_npm_publish',
    pattern: 'npm publish',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: npm发布(非force)'
  },
  {
    ruleId: 'ask_yarn_add',
    pattern: 'yarn add',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: yarn添加依赖'
  },
  {
    ruleId: 'ask_yarn_remove',
    pattern: 'yarn remove',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: yarn移除依赖'
  },
  {
    ruleId: 'ask_pnpm_add',
    pattern: 'pnpm add',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: pnpm添加依赖'
  },
  {
    ruleId: 'ask_pnpm_remove',
    pattern: 'pnpm remove',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: pnpm移除依赖'
  },
  {
    ruleId: 'ask_npm_start',
    pattern: 'npm start',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: npm start启动应用'
  },
  {
    ruleId: 'ask_npm_test',
    pattern: 'npm test',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: npm test运行测试'
  },
  {
    ruleId: 'ask_yarn_start',
    pattern: 'yarn start',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: yarn start启动应用'
  },
  {
    ruleId: 'ask_yarn_test',
    pattern: 'yarn test',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: yarn test运行测试'
  },

  // pip/conda 扩展
  {
    ruleId: 'ask_conda_install',
    pattern: 'conda install',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: conda安装包'
  },
  {
    ruleId: 'ask_conda_create',
    pattern: 'conda create',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: conda创建环境'
  },
  {
    ruleId: 'ask_conda_remove',
    pattern: 'conda remove',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: conda移除包/环境'
  },
  {
    ruleId: 'ask_pip3_install',
    pattern: 'pip3 install',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: pip3安装包'
  },

  // docker-compose 扩展
  {
    ruleId: 'ask_docker_compose_up',
    pattern: 'docker-compose up',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: docker-compose启动服务'
  },
  {
    ruleId: 'ask_docker_compose_down',
    pattern: 'docker-compose down',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: docker-compose停止服务'
  },
  {
    ruleId: 'ask_docker_compose_build',
    pattern: 'docker-compose build',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: docker-compose构建镜像'
  },
  {
    ruleId: 'ask_docker_compose_restart',
    pattern: 'docker-compose restart',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: docker-compose重启服务'
  },
  {
    ruleId: 'ask_docker_pull',
    pattern: 'docker pull',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: docker拉取镜像'
  },
  {
    ruleId: 'ask_docker_push',
    pattern: 'docker push',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: docker推送镜像'
  },
  {
    ruleId: 'ask_docker_compose_exec',
    pattern: 'docker-compose exec',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: docker-compose容器内执行'
  },
  {
    ruleId: 'ask_docker_rmi',
    pattern: 'docker rmi',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: docker删除镜像'
  },
  {
    ruleId: 'ask_docker_kill',
    pattern: 'docker kill',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: docker强制停止容器'
  },

  // 云操作扩展
  {
    ruleId: 'ask_aws_cli',
    pattern: '^aws\\s+(s3\\s+rm|s3\\s+cp|ec2\\s+terminate|ec2\\s+stop|rds\\s+delete|iam\\s+delete)',
    patternType: 'regex',
    behavior: 'ask',
    source: 'default',
    description: '审核: AWS危险操作(s3删除/EC2终止/RDS删除/IAM删除)'
  },
  {
    ruleId: 'ask_gcloud_cli',
    pattern: '^gcloud\\s+.*delete',
    patternType: 'regex',
    behavior: 'ask',
    source: 'default',
    description: '审核: gcloud删除操作'
  },
  {
    ruleId: 'ask_az_cli_delete',
    pattern: '^az\\s+.*delete',
    patternType: 'regex',
    behavior: 'ask',
    source: 'default',
    description: '审核: Azure删除操作'
  },

  // 网络工具扩展
  {
    ruleId: 'ask_ssh',
    pattern: 'ssh',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: SSH远程连接'
  },
  {
    ruleId: 'ask_scp',
    pattern: 'scp',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: SCP文件传输'
  },
  {
    ruleId: 'ask_rsync',
    pattern: 'rsync',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: rsync文件同步'
  },
  {
    ruleId: 'ask_curl_download',
    pattern: '^curl\\s.*-o\\s',
    patternType: 'regex',
    behavior: 'ask',
    source: 'default',
    description: '审核: curl下载文件(-o)'
  },
  {
    ruleId: 'ask_wget',
    pattern: 'wget',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: wget下载文件'
  },

  // 构建工具扩展
  {
    ruleId: 'ask_gradle_build',
    pattern: 'gradle build',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: Gradle构建'
  },
  {
    ruleId: 'ask_mvn_build',
    pattern: 'mvn build',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: Maven构建'
  },
  {
    ruleId: 'ask_mvn_install',
    pattern: 'mvn install',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: Maven install'
  },
  {
    ruleId: 'ask_cargo_run',
    pattern: 'cargo run',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: cargo run运行Rust程序'
  },
  {
    ruleId: 'ask_go_run',
    pattern: 'go run',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: go run运行Go程序'
  },
  {
    ruleId: 'ask_go_test',
    pattern: 'go test',
    patternType: 'prefix',
    behavior: 'ask',
    source: 'default',
    description: '审核: go test运行测试'
  },
  {
    ruleId: 'ask_go_mod_tidy',
    pattern: 'go mod tidy',
    patternType: 'exact',
    behavior: 'ask',
    source: 'default',
    description: '审核: go mod tidy整理依赖'
  },

  // --- Allow规则扩充(新增约25条) ---

  // git 只读补充
  {
    ruleId: 'allow_git_branch_list',
    pattern: 'git branch',
    patternType: 'prefix',
    behavior: 'allow',
    source: 'default',
    description: '允许: git branch查看分支(不含-d/-D)'
  },
  {
    ruleId: 'allow_git_tag_list',
    pattern: 'git tag -l',
    patternType: 'prefix',
    behavior: 'allow',
    source: 'default',
    description: '允许: git tag -l列出标签'
  },
  {
    ruleId: 'allow_git_remote_verbose',
    pattern: 'git remote -v',
    patternType: 'prefix',
    behavior: 'allow',
    source: 'default',
    description: '允许: git remote -v查看远程'
  },
  {
    ruleId: 'allow_git_blame',
    pattern: 'git blame',
    patternType: 'prefix',
    behavior: 'allow',
    source: 'default',
    description: '允许: git blame查看行归属'
  },
  {
    ruleId: 'allow_git_shortlog',
    pattern: 'git shortlog',
    patternType: 'prefix',
    behavior: 'allow',
    source: 'default',
    description: '允许: git shortlog简短日志'
  },
  {
    ruleId: 'allow_git_reflog',
    pattern: 'git reflog',
    patternType: 'prefix',
    behavior: 'allow',
    source: 'default',
    description: '允许: git reflog引用日志'
  },
  {
    ruleId: 'allow_git_name_rev',
    pattern: 'git name-rev',
    patternType: 'prefix',
    behavior: 'allow',
    source: 'default',
    description: '允许: git name-rev命名引用'
  },

  // Docker只读补充
  {
    ruleId: 'allow_docker_inspect',
    pattern: 'docker inspect',
    patternType: 'prefix',
    behavior: 'allow',
    source: 'default',
    description: '允许: docker inspect查看详情'
  },
  {
    ruleId: 'allow_docker_logs',
    pattern: 'docker logs',
    patternType: 'prefix',
    behavior: 'allow',
    source: 'default',
    description: '允许: docker logs查看日志'
  },
  {
    ruleId: 'allow_docker_top',
    pattern: 'docker top',
    patternType: 'prefix',
    behavior: 'allow',
    source: 'default',
    description: '允许: docker top查看容器进程'
  },
  {
    ruleId: 'allow_docker_stats',
    pattern: 'docker stats',
    patternType: 'prefix',
    behavior: 'allow',
    source: 'default',
    description: '允许: docker stats查看容器资源'
  },
  {
    ruleId: 'allow_docker_search',
    pattern: 'docker search',
    patternType: 'prefix',
    behavior: 'allow',
    source: 'default',
    description: '允许: docker search搜索镜像'
  },

  // K8s只读补充
  {
    ruleId: 'allow_kubectl_describe',
    pattern: 'kubectl describe',
    patternType: 'prefix',
    behavior: 'allow',
    source: 'default',
    description: '允许: kubectl describe查看详情'
  },
  {
    ruleId: 'allow_kubectl_logs',
    pattern: 'kubectl logs',
    patternType: 'prefix',
    behavior: 'allow',
    source: 'default',
    description: '允许: kubectl logs查看日志'
  },
  {
    ruleId: 'allow_kubectl_top',
    pattern: 'kubectl top',
    patternType: 'prefix',
    behavior: 'allow',
    source: 'default',
    description: '允许: kubectl top查看资源'
  },
  {
    ruleId: 'allow_kubectl_version',
    pattern: 'kubectl version',
    patternType: 'prefix',
    behavior: 'allow',
    source: 'default',
    description: '允许: kubectl version查看版本'
  },
  {
    ruleId: 'allow_kubectl_api_resources',
    pattern: 'kubectl api-resources',
    patternType: 'prefix',
    behavior: 'allow',
    source: 'default',
    description: '允许: kubectl api-resources查看API资源'
  },
  {
    ruleId: 'allow_kubectl_config_view',
    pattern: 'kubectl config view',
    patternType: 'prefix',
    behavior: 'allow',
    source: 'default',
    description: '允许: kubectl config view查看配置'
  },

  // 版本查询补充
  {
    ruleId: 'allow_java_version',
    pattern: 'java --version',
    patternType: 'exact',
    behavior: 'allow',
    source: 'default',
    description: '允许: java版本查询'
  },
  {
    ruleId: 'allow_javac_version',
    pattern: 'javac --version',
    patternType: 'exact',
    behavior: 'allow',
    source: 'default',
    description: '允许: javac版本查询'
  },
  {
    ruleId: 'allow_ruby_version',
    pattern: 'ruby --version',
    patternType: 'exact',
    behavior: 'allow',
    source: 'default',
    description: '允许: ruby版本查询'
  },
  {
    ruleId: 'allow_php_version',
    pattern: 'php --version',
    patternType: 'exact',
    behavior: 'allow',
    source: 'default',
    description: '允许: php版本查询'
  },
  {
    ruleId: 'allow_docker_compose_version',
    pattern: 'docker-compose --version',
    patternType: 'exact',
    behavior: 'allow',
    source: 'default',
    description: '允许: docker-compose版本查询'
  },
  {
    ruleId: 'allow_gh_version',
    pattern: 'gh --version',
    patternType: 'exact',
    behavior: 'allow',
    source: 'default',
    description: '允许: GitHub CLI版本查询'
  },

  // 系统信息只读
  {
    ruleId: 'allow_uname',
    pattern: 'uname',
    patternType: 'prefix',
    behavior: 'allow',
    source: 'default',
    description: '允许: uname查看系统信息'
  },
  {
    ruleId: 'allow_hostname',
    pattern: 'hostname',
    patternType: 'prefix',
    behavior: 'allow',
    source: 'default',
    description: '允许: hostname查看主机名'
  },
  {
    ruleId: 'allow_whoami',
    pattern: 'whoami',
    patternType: 'exact',
    behavior: 'allow',
    source: 'default',
    description: '允许: whoami查看当前用户'
  },
  {
    ruleId: 'allow_id',
    pattern: 'id',
    patternType: 'exact',
    behavior: 'allow',
    source: 'default',
    description: '允许: id查看用户信息'
  },
  {
    ruleId: 'allow_df',
    pattern: 'df',
    patternType: 'prefix',
    behavior: 'allow',
    source: 'default',
    description: '允许: df查看磁盘使用'
  },
  {
    ruleId: 'allow_free',
    pattern: 'free',
    patternType: 'exact',
    behavior: 'allow',
    source: 'default',
    description: '允许: free查看内存使用'
  },
  {
    ruleId: 'allow_uptime',
    pattern: 'uptime',
    patternType: 'exact',
    behavior: 'allow',
    source: 'default',
    description: '允许: uptime查看运行时间'
  },
  {
    ruleId: 'allow_env',
    pattern: 'env',
    patternType: 'exact',
    behavior: 'allow',
    source: 'default',
    description: '允许: env查看环境变量'
  },
  {
    ruleId: 'allow_printenv',
    pattern: 'printenv',
    patternType: 'prefix',
    behavior: 'allow',
    source: 'default',
    description: '允许: printenv查看环境变量'
  },
  {
    ruleId: 'allow_which',
    pattern: 'which',
    patternType: 'prefix',
    behavior: 'allow',
    source: 'default',
    description: '允许: which查找命令路径'
  },
  {
    ruleId: 'allow_type_command',
    pattern: 'type',
    patternType: 'prefix',
    behavior: 'allow',
    source: 'default',
    description: '允许: type查看命令类型'
  }
];
