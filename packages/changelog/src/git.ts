import dayjs from 'dayjs';
import { ofetch } from 'ofetch';
import { consola } from 'consola';
import semver from 'semver';
import { execCommand, notNullish } from './shared';
import { VERSION_REG } from './constant';
import type { GitCommit, GitCommitAuthor, GithubConfig, RawGitCommit, Reference, ResolvedAuthor } from './types';

/**
 * 获取所有符合语义化版本的 git 标签，并进行排序
 *
 * @returns {Promise<string[]>} 按 semver 升序排序后的标签列表
 */
export async function getTotalGitTags() {
  const tagStr = await execCommand('git', ['--no-pager', 'tag', '-l', '--sort=v:refname']);

  const tags = tagStr.split('\n');

  const filtered = tags.filter(tag => VERSION_REG.test(tag));

  return semver.sort(filtered);
}

/**
 * 获取每个 git tag 对应的日期映射表
 *
 * @returns {Promise<Map<string, string>>} Map<标签名, 日期字符串(YYYY-MM-DD)>
 */
export async function getTagDateMap() {
  const tagDateStr = await execCommand('git', [
    '--no-pager',
    'log',
    '--tags',
    '--simplify-by-decoration',
    '--pretty=format:%ci %d'
  ]);

  const TAG_MARK = 'tag: ';

  const map = new Map<string, string>();

  const dates = tagDateStr.split('\n').filter(item => item.includes(TAG_MARK));

  dates.forEach(item => {
    const [dateStr, tagStr] = item.split(TAG_MARK);

    const date = dayjs(dateStr).format('YYYY-MM-DD');

    const tag = tagStr.match(VERSION_REG)?.[0];
    if (tag && date) {
      map.set(tag.trim(), date);
    }
  });

  return map;
}

/**
 * 生成版本之间的 from-to 区间，用于生成 CHANGELOG 对比范围
 *
 * @param tags git 标签列表
 * @returns {Array<{ from: string; to: string }>} 版本区间对
 */
export function getFromToTags(tags: string[]) {
  const result: { from: string; to: string }[] = [];

  if (tags.length < 2) {
    return result;
  }

  const releaseTags = tags.filter(tag => !isPrerelease(tag));

  const reversedTags = [...tags].reverse();

  reversedTags.forEach((tag, index) => {
    if (index < reversedTags.length - 1) {
      const to = tag;

      let from = reversedTags[index + 1];

      if (!isPrerelease(to)) {
        const toIndex = releaseTags.indexOf(to);

        from = releaseTags[toIndex - 1];
      }

      result.push({ from, to });
    }
  });

  return result.reverse();
}

/**
 * 获取当前分支名
 *
 * @returns {Promise<string>} 当前分支名
 */
