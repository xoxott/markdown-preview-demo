/**
 * 文件扩展名 → shiki/Monaco 语言 ID 集中映射
 *
 * 所有组件（MonacoEditor、CodePreviewer、FileEditor）共享此映射， 不再各自维护重复且不一致的映射表。
 *
 * 映射值使用 shiki 的标准语言 ID，与 bundledLanguages 的 key 一致， 便于动态加载对应的语法 grammar。
 */

export const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  // Web 核心
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  jsx: 'jsx',
  tsx: 'tsx',
  vue: 'vue',
  css: 'css',
  scss: 'scss',
  less: 'less',
  html: 'html',
  json: 'json',
  json5: 'json5',
  jsonc: 'jsonc',
  md: 'markdown',
  markdown: 'markdown',

  // 配置 / 数据
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  ini: 'ini',
  csv: 'csv',
  env: 'dotenv',

  // Shell
  sh: 'shellscript',
  bash: 'shellscript',
  zsh: 'shellscript',

  // 编程语言
  py: 'python',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  h: 'c',
  go: 'go',
  rs: 'rust',
  rb: 'ruby',
  php: 'php',
  cs: 'csharp',
  swift: 'swift',
  lua: 'lua',
  perl: 'perl',
  pl: 'perl',
  sql: 'sql',
  r: 'r',
  dart: 'dart',
  scala: 'scala',
  clj: 'clojure',
  coffee: 'coffeescript',
  kt: 'kotlin',

  // 基础设施 / DevOps
  dockerfile: 'docker',
  make: 'make',
  gitignore: 'plaintext',
  conf: 'ini',
  log: 'plaintext',
  txt: 'plaintext'
};

/** 根据文件扩展名解析语言 ID，未知扩展名返回 'plaintext' */
export function resolveLanguage(extension: string): string {
  const ext = extension?.toLowerCase() || '';
  return EXTENSION_TO_LANGUAGE[ext] || 'plaintext';
}

/** 根据文件名（含扩展名）解析语言 ID */
export function resolveLanguageFromFilename(filename: string): string {
  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex === -1) return 'plaintext';
  const ext = filename.slice(dotIndex + 1).toLowerCase();
  return resolveLanguage(ext);
}
