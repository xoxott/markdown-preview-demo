/**
 * Bash命令安全验证 — readOnlyValidation + destructiveCommandWarning + bashSecurity
 *
 * 对齐 Claude Code BashTool 安全验证层:
 *
 * 1. readOnlyCommand — 判定命令是否为只读（可自动允许）
 * 2. destructiveCommand — 检测破坏性命令模式并生成警告
 * 3. commandInjection — 检测命令注入模式（$()/反引号/过程替换）
 * 4. pathValidation — 路径约束验证
 *
 * 注: 这是安全辅助层，实际权限决策由宿主权限管线决定。
 */

// ============================================================
// 1. ReadOnly 命令判定
// ============================================================

/** 只读命令正则模式 — 匹配简单只读命令（无参数或只有安全参数） */
const READONLY_COMMAND_REGEXES: readonly RegExp[] = [
  /^cat\s/,
  /^head\s/,
  /^tail\s/,
  /^ls\b(?!\s)/,
  /^find\s/,
  /^echo\s/,
  /^pwd\b/,
  /^whoami\b/,
  /^hostname\b/,
  /^date\b/,
  /^uname\s/,
  /^wc\s/,
  /^sort\s/,
  /^uniq\s/,
  /^diff\s/,
  /^grep\s/,
  /^rg\s/,
  /^ag\s/,
  /^ack\s/,
  /^git\s+log\b/,
  /^git\s+status\b/,
  /^git\s+diff\b/,
  /^git\s+branch\s+-[lv]/,
  /^git\s+show\b/,
  /^git\s+tag\s+-l/,
  /^git\s+remote\s+-[v]/,
  /^which\b/,
  /^type\b/,
  /^command\s+-v/,
  /^env\b/,
  /^ps\b/,
  /^top\b/,
  /^df\b/,
  /^du\s/,
  /^free\b/,
  /^printenv\b/,
  /^node\s+--version/,
  /^npm\s+--version/,
  /^python\s+--version/,
  /^ruby\s+--version/,
  /^go\s+version/,
  /^java\s+--version/,
  /^curl\s+--?head/,
  /^curl\s+--?I/,
  /^wget\s+--spider/,
  /^tree\b/,
  /^stat\s/,
  /^file\s/,
  /^basename\b/,
  /^dirname\b/,
  /^realpath\b/,
  /^readlink\b/,
  /^mktemp\s+-[du]/,
  /^tput\b/,
  /^seq\s/,
  /^yes\b/,
  /^sleep\b/,
  /^true\b/,
  /^false\b/,
  /^test\b/,
  /^printf\s/
];

/**
 * 具有安全flags白名单的命令 — 每个命令定义哪些flags是安全的
 *
 * 参考 Claude Code COMMAND_ALLOWLIST 简化版:
 *
 * - 安全flags意味着带这些flags的命令仍然只读
 * - 其他flags可能改变行为为非只读
 */