async function getGitMainBranchName() {
  const main = await execCommand('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
  return main;
}


/**
 * 获取当前 Git 指针位置：若有 tag 返回 tag，否则返回分支名
 *
 * @returns {Promise<string>} 当前 tag 或分支名
 */
export async function getCurrentGitBranch() {
  const tag = await execCommand('git', ['tag', '--points-at', 'HEAD']);
  const main = getGitMainBranchName();

  return tag || main;
}

/**
 * 获取 GitHub 仓库名称 (格式: owner/repo)
 *
 * @throws 当无法从 remote.origin.url 解析时抛出异常
 * @returns {Promise<string>} 仓库名称字符串
 */
export async function getGitHubRepo() {
  const url = await execCommand('git', ['config', '--get', 'remote.origin.url']);
  const match = url.match(/github\.com[/:]([\w\d._-]+?)\/([\w\d._-]+?)(\.git)?$/i);
  if (!match) {
    throw new Error(`Can not parse GitHub repo from url ${url}`);
  }
  return `${match[1]}/${match[2]}`;
}

/**
 * 判断是否为预发布版本
 *
 * @param version 版本号
 * @returns {boolean} 是否为 pre-release 版本
 */
export function isPrerelease(version: string) {
  const REG = /^[^.]*[\d.]+$/;

  return !REG.test(version);
}

/**
 * 获取第一个 git 提交记录（commit hash）
 *
 * @returns {Promise<string>} 第一个提交的 hash
 */
export function getFirstGitCommit() {
  return execCommand('git', ['rev-list', '--max-parents=0', 'HEAD']);
}

/**
 * 获取 git 提交差异区间的原始提交信息
 *
 * @param from 起始提交/标签
 * @param to 结束提交/标签，默认为 HEAD
 * @returns {Promise<RawGitCommit[]>} 原始提交数据列表
 */
async function getGitDiff(from?: string, to = 'HEAD'): Promise<RawGitCommit[]> {
  // https://git-scm.com/docs/pretty-formats
  const rawGit = await execCommand('git', [
    '--no-pager',
    'log',
    `${from ? `${from}...` : ''}${to}`,
    '--pretty="----%n%s|%h|%an|%ae%n%b"',
    '--name-status'
  ]);

  const rwaGitLines = rawGit.split('----\n').splice(1);

  const gitCommits = rwaGitLines.map(line => {
    const [firstLine, ...body] = line.split('\n');
    const [message, shortHash, authorName, authorEmail] = firstLine.split('|');
    const gitCommit: RawGitCommit = {
      message,
      shortHash,
      author: { name: authorName, email: authorEmail },
      body: body.join('\n')
    };
    return gitCommit;
  });

  return gitCommits;
}

/**
 * 解析单条提交信息，符合 Conventional Commit 格式时返回结构化结果
 *
 * @param commit 原始提交数据
 * @returns {GitCommit | null} 解析结果或 null
 */
function parseGitCommit(commit: RawGitCommit): GitCommit | null {
  // https://www.conventionalcommits.org/en/v1.0.0/
  // https://regex101.com/r/FSfNvA/1
  const ConventionalCommitRegex = /(?<type>[a-z]+)(\((?<scope>.+)\))?(?<breaking>!)?: (?<description>.+)/i;
  const CoAuthoredByRegex = /co-authored-by:\s*(?<name>.+)(<(?<email>.+)>)/gim;
  const PullRequestRE = /\([a-z]*(#\d+)\s*\)/gm;
  const IssueRE = /(#\d+)/gm;

  const match = commit.message.match(ConventionalCommitRegex);

  if (!match?.groups) {
    return null;
  }

  const type = match.groups.type;

  const scope = match.groups.scope || '';

  const isBreaking = Boolean(match.groups.breaking);
  let description = match.groups.description;

   // 引用信息
  const references: Reference[] = [];
  for (const m of description.matchAll(PullRequestRE)) {
    references.push({ type: 'pull-request', value: m[1] });
  }
  for (const m of description.matchAll(IssueRE)) {
    if (!references.some(i => i.value === m[1])) {
      references.push({ type: 'issue', value: m[1] });
    }
  }
  references.push({ value: commit.shortHash, type: 'hash' });
  description = description.replace(PullRequestRE, '').trim();

 // 作者信息
  const authors: GitCommitAuthor[] = [commit.author];

  const matches = commit.body.matchAll(CoAuthoredByRegex);

  for (const $match of matches) {
    const { name = '', email = '' } = $match.groups || {};

    const author: GitCommitAuthor = {
      name: name.trim(),
      email: email.trim()
    };

    authors.push(author);
  }

  return {
    ...commit,
    authors,
    resolvedAuthors: [],
    description,
    type,
    scope,
    references,
    isBreaking
  };
}


/**
 * 获取解析后的 git 提交记录
 *
 * @param from 起始提交/标签
 * @param to 结束提交/标签，默认为 HEAD
 * @returns {Promise<GitCommit[]>} 解析后的提交数据
 */
export async function getGitCommits(from?: string, to = 'HEAD') {
  const rwaGitCommits = await getGitDiff(from, to);
  const commits = rwaGitCommits.map(commit => parseGitCommit(commit)).filter(notNullish);

  return commits;
}

/**
 * 根据 GitHub token 生成请求 headers
 */
function getHeaders(githubToken: string) {
  return {
    accept: 'application/vnd.github.v3+json',
    authorization: `token ${githubToken}`
  };
}

/**
 * 通过 email 和提交 hash，尝试解析 GitHub 用户 login
 *
 * @param github GitHub 配置信息
 * @param commitHashes 提交 hash 列表
 * @param email 作者邮箱
 * @returns {Promise<string>} GitHub login 或空字符串
 */
async function getResolvedAuthorLogin(github: GithubConfig, commitHashes: string[], email: string) {
  let login = '';

  try {
    const data = await ofetch(`https://ungh.cc/users/find/${email}`);
    login = data?.user?.username || '';
  } catch (e) {
    consola.log('e: ', e);
  }

  if (login) {
    return login;
  }

  const { repo, token } = github;

  // token not provided, skip github resolving
  if (!token) {
    return login;
  }

  if (commitHashes.length) {
    try {
      const data = await ofetch(`https://api.github.com/repos/${repo}/commits/${commitHashes[0]}`, {
        headers: getHeaders(token)
      });
      login = data?.author?.login || '';
    } catch (e) {
      consola.log('e: ', e);
    }
  }

  if (login) {
    return login;
  }

  try {
    const data = await ofetch(`https://api.github.com/search/users?q=${encodeURIComponent(email)}`, {
      headers: getHeaders(token)
    });
    login = data.items[0].login;
  } catch (e) {
    consola.log('e: ', e);
  }

  return login;
}


/**
 * 获取解析后的提交及贡献者信息
 *
 * @param commits 已解析的提交列表
 * @param github GitHub 配置
 * @param resolvedLogins 已缓存的邮箱-login 映射（可选）
 * @returns {Promise<{ commits: GitCommit[]; contributors: ResolvedAuthor[] }>}
 */
export async function getGitCommitsAndResolvedAuthors(
  commits: GitCommit[],
  github: GithubConfig,
  resolvedLogins?: Map<string, string>
) {
  const resultCommits: GitCommit[] = [];

  const map = new Map<string, ResolvedAuthor>();

  for await (const commit of commits) {
    const resolvedAuthors: ResolvedAuthor[] = [];

    for await (const [index, author] of commit.authors.entries()) {
      const { email, name } = author;

      if (email && name) {
        const commitHashes: string[] = [];

        if (index === 0) {
          commitHashes.push(commit.shortHash);
        }

        const resolvedAuthor: ResolvedAuthor = {
          name,
          email,
          commits: commitHashes,
          login: ''
        };

        if (!resolvedLogins?.has(email)) {
          const login = await getResolvedAuthorLogin(github, commitHashes, email);
          resolvedAuthor.login = login;

          resolvedLogins?.set(email, login);
        } else {
          const login = resolvedLogins?.get(email) || '';
          resolvedAuthor.login = login;
        }

        resolvedAuthors.push(resolvedAuthor);

        if (!map.has(email)) {
          map.set(email, resolvedAuthor);
        }
      }
    }

    const resultCommit = { ...commit, resolvedAuthors };

    resultCommits.push(resultCommit);
  }

  return {
    commits: resultCommits,
    contributors: Array.from(map.values())
  };
}