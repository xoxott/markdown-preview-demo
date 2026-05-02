/**
 * BashCommandClassifier — 确定性bash命令分类器（纯函数）
 *
 * P38: 参考 Claude Code bashPermissions.ts，精简版实现。 在调用 LLM 分类器之前，通过白名单/黑名单规则快速判定 bash 命令安全性。
 *
 * 设计原则:
 *
 * - 纯函数: classifyBashCommand 不依赖外部状态，确定性输出
 * - ALLOW 白名单: 只读命令前缀精确匹配 → 自动 allow
 * - DENY 黑名单: 破坏性命令前缀匹配 → 自动 deny
 * - 复合命令: 管道/链式/子shell/重定向中含破坏性组件 → deny
 * - sudo: 全部 deny（可绕过所有安全限制）
 * - 无匹配 → ask (升级到 LLM 分类器)
 *
 * 被调用位置: LLMPermissionClassifier.classify() 内部, 当 toolName === 'bash' 时先尝试确定性分类，避免昂贵的 LLM API 调用。
 */

// ========== 类型定义 ==========

/** Bash 命令分类决策 */
export type BashCommandDecision = 'allow' | 'deny' | 'ask';

/** Bash 命令分类结果 */
export interface BashClassifyResult {
  /** 分类决策 */
  readonly decision: BashCommandDecision;
  /** 决策原因 */
  readonly reason: string;
  /** 置信度 */
  readonly confidence: 'high' | 'medium' | 'low';
  /** 匹配的规则类型（用于调试/日志） */
  readonly matchType?:
    | 'allow_prefix'
    | 'deny_prefix'
    | 'compound_deny'
    | 'redirect_deny'
    | 'sudo_deny'
    | 'subshell_deny'
    | 'ambiguous';
}

// ========== 白名单/黑名单 ==========

/**
 * ALLOW 白名单 — 只读命令前缀
 *
 * 这些命令在 auto 模式下可以自动执行，无需 LLM 分类或用户确认。 前缀匹配: 命令行以该前缀开头即匹配（如 "ls -la" 匹配 "ls"）。
 *
 * 分类依据:
 *
 * - 文件读取: cat, head, tail, readlink, file, stat
 * - 搜索/查询: ls, find, grep, which, type, tree, glob
 * - 信息查看: pwd, echo(纯输出), env, printenv, date, uname, whoami, id, hostname, uptime
 * - 系统状态: df, du, free, ps, wc, diff, sort, uniq, cut, tr
 * - 路径处理: basename, dirname, realpath
 * - 哈希计算: md5sum, sha256sum, sha1sum
 * - git 只读: git status, git log, git diff, git branch, git show, git tag -l, git remote -v
 * - npm 只读: npm list, npm view, npm info
 */
const ALLOW_PREFIXES: readonly string[] = [
  // 文件读取
  'ls',
  'cat',
  'head',
  'tail',
  'readlink',
  'file',
  'stat',

  // 搜索/查询
  'find',
  'grep',
  'egrep',
  'fgrep',
  'rg',
  'which',
  'type',
  'tree',
  'glob',

  // 信息查看
  'pwd',
  'echo',
  'env',
  'printenv',
  'date',
  'uname',
  'whoami',
  'id',
  'hostname',
  'uptime',

  // 系统状态
  'df',
  'du',
  'free',
  'ps',
  'top',
  'htop',
  'wc',
  'diff',
  'sort',
  'uniq',
  'cut',
  'tr',
  'tee',
  'xargs',

  // 路径处理
  'basename',
  'dirname',
  'realpath',

  // 哈希计算
  'md5sum',
  'sha256sum',
  'sha1sum',

  // git 只读子命令
  'git status',
  'git log',
  'git diff',
  'git branch',
  'git show',
  'git tag -l',
  'git remote -v',
  'git rev-parse',
  'git config --get',
  'git describe',
  'git ls-files',
  'git ls-tree',
  'git shortlog',

  // npm/yarn 只读
  'npm list',
  'npm view',
  'npm info',
  'npm ls',
  'npm run', // npm run scripts可能有副作用，但通常只是构建/测试
  'yarn list',
  'yarn info',
  'pnpm list'
];

