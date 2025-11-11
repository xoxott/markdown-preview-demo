<script setup lang="ts">
import { useThemeStore } from '@/store/modules/theme';
import '@primer/css/core/index.scss';
import '@primer/css/markdown/index.scss';
import 'github-markdown-css/github-markdown.css';
import 'highlight.js/styles/github-dark.css';
import MarkdownIt from 'markdown-it';
import markdownItMultimdTable from 'markdown-it-multimd-table';
import { useThemeVars } from 'naive-ui';
import { storeToRefs } from 'pinia';
import type { VNode } from 'vue';
import { computed, ref, watch } from 'vue';
import codeBlock from './modules/code-block.vue';
import echartsRender from './modules/echarts-render.vue';
import mermaidRender from './modules/mermaid-render.vue';
import mindmapRender from './modules/mindmap-render.vue';
import markdwonVuePlugn from './plugins/index';
const themeVars = useThemeVars();
const themeStore = useThemeStore();
const { darkMode } = storeToRefs(themeStore);
interface Props {
  content: string;
}
const props = defineProps<Props>();
// 初始化 Markdown 解析器
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true
});

md.use(markdwonVuePlugn, {
  components: {
    codeBlock: (meta: any) => {
      if (meta.langName === 'mermaid') {
        return mermaidRender;
      }
      if (meta.langName === 'markmap') {
        return mindmapRender;
      }
      if (meta.langName === 'echarts') {
        return echartsRender;
      }
      return codeBlock;
    }
  }
}).use(markdownItMultimdTable);

const vnodes = ref<VNode[]>([]);
watch(
  () => props.content,
  () => {
    const tokens = md.parse(props.content, {});
    vnodes.value = md.renderer.render(tokens, md.options, {}) as unknown as VNode[];
  },
  { immediate: true }
);
const cssVars = computed(() => ({
  '--markdown-text-color': themeVars.value.textColorBase
}));
</script>

<template>
  <div :style="cssVars" class="markdown-container" :class="[darkMode ? 'color-mode-dark' : 'color-mode-light']">
    <article class="markdown-body">
      <component :is="vnode" v-for="(vnode, index) in vnodes" :key="index" />
    </article>
  </div>
</template>

<style>
.markdown-container {
  color: var(--markdown-text-color);
}

.markdown-body table {
  display: block;         /* 关键：让 table 当块级元素 */
  width: 100%;
  overflow-x: auto;       /* 出滚动条 */
  -webkit-overflow-scrolling: touch;
}
.markdown-body table td,
.markdown-body table th {
  white-space: nowrap;    /* 不换行，保持一行 */
}
</style>
