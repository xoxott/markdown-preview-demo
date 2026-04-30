import * as monaco from 'monaco-editor-core';
import { createHighlighterCoreSync } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine-javascript.mjs';
import { shikiToMonaco } from '@shikijs/monaco';
import { bundledLanguages } from 'shiki/langs';
/** 核心语言 — 静态 import，同步注册 */
import langVue from 'shiki/langs/vue.mjs';
import langTsx from 'shiki/langs/tsx.mjs';
import langJsx from 'shiki/langs/jsx.mjs';
import langJs from 'shiki/langs/js.mjs';
import langTs from 'shiki/langs/ts.mjs';
import langCss from 'shiki/langs/css.mjs';
import langHtml from 'shiki/langs/html.mjs';
import langJson from 'shiki/langs/json.mjs';
import langMarkdown from 'shiki/langs/markdown.mjs';
/** 主题 */
import themeDark from 'shiki/themes/dark-plus.mjs';
import themeLight from 'shiki/themes/light-plus.mjs';

/** 核心语言 ID 列表 — 初始化时同步注册 */
const CORE_LANG_IDS = [
  'vue',
  'tsx',
  'jsx',
  'javascript',
  'typescript',
  'css',
  'html',
  'json',
  'markdown'
];

let highlighterInstance: ReturnType<typeof createHighlighterCoreSync> | null = null;
let initialized = false;

/** 常用非核心语言 — 可在 app 启动时预加载 */
const COMMON_LANG_IDS = [
  'python',
  'java',
  'cpp',
  'c',
  'go',
  'rust',
  'yaml',
  'xml',
  'shellscript',
  'sql',
  'scss',
  'less',
  'toml',
  'ini',
  'docker',
  'ruby',
  'php',
  'csharp',
  'swift',
  'lua'
];

/** 初始化 shiki 高亮器（同步），注册核心语言和主题。 首次调用时执行，后续调用直接返回主题名称。 */
export function registerHighlighter() {
  if (!initialized) {
    highlighterInstance = createHighlighterCoreSync({
      themes: [themeDark, themeLight],
      langs: [langVue, langTsx, langJsx, langJs, langTs, langCss, langHtml, langJson, langMarkdown],
      engine: createJavaScriptRegexEngine()
    });

    for (const id of CORE_LANG_IDS) {
      monaco.languages.register({ id });
    }
    shikiToMonaco(highlighterInstance, monaco);
    initialized = true;
  }

  return {
    light: themeLight.name!,
    dark: themeDark.name!
  };
}

/** 获取高亮器实例（需先调用 registerHighlighter） */
export function getHighlighter() {
  if (!highlighterInstance) registerHighlighter();
  return highlighterInstance!;
}

/**
 * 动态加载单个 shiki 语言 grammar 并注册到 Monaco。
 *
 * 流程：
 *
 * 1. 检查是否已加载 → 跳过
 * 2. 通过 bundledLanguages 动态 import 语言模块
 * 3. 加载到 highlighter 实例
 * 4. 注册到 Monaco languages
 * 5. 重新调用 shikiToMonaco 绑定全部 tokenizer（幂等，对已注册语言无副作用）
 */
export async function loadLanguage(langId: string): Promise<void> {
  registerHighlighter(); // 确保 initialized

  const loadedLangs = highlighterInstance!.getLoadedLanguages();
  if (loadedLangs.includes(langId)) return;

  // plaintext 等无需 shiki grammar
  if (langId === 'plaintext' || langId === 'txt' || langId === 'text') {
    monaco.languages.register({ id: langId });
    return;
  }

  // 查找动态 import getter
  const importGetter = bundledLanguages[langId as keyof typeof bundledLanguages];
  if (!importGetter) {
    console.warn(`[Monaco] No shiki language bundle for "${langId}", falling back to plaintext`);
    monaco.languages.register({ id: langId });
    return;
  }

  try {
    const langModule = await importGetter();
    const langRegistration = Array.isArray(langModule) ? langModule : [langModule];
    await highlighterInstance!.loadLanguage(...langRegistration);

    monaco.languages.register({ id: langId });
    shikiToMonaco(highlighterInstance!, monaco);
  } catch (err) {
    console.warn(`[Monaco] Failed to load language "${langId}":`, err);
    monaco.languages.register({ id: langId });
  }
}

/** 预加载常用非核心语言 — 可在 app 启动时调用 */
export async function preloadCommonLanguages(): Promise<void> {
  registerHighlighter();
  await Promise.all(COMMON_LANG_IDS.map(id => loadLanguage(id)));
}
