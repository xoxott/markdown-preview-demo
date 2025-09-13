import { Presets, SingleBar } from 'cli-progress';
import { createOptions } from './options';
import { getCurrentGitBranch, getFromToTags, getGitCommits, getGitCommitsAndResolvedAuthors } from './git';
import { generateMarkdown, isVersionInMarkdown, writeMarkdown } from './markdown';
import type { ChangelogOption } from './types';

/**
 * 根据两个 Git 标签（或提交区间）生成对应的 changelog Markdown 文本
 *
 * @param options changelog 配置项（部分字段可覆盖默认配置）
 * @param showTitle 是否在生成的 markdown 中包含标题
 *
 * @returns 包含以下内容的对象：
 * - `markdown`: 生成的 changelog 文本
 * - `commits`: 提交记录列表
 * - `options`: 最终合并的配置项
 */
export async function getChangelogMarkdown(options?: Partial<ChangelogOption>, showTitle = true) {
  const opts = await createOptions(options);

  const current = await getCurrentGitBranch();
  const to = opts.tags.includes(opts.to) ? opts.to : current;

  const gitCommits = await getGitCommits(opts.from, to);
  const resolvedLogins = new Map<string, string>();
  const { commits, contributors } = await getGitCommitsAndResolvedAuthors(gitCommits, opts.github, resolvedLogins);

  const markdown = generateMarkdown({ commits, options: opts, showTitle, contributors });

  return {
    markdown,
    commits,
    options: opts
  };
}

/**
 * 根据所有 Git 标签区间，生成完整的 changelog Markdown 文本
 *
 * @param options changelog 配置项（部分字段可覆盖默认配置）
 * @param showProgress 是否显示进度条（默认显示）
 *
 * @returns 拼接好的完整 changelog 文本
 */
export async function getTotalChangelogMarkdown(options?: Partial<ChangelogOption>, showProgress = true) {
  const opts = await createOptions(options);

  let bar: SingleBar | null = null;
  if (showProgress) {
    bar = new SingleBar(
      { format: 'generate total changelog: [{bar}] {percentage}% | ETA: {eta}s | {value}/{total}' },
      Presets.shades_classic
    );
  }

  const tags = getFromToTags(opts.tags);

  if (tags.length === 0) {
    const { markdown } = await getChangelogMarkdown(opts);
    return markdown;
  }

  bar?.start(tags.length, 0);

  let markdown = '';
  const resolvedLogins = new Map<string, string>();

  for await (const [index, tag] of tags.entries()) {
    const { from, to } = tag;
    const gitCommits = await getGitCommits(from, to);
    const { commits, contributors } = await getGitCommitsAndResolvedAuthors(gitCommits, opts.github, resolvedLogins);

    const nextMd = generateMarkdown({ commits, options: { ...opts, from, to }, showTitle: true, contributors });

    markdown = `${nextMd}\n\n${markdown}`;

    bar?.update(index + 1);
  }

  bar?.stop();

  return markdown;
}

/**
 * 根据两个 Git 标签区间，生成 changelog 文件（如 `CHANGELOG.md`）
 *
 * @param options changelog 配置项（部分字段可覆盖默认配置）
 *
 * @description
 * - 如果目标 changelog 文件中已存在该版本的内容，且未开启 `regenerate`，则不会重复生成。
 * - 否则会写入或覆盖 changelog。
 */
export async function generateChangelog(options?: Partial<ChangelogOption>) {
  const opts = await createOptions(options);

  const existContent = await isVersionInMarkdown(opts.to, opts.output);

  if (!opts.regenerate && existContent) return;

  const { markdown } = await getChangelogMarkdown(opts);

  await writeMarkdown(markdown, opts.output, opts.regenerate);
}

/**
 * 根据所有 Git 标签区间，生成完整的 changelog 文件（覆盖写入）
 *
 * @param options changelog 配置项（部分字段可覆盖默认配置）
 * @param showProgress 是否显示进度条（默认显示）
 *
 * @description
 * - 会生成包含所有版本记录的完整 changelog
 * - 结果会写入指定的输出文件（默认是 `CHANGELOG.md`）
 * - 与 `generateChangelog` 不同的是，该函数会强制覆盖写入所有版本内容
 */
export async function generateTotalChangelog(options?: Partial<ChangelogOption>, showProgress = true) {
  const opts = await createOptions(options);

  const markdown = await getTotalChangelogMarkdown(opts, showProgress);

  await writeMarkdown(markdown, opts.output, true);
}

export type { ChangelogOption };
