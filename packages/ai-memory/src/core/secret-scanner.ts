/**
 * Team Memory Secret Scanner — 客户端 secret 扫描
 *
 * 对齐 CC services/teamMemorySync/secretScanner.ts。在内容上传到团队共享内存 之前，扫描其中是否包含 API key / OAuth token
 * 等敏感凭证，避免将密钥同步给 团队所有成员。规则源自 gitleaks (MIT license)，仅保留高置信度规则。
 */

// ============================================================
// 类型
// ============================================================

interface SecretRule {
  /** Gitleaks rule ID（kebab-case） */
  readonly id: string;
  /** Regex source */
  readonly source: string;
  /** 可选的 JS regex flags（多数规则区分大小写） */
  readonly flags?: string;
}

export interface SecretMatch {
  /** Gitleaks rule ID */
  readonly ruleId: string;
  /** 人类可读的标签（首字母大写） */
  readonly label: string;
}

// ============================================================
// 规则
// ============================================================

// 在运行时拼接 Anthropic 前缀，避免最终 bundle 中出现明文
const ANT_KEY_PFX = ['sk', 'ant', 'api'].join('-');

const SECRET_RULES: readonly SecretRule[] = [
  // — 云提供商 —
  { id: 'aws-access-token', source: '\\b((?:A3T[A-Z0-9]|AKIA|ASIA|ABIA|ACCA)[A-Z2-7]{16})\\b' },
  { id: 'gcp-api-key', source: '\\b(AIza[\\w-]{35})(?:[\\x60\'"\\s;]|\\\\[nr]|$)' },
  {
    id: 'azure-ad-client-secret',
    source:
      '(?:^|[\\\\\'"\\x60\\s>=:(,)])([a-zA-Z0-9_~.]{3}\\dQ~[a-zA-Z0-9_~.-]{31,34})(?:$|[\\\\\'"\\x60\\s<),])'
  },
  { id: 'digitalocean-pat', source: '\\b(dop_v1_[a-f0-9]{64})(?:[\\x60\'"\\s;]|\\\\[nr]|$)' },
  {
    id: 'digitalocean-access-token',
    source: '\\b(doo_v1_[a-f0-9]{64})(?:[\\x60\'"\\s;]|\\\\[nr]|$)'
  },

  // — AI APIs —
  {
    id: 'anthropic-api-key',
    source: `\\b(${ANT_KEY_PFX}03-[a-zA-Z0-9_\\-]{93}AA)(?:[\\x60'"\\s;]|\\\\[nr]|$)`
  },
  {
    id: 'anthropic-admin-api-key',
    source: '\\b(sk-ant-admin01-[a-zA-Z0-9_\\-]{93}AA)(?:[\\x60\'"\\s;]|\\\\[nr]|$)'
  },
  {
    id: 'openai-api-key',
    source:
      '\\b(sk-(?:proj|svcacct|admin)-(?:[A-Za-z0-9_-]{74}|[A-Za-z0-9_-]{58})T3BlbkFJ(?:[A-Za-z0-9_-]{74}|[A-Za-z0-9_-]{58})\\b|sk-[a-zA-Z0-9]{20}T3BlbkFJ[a-zA-Z0-9]{20})(?:[\\x60\'"\\s;]|\\\\[nr]|$)'
  },
  { id: 'huggingface-access-token', source: '\\b(hf_[a-zA-Z]{34})(?:[\\x60\'"\\s;]|\\\\[nr]|$)' },

  // — 版本控制 —
  { id: 'github-pat', source: 'ghp_[0-9a-zA-Z]{36}' },
  { id: 'github-fine-grained-pat', source: 'github_pat_\\w{82}' },
  { id: 'github-app-token', source: '(?:ghu|ghs)_[0-9a-zA-Z]{36}' },
  { id: 'github-oauth', source: 'gho_[0-9a-zA-Z]{36}' },
  { id: 'github-refresh-token', source: 'ghr_[0-9a-zA-Z]{36}' },
  { id: 'gitlab-pat', source: 'glpat-[\\w-]{20}' },
  { id: 'gitlab-deploy-token', source: 'gldt-[0-9a-zA-Z_\\-]{20}' },

  // — 通讯 —
  { id: 'slack-bot-token', source: 'xoxb-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*' },
  { id: 'slack-user-token', source: 'xox[pe](?:-[0-9]{10,13}){3}-[a-zA-Z0-9-]{28,34}' },
  { id: 'slack-app-token', source: 'xapp-\\d-[A-Z0-9]+-\\d+-[a-z0-9]+', flags: 'i' },
  { id: 'twilio-api-key', source: 'SK[0-9a-fA-F]{32}' },
  {
    id: 'sendgrid-api-token',
    source: '\\b(SG\\.[a-zA-Z0-9=_\\-.]{66})(?:[\\x60\'"\\s;]|\\\\[nr]|$)'
  },

  // — 开发者工具 —
  { id: 'npm-access-token', source: '\\b(npm_[a-zA-Z0-9]{36})(?:[\\x60\'"\\s;]|\\\\[nr]|$)' },
  { id: 'pypi-upload-token', source: 'pypi-AgEIcHlwaS5vcmc[\\w-]{50,1000}' },
  {
    id: 'databricks-api-token',
    source: '\\b(dapi[a-f0-9]{32}(?:-\\d)?)(?:[\\x60\'"\\s;]|\\\\[nr]|$)'
  },
  { id: 'hashicorp-tf-api-token', source: '[a-zA-Z0-9]{14}\\.atlasv1\\.[a-zA-Z0-9\\-_=]{60,70}' },
  { id: 'pulumi-api-token', source: '\\b(pul-[a-f0-9]{40})(?:[\\x60\'"\\s;]|\\\\[nr]|$)' },
  {
    id: 'postman-api-token',
    source: '\\b(PMAK-[a-fA-F0-9]{24}-[a-fA-F0-9]{34})(?:[\\x60\'"\\s;]|\\\\[nr]|$)'
  },

  // — 可观测性 —
  {
    id: 'grafana-api-key',
    source: '\\b(eyJrIjoi[A-Za-z0-9+/]{70,400}={0,3})(?:[\\x60\'"\\s;]|\\\\[nr]|$)'
  },
  {
    id: 'grafana-cloud-api-token',
    source: '\\b(glc_[A-Za-z0-9+/]{32,400}={0,3})(?:[\\x60\'"\\s;]|\\\\[nr]|$)'
  },
  {
    id: 'grafana-service-account-token',
    source: '\\b(glsa_[A-Za-z0-9]{32}_[A-Fa-f0-9]{8})(?:[\\x60\'"\\s;]|\\\\[nr]|$)'
  },
  { id: 'sentry-user-token', source: '\\b(sntryu_[a-f0-9]{64})(?:[\\x60\'"\\s;]|\\\\[nr]|$)' }
];