const COMMAND_SAFE_FLAGS: ReadonlyMap<string, readonly string[]> = new Map([
  [
    'ls',
    [
      '-1',
      '-a',
      '-A',
      '-c',
      '-d',
      '-f',
      '-F',
      '-g',
      '-G',
      '-h',
      '-H',
      '-i',
      '-k',
      '-l',
      '-L',
      '-m',
      '-n',
      '-o',
      '-p',
      '-q',
      '-Q',
      '-r',
      '-R',
      '-s',
      '-S',
      '-t',
      '-T',
      '-u',
      '-U',
      '-v',
      '-w',
      '-x',
      '-X',
      '-Z',
      '--author',
      '--block-size',
      '--classify',
      '--color',
      '--format',
      '--full-time',
      '--group-directories-first',
      '--human-readable',
      '--inode',
      '--numeric-uid-gid',
      '--quote-name',
      '--reverse',
      '--show-control-chars',
      '--size',
      '--sort',
      '--time',
      '--time-style'
    ]
  ],
  [
    'cat',
    [
      '-A',
      '-b',
      '-E',
      '-e',
      '-n',
      '-s',
      '-T',
      '-t',
      '-u',
      '-v',
      '--number',
      '--number-nonblank',
      '--show-all',
      '--show-ends',
      '--show-nonprinting',
      '--show-tabs',
      '--squeeze-blank'
    ]
  ],
  ['head', ['-c', '-n', '--bytes', '--lines']],
  [
    'tail',
    [
      '-c',
      '-f',
      '-F',
      '-n',
      '--bytes',
      '--follow',
      '--lines',
      '--pid',
      '--retry',
      '--sleep-interval'
    ]
  ],
  [
    'find',
    [
      '-L',
      '-P',
      '-H',
      '-name',
      '-iname',
      '-path',
      '-ipath',
      '-regex',
      '-iregex',
      '-type',
      '-size',
      '-mtime',
      '-atime',
      '-ctime',
      '-perm',
      '-user',
      '-group',
      '-uid',
      '-gid',
      '-newer',
      '-anewer',
      '-cnewer',
      '-empty',
      '-maxdepth',
      '-mindepth',
      '-depth',
      '-print',
      '-print0',
      '-fprintf',
      '-ls',
      '-fls',
      '-quit',
      '-exec',
      '-ok'
    ]
  ],
  [
    'grep',
    [
      '-E',
      '-F',
      '-G',
      '-P',
      '-i',
      '-v',
      '-w',
      '-x',
      '-c',
      '-l',
      '-L',
      '-n',
      '-H',
      '-h',
      '-m',
      '-o',
      '-q',
      '-s',
      '-b',
      '-r',
      '-R',
      '-I',
      '-a',
      '-d',
      '--color',
      '--context',
      '--after-context',
      '--before-context',
      '--count',
      '--files-with-matches',
      '--files-without-match',
      '--line-number',
      '--max-count',
      '--quiet',
      '--silent',
      '--no-messages',
      '--recursive',
      '--exclude',
      '--exclude-dir',
      '--include'
    ]
  ],
  [
    'sort',
    [
      '-b',
      '-d',
      '-f',
      '-g',
      '-i',
      '-M',
      '-h',
      '-n',
      '-R',
      '-r',
      '-c',
      '-C',
      '-k',
      '-m',
      '-o',
      '-s',
      '-S',
      '-t',
      '-T',
      '-u',
      '-z',
      '--field-separator',
      '--key',
      '--numeric-sort',
      '--reverse',
      '--unique'
    ]
  ],
  [
    'wc',
    ['-c', '-m', '-l', '-L', '-w', '--bytes', '--chars', '--lines', '--max-line-length', '--words']
  ],
  [
    'git',
    [
      'log',
      'status',
      'diff',
      'show',
      'branch',
      'tag',
      'remote',
      'describe',
      'rev-parse',
      'ls-files',
      'ls-tree',
      'ls-remote',
      'shortlog',
      'reflog',
      'name-rev',
      'merge-base',
      'cherry',
      'cherry-pick' /* cherry-pick需要审核但查看信息安全 */
    ]
  ],
  [
    'ps',
    [
      '-a',
      '-A',
      '-e',
      '-f',
      '-F',
      '-H',
      '-l',
      '-M',
      '-N',
      '-o',
      '-O',
      '-p',
      '-T',
      '-U',
      '-u',
      '-w',
      '--columns',
      '--forest',
      '--format',
      '--group',
      '--no-headers',
      '--pid',
      '--ppid',
      '--sort',
      '--user'
    ]
  ],
  ['echo', ['-n', '-e', '-E']],
  ['printf', []],
  ['seq', ['-f', '-s', '-w', '-b']],
  ['env', []],
  ['printenv', []],
  [
    'diff',
    [
      '-a',
      '-b',
      '-B',
      '-c',
      '-C',
      '-d',
      '-e',
      '-E',
      '-f',
      '-H',
      '-i',
      '-I',
      '-l',
      '-n',
      '-N',
      '-p',
      '-q',
      '-r',
      '-s',
      '-S',
      '-t',
      '-T',
      '-u',
      '-U',
      '-v',
      '-w',
      '-W',
      '-x',
      '-y',
      '--brief',
      '--context',
      '--ed',
      '--expand-tabs',
      '--ignore-all-space',
      '--ignore-blank-lines',
      '--ignore-case',
      '--left-column',
      '--minimal',
      '--no-prefix',
      '--normal',
      '--rcs',
      '--report-identical-files',
      '--show-c-function',
      '--side-by-side',
      '--starting-file',
      '--strip-trailing-cr',
      '--suppress-common-lines',
      '--text',
      '--unified',
      '--width'
    ]
  ],
  ['awk', ['-F', '-v', '--version']],
  ['sed', ['-n', '-e', '-f', '--version']],
  ['cut', ['-d', '-f', '-c', '-b', '-s', '--version', '--delimiter', '--fields', '--characters']],
  [
    'tr',
    ['-d', '-s', '-c', '-C', '-t', '--version', '--delete', '--squeeze-repeats', '--complement']
  ],
  [
    'xargs',
    [
      '-d',
      '-n',
      '-I',
      '-L',
      '-P',
      '-r',
      '-t',
      '--version',
      '--delimiter',
      '--max-args',
      '--replace',
      '--max-lines',
      '--no-run-if-empty',
      '--verbose'
    ]
  ],
  ['wget', ['--spider', '-q', '--version', '-S', '--server-response']],
  [
    'jq',
    [
      '-r',
      '-e',
      '-n',
      '-S',
      '-j',
      '-C',
      '-M',
      '-R',
      '--version',
      '--raw-output',
      '--exit-status',
      '--null-input',
      '--sort-keys',
      '--join-output',
      '--compact-output',
      '--monochrome-output',
      '--raw-input'
    ]
  ],
  ['hexdump', ['-C', '-c', '-d', '-o', '-x', '-v', '-e', '-n', '-s', '--version']],
  ['od', ['-A', '-t', '-N', '-v', '-j', '-w', '--version']],
  ['base64', ['-d', '--decode', '--version', '-w', '--wrap']],
  ['md5sum', ['--version', '-c', '--check', '--status']],
  ['sha256sum', ['--version', '-c', '--check', '--status']],
  ['sha1sum', ['--version', '-c', '--check', '--status']],
  [
    'tree',
    [
      '-a',
      '-d',
      '-f',
      '-i',
      '-l',
      '-L',
      '-p',
      '-P',
      '-q',
      '-s',
      '-t',
      '-u',
      '-g',
      '-D',
      '-F',
      '-h',
      '-v',
      '--version'
    ]
  ],
  ['stat', ['-c', '-f', '-L', '-q', '--version', '--format', '--file-system', '--dereference']],
  [
    'file',
    [
      '-b',
      '-i',
      '-L',
      '-h',
      '-z',
      '-s',
      '--version',
      '--brief',
      '--mime-type',
      '--dereference',
      '--no-dereference',
      '--uncompress',
      '--special-files'
    ]
  ],
  [
    'du',
    [
      '-a',
      '-b',
      '-c',
      '-h',
      '-H',
      '-k',
      '-m',
      '-L',
      '-l',
      '-s',
      '-S',
      '-x',
      '-X',
      '--version',
      '--apparent-size',
      '--block-size',
      '--summarize',
      '--total',
      '--one-file-system',
      '--exclude',
      '--human-readable',
      '--max-depth'
    ]
  ]
]);