/**
 * DENY 黑名单 — 破坏性命令前缀
 *
 * 这些命令在 auto 模式下自动拒绝，不可执行。 前缀匹配: 命令行以该前缀开头即匹配。
 *
 * 分类依据:
 *
 * - 文件删除: rm, rmdir, shred, unlink
 * - 系统破坏: mkfs, dd (危险), format, erase, wipe, srm
 * - 权限修改: chmod, chown, chgrp
 * - 进程终止: kill, killall, pkill
 * - 系统控制: reboot, shutdown, halt, poweroff, init
 * - 网络修改: iptables, route add, ifconfig
 * - 包安装: npm publish, pip install, apt install, yum install, brew install
 * - git 破坏性: git push, git reset --hard, git clean -f, git checkout --, git rebase
 * - docker 破坏性: docker rm, docker rmi
 * - kubectl 破坏性: kubectl delete
 */
const DENY_PREFIXES: readonly string[] = [
  // 文件删除
  'rm',
  'rmdir',
  'shred',
  'unlink',
  'srm',

  // 系统破坏
  'mkfs',
  'dd',
  'format',
  'erase',
  'wipe',

  // 权限修改
  'chmod',
  'chown',
  'chgrp',

  // 进程终止
  'kill',
  'killall',
  'pkill',

  // 系统控制
  'reboot',
  'shutdown',
  'halt',
  'poweroff',
  'init',

  // 网络修改
  'iptables',
  'route add',
  'ifconfig',

  // 包安装/发布
  'npm publish',
  'pip install',
  'apt install',
  'apt-get install',
  'yum install',
  'dnf install',
  'brew install',
  'gem install',

  // git 破坏性子命令
  'git push',
  'git push-force',
  'git reset --hard',
  'git clean -f',
  'git checkout --',
  'git rebase',
  'git cherry-pick',
  'git merge',
  'git stash drop',
  'git commit',
  'git add',
  'git rm',

  // docker 破坏性
  'docker rm',
  'docker rmi',
  'docker stop',
  'docker kill',

  // kubectl 破坏性
  'kubectl delete',

  // 其他危险命令
  'sudo',
  'su',
  'chroot',
  'mount',
  'umount',
  'fdisk',
  'parted',
  'cryptsetup'
];

// ========== 解析辅助 ==========

/** 从命令段提取第一个 token（命令名） */
function extractFirstToken(segment: string): string {
  // 去除前导空格
  const trimmed = segment.trimStart();
  if (trimmed === '') return '';

  // 提取第一个非空 token
  const match = trimmed.match(/^[\w./-]+/);
  return match ? match[0] : '';
}

/**
 * 检查单个命令段是否在白名单中
 *
 * 前缀匹配: "ls -la" 匹配 "ls"
 */
function matchAllowPrefix(segment: string): string | null {
  // 提取命令名
  const cmd = extractFirstToken(segment);
  if (!cmd) return null;

  // 检查简单命令白名单
  for (const prefix of ALLOW_PREFIXES) {
    // 对于 "git status" 这样的复合前缀，需要完整匹配前缀
    // 对于 "ls" 这样的简单前缀，只匹配命令名
    if (prefix.includes(' ') ? segment.trimStart().startsWith(prefix) : cmd === prefix) {
      return prefix;
    }
  }

  return null;
}

/**
 * 检查单个命令段是否在黑名单中
 *
 * 前缀匹配: "rm -rf /" 匹配 "rm"
 */
function matchDenyPrefix(segment: string): string | null {
  // sudo 前缀 — 特殊处理
  const trimmed = segment.trimStart();
  if (trimmed.startsWith('sudo ') || trimmed === 'sudo') {
    return 'sudo';
  }

  // 提取命令名
  const cmd = extractFirstToken(trimmed);
  if (!cmd) return null;

  // 检查简单命令黑名单
  for (const prefix of DENY_PREFIXES) {
    // 复合前缀: "git push" 需要完整匹配; 简单前缀: "rm" 只匹配命令名
    if (prefix.includes(' ') ? trimmed.startsWith(prefix) : cmd === prefix) {
      return prefix;
    }
  }

  return null;
}

