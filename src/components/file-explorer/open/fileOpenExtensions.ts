/** 可用内置 Markdown 编辑器打开的扩展名 */
export const MARKDOWN_EXTENSIONS = new Set(['md', 'markdown', 'mdx']);

/** 可用内置代码编辑器打开的扩展名（与预览注册表 code 分类对齐） */
export const CODE_EDITABLE_EXTENSIONS = new Set([
  'js',
  'mjs',
  'cjs',
  'ts',
  'jsx',
  'tsx',
  'vue',
  'css',
  'scss',
  'less',
  'html',
  'json',
  'xml',
  'yaml',
  'yml',
  'sh',
  'bash',
  'py',
  'java',
  'cpp',
  'c',
  'h',
  'go',
  'rust',
  'rs',
  'sql',
  'r',
  'lua',
  'perl',
  'pl',
  'rb',
  'php',
  'cs',
  'swift',
  'kt',
  'dart',
  'scala',
  'clj',
  'coffee',
  'make',
  'dockerfile',
  'gitignore',
  'env',
  'log',
  'conf',
  'ini',
  'toml',
  'csv',
  'txt',
  'mermaid',
  'mmd',
  'svg',
  'echarts',
  'chart',
  'markmap',
  'mm'
]);

export function isTextEditableExtension(extension?: string): boolean {
  if (!extension) return false;
  const ext = extension.toLowerCase();
  return MARKDOWN_EXTENSIONS.has(ext) || CODE_EDITABLE_EXTENSIONS.has(ext);
}
