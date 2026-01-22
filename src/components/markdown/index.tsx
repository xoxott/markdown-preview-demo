import { type VNode, defineComponent, ref, watch, nextTick, onMounted, Component, type PropType } from 'vue';
import MarkdownIt from 'markdown-it';
import markdownItMultimdTable from 'markdown-it-multimd-table';
import markdownItKatex from '@vscode/markdown-it-katex';
import markdownItTaskLists from '@suga/markdown-it-task-lists';
import type { CodeBlockMeta } from '@suga/markdown-it-render-vnode';
import { DOM_ATTR_NAME } from '@suga/markdown-it-render-vnode';
import StreamingPenEffect from '@/components/streaming-pen-effect';

// 注意：这些插件需要先安装依赖
// import markdownItFootnote from 'markdown-it-footnote';
// import markdownItEmoji from 'markdown-it-emoji';
// import '@primer/css/core/index.scss';
// import '@primer/css/markdown/index.scss';
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

import './index.scss';

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
    },
    // 是否启用笔写效果
    showPenEffect: {
      type: Boolean,
      default: false
    },
    // 笔写效果配置
    penEffectConfig: {
      type: Object as PropType<{
        penColor?: string;
        size?: number;
        offsetX?: number;
        offsetY?: number;
      }>,
      default: () => ({
        penColor: '#15803d',
        size: 30,
        offsetX: 0.65,
        offsetY: -1
      })
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
    // 注意：markdownVuePlugin 必须先注册，然后再注册其他修改渲染规则的插件
    // 这样其他插件的自定义渲染规则才不会被覆盖
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
      })
      .use(markdownItTaskLists, {
        enabled: true  // 禁用交互（checkbox 为 disabled，只用于预览）
      });
      // 以下插件需要先安装依赖后再启用
      // .use(markdownItFootnote)
      // .use(markdownItEmoji);

    const vnodes = ref<VNode[]>([]);
    const markdownBodyRef = ref<HTMLElement | null>(null);

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

    return () => (
      <div style={cssVars.value} class={['markdown-container', themeClass.value]}>
        <article
          ref={markdownBodyRef}
          class={['markdown-body', darkMode.value && 'markdown-body-dark']}
          style={{ position: 'relative' }}
        >
          {vnodes.value.map((vnode, index) => {
            const props = vnode.props as Record<string, unknown> | null | undefined;
            const tokenKey = (props?.['data-token-key'] as string | undefined) ||
                           (props?.[DOM_ATTR_NAME.TOKEN_IDX] as string | undefined) ||
                           `vnode-${index}`;
            return { ...vnode, key: tokenKey };
          })}
          {/* {props.showPenEffect  && markdownBodyRef.value && (
            <StreamingPenEffect
              isWriting={props.showPenEffect}
              targetRef={markdownBodyRef.value}
              penColor={props.penEffectConfig.penColor}
              size={props.penEffectConfig.size}
              offsetX={props.penEffectConfig.offsetX}
              offsetY={props.penEffectConfig.offsetY}
            />
          )} */}
        </article>
      </div>
    );
  }
});