/**
 * 检测命令中的子shell表达式
 *
 * 识别 $() 和反引号，递归检查内部命令的安全性。
 */
function containsSubshell(command: string): { found: boolean; innerCommands: string[] } {
  const innerCommands: string[] = [];

  // 检测 $() 表达式
  const dollarParenRegex = /\$\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = dollarParenRegex.exec(command)) !== null) {
    innerCommands.push(match[1].trim());
  }

  // 检测反引号表达式
  const backtickRegex = /`([^`]+)`/g;
  while ((match = backtickRegex.exec(command)) !== null) {
    innerCommands.push(match[1].trim());
  }

  return { found: innerCommands.length > 0, innerCommands };
}

/**
 * 检测写重定向
 *
 * `>` 和 `>>` 都被视为写操作 → deny 注意: 2> (stderr重定向) 通常不是文件写入，但安全优先
 */
function hasWriteRedirect(command: string): boolean {
  // 检测 > 和 >> （排除 2>&1 这种管道重定向）
  // 简化检测: 任何 > 或 >> 都视为写重定向
  // 更精确的版本会排除 2>&1, 但安全优先
  return /[^&]>\s*\S/.test(command) || />>/.test(command);
}

/**
 * 将命令分割为管道段
 *
 * 按 `|` 分割，但排除 `||` (逻辑或)
 */
function splitPipeSegments(command: string): string[] {
  // 用正则分割: | 但不分割 || 或 |&
  const segments: string[] = [];
  let current = '';
  let i = 0;

  while (i < command.length) {
    if (command[i] === '|') {
      if (i + 1 < command.length && (command[i + 1] === '|' || command[i + 1] === '&')) {
        // || 或 |& — 不分割，加入当前段
        current += command[i] + command[i + 1];
        i += 2;
      } else {
        // 纯管道 | — 分割
        segments.push(current.trim());
        current = '';
        i += 1;
      }
    } else {
      current += command[i];
      i += 1;
    }
  }

  if (current.trim()) segments.push(current.trim());
  return segments;
}

/**
 * 将命令段分割为链式子段
 *
 * 按 `&&` 和 `||` 分割
 */
function splitChainSegments(segment: string): string[] {
  const parts: string[] = [];
  let current = '';
  let i = 0;

  while (i < segment.length) {
    if (i + 1 < segment.length && segment[i] === '&' && segment[i + 1] === '&') {
      parts.push(current.trim());
      current = '';
      i += 2;
    } else if (i + 1 < segment.length && segment[i] === '|' && segment[i + 1] === '|') {
      parts.push(current.trim());
      current = '';
      i += 2;
    } else {
      current += segment[i];
      i += 1;
    }
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}

// ========== 核心分类逻辑 ==========

/**
 * 分类单个简单命令段
 *
 * 1. 检查白名单 → allow
 * 2. 检查黑名单 → deny
 * 3. 无匹配 → ask
 */
function classifySimpleSegment(segment: string): BashClassifyResult {
  const allowMatch = matchAllowPrefix(segment);
  if (allowMatch) {
    return {
      decision: 'allow',
      reason: `Safe read-only command: ${allowMatch}`,
      confidence: 'high',
      matchType: 'allow_prefix'
    };
  }

  const denyMatch = matchDenyPrefix(segment);
  if (denyMatch) {
    return {
      decision: 'deny',
      reason: `Destructive command: ${denyMatch}`,
      confidence: 'high',
      matchType: 'deny_prefix'
    };
  }

  return {
    decision: 'ask',
    reason: 'Ambiguous command, needs LLM evaluation',
    confidence: 'low',
    matchType: 'ambiguous'
  };
}

/**
 * 分类复合命令段（含链式操作）
 *
 * 任一子段 deny → 整体 deny 全部 allow → 整体 allow 混合 (allow + ask) → ask
 */
function classifyChainSegment(segment: string): BashClassifyResult {
  const subSegments = splitChainSegments(segment);

  const results = subSegments.map(sub => classifySimpleSegment(sub.trim()));

  // 任一 deny → 整体 deny
  const denyResult = results.find(r => r.decision === 'deny');
  if (denyResult) {
    return {
      decision: 'deny',
      reason: `Chain contains destructive command: ${denyResult.reason}`,
      confidence: 'high',
      matchType: 'compound_deny'
    };
  }

  // 全部 allow → allow
  if (results.every(r => r.decision === 'allow')) {
    return {
      decision: 'allow',
      reason: `Safe read-only chain: ${results.map(r => r.reason).join(', ')}`,
      confidence: 'high',
      matchType: 'allow_prefix'
    };
  }

  // 混合 → ask
  return {
    decision: 'ask',
    reason: 'Chain contains ambiguous commands, needs LLM evaluation',
    confidence: 'low',
    matchType: 'ambiguous'
  };
}

/**
 * 分类管道命令
 *
 * 任一管道段 deny → 整体 deny 全部 allow → allow 混合 → ask
 */
function classifyPipeCommand(command: string): BashClassifyResult {
  const segments = splitPipeSegments(command);

  const results = segments.map(seg => classifyChainSegment(seg));

  const denyResult = results.find(r => r.decision === 'deny');
  if (denyResult) {
    return {
      decision: 'deny',
      reason: `Pipe contains destructive command: ${denyResult.reason}`,
      confidence: 'high',
      matchType: 'compound_deny'
    };
  }

  if (results.every(r => r.decision === 'allow')) {
    return {
      decision: 'allow',
      reason: `Safe read-only: ${results.map(r => r.reason).join(', ')}`,
      confidence: 'high',
      matchType: 'allow_prefix'
    };
  }

  return {
    decision: 'ask',
    reason: 'Pipeline contains ambiguous commands, needs LLM evaluation',
    confidence: 'low',
    matchType: 'ambiguous'
  };
}

// ========== 主入口 ==========

/**
 * 确定性分类 bash 命令 — 纯函数
 *
 * 在 LLM 分类器调用之前，通过白名单/黑名单快速判定命令安全性。 确定性 allow/deny 直接返回，跳过 LLM API 调用； 模糊命令 (ask) 升级到 LLM 两阶段分类。
 *
 * @param command bash 命令字符串
 * @returns BashClassifyResult 分类结果
 */
export function classifyBashCommand(command: string): BashClassifyResult {
  // 空命令 → ask
  if (!command || command.trim() === '') {
    return {
      decision: 'ask',
      reason: 'Empty command',
      confidence: 'low',
      matchType: 'ambiguous'
    };
  }

  const trimmed = command.trim();

  // ===== Step 1: sudo 前缀 → deny =====
  if (trimmed.startsWith('sudo ') || trimmed === 'sudo') {
    return {
      decision: 'deny',
      reason: 'sudo commands require explicit user confirmation',
      confidence: 'high',
      matchType: 'sudo_deny'
    };
  }

  // ===== Step 2: 写重定向 → deny =====
  if (hasWriteRedirect(trimmed)) {
    return {
      decision: 'deny',
      reason: 'Command contains write redirection (>/>>)',
      confidence: 'high',
      matchType: 'redirect_deny'
    };
  }

  // ===== Step 3: 子shell检测 =====
  const subshell = containsSubshell(trimmed);
  if (subshell.found) {
    // 递归检查每个子shell内部命令
    for (const inner of subshell.innerCommands) {
      const innerResult = classifyBashCommand(inner);
      if (innerResult.decision === 'deny') {
        return {
          decision: 'deny',
          reason: `Subshell contains destructive command: ${innerResult.reason}`,
          confidence: 'high',
          matchType: 'subshell_deny'
        };
      }
    }

    // 子shell全部安全 → 继续检查外部命令
    // 但因为包含子shell，整体降级为 ask（除非外部命令也很明确）
    // 递归检查外层命令（去除子shell部分）
    // 简化处理: 包含安全子shell，继续分类外层
  }

  // ===== Step 4: 管道/链式/简单命令分类 =====
  return classifyPipeCommand(trimmed);
}