/**
 * isSafeCompoundCommand — 判断管道(|)和链式(; &&)命令是否全部只读
 *
 * 逻辑: 分解管道(|)，逐段检查每段是否只读
 *
 * - 所有段只读 → 整体只读
 * - 任一段非只读 → 整体非只读
 *
 * 注意: 后台(&)命令不安全，不受此函数处理
 */
function isSafeCompoundCommand(command: string): { isReadOnly: boolean; reason?: string } {
  // 分解管道(|) — 但不分解 ||（逻辑OR）
  // 先替换 || 为占位符，再分割管道
  const placeholder = '__DOUBLE_PIPE__';
  const replaced = command.replace(/\|\|/g, placeholder);
  const segments = replaced
    .split('|')
    .map(s => s.replace(new RegExp(placeholder, 'g'), '||').trim());

  // 逐段检查只读
  for (const segment of segments) {
    // 检查 || 和 && 链式命令
    if (segment.includes('||') || segment.includes('&&')) {
      // 链式命令分解检查
      const chainParts = segment
        .split(/\|\||&&/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
      for (const part of chainParts) {
        const result = isSingleCommandReadOnly(part);
        if (!result.isReadOnly) {
          return { isReadOnly: false, reason: `non_readonly_segment: ${part}` };
        }
      }
      continue;
    }

    // 单段命令检查
    const result = isSingleCommandReadOnly(segment);
    if (!result.isReadOnly) {
      return { isReadOnly: false, reason: `non_readonly_segment: ${segment}` };
    }
  }

  return { isReadOnly: true, reason: 'all_segments_readonly' };
}

/** isSingleCommandReadOnly — 判断单个命令是否只读（不含管道/链式） */
function isSingleCommandReadOnly(command: string): { isReadOnly: boolean; reason?: string } {
  const trimmed = command.trim();
  if (trimmed === '') return { isReadOnly: true, reason: 'empty_command' };

  const stripped = stripEnvVarsForReadOnly(trimmed);
  const unwrapped = stripWrappersForReadOnly(stripped);

  // 检查flags白名单
  const parts = unwrapped.split(/\s+/);
  const cmdName = parts[0];
  const safeFlags = COMMAND_SAFE_FLAGS.get(cmdName);

  if (safeFlags !== undefined) {
    const flags = parts.slice(1).filter(p => p.startsWith('-'));
    for (const flag of flags) {
      if (flag.startsWith('--')) {
        const normalized = normalizeLongFlag(flag);
        if (!safeFlags.includes(normalized)) {
          return { isReadOnly: false, reason: `unsafe_flag_${flag}` };
        }
      } else if (flag.length > 1) {
        if (safeFlags.includes(flag)) {
          // 整体flag安全
        } else {
          const flagChars = flag.slice(1).split('');
          for (const ch of flagChars) {
            if (!safeFlags.includes(`-${ch}`)) {
              return { isReadOnly: false, reason: `unsafe_flag_-${ch}` };
            }
          }
        }
      }
    }
    return { isReadOnly: true, reason: 'safe_flags_match' };
  }

  // 检查简单只读正则
  for (const regex of READONLY_COMMAND_REGEXES) {
    if (regex.test(unwrapped)) {
      return { isReadOnly: true, reason: 'readonly_regex_match' };
    }
  }

  return { isReadOnly: false, reason: 'not_in_allowlist' };
}

/**
 * isReadOnlyCommand — 判定bash命令是否为只读
 *
 * 判定逻辑:
 *
 * 1. 去除环境变量和安全包装
 * 2. 含管道(|) → 调用 isSafeCompoundCommand 逐段检查
 * 3. 含后台(&) → 非只读
 * 4. 含链式(; && ||) → 逐段检查
 * 5. 单命令 → 检查 flags白名单 + READONLY_COMMAND_REGEXES
 *
 * @returns {isReadOnly: boolean, reason?: string}
 */
export function isReadOnlyCommand(command: string): { isReadOnly: boolean; reason?: string } {
  const trimmed = command.trim();

  // 空命令 → 只读（无操作）
  if (trimmed === '') return { isReadOnly: true, reason: 'empty_command' };

  // 去除环境变量前缀
  const stripped = stripEnvVarsForReadOnly(trimmed);
  // 去除安全包装
  const unwrapped = stripWrappersForReadOnly(stripped);

  // 后台命令(&) → 非只读（不安全）
  // 匹配末尾 & 或空格后的 &（但不匹配 &&）
  if (/\s&\s*$/.test(unwrapped) || /[;&]$/.test(unwrapped.replace(/&&/g, ''))) {
    return { isReadOnly: false, reason: 'background_command' };
  }

  // 含管道(|) → 逐段检查
  // 注意: || 是逻辑OR，不是管道
  const pipeCheck = unwrapped.replace(/\|\|/g, '');
  if (pipeCheck.includes('|')) {
    return isSafeCompoundCommand(unwrapped);
  }

  // 含链式(; && ||) → 逐段检查
  if (/[;&]/.test(unwrapped) || unwrapped.includes('||')) {
    return isSafeCompoundCommand(unwrapped);
  }

  // 单命令 → 调用 isSingleCommandReadOnly
  return isSingleCommandReadOnly(unwrapped);
}

// ============================================================
// 2. Destructive 命令检测
// ============================================================

/** 破坏性命令模式 — 检测可能造成不可逆损害的命令 */
const DESTRUCTIVE_COMMAND_PATTERNS: readonly {
  pattern: RegExp;
  description: string;
  severity: 'critical' | 'high' | 'medium';
}[] = [
  // 文件系统破坏
  {
    pattern: /rm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+|--force\s+)/,
    description: '强制删除文件(rm -rf)',
    severity: 'critical'
  },
  {
    pattern: /rm\s+(-[a-zA-Z]*r[a-zA-Z]*\s+|--recursive\s+)/,
    description: '递归删除目录(rm -r)',
    severity: 'critical'
  },
  { pattern: /rm\s+.*\/\s*$/, description: '删除根目录或家目录', severity: 'critical' },
  { pattern: /rmdir\s+.*\/\s*$/, description: '删除根级目录', severity: 'high' },
  { pattern: /mkfs\b/, description: '格式化磁盘(mkfs)', severity: 'critical' },
  { pattern: /dd\s+.*of=\/dev\//, description: 'dd写入设备文件', severity: 'critical' },
  { pattern: /shred\b/, description: '安全擦除文件(shred)', severity: 'high' },

  // Git破坏性操作
  {
    pattern: /git\s+(push\s+.*--force|push\s+.*-f\s)/,
    description: '强制推送(git push --force)',
    severity: 'high'
  },
  { pattern: /git\s+reset\s+.*--hard/, description: '硬重置(git reset --hard)', severity: 'high' },
  {
    pattern: /git\s+clean\s+.*-[a-zA-Z]*f/,
    description: '强制清理(git clean -f)',
    severity: 'high'
  },
  {
    pattern: /git\s+checkout\s+.*--force/,
    description: '强制checkout覆盖修改',
    severity: 'medium'
  },
  { pattern: /git\s+rebase\s+.*--force/, description: '强制rebase', severity: 'medium' },

  // 数据库破坏
  {
    pattern: /DROP\s+(TABLE|DATABASE|SCHEMA)\b/i,
    description: '删除数据库表(DROP TABLE)',
    severity: 'critical'
  },
  { pattern: /TRUNCATE\s+TABLE\b/i, description: '清空表(TRUNCATE)', severity: 'high' },

  // 容器/集群破坏
  {
    pattern: /kubectl\s+delete\s+(--force|--now|--grace-period=0)/,
    description: '强制删除K8s资源',
    severity: 'high'
  },
  {
    pattern: /docker\s+(rm\s+-f|system\s+prune\s+-a)/,
    description: '强制删除Docker资源',
    severity: 'medium'
  },
  { pattern: /terraform\s+destroy\b/, description: '销毁Terraform基础设施', severity: 'critical' },

  // 系统破坏
  { pattern: /chmod\s+(-R\s+)?0\d+\s+/, description: '移除所有权限(chmod 000)', severity: 'high' },
  { pattern: /kill\s+(-9|-KILL)\s+1\b/, description: '强制杀死init进程', severity: 'critical' },
  { pattern: /killall\s+(-9|-KILL)/, description: '强制杀死所有匹配进程', severity: 'medium' },
  {
    pattern: /systemctl\s+(stop|disable)\s+(ssh|sshd|network|firewall)/,
    description: '停止关键系统服务',
    severity: 'high'
  },

  // 权限提升
  { pattern: /sudo\s+rm/, description: 'sudo删除操作', severity: 'high' },
  { pattern: /sudo\s+chmod\s+-R/, description: 'sudo递归修改权限', severity: 'high' },
  { pattern: /sudo\s+tee\s+\/etc\//, description: 'sudo写入系统配置', severity: 'medium' }
];

/**
 * detectDestructiveCommand — 检测破坏性命令模式
 *
 * @returns 检测到的破坏性模式列表（空=无检测到）
 */
export function detectDestructiveCommand(command: string): readonly {
  pattern: string;
  description: string;
  severity: 'critical' | 'high' | 'medium';
}[] {
  const trimmed = command.trim();
  const detected: {
    pattern: string;
    description: string;
    severity: 'critical' | 'high' | 'medium';
  }[] = [];

  for (const { pattern, description, severity } of DESTRUCTIVE_COMMAND_PATTERNS) {
    if (pattern.test(trimmed)) {
      detected.push({ pattern: pattern.source, description, severity });
    }
  }

  return detected;
}

// ============================================================
// 3. 命令注入检测
// ============================================================

/** 命令注入模式 — 检测危险的shell结构 */
const INJECTION_PATTERNS: readonly {
  pattern: RegExp;
  description: string;
}[] = [
  { pattern: /\$\(/, description: '命令替换 $()' },
  { pattern: /`[^`]+`/, description: '反引号命令替换' },
  { pattern: />\(\)/, description: '过程替换 >()' },
  { pattern: /<\(\)/, description: '过程替换 <()' },
  { pattern: /\$\{[^}]*\(/, description: '参数扩展命令调用 ${}' },
  { pattern: /eval\s/, description: '动态命令执行(eval)' },
  { pattern: /exec\s/, description: '命令替换(exec)' },
  { pattern: /source\s+.*\|/, description: '带管道的source(可能注入)' }
];

/**
 * detectCommandInjection — 检测命令注入模式
 *
 * @returns 检测到的注入模式列表（空=安全）
 */
export function detectCommandInjection(command: string): readonly {
  pattern: string;
  description: string;
}[] {
  const trimmed = command.trim();
  const detected: { pattern: string; description: string }[] = [];

  for (const { pattern, description } of INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      detected.push({ pattern: pattern.source, description });
    }
  }

  return detected;
}

// ============================================================
// 4. 路径验证
// ============================================================

/** 危险删除路径 — rm/rmdir 不应操作这些路径 */
const DANGEROUS_REMOVAL_PATHS: readonly RegExp[] = [
  /^\/$/,
  /^\/home\/?$/i,
  /^\/etc\/?$/i,
  /^\/usr\/?$/i,
  /^\/var\/?$/i,
  /^\/System/i,
  /^\/Library/i,
  /^\/Applications/i,
  /^\/Users\/[^/]+\/?$/i,
  /^\/$HOME\/?$/
];

/** 需要路径提取的命令 — 定义哪些参数位置是路径 */
const PATH_EXTRACTING_COMMANDS: ReadonlyMap<
  string,
  (args: readonly string[]) => readonly string[]
> = new Map([
  ['cd', args => args.filter(a => !a.startsWith('-'))],
  ['ls', args => args.filter(a => !a.startsWith('-') && a !== '--')],
  [
    'find',
    args => {
      const paths: string[] = [];
      const afterDash = args.indexOf('--');
      if (afterDash >= 0) {
        paths.push(...args.slice(0, afterDash).filter(a => !a.startsWith('-')));
      } else {
        // 第一个非flag参数是搜索路径
        const nonFlag = args.find(a => !a.startsWith('-'));
        if (nonFlag) paths.push(nonFlag);
      }
      return paths;
    }
  ],
  ['rm', args => args.filter(a => !a.startsWith('-') && a !== '--')],
  ['rmdir', args => args.filter(a => !a.startsWith('-'))],
  ['cat', args => args.filter(a => !a.startsWith('-'))],
  ['head', args => args.filter(a => !a.startsWith('-'))],
  ['tail', args => args.filter(a => !a.startsWith('-'))],
  ['cp', args => args.filter(a => !a.startsWith('-')).slice(-2)],
  ['mv', args => args.filter(a => !a.startsWith('-')).slice(-2)],
  ['mkdir', args => args.filter(a => !a.startsWith('-'))],
  ['touch', args => args.filter(a => !a.startsWith('-'))],
  ['chmod', args => args.filter(a => !a.startsWith('-')).slice(1)],
  ['chown', args => args.filter(a => !a.startsWith('-')).slice(1)],
  [
    'git',
    args => {
      const subcmd = args[0];
      if (subcmd === 'checkout' || subcmd === 'clone') {
        return args.filter(a => !a.startsWith('-')).slice(1);
      }
      return [];
    }
  ],
  ['grep', args => args.filter(a => !a.startsWith('-') && !a.startsWith('--') && a !== '-e')],
  ['rg', args => args.filter(a => !a.startsWith('-'))],
  ['sed', args => args.filter(a => !a.startsWith('-'))],
  ['awk', args => args.filter(a => !a.startsWith('-'))],
  ['curl', args => args.filter(a => !a.startsWith('-') && a.startsWith('http'))],
  ['wget', args => args.filter(a => !a.startsWith('-') && a.startsWith('http'))],
  ['tee', args => args.filter(a => !a.startsWith('-'))]
]);

/** 被阻止的设备文件路径 — 不允许读取/写入 */
export const BLOCKED_DEVICE_PATHS: readonly string[] = [
  '/dev/zero',
  '/dev/random',
  '/dev/urandom',
  '/dev/full',
  '/dev/null',
  '/dev/input',
  '/dev/tty',
  '/dev/console',
  '/dev/kmsg',
  '/dev/mem',
  '/dev/port',
  '/dev/snmp'
];

/**
 * validateCommandPaths — 验证命令中涉及的路径
 *
 * 检测:
 *
 * 1. rm/rmdir 对危险路径的操作
 * 2. 输出重定向到受限路径
 * 3. 设备文件路径
 *
 * @returns 路径验证警告列表
 */
export function validateCommandPaths(
  command: string,
  _cwd: string
): readonly { path: string; issue: string; severity: 'critical' | 'high' | 'medium' }[] {
  const warnings: { path: string; issue: string; severity: 'critical' | 'high' | 'medium' }[] = [];
  const trimmed = command.trim();

  // 1. 检查设备文件路径
  for (const blocked of BLOCKED_DEVICE_PATHS) {
    if (trimmed.includes(blocked)) {
      warnings.push({ path: blocked, issue: 'device_file_access', severity: 'critical' });
    }
  }

  // 2. 检查输出重定向
  const redirectMatch = trimmed.match(/>>?\s*([^\s;&|)]+)/g);
  if (redirectMatch) {
    for (const redirect of redirectMatch) {
      const targetPath = redirect.replace(/>>?\s*/, '');
      // 不允许重定向到 /etc, /usr, /System 等系统目录
      if (/^\/(etc|usr|System|Library)\//i.test(targetPath)) {
        warnings.push({ path: targetPath, issue: 'system_redirect', severity: 'high' });
      }
    }
  }

  // 3. 提取命令路径并检查
  const parts = trimmed.split(/\s+/);
  const cmdName = parts[0];
  const extractor = PATH_EXTRACTING_COMMANDS.get(cmdName);

  if (extractor) {
    const args = parts.slice(1);
    const paths = extractor(args);

    // 检查 rm/rmdir 对危险路径
    if (cmdName === 'rm' || cmdName === 'rmdir') {
      for (const p of paths) {
        for (const dangerous of DANGEROUS_REMOVAL_PATHS) {
          if (dangerous.test(p)) {
            warnings.push({ path: p, issue: 'dangerous_removal_path', severity: 'critical' });
          }
        }
      }
    }
  }

  return warnings;
}

// ============================================================
// 5. 综合安全评估
// ============================================================

/** Bash命令安全评估结果 */
export interface BashSecurityAssessment {
  /** 是否为只读命令 */
  readonly isReadOnly: boolean;
  readonly readOnlyReason?: string;
  /** 是否包含命令注入模式 */
  readonly hasInjection: boolean;
  readonly injectionPatterns: readonly { pattern: string; description: string }[];
  /** 是否为破坏性命令 */
  readonly hasDestructive: boolean;
  readonly destructivePatterns: readonly {
    pattern: string;
    description: string;
    severity: string;
  }[];
  /** 路径验证警告 */
  readonly pathWarnings: readonly { path: string; issue: string; severity: string }[];
  /** 综合安全级别 */
  readonly safetyLevel: 'safe' | 'caution' | 'dangerous';
  /** 综合建议 */
  readonly recommendation: string;
}

/**
 * assessBashCommandSecurity — 综合安全评估
 *
 * 整合 readOnly + injection + destructive + path 验证， 生成综合安全级别和建议。
 *
 * safetyLevel:
 *
 * - safe: 只读 + 无注入 + 无破坏性 + 无路径警告 → 可自动允许
 * - caution: 有注入/路径警告但无破坏性 → 需审核
 * - dangerous: 有破坏性命令 → 需严格审核+警告
 */
export function assessBashCommandSecurity(command: string, cwd?: string): BashSecurityAssessment {
  const readOnly = isReadOnlyCommand(command);
  const injections = detectCommandInjection(command);
  const destructive = detectDestructiveCommand(command);
  const pathWarnings = cwd ? validateCommandPaths(command, cwd) : [];

  const hasInjection = injections.length > 0;
  const hasDestructive = destructive.length > 0;

  // 综合安全级别
  let safetyLevel: 'safe' | 'caution' | 'dangerous';
  let recommendation: string;

  if (hasDestructive) {
    safetyLevel = 'dangerous';
    const worstSeverity = destructive.some(d => d.severity === 'critical')
      ? 'critical'
      : destructive.some(d => d.severity === 'high')
        ? 'high'
        : 'medium';
    recommendation = `破坏性命令[${worstSeverity}]: ${destructive.map(d => d.description).join('; ')}。需严格审核。`;
  } else if (hasInjection || pathWarnings.length > 0) {
    safetyLevel = 'caution';
    const issues: string[] = [];
    if (hasInjection) issues.push(`注入模式: ${injections.map(i => i.description).join('; ')}`);
    if (pathWarnings.length > 0)
      issues.push(`路径警告: ${pathWarnings.map(p => `${p.path}(${p.issue})`).join('; ')}`);
    recommendation = `需审核: ${issues.join('。')}`;
  } else if (readOnly.isReadOnly) {
    safetyLevel = 'safe';
    recommendation = '只读命令，可自动允许';
  } else {
    safetyLevel = 'caution';
    recommendation = '非只读命令，需权限确认';
  }

  return {
    isReadOnly: readOnly.isReadOnly,
    readOnlyReason: readOnly.reason,
    hasInjection,
    injectionPatterns: injections,
    hasDestructive,
    destructivePatterns: destructive,
    pathWarnings,
    safetyLevel,
    recommendation
  };
}

// ============================================================
// 辅助函数
// ============================================================

/** 去除环境变量前缀（只读判定用） */
function stripEnvVarsForReadOnly(command: string): string {
  const envPattern = /^[A-Za-z_][A-Za-z0-9_]*=\S+\s+/;
  let stripped = command.trim();
  while (envPattern.test(stripped)) {
    stripped = stripped.replace(envPattern, '');
  }
  if (/^[A-Za-z_][A-Za-z0-9_]*=\S*$/.test(stripped) && !stripped.includes(' ')) {
    return '';
  }
  return stripped.trim();
}

/** 去除安全包装命令（只读判定用） */
function stripWrappersForReadOnly(command: string): string {
  const wrappers = ['timeout', 'time', 'nice', 'ionice', 'env', 'nohup', 'stdbuf', 'unbuffer'];
  let stripped = command.trim();

  for (const wrapper of wrappers) {
    const pattern = new RegExp(`^${wrapper}\\s+\\S+\\s+`);
    if (pattern.test(stripped)) {
      stripped = stripped.replace(pattern, '');
    }
    const patternNoArg = new RegExp(`^${wrapper}\\s+`);
    if (patternNoArg.test(stripped) && !pattern.test(stripped)) {
      stripped = stripped.replace(patternNoArg, '');
    }
  }

  return stripped.trim();
}

/** 规范化长flag — 去除=值部分 */
function normalizeLongFlag(flag: string): string {
  const eqIndex = flag.indexOf('=');
  if (eqIndex >= 0) {
    return flag.slice(0, eqIndex);
  }
  return flag;
}
