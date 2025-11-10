import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import dayjs from 'dayjs';
import { convert } from 'convert-gitmoji';
import { capitalize, groupBy, join, partition } from './shared';
import { VERSION_REG_OF_MARKDOWN, VERSION_WITH_RELEASE } from './constant';
import type { ChangelogOption, GitCommit, Reference, ResolvedAuthor } from './types';

/**
 * 格式化 commit 中的引用（issues 或 hash），生成对应的 Markdown 链接
 *
 * @param references Git 提交中的引用信息
 * @param githubRepo 仓库名，例如 "user/repo"
 * @param type 'issues' | 'hash'
 * @returns Markdown 格式的引用字符串
 */
function formatReferences(references: Reference[], githubRepo: string, type: 'issues' | 'hash'): string {
  const refs = references
    .filter(i => {
      if (type === 'issues') return i.type === 'issue' || i.type === 'pull-request';
      return i.type === 'hash';
    })
    .map(ref => {
      if (!githubRepo) return ref.value;
      if (ref.type === 'pull-request' || ref.type === 'issue')
        return `https://github.com/${githubRepo}/issues/${ref.value.slice(1)}`;
      return `[<samp>(${ref.value.slice(0, 5)})</samp>](https://github.com/${githubRepo}/commit/${ref.value})`;
    });

  const referencesString = join(refs).trim();

  if (type === 'issues') return referencesString && `in ${referencesString}`;
  return referencesString;
}

/**
 * 格式化单个 commit 的描述和作者引用信息
 *
 * @param commit GitCommit 对象
 * @param options Changelog 配置
 * @returns Markdown 格式的 commit 行
 */
function formatLine(commit: GitCommit, options: ChangelogOption) {
  const prRefs = formatReferences(commit.references, options.github.repo, 'issues');
  const hashRefs = formatReferences(commit.references, options.github.repo, 'hash');

  let authors = join([...new Set(commit.resolvedAuthors.map(i => (i.login ? `@${i.login}` : `**${i.name}**`)))]).trim();

  if (authors) {
    authors = `by ${authors}`;
  }

  let refs = [authors, prRefs, hashRefs].filter(i => i?.trim()).join(' ');

  if (refs) {
    refs = `&nbsp;-&nbsp; ${refs}`;
  }

  const description = options.capitalize ? capitalize(commit.description) : commit.description;

  return [description, refs].filter(i => i?.trim()).join(' ');
}

/**
 * 格式化章节标题
 *
 * @param name 章节名
 * @param options Changelog 配置
 * @returns Markdown 标题
 */
function formatTitle(name: string, options: ChangelogOption) {
  const emojisRE =
    /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g;

  let formatName = name.trim();

  if (!options.emoji) {
    formatName = name.replace(emojisRE, '').trim();
  }

  return `### &nbsp;&nbsp;&nbsp;${formatName}`;
}

/**
 * 格式化一个 commit 类型的章节
 *
 * @param commits GitCommit 数组
 * @param sectionName 章节名称
 * @param options Changelog 配置
 * @returns Markdown 行数组
 */
function formatSection(commits: GitCommit[], sectionName: string, options: ChangelogOption) {
  if (!commits.length) return [];

  const lines: string[] = ['', formatTitle(sectionName, options), ''];

  const scopes = groupBy(commits, 'scope');

  let useScopeGroup = true;

  // group scopes only when one of the scope have multiple commits
  if (!Object.entries(scopes).some(([k, v]) => k && v.length > 1)) {
    useScopeGroup = false;
  }

  Object.keys(scopes)
    .sort()
    .forEach(scope => {
      let padding = '';
      let prefix = '';
      const scopeText = `**${scope}**`;
      if (scope && useScopeGroup) {
        lines.push(`- ${scopeText}:`);
        padding = '  ';
      } else if (scope) {
        prefix = `${scopeText}: `;
      }

      lines.push(...scopes[scope].reverse().map(commit => `${padding}- ${prefix}${formatLine(commit, options)}`));
    });

  return lines;
}

/**
 * 获取用户的 GitHub 链接
 *
 * @param userName GitHub 用户名
 */
function getUserGithub(userName: string) {
  const githubUrl = `https://github.com/${userName}`;

  return githubUrl;
}

/**
 * 获取用户头像链接
 *
 * @param userName GitHub 用户名
 */
function getGitUserAvatar(userName: string) {
  const githubUrl = getUserGithub(userName);

  const avatarUrl = `${githubUrl}.png?size=48`;

  return avatarUrl;
}

/**
 * 生成贡献者 Markdown 行
 *
 * @param contributors 贡献者列表
 * @returns Markdown 字符串
 */