// ============================================================
// 编译缓存
// ============================================================

let compiledRules: ReadonlyArray<{ id: string; regex: RegExp }> | null = null;

function getCompiledRules(): ReadonlyArray<{ id: string; regex: RegExp }> {
  if (!compiledRules) {
    compiledRules = SECRET_RULES.map(r => ({ id: r.id, regex: new RegExp(r.source, r.flags) }));
  }
  return compiledRules;
}

// ============================================================
// 标签
// ============================================================

/** 把 kebab-case rule id 转成人类可读 label（如 "github-pat" -> "Github Pat"） */
export function ruleIdToLabel(ruleId: string): string {
  return ruleId
    .split('-')
    .map(seg => (seg.length > 0 ? seg[0]!.toUpperCase() + seg.slice(1) : seg))
    .join(' ');
}

// ============================================================
// 主扫描函数
// ============================================================

/**
 * 扫描内容查找 secret，返回所有命中的规则
 *
 * @param content 待扫描的文本
 * @returns 命中的 SecretMatch 列表（每个 rule 至多一个 match，避免重复）
 */
export function scanForSecrets(content: string): readonly SecretMatch[] {
  const rules = getCompiledRules();
  const matches: SecretMatch[] = [];
  const seen = new Set<string>();

  for (const { id, regex } of rules) {
    if (seen.has(id)) continue;
    if (regex.test(content)) {
      seen.add(id);
      matches.push({ ruleId: id, label: ruleIdToLabel(id) });
    }
  }

  return matches;
}

/** 是否存在任意 secret（性能优化版本，命中第一个即返回） */
export function hasAnySecret(content: string): boolean {
  const rules = getCompiledRules();
  for (const { regex } of rules) {
    if (regex.test(content)) return true;
  }
  return false;
}

/** 仅返回内置规则数量（测试用） */
export function getSecretRuleCount(): number {
  return SECRET_RULES.length;
}
