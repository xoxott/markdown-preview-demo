<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useThemeStore } from '@/store/modules/theme';
import { useCodeTools, useSvgTools } from '../hook/useToolbar';
import { useMindmap } from '../hook/useMindmap';
import { debounce } from '../utils';
import ToolBar from './tool-bar.vue';

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
const showCode = ref(false);
const containerRef = ref<HTMLElement>();
const svgRef = ref();
const { darkMode } = storeToRefs(useThemeStore());
const content = computed(() => props.meta.content);
const { renderMindmap, errorMessage, zoom } = useMindmap(content, svgRef);
const { copyCode, copyFeedback } = useCodeTools();
const { downloadSVG } = useSvgTools(undefined, svgRef);

const debouncedRender = debounce(renderMindmap, 100);
watch(() => props.meta.content, debouncedRender, { immediate: true });
watch(() => darkMode.value, debouncedRender);
const handleAfterEnter = () => {
  if (!showCode.value && !errorMessage.value) {
    debouncedRender();
  }
};
</script>

<template>
  <NCard :bordered="true" class="mb-2 mt-4">
    <ToolBar
      :lang-name="props.meta.langName"
      :show-code="showCode"
      :error-message="errorMessage"
      :copy-feedback="copyFeedback"
      :is-svg="true"
      @toggle-code="showCode = !showCode"
      @retry="renderMindmap"
      @download="downloadSVG"
      @zoom="zoom"
      @copy="() => copyCode(props.meta.content, errorMessage)"
    />
    <div v-if="errorMessage && !showCode" class="error-message">❌ {{ errorMessage }}</div>
    <Transition name="mindmap-fade" mode="out-in" @after-enter="handleAfterEnter">
      <div v-if="showCode" key="code" class="code-block">
        <pre>{{ props.meta.content }}</pre>
      </div>
      <div v-else-if="!errorMessage" ref="containerRef" class="svg-container">
        <svg ref="svgRef" :style="{ color: darkMode ? 'white' : 'black' }" class="h-full w-full"></svg>
      </div>
    </Transition>
  </NCard>
</template>

<style scoped>
/* 过渡 */
.mindmap-fade-enter-active,
.mindmap-fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.mindmap-fade-enter-from,
.mindmap-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
.error-message {
  color: #dc2626;
  background: #fef2f2;
  padding: 1rem;
  border-radius: 4px;
  margin-top: 1rem;
  border: 1px solid #fecaca;
}
.svg-container {
  width: 100%;
  height: auto;
  overflow: hidden;
  border-radius: 6px;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}
@media (max-width: 640px) {
  .svg-container {
    max-height: 30vh;
  }
}
pre {
  margin: 0 !important;
}
</style>

<style>
/*  解决闪烁滚动条闪烁问题 */
html {
  overflow-y: hidden; /* 始终保留滚动条空间 */
}
</style>