function createContributorLine(contributors: ResolvedAuthor[]) {
  let loginLine = '';
  let unLoginLine = '';

  const contributorMap = new Map<string, ResolvedAuthor>();
  contributors.forEach(contributor => {
    contributorMap.set(contributor.email, contributor);
  });

  const filteredContributors = Array.from(contributorMap.values());

  filteredContributors.forEach((contributor, index) => {
    const { name, email, login } = contributor;

    if (!login) {
      let line = `[${name}](mailto:${email})`;

      if (index < contributors.length - 1) {
        line += ',&nbsp;';
      }

      unLoginLine += line;
    } else {
      const githubUrl = getUserGithub(login);
      const avatar = getGitUserAvatar(login);
      loginLine += `[![${login}](${avatar})](${githubUrl})&nbsp;&nbsp;`;
    }
  });

  return `${loginLine}\n${unLoginLine}`;
}

/**
 * 根据 commits 和配置信息生成完整 Markdown changelog
 *
 * @param params.commits Git 提交数组
 * @param params.options Changelog 配置
 * @param params.showTitle 是否显示版本标题
 * @param params.contributors 贡献者列表
 * @returns Markdown 字符串
 */
export function generateMarkdown(params: {
  commits: GitCommit[];
  options: ChangelogOption;
  showTitle: boolean;
  contributors: ResolvedAuthor[];
}) {
  const { options, showTitle, contributors } = params;

  // filter commits means that release version
  const commits = params.commits.filter(commit => commit.description.match(VERSION_WITH_RELEASE) === null);

  const lines: string[] = [];

  const url = `https://github.com/${options.github.repo}/compare/${options.from}...${options.to}`;

  if (showTitle) {
    const date = options.tagDateMap.get(options.to) || dayjs().format('YYYY-MM-DD');

    let title = `## [${options.to}](${url})`;

    if (date) {
      title += ` (${date})`;
    }

    lines.push(title);
  }

  const [breaking, changes] = partition(commits, c => c.isBreaking);

  const group = groupBy(changes, 'type');

  lines.push(...formatSection(breaking, options.titles.breakingChanges, options));

  for (const type of Object.keys(options.types)) {
    const items = group[type] || [];
    lines.push(...formatSection(items, options.types[type], options));
  }

  if (!lines.length) {
    lines.push('*No significant changes*');
  }

  if (!showTitle) {
    lines.push('', `##### &nbsp;&nbsp;&nbsp;&nbsp;[View changes on GitHub](${url})`);
  }

  if (showTitle) {
    lines.push('', '### &nbsp;&nbsp;&nbsp;❤️ Contributors', '');

    const contributorLine = createContributorLine(contributors);

    lines.push(contributorLine);
  }

  const md = convert(lines.join('\n').trim(), true);

  return md;
}

/**
 * 判断指定版本是否已经存在于 changelog Markdown 文件中
 *
 * @param newVersion 新版本号
 * @param mdPath changelog 文件路径
 * @returns true 已存在，false 不存在
 */
export async function isVersionInMarkdown(newVersion: string, mdPath: string) {
  let isIn = false;

  let md = '';
  try {
    md = await readFile(mdPath, 'utf8');
  } catch {}

  if (md) {
    const matches = md.match(VERSION_REG_OF_MARKDOWN);

    if (matches?.length) {
      const versionInMarkdown = `## [${newVersion}]`;

      isIn = matches.includes(versionInMarkdown);
    }
  }

  return isIn;
}

/**
 * 写入或更新 changelog Markdown 文件
 *
 * @param md 生成的 Markdown 内容
 * @param mdPath changelog 文件路径
 * @param regenerate 是否重新生成（覆盖原有内容）
 */
export async function writeMarkdown(md: string, mdPath: string, regenerate = false) {
  let changelogMD: string = '';

  const changelogPrefix = '# Changelog';

  if (!existsSync(mdPath)) {
    await writeFile(mdPath, `${changelogPrefix}\n\n`, 'utf8');
  }

  if (!regenerate) {
    changelogMD = await readFile(mdPath, 'utf8');
  }

  if (!changelogMD.startsWith(changelogPrefix)) {
    changelogMD = `${changelogPrefix}\n\n${changelogMD}`;
  }

  const lastEntry = changelogMD.match(/^###?\s+.*$/m);

  if (lastEntry) {
    changelogMD = `${changelogMD.slice(0, lastEntry.index) + md}\n\n${changelogMD.slice(lastEntry.index)}`;
  } else {
    changelogMD += `\n${md}\n\n`;
  }

  await writeFile(mdPath, changelogMD);
}
