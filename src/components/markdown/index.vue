<script setup lang="ts">
import { nextTick, VNode } from "vue";
import { ref, watch,computed } from "vue";
import "highlight.js/styles/github-dark.css";
import MarkdownIt from "markdown-it";
import mermaidRender from "./modules/mermaid-render.vue";
import echartsRender from "./modules/echarts-render.vue";
import codeBlock from "./modules/code-block.vue";
import markdwonVuePlugn from "./plugins/markdown-render-vnode";
import { useThemeVars } from 'naive-ui';
import { useThemeStore } from "@/store/modules/theme";
import { storeToRefs } from "pinia";
import '@primer/css/markdown/index.scss';
import '@primer/css/core/index.scss';
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
  breaks: true,
});

md.use(markdwonVuePlugn, {
  component: {
    codeBlock: (meta: any) => {
      if (meta.langName === "mermaid") {
        return mermaidRender;
      }
      if (meta.langName === "echarts") {
        return echartsRender;
      }
      return codeBlock;
    },
  },
});

const vnodes = ref<VNode[]>([]);
watch(
  () => props.content,
  () => {
    const tokens = md.parse(props.content, {});
    vnodes.value = (md.renderer.render(tokens, md.options, {}) as unknown) as VNode[];
  },
  { immediate: true }
);
const cssVars = computed(() => ({
  '--markdown-text-color': themeVars.value.textColorBase,
}))
</script>

<template>
  <div :style="cssVars" :class="['markdown-container', darkMode ? 'color-mode-dark' : 'color-mode-light']"
  >
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