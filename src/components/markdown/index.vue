<script setup lang="ts">
import type { VNode } from 'vue';
import { computed, createVNode, defineAsyncComponent, Fragment,Comment, ref, Text,watch } from 'vue';
import 'highlight.js/styles/github-dark.css';
import { storeToRefs } from 'pinia';
import { useThemeVars } from 'naive-ui';
import MarkdownIt from 'markdown-it';
import { useThemeStore } from '@/store/modules/theme';
import mermaidRender from './modules/mermaid-render.vue';
import mindmapRender from './modules/mindmap-render.vue';
import echartsRender from './modules/echarts-render.vue';
import codeBlock from './modules/code-block.vue';
import markdwonVuePlugn from './plugins/markdown-render-vnode';
import '@primer/css/markdown/index.scss';
import '@primer/css/core/index.scss';
import createMarkdownPlugin from './plugins/lib/UniversalMarkdownPlugin';
import { FrameworkType } from './plugins/lib/FrameworkAdapter';
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

// const vueMarkdownPlugin = createMarkdownPlugin({
//   framework:FrameworkType.VUE,
//   frameworkLib:{
//     createVNode,
//     Fragment,
//     Text,
//     Comment,
//     defineAsyncComponent
//   },
//   components:{
//     codeBlock:(meta:any)=>{
//       if (meta.langName === 'mermaid') {
//         return mermaidRender;
//       }
//       if (meta.langName === 'markmap') {
//         return mindmapRender;
//       }
//       if (meta.langName === 'echarts') {
//         return echartsRender;
//       }
//       return codeBlock;
//     }
//   },
//   safeMode:true,
//   langPrefix: 'language-'
// })
// md.use(vueMarkdownPlugin)

md.use(markdwonVuePlugn, {
  component: {
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
});

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
</style>
