/** Git 提交的作者信息 */
export interface GitCommitAuthor {
  /** 作者的姓名 */
  name: string;
  /** 作者的邮箱地址 */
  email: string;
}

/** 原始的 Git 提交信息（未解析） */
export interface RawGitCommit {
  /** 提交标题（subject） */
  message: string;
  /** 提交正文（body） */
  body: string;
  /** 提交的短哈希值 */
  shortHash: string;
  /** 提交作者 */
  author: GitCommitAuthor;
}

/** 提交中引用的对象（如哈希、Issue、Pull Request） */
export interface Reference {
  /** 引用的类型 */
  type: 'hash' | 'issue' | 'pull-request';
  /** 引用的值（哈希、Issue 编号、PR 编号） */
  value: string;
}

/** 已解析并关联到 GitHub 的作者信息 */
export interface ResolvedAuthor extends GitCommitAuthor {
  /** 该作者相关的提交哈希列表 */
  commits: string[];
  /** 作者在 GitHub 上的登录用户名 */
  login: string;
}

/** 解析后的 Git 提交信息（包含更多结构化内容） */
export interface GitCommit extends RawGitCommit {
  /** 提交的描述（通常来源于 message） */
  description: string;
  /** 提交的类型（如 feat、fix、docs 等） */
  type: string;
  /** 提交的作用域（scope，可选，指明影响的模块/范围） */
  scope: string;
  /** 提交中解析出的引用信息 */
  references: Reference[];
  /** 提交中包含的作者信息（从 trailers 中解析） */
  authors: GitCommitAuthor[];
  /** 解析并匹配到 GitHub 用户的作者信息 */
  resolvedAuthors: ResolvedAuthor[];
  /** 是否为破坏性变更（breaking change） */
  isBreaking: boolean;
}

/** GitHub 仓库配置 */
export interface GithubConfig {
  /** 仓库名称（格式：owner/repo）*/
  repo: string;
  /** GitHub API 访问的 Token */
  token: string;
}

/** 生成 Changelog 的配置项 */
export interface ChangelogOption {
  /**
   * 项目的工作目录
   *
   * @default process.cwd()
   */
  cwd: string;

  /** 提交类型与对应标题的映射 */
  types: Record<string, string>;

  /** GitHub 相关配置 */
  github: GithubConfig;

  /** Changelog 的起始提交哈希或标签 */
  from: string;

  /** Changelog 的结束提交哈希或标签 */
  to: string;

  /** 仓库中所有的标签列表 */
  tags: string[];

  /** 标签与发布日期的映射 */
  tagDateMap: Map<string, string>;

  /** 是否将提交类型的首字母大写 */
  capitalize: boolean;

  /**
   * 是否在标题中使用 Emoji
   *
   * @default true
   */
  emoji: boolean;

  /** 标题配置 */
  titles: {
    /** 破坏性变更（breaking change）部分的标题 */
    breakingChanges: string;
  };

  /** 生成的 Changelog 输出文件路径 */
  output: string;

  /**
   * 是否重新生成已有版本的 changelog
   *
   * @example
   * 当 v0.0.1 已存在 changelog 时，开启此选项会强制重新生成该版本内容
   */
  regenerate: boolean;

  /** 是否将该版本标记为预发布（prerelease） */
  prerelease?: boolean;
}