#!/usr/bin/env node
/**
 * GitHublogen CLI 工具
 *
 * 该工具基于 @soybeanjs/changelog 自动生成 changelog，并推送到 GitHub Release。
 * 
 * 功能点：
 * - 获取当前仓库的提交记录并生成 Markdown 格式的 changelog。
 * - 检查目标 tag 是否已经存在于 GitHub。
 * - 若仓库为浅克隆（shallow clone），提示用户配置 fetch-depth: 0。
 * - 自动将 changelog 发布为 GitHub Release。
 */

import process from 'node:process';
import { getChangelogMarkdown } from '@soybeanjs/changelog';
import cac from 'cac';
import { consola } from 'consola';
import { blue, bold, cyan, dim, red, yellow } from 'kolorist';
import { version } from '../package.json';
import { hasTagOnGitHub, isRepoShallow, sendRelease } from './github';

/**
 * 初始化 CLI 命令行工具
 */
function setupCli() {
  // 使用 cac 创建命令行工具
  const cli = cac('githublogen');

  // 配置版本与全局选项
  cli.version(version).option('-t, --token <path>', 'GitHub Token').help();

  // 默认命令：生成 changelog 并发布到 GitHub Release
  cli.command('').action(async (args: any) => {
    try {
      // 当前工作目录
      const cwd = process.cwd();

      // 调用 changelog 生成函数，获取提交记录和 changelog 内容
      const { options, commits, markdown } = await getChangelogMarkdown(
        {
          cwd,
          ...args
        },
        false
      );

      // 输出 changelog 范围与提交数量
      consola.log(
        cyan(options.from) + dim(' -> ') + blue(options.to) + dim(` (${commits.length} commits)`)
      );

      // 检查目标 tag 是否存在于 GitHub，不存在则跳过发布
      if (!(await hasTagOnGitHub(options.to, options.github.repo, options.github.token))) {
        consola.error(
          yellow(`Current ref "${bold(options.to)}" is not available as tags on GitHub. Release skipped.`)
        );

        if (process.exitCode) {
          process.exitCode = 1;
        }
      }

      // 如果没有提交记录并且仓库为浅克隆，则提示用户调整 CI 配置
      if (!commits.length && (await isRepoShallow())) {
        consola.error(
          yellow(
            'The repo seems to be clone shallowly, which make changelog failed to generate. ' +
              'You might want to specify `fetch-depth: 0` in your CI config.'
          )
        );
        if (process.exitCode) {
          process.exitCode = 1;
        }
        return;
      }

      // 发布 GitHub Release
      await sendRelease(options, markdown);
    } catch (e: any) {
      // 捕获异常并打印详细错误信息
      consola.error(red(String(e)));
      if (e?.stack) {
        consola.error(dim(e.stack?.split('\n').slice(1).join('\n')));
      }

      process.exit(1);
    }
  });

  // 解析命令行参数
  cli.parse();
}

// 启动 CLI
setupCli();
