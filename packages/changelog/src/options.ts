import process from 'node:process';
import { readFile } from 'node:fs/promises';
import {
  getFirstGitCommit,
  getGitHubRepo,
  getTagDateMap,
  getTotalGitTags,
  isPrerelease
} from './git';
import type { ChangelogOption } from './types';

/**
 * 创建默认的 Changelog 配置选项
 *
 * @returns 默认的 ChangelogOption 对象
 */
function createDefaultOptions() {
  const cwd = process.cwd();

  const options: ChangelogOption = {
    cwd,
    types: {
      feat: '🚀 Features',
      fix: '🐞 Bug Fixes',
      perf: '🔥 Performance',
      optimize: '🛠 Optimizations',
      refactor: '💅 Refactors',
      docs: '📖 Documentation',
      build: '📦 Build',
      types: '🌊 Types',
      chore: '🏡 Chore',
      examples: '🏀 Examples',
      test: '✅ Tests',
      style: '🎨 Styles',
      ci: '🤖 CI'
    },
    github: {
      repo: '',
      token: process.env.GITHUB_TOKEN || ''
    },
    from: '',
    to: '',
    tags: [],
    tagDateMap: new Map(),
    capitalize: false,
    emoji: true,
    titles: {
      breakingChanges: '🚨 Breaking Changes'
    },
    output: 'CHANGELOG.md',
    regenerate: false
  };

  return options;
}

/**
 * 从 package.json 中获取当前版本号
 *
 * @param cwd 当前项目路径
 * @returns 包含 newVersion 的对象
 */
async function getVersionFromPkgJson(cwd: string) {
  let newVersion = '';

  try {
    const pkgJson = await readFile(`${cwd}/package.json`, 'utf-8');
    const pkg = JSON.parse(pkgJson);
    newVersion = pkg?.version || '';
  } catch {}

  return {
    newVersion
  };
}

/**
 * 创建完整的 Changelog 配置选项，包括 GitHub 仓库信息、Git 标签范围等
 *
 * @param options 可选的自定义配置，会覆盖默认配置
 * @returns 完整的 ChangelogOption 对象
 */
export async function createOptions(options?: Partial<ChangelogOption>) {
  // 初始化默认配置
  const opts = createDefaultOptions();
  // 合并用户传入的自定义配置
  Object.assign(opts, options);
  // 获取当前项目版本号
  const { newVersion } = await getVersionFromPkgJson(opts.cwd);
  // 获取 GitHub 仓库信息，如果未指定则自动获取
  opts.github.repo ||= await getGitHubRepo();
  // 获取所有 Git 标签
  const tags = await getTotalGitTags();
  opts.tags = tags;

  // 设置 Changelog 范围，默认从上一个标签到当前版本
  opts.from ||= tags[tags.length - 1];
  opts.to ||= `v${newVersion}`;

  // 如果 from 和 to 相同，则回退到上一个标签
  if (opts.to === opts.from) {
    const lastTag = tags[tags.length - 2];
    const firstCommit = await getFirstGitCommit();
    opts.from = lastTag || firstCommit;
  }

  // 获取每个标签的提交日期
  opts.tagDateMap = await getTagDateMap();
  // 判断是否为预发布版本
  opts.prerelease ||= isPrerelease(opts.to);
  const isFromPrerelease = isPrerelease(opts.from);

  // 如果当前版本不是预发布版本，但 from 是预发布版本，则调整 from 为最近的正式版本
  if (!isPrerelease(newVersion) && isFromPrerelease) {
    const allReleaseTags = opts.tags.filter(tag => !isPrerelease(tag) && tag !== opts.to);

    opts.from = allReleaseTags[allReleaseTags.length - 1];
  }

  return opts;
}
