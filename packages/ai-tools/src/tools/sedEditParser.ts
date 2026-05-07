/**
 * G7: sed -i 命令解析器 — 检测+解析+JS模拟替换
 *
 * 对齐 Claude Code BashTool/sedEditParser.ts:
 *
 * 1. isSedInPlaceEdit — 检测命令是否为简单 sed -i 替换
 * 2. parseSedEditCommand — 解析为 SedEditInfo 结构
 * 3. applySedSubstitution — 在 JS 中模拟替换（BRE→ERE 转换）
 *
 * 仅支持简单 `sed -i 's/pattern/replacement/flags' file` 命令。 复杂命令（管道、多表达式、glob）返回 null。
 */

// ============================================================
// 类型定义
// ============================================================

/** sed -i 编辑信息 */
export interface SedEditInfo {
  /** 目标文件路径 */
  readonly filePath: string;
  /** sed 搜索模式（原样字符串） */
  readonly pattern: string;
  /** sed 替换字符串（原样字符串） */
  readonly replacement: string;
  /** sed 标志 (g/i 等) */
  readonly flags: string;
  /** 是否使用扩展正则 (-E/-r) */
  readonly extendedRegex: boolean;
  /** 原始命令 */
  readonly originalCommand: string;
}

// ============================================================
// 1. sed -i 检测
// ============================================================

/**
 * isSedInPlaceEdit — 检测命令是否为可拦截的简单 sed -i 替换
 *
 * 条件:
 *
 * - 命令以 sed 开头
 * - 包含 -i 或 --in-place 标志
 * - 只有一个替换表达式 (s/pattern/replacement/flags)
 * - 无管道、无重定向、无多个 -e 表达式
 * - 有明确的目标文件路径
 */
export function isSedInPlaceEdit(command: string): boolean {
  return parseSedEditCommand(command) !== null;
}

// ============================================================
// 2. sed -i 解析
// ============================================================

/**
 * parseSedEditCommand — 解析简单 sed -i 命令
 *
 * 支持格式: sed -i 's/pattern/replacement/flags' file sed -i -e 's/pattern/replacement/flags' file sed
 * -E -i 's/pattern/replacement/flags' file sed --in-place 's/pattern/replacement/flags' file sed
 * -i'' 's/pattern/replacement/flags' file (BSD style: -i with empty suffix)
 *
 * 不支持（返回 null）: 管道命令 (|, >, >>) 多个 -e 表达式 非 s 命令 (d, p, y 等) glob 文件路径 (*.txt) 后缀备份 (-i.bak)
 * 命令中包含分号分隔的多条命令
 */
