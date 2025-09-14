import type { ChangelogOption } from './types';
import { ofetch } from 'ofetch';
import { consola } from 'consola';
import { cyan, green, red, yellow } from 'kolorist';

/**
 * 构造 GitHub API 请求头
 * @param githubToken GitHub Token
 * @returns 包含认证和 Accept 类型的请求头
 */
function getHeaders(githubToken: string) {
  return {
    accept: 'application/vnd.github.v3+json',
    authorization: `token ${githubToken}`
  };
}

/**
 * 检查指定 tag 是否已经存在于 GitHub 仓库中
 * @param tag 标签名
 * @param repo 仓库全名（格式：owner/repo）
 * @param githubToken GitHub Token
 * @returns 存在返回 true，否则返回 false
 */
export async function hasTagOnGitHub(tag: string, repo: string, githubToken: string) {
  try {
    await ofetch(`https://api.github.com/repos/${repo}/git/ref/tags/${tag}`, {
      headers: getHeaders(githubToken)
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * 创建或更新 GitHub Release
 * 
 * - 如果 release 已存在，则更新内容
 * - 如果 release 不存在，则新建
 * 
 * @param options changelog 配置项，包含 GitHub 仓库信息、tag 等
 * @param content 生成的 changelog markdown 内容
 */
export async function sendRelease(options: ChangelogOption, content: string) {
  const headers = getHeaders(options.github.token!);
  const github = options.github.repo;

  // 默认情况下使用 POST 创建 release
  let url = `https://api.github.com/repos/${github}/releases`;
  let method = 'POST';

  try {
    // 检查 release 是否已经存在
    const exists = await ofetch(`https://api.github.com/repos/${github}/releases/tags/${options.to}`, {
      headers
    });
    if (exists.url) {
      // 如果存在，则使用 PATCH 更新 release
      url = exists.url;
      method = 'PATCH';
    }
  } catch {
    // 忽略不存在的情况，继续新建
  }

  const body = {
    body: content,
    draft: false,
    name: options.to,
    prerelease: options.prerelease,
    tag_name: options.to
  };

  // 构造手动发布的备用链接
  const webUrl = `https://github.com/${github}/releases/new?title=${encodeURIComponent(
    String(body.name)
  )}&body=${encodeURIComponent(String(body.body))}&tag=${encodeURIComponent(String(options.to))}&prerelease=${
    options.prerelease
  }`;

  try {
    // 输出日志
    consola.log(cyan(method === 'POST' ? 'Creating release notes...' : 'Updating release notes...'));
    // 发起 GitHub API 请求
    const res = await ofetch(url, {
      method,
      body: JSON.stringify(body),
      headers
    });

    // 打印成功信息
    consola.log(green(`Released on ${res.html_url}`));
  } catch (e) {
    // 出现错误时，提示用户手动操作
    consola.error(red('Failed to create the release. Using the following link to create it manually:'));
    consola.error(yellow(webUrl));

    throw e;
  }
}

/**
 * 执行命令行工具并返回输出
 * @param cmd 命令名
 * @param args 参数列表
 * @returns 命令输出结果
 */
async function execCommand(cmd: string, args: string[]) {
  const { execa } = await import('execa');
  const res = await execa(cmd, args);
  return res.stdout.trim();
}

/**
 * 判断当前仓库是否为浅克隆（shallow clone）
 * @returns 若为浅克隆返回 true，否则 false
 */
export async function isRepoShallow() {
  return (await execCommand('git', ['rev-parse', '--is-shallow-repository'])).trim() === 'true';
}
