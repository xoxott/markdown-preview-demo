import { type VNode, defineComponent, onMounted, ref, watch } from 'vue';
import MarkdownIt from 'markdown-it';
import markdownItMultimdTable from 'markdown-it-multimd-table';
import markdownItKatex from '@vscode/markdown-it-katex';
// 注意：这些插件需要先安装依赖
// import markdownItFootnote from 'markdown-it-footnote';
// import markdownItTaskLists from 'markdown-it-task-lists';
// import markdownItEmoji from 'markdown-it-emoji';
import '@primer/css/core/index.scss';
import '@primer/css/markdown/index.scss';
import 'github-markdown-css/github-markdown.css';
// 暗色主题自己调整 不要使用引入会冲突
// import 'github-markdown-css/github-markdown-dark.css';
import 'highlight.js/styles/github.css';
import 'highlight.js/styles/github-dark.css';
import 'katex/dist/katex.min.css';
import { useMarkdownTheme } from './hooks/useMarkdownTheme';
import markdownVuePlugin from './plugins';
import { CodeBlock } from './components/CodeBlock';
import { MermaidRenderer } from './components/MermaidRenderer';
import { MindmapRenderer } from './components/MindmapRenderer';
import { EchartsRenderer } from './components/EchartsRenderer';
import { SvgRenderer } from './components/SvgRenderer';
import type { CodeBlockMeta } from '@suga/markdown-it-render-vnode';
import { DOM_ATTR_NAME } from '@suga/markdown-it-render-vnode';
import type { Component } from 'vue';

// 代码块组件映射表
const CODE_BLOCK_COMPONENTS: Record<string, Component> = {
  mermaid: MermaidRenderer,
  markmap: MindmapRenderer,
  echarts: EchartsRenderer,
  svg: SvgRenderer
};

