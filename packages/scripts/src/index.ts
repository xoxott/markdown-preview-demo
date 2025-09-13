import cac from 'cac'; // CLI 框架，用于快速定义命令行工具
import { blue, lightGreen } from 'kolorist'; // 彩色输出工具，CLI提示更美观
import { version } from '../package.json'; // 项目版本号
import { cleanup, genChangelog, generateRoute, gitCommit, gitCommitVerify, release, updatePkg } from './commands';
import { loadCliOptions } from './config'; // CLI 配置
import type { Lang } from './locales';

// 定义 CLI 支持的命令类型
type Command = 'cleanup' | 'update-pkg' | 'git-commit' | 'git-commit-verify' | 'changelog' | 'release' | 'gen-route';

// 命令执行函数类型，支持异步或同步
type CommandAction<A extends object> = (args?: A) => Promise<void> | void;

// 命令集合类型，记录每个命令的描述和执行函数
type CommandWithAction<A extends object = object> = Record<Command, { desc: string; action: CommandAction<A> }>;

// CLI 命令参数类型
interface CommandArg {
  /** 在版本更新后、提交前执行的额外命令，默认 'pnpm sa changelog' */
  execute?: string;
  /** 是否推送 git commit 和 tag，默认 true */
  push?: boolean;
  /** 是否根据所有标签生成 changelog */
  total?: boolean;
  /** 指定清理目录的 glob 模式 */
  cleanupDir?: string;
 /** CLI 显示语言 */
  lang?: Lang;
}

export async function setupCli() {
   // 加载 CLI 配置，例如忽略文件、changelog 配置等
  const cliOptions = await loadCliOptions();
  
   // 初始化 CLI 实例，指定工具名和颜色
  const cli = cac(blue('soybean-admin'));

  // 设置 CLI 全局版本和选项
  cli
    .version(lightGreen(version)) // 显示当前项目版本
    .option(
      '-e, --execute [command]',
      "在版本更新后、提交前执行额外命令，默认 'npx soy changelog'"
    )
    .option('-p, --push', '是否推送 git commit 和 tag')
    .option('-t, --total', '是否根据所有标签生成 changelog')
    .option(
      '-c, --cleanupDir <dir>',
      '指定清理目录的 glob 模式，多个用 , 分隔'
    )
    .option('-l, --lang <lang>', 'CLI 显示语言', { default: 'en-us', type: [String] })
    .help(); // 自动生成帮助命令

    // 定义 CLI 支持的命令及其执行逻辑
  const commands: CommandWithAction<CommandArg> = {
    cleanup: {
      desc: '删除目录,例如: node_modules, dist, etc 等',
      action: async () => {
        await cleanup(cliOptions.cleanupDirs);
      }
    },
    'update-pkg': {
      desc: '更新 package.json 的依赖版本',
      action: async () => {
        await updatePkg(cliOptions.ncuCommandArgs);
      }
    },
    'git-commit': {
      desc: '生成 git commit,符合 Conventional Commits 规范',
      action: async args => {
        await gitCommit(args?.lang);
      }
    },
    'git-commit-verify': {
      desc: '校验 git commit 消息是否符合规范',
      action: async args => {
        await gitCommitVerify(args?.lang, cliOptions.gitCommitVerifyIgnores);
      }
    },
    changelog: {
      desc: '生成 changelog',
      action: async args => {
        await genChangelog(cliOptions.changelogOptions, args?.total);
      }
    },
    release: {
      desc: '发布版本: 更新版本号、生成 changelog、提交代码',
      action: async args => {
        await release(args?.execute, args?.push);
      }
    },
    'gen-route': {
      desc: '自动生成 路由文件',
      action: async () => {
        await generateRoute();
      }
    }
  };
  // 循环注册命令到 CLI
  for (const [command, { desc, action }] of Object.entries(commands)) {
    cli.command(command, lightGreen(desc)).action(action);
  }
  // 解析命令行参数并执行对应命令
  cli.parse();
}

setupCli();