export function parseSedEditCommand(command: string): SedEditInfo | null {
  const trimmed = command.trim();

  // 排除管道/重定向 — 但只在引号外的才算
  // sed -i 's/foo|bar/baz/' file 中的 | 在引号内（ERE 交替），不是管道
  // 先剥掉引号内容再检测
  const stripped = trimmed.replace(/'[^']*'/g, '').replace(/"[^"]*"/g, '');
  if (/[|&>]/.test(stripped)) return null;

  // 匹配 sed 命令结构
  // sed [-E|-r] [-i|--in-place[=suffix]] [-e expr] 's/.../.../...' file
  const sedMatch = trimmed.match(/^sed\s+([\S\s]+)$/);
  if (!sedMatch) return null;

  const rest = sedMatch[1];
  let extendedRegex = false;
  let hasInPlace = false;
  let suffix = '';
  const expressions: string[] = [];
  let filePath: string | null = null;

  // 解析参数
  const tokens = tokenizeSedArgs(rest);

  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];

    // -E/-r: 扩展正则
    if (token === '-E' || token === '-r' || token === '--regexp-extended') {
      extendedRegex = true;
      i++;
      continue;
    }

    // -i 或 --in-place: in-place 编辑
    if (token === '-i') {
      hasInPlace = true;
      // BSD sed: -i 可以紧跟后缀（如 -i'' 或 -i.bak）
      // 如果下一个 token 不以 - 开头且不是表达式，则可能是后缀或文件
      // 但 -i.bak 表示备份后缀，我们不支持
      i++;
      // 检查是否有紧跟的后缀（BSD style -i'' 或 GNU -i with no separate suffix）
      // 如果 -i 后面的 token 以 - 开头（另一个 flag），则无后缀
      if (i < tokens.length && !tokens[i].startsWith('-') && !isSedExpression(tokens[i])) {
        suffix = tokens[i];
        if (suffix !== '') return null; // -i.bak 等有备份后缀 → 不拦截
        i++;
      }
      continue;
    }

    // --in-place[=suffix]
    if (token.startsWith('--in-place')) {
      hasInPlace = true;
      const eqIdx = token.indexOf('=');
      if (eqIdx >= 0) {
        suffix = token.substring(eqIdx + 1);
        if (suffix !== '') return null; // 有备份后缀 → 不拦截
      }
      i++;
      continue;
    }

    // -e 表达式
    if (token === '-e') {
      i++;
      if (i >= tokens.length) return null; // -e 后无表达式
      expressions.push(tokens[i]);
      i++;
      continue;
    }

    // 裸表达式（无 -e 前缀） — 只允许一个
    if (isSedExpression(token)) {
      expressions.push(token);
      i++;
      // 剩余 token 应为文件路径
      if (i < tokens.length) {
        filePath = tokens[i];
        i++;
      }
      continue;
    }

    // 其他 flag（如 -n）— 跳过但不拦截
    if (token.startsWith('-')) {
      i++;
      continue;
    }

    // 文件路径
    filePath = token;
    i++;
  }

  if (!hasInPlace) return null;
  if (expressions.length !== 1) return null; // 只支持单个表达式
  if (!filePath) return null;

  // 检查表达式不包含分号分隔的多命令（如 s/a/b/; s/c/d/）
  const sedExpr = expressions[0];
  // 分号分隔多命令: 表达式包含 ; 后跟非空内容
  // 在 sed s 命令中，分号后的空格+命令字符是非替换命令
  if (/;\s*\S/.test(sedExpr)) return null;

  // 检查文件路径不包含 glob
  if (/[{*?[]/.test(filePath)) return null;

  // 解析 s/pattern/replacement/flags
  const sedExprRaw = expressions[0];
  const parsed = parseSubstitutionExpr(sedExprRaw);
  if (!parsed) return null;

  return {
    filePath,
    pattern: parsed.pattern,
    replacement: parsed.replacement,
    flags: parsed.flags,
    extendedRegex,
    originalCommand: command
  };
}

// ============================================================
// 3. sed 替换表达式解析
// ============================================================

/** 替换表达式内部结构 */
interface SubstitutionParts {
  readonly pattern: string;
  readonly replacement: string;
  readonly flags: string;
}

/**
 * parseSubstitutionExpr — 解析 s/pattern/replacement/flags
 *
 * 分隔符可以是任意字符（不只 /），如 s|pattern|replacement|g 支持转义分隔符：/
 */
function parseSubstitutionExpr(expr: string): SubstitutionParts | null {
  // 必须以 s 开头
  if (expr[0] !== 's') return null;

  const delimiter = expr[1];
  if (!delimiter) return null;

  // 分隔符不能是字母/数字（sed 规范）
  if (/[a-zA-Z0-9]/.test(delimiter)) return null;

  // 从位置2开始提取 pattern, replacement, flags
  let pos = 2;
  const parts: string[] = [];

  for (let partIdx = 0; partIdx < 3; partIdx++) {
    let current = '';
    while (pos < expr.length) {
      const ch = expr[pos];
      if (ch === delimiter && partIdx < 2) {
        pos++;
        break;
      }
      if (ch === '\\' && pos + 1 < expr.length) {
        // 转义序列
        const next = expr[pos + 1];
        if (next === delimiter) {
          // 转义分隔符 → 保留分隔符本身
          current += delimiter;
          pos += 2;
        } else if (next === 'n' && partIdx === 1) {
          // 替换串中 \n → 换行（sed 标准）
          current += '\n';
          pos += 2;
        } else if (next === 't' && partIdx === 1) {
          // 替换串中 \t → tab
          current += '\t';
          pos += 2;
        } else if (next === '\\') {
          current += '\\';
          pos += 2;
        } else {
          // 其他转义 → 保留原样
          current += ch + next;
          pos += 2;
        }
      } else {
        current += ch;
        pos++;
      }
    }
    parts.push(current);
  }

  if (parts.length < 2) return null;

  return {
    pattern: parts[0],
    replacement: parts[1],
    flags: parts[2] || ''
  };
}

// ============================================================
// 4. JS 模拟替换
// ============================================================

/**
 * applySedSubstitution — 在 JS 中模拟 sed 替换
 *
 * 将 sed BRE 模式转换为 JS RegExp:
 *
 * - BRE: (...) → ERE/JS: (...), {m,n} → {m,n}
 * - - → +（ERE量词）
 * - ? → ?（ERE量词）
 * - & → $&（整个匹配引用）
 * - \1 → $1（分组引用）
 *
 * 扩展正则模式 (-E/-r) 不需要 BRE→ERE 转换
 */
export function applySedSubstitution(content: string, info: SedEditInfo): string {
  let jsPattern: string;

  if (info.extendedRegex) {
    // ERE 模式：直接作为 JS 正则使用
    jsPattern = info.pattern;
  } else {
    // BRE 模式 → ERE/JS 转换
    jsPattern = breToEre(info.pattern);
  }

  // sed 替换串 → JS 替换串转换
  const jsReplacement = sedReplacementToJs(info.replacement);

  // 构建正则标志
  const regexFlags = buildRegexFlags(info.flags);

  try {
    const regex = new RegExp(jsPattern, regexFlags);
    return content.replace(regex, jsReplacement);
  } catch {
    // 正则编译失败 → 返回原内容（无法模拟）
    return content;
  }
}

/**
 * BRE → ERE/JS 转换
 *
 * 转换规则: ( → ( (BRE 分组开始) ) → ) (BRE 分组结束) { → { (BRE 量词开始) } → } (BRE 量词结束) + → + (BRE "至少一次") ? →
 * ? (BRE "零或一次") 未转义的 ( → ( (ERE 中是分组，BRE 中是普通字符 — 但这混淆少见) 未转义的 ) → ) 未转义的 { → {
 * (量词定界符在ERE中是量词，在BRE中需转义) 未转义的 + → + (ERE量词在BRE中是普通字符) 未转义的 ? → ? (同上)
 */
function breToEre(bre: string): string {
  let result = '';
  let i = 0;
  while (i < bre.length) {
    if (bre[i] === '\\' && i + 1 < bre.length) {
      const next = bre[i + 1];
      if (
        next === '(' ||
        next === ')' ||
        next === '{' ||
        next === '}' ||
        next === '+' ||
        next === '?'
      ) {
        // 转义的 BRE 特殊 → ERE 中未转义
        result += next;
        i += 2;
      } else {
        // 其他转义保留
        result += `\\${next}`;
        i += 2;
      }
    } else {
      const ch = bre[i];
      // BRE 中未转义的特殊字符 → ERE 中需转义
      if (ch === '+' || ch === '?' || ch === '(' || ch === ')' || ch === '{' || ch === '}') {
        result += `\\${ch}`;
      } else {
        result += ch;
      }
      i++;
    }
  }
  return result;
}

/**
 * sed 替换串 → JS 替换串
 *
 * 转换规则: & → $&（整个匹配引用） \1 → $1（分组1引用） \2 → $2（分组2引用） ... 以此类推 \n → 换行（已在 parseSubstitutionExpr 处理）
 * 其他保留原样
 */
function sedReplacementToJs(sedRep: string): string {
  let result = '';
  let i = 0;
  while (i < sedRep.length) {
    if (sedRep[i] === '&') {
      result += '$&';
      i++;
    } else if (sedRep[i] === '\\' && i + 1 < sedRep.length) {
      const next = sedRep[i + 1];
      if (/^[1-9]/.test(next)) {
        // \1 → $1, \2 → $2...
        result += `$${next}`;
        i += 2;
      } else {
        // 其他转义保留
        result += sedRep[i] + next;
        i += 2;
      }
    } else {
      result += sedRep[i];
      i++;
    }
  }
  return result;
}

/**
 * 构建正则标志
 *
 * g → 全局替换 i → 大小写不敏感
 */
function buildRegexFlags(flags: string): string {
  let result = '';
  if (flags.includes('g')) result += 'g';
  if (flags.includes('i')) result += 'i';
  return result;
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * tokenizeSedArgs — 将 sed 参数字符串分词
 *
 * 处理引号（单引号、双引号）和 -i紧跟后缀
 */
function tokenizeSedArgs(args: string): string[] {
  const tokens: string[] = [];
  let pos = 0;

  while (pos < args.length) {
    // 跳过空白
    while (pos < args.length && /\s/.test(args[pos])) pos++;
    if (pos >= args.length) break;

    // 处理引号
    if (args[pos] === "'" || args[pos] === '"') {
      const quote = args[pos];
      pos++;
      let token = '';
      while (pos < args.length && args[pos] !== quote) {
        if (args[pos] === '\\' && pos + 1 < args.length) {
          token += args[pos + 1];
          pos += 2;
        } else {
          token += args[pos];
          pos++;
        }
      }
      if (pos < args.length) pos++; // 跳过结束引号
      tokens.push(token);
    } else {
      // 非引号 token
      let token = '';
      while (pos < args.length && !/\s/.test(args[pos])) {
        token += args[pos];
        pos++;
      }
      tokens.push(token);
    }
  }

  return tokens;
}

/** isSedExpression — 判断 token 是否为 sed 替换表达式 */
function isSedExpression(token: string): boolean {
  return token.length >= 3 && token[0] === 's' && !/[a-zA-Z0-9]/.test(token[1]);
}
