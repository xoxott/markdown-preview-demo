<script setup lang="ts">
import { computed, onMounted, ref, useAttrs } from 'vue';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import { useThemeStore } from '@/store/modules/theme/index.js';
import { useCodeTools } from '../hook/useToolbar';
import ToolBar from './tool-bar.vue';
import SandBox from './sand-box.vue';
import type { CodeType } from './sand-box.vue';
import { storeToRefs } from 'pinia';
const themeStore = useThemeStore();
const { darkMode } = storeToRefs(themeStore);
defineOptions({
  name: 'CodeBlock'
});

interface Props {
  meta: {
    langName: string;
    content: string;
    attrs: Record<string, string>;
    info: string;
    token: any;
  };
}
const props = defineProps<Props>();
const attrs = useAttrs();
const resetStyle = `margin: 0; padding: 0; font-size: none;margin-bottom:0`;
const { copyCode, copyFeedback } = useCodeTools();
const language = computed(() => props.meta.langName);
const showSandBox = ref(false);
const runCodeLangs = ['vue', 'javascript'];
</script>

<template>
  <NConfigProvider :hljs="hljs">
    <NCard class="mb-2 mt-4">
      <ToolBar
        :copy-feedback="copyFeedback"
        :lang-name="language || 'text'"
        :theme="darkMode ? 'dark' : 'light'"
        @copy="() => copyCode(props.meta.content)"
        @run="showSandBox = true"
      />
      <NCode
        :show-line-numbers="true"
        :code="props.meta.content"
        :style="resetStyle"
        :language="language || 'text'"
        v-bind="attrs"
      />
      <template v-if="runCodeLangs.includes(props.meta.langName) && props.meta.content">
        <SandBox v-model:show="showSandBox" :code="props.meta.content" :mode="props.meta.langName" />
      </template>
    </NCard>
  </NConfigProvider>
</template>

<style>
.markdown-body code pre {
  margin-bottom: 0;
  background: transparent;
  font-size: 14px !important;
}
</style>