export default defineComponent({
  name: 'MarkdownPreview',
  props: {
    content: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const { darkMode, cssVars, themeClass } = useMarkdownTheme();

    // 初始化 Markdown 解析器
    const md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      breaks: true
    });

    // 配置插件
    md.use(markdownVuePlugin, {
      components: {
        codeBlock: (meta: CodeBlockMeta) => {
          return CODE_BLOCK_COMPONENTS[meta.langName] || CodeBlock;
        }
      }
    })
      .use(markdownItMultimdTable)
      .use(markdownItKatex, {
        throwOnError: false,
        errorColor: '#cc0000'
      });
      // 以下插件需要先安装依赖后再启用
      // .use(markdownItFootnote)
      // .use(markdownItTaskLists, { enabled: true })
      // .use(markdownItEmoji);

    const vnodes = ref<VNode[]>([]);

    // 监听内容变化
    // 依赖 Vue 的 key-based diff 进行优化
    watch(
      () => props.content,
      newContent => {
        if (newContent) {
          const tokens = md.parse(newContent, {});
            vnodes.value = md.renderer.render(tokens, md.options, {}) as unknown as VNode[];
        }
      },
      { immediate: true }
    );

    // 注入主题样式
    onMounted(() => {
      const styleId = 'markdown-theme-styles';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          /* 基础容器样式 */
          .markdown-container {
            width: 100%;
            height: 100%;
          }

          .markdown-body {
            box-sizing: border-box;
            min-width: 200px;
            max-width: 100%;
            padding: 20px;
          }

          /* 亮色模式样式 */
          .markdown-container.color-mode-light .markdown-body {
            color-scheme: light;
            background-color: #ffffff;
            color: #24292f !important;
          }

          .markdown-container.color-mode-light .markdown-body h1,
          .markdown-container.color-mode-light .markdown-body h2,
          .markdown-container.color-mode-light .markdown-body h3,
          .markdown-container.color-mode-light .markdown-body h4,
          .markdown-container.color-mode-light .markdown-body h5,
          .markdown-container.color-mode-light .markdown-body h6 {
            color: #24292f !important;
          }

          .markdown-container.color-mode-light .markdown-body p,
          .markdown-container.color-mode-light .markdown-body li,
          .markdown-container.color-mode-light .markdown-body td,
          .markdown-container.color-mode-light .markdown-body th {
            color: #24292f !important;
          }

          .markdown-container.color-mode-light .markdown-body a {
            color: #0969da !important;
          }

          .markdown-container.color-mode-light .markdown-body a:hover {
            color: #0550ae !important;
          }

          .markdown-container.color-mode-light .markdown-body code {
            background-color: rgba(175, 184, 193, 0.2) !important;
            color: #24292f !important;
          }

          .markdown-container.color-mode-light .markdown-body pre {
            background-color: #f6f8fa !important;
            border: 1px solid #d0d7de !important;
          }

          .markdown-container.color-mode-light .markdown-body pre code {
            background-color: transparent !important;
          }

          .markdown-container.color-mode-light .markdown-body blockquote {
            color: #57606a !important;
            border-left-color: #d0d7de !important;
          }

          .markdown-container.color-mode-light .markdown-body table tr {
            border-top-color: #d0d7de !important;
          }

          .markdown-container.color-mode-light .markdown-body table tr:nth-child(2n) {
            background-color: #f6f8fa !important;
          }

          .markdown-container.color-mode-light .markdown-body table th,
          .markdown-container.color-mode-light .markdown-body table td {
            border-color: #d0d7de !important;
          }

          .markdown-container.color-mode-light .markdown-body hr {
            background-color: #d0d7de !important;
          }

          .markdown-container.color-mode-light .markdown-body strong {
            color: #24292f !important;
          }

          .markdown-container.color-mode-light .markdown-body em {
            color: #24292f !important;
          }

          .markdown-container.color-mode-light .markdown-body del {
            color: #57606a !important;
          }

          .markdown-container.color-mode-light .markdown-body ul,
          .markdown-container.color-mode-light .markdown-body ol {
            color: #24292f !important;
          }

          /* 暗色模式样式 */
          .markdown-container.color-mode-dark .markdown-body {
            color-scheme: dark;
            color: #e6edf3 !important;
            background-color: transparent !important;
          }

          .markdown-container.color-mode-dark .markdown-body h1,
          .markdown-container.color-mode-dark .markdown-body h2,
          .markdown-container.color-mode-dark .markdown-body h3,
          .markdown-container.color-mode-dark .markdown-body h4,
          .markdown-container.color-mode-dark .markdown-body h5,
          .markdown-container.color-mode-dark .markdown-body h6 {
            color: #e6edf3 !important;
            border-bottom-color: #30363d !important;
          }

          .markdown-container.color-mode-dark .markdown-body p,
          .markdown-container.color-mode-dark .markdown-body li,
          .markdown-container.color-mode-dark .markdown-body td,
          .markdown-container.color-mode-dark .markdown-body th {
            color: #c9d1d9 !important;
          }

          .markdown-container.color-mode-dark .markdown-body a {
            color: #58a6ff !important;
          }

          .markdown-container.color-mode-dark .markdown-body a:hover {
            color: #79c0ff !important;
          }

          .markdown-container.color-mode-dark .markdown-body code {
            background-color: rgba(110, 118, 129, 0.4) !important;
            color: #e6edf3 !important;
          }

          .markdown-container.color-mode-dark .markdown-body pre {
            background-color: #161b22 !important;
            border: 1px solid #30363d !important;
          }

          .markdown-container.color-mode-dark .markdown-body pre code {
            background-color: transparent !important;
          }

          .markdown-container.color-mode-dark .markdown-body blockquote {
            color: #8b949e !important;
            border-left-color: #3b434b !important;
          }

          .markdown-container.color-mode-dark .markdown-body table tr {
            background-color: transparent !important;
            border-top-color: #30363d !important;
          }

          .markdown-container.color-mode-dark .markdown-body table tr:nth-child(2n) {
            background-color: rgba(110, 118, 129, 0.05) !important;
          }

          .markdown-container.color-mode-dark .markdown-body table th,
          .markdown-container.color-mode-dark .markdown-body table td {
            border-color: #30363d !important;
          }

          /* KaTeX 数学公式样式 */
          .markdown-body .katex {
            font-size: 1.05em;
          }

          .markdown-body .katex-display {
            margin: 1em 0;
            overflow-x: auto;
            overflow-y: hidden;
          }

          /* 暗色模式下的 KaTeX 样式 */
          .markdown-container.color-mode-dark .markdown-body .katex {
            color: #e6edf3;
          }

          .markdown-container.color-mode-dark .markdown-body .katex-display {
            background-color: rgba(110, 118, 129, 0.1);
            border-radius: 4px;
            padding: 0.5em;
          }

          /* 脚注样式 */
          .markdown-body .footnote-ref {
            color: var(--markdown-link-color);
            text-decoration: none;
            font-weight: 500;
          }

          .markdown-body .footnote-ref:hover {
            text-decoration: underline;
          }

          .markdown-body .footnotes {
            margin-top: 2em;
            padding-top: 1em;
            border-top: 1px solid var(--markdown-hr-color);
            font-size: 0.9em;
            color: var(--markdown-blockquote-color);
          }

          .markdown-body .footnotes ol {
            padding-left: 1.5em;
          }

          .markdown-body .footnotes li {
            margin: 0.5em 0;
          }

          .markdown-body .footnote-backref {
            text-decoration: none;
            color: var(--markdown-link-color);
            margin-left: 0.3em;
          }

          /* 任务列表样式 */
          .markdown-body .task-list-item {
            list-style-type: none;
          }

          .markdown-body .task-list-item input[type="checkbox"] {
            margin-right: 0.5em;
            margin-left: -1.5em;
            cursor: pointer;
          }

          .markdown-body .task-list-item input[type="checkbox"]:checked + * {
            text-decoration: line-through;
            opacity: 0.7;
          }

          /* Emoji 样式 */
          .markdown-body .emoji {
            height: 1.2em;
            width: 1.2em;
            margin: 0 0.1em;
            vertical-align: -0.1em;
            display: inline-block;
          }

          .markdown-container.color-mode-dark .markdown-body hr {
            background-color: #30363d !important;
            border: none !important;
          }

          .markdown-container.color-mode-dark .markdown-body img {
            background-color: transparent !important;
          }

          .markdown-container.color-mode-dark .markdown-body strong {
            color: #e6edf3 !important;
          }

          .markdown-container.color-mode-dark .markdown-body em {
            color: #e6edf3 !important;
          }

          .markdown-container.color-mode-dark .markdown-body del {
            color: #8b949e !important;
          }

          .markdown-container.color-mode-dark .markdown-body ul,
          .markdown-container.color-mode-dark .markdown-body ol {
            color: #c9d1d9 !important;
          }
        `;
        document.head.appendChild(style);
      }
    });

    return () => (
      <div style={cssVars.value} class={['markdown-container', themeClass.value]}>
        <article class={['markdown-body', darkMode.value && 'markdown-body-dark']}>
          {vnodes.value.map((vnode, index) => {
            const props = vnode.props as Record<string, unknown> | null | undefined;
            const tokenKey = (props?.['data-token-key'] as string | undefined) ||
                           (props?.[DOM_ATTR_NAME.TOKEN_IDX] as string | undefined) ||
                           `vnode-${index}`;
            return { ...vnode, key: tokenKey };
          })}
        </article>
      </div>
    );
  }
});
