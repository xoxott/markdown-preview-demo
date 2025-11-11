import { type  PropType, type VNode, defineComponent, ref, watch } from 'vue';
import MarkdownIt from 'markdown-it';
import markdownItMultimdTable from 'markdown-it-multimd-table';
import '@primer/css/core/index.scss';
import '@primer/css/markdown/index.scss';
import 'github-markdown-css/github-markdown.css';
import 'highlight.js/styles/github-dark.css';
import { useMarkdownTheme } from './hooks/useMarkdownTheme';
import markdownVuePlugin from './plugins/markdown-render-vnode';
import { CodeBlock } from './components/CodeBlock';
import { MermaidRenderer } from './components/MermaidRenderer';
import { MindmapRenderer } from './components/MindmapRenderer';
import { EchartsRenderer } from './components/EchartsRenderer';
import { SvgRenderer } from './components/SvgRenderer';
import type { CodeBlockMeta } from './plugins/types';

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
          if (meta.langName === 'mermaid') {
            return MermaidRenderer;
          }
          if (meta.langName === 'markmap') {
            return MindmapRenderer;
          }
          if (meta.langName === 'echarts') {
            return EchartsRenderer;
          }
          if (meta.langName === 'svg') {
            return SvgRenderer;
          }
          return CodeBlock;
        }
      }
    }).use(markdownItMultimdTable);

    const vnodes = ref<VNode[]>([]);

    // 监听内容变化，重新解析
    watch(
      () => props.content,
      () => {
        const tokens = md.parse(props.content, {});
        vnodes.value = md.renderer.render(tokens, md.options, {}) as unknown as VNode[];
      },
      { immediate: true }
    );

    return () => (
      <div style={cssVars.value} class={['markdown-container', themeClass.value]}>
        <article class="markdown-body">
          {vnodes.value}
        </article>
      </div>
    );
  }
});
