<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useThemeStore } from '@/store/modules/theme';
import { useMermaid } from '../hook/useMermaid';
import { debounce } from '../utils/index';
import { useCodeTools, useSvgTools } from '../hook/useToolbar';
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
const { copyCode, copyFeedback } = useCodeTools();
const content = computed(() => props.meta.content);
const themeStore = useThemeStore();
const { darkMode } = storeToRefs(themeStore);
const { svgValue, svgAspectRatio, initMermaid, renderDiagram, containerStyle, errorMessage } = useMermaid(
  content,
  darkMode.value
);
const { downloadSVG, startDrag, scale, zoom, position, isDragging } = useSvgTools(containerRef, svgValue);

watch(scale, (newVal, oldVal) => {
  if (newVal !== oldVal) {
    // 自动居中
    position.value = { x: 0, y: 0 };
  }
});

const debouncedRender = debounce(renderDiagram, 100);

watch(
  () => props.meta.content,
  (newVal, oldVal) => {
    if (newVal !== oldVal) debouncedRender();
  },
  { immediate: true }
);

watch(
  () => darkMode.value,
  () => {
    initMermaid();
  }
);
watch(svgValue, () => {
  nextTick(() => {
    if (containerRef.value) {
      const { width } = containerRef.value.getBoundingClientRect();
      containerRef.value.style.height = `${width * svgAspectRatio.value}px`;
    }
  });
});

onMounted(() => {
  initMermaid();
});
</script>

<template>
  <NCard :bordered="true" class="mb-2 mt-4">
    <ToolBar
      :lang-name="props.meta.langName"
      :copy-feedback="copyFeedback"
      :error-message="errorMessage"
      :show-code="showCode"
      :theme="darkMode ? 'dark' : 'light'"
      :is-svg="true"
      @copy="() => copyCode(props.meta.content, errorMessage)"
      @download="downloadSVG"
      @toggle-code="showCode = !showCode"
      @zoom="zoom"
      @retry="renderDiagram"
    />
    <div v-if="errorMessage && !showCode" class="error-message">❌ {{ errorMessage }}</div>
    <Transition name="mermaid-fade" mode="out-in">
      <div v-if="showCode" key="code" class="code-block">
        <pre>{{ props.meta.content }}</pre>
      </div>
      <div v-else-if="svgValue && !errorMessage" ref="containerRef" class="svg-container" :style="containerStyle">
        <div
          class="svg-wrapper"
          :style="{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            cursor: isDragging ? 'grabbing' : 'grab'
          }"
          @mousedown="startDrag"
          @touchstart.passive="startDrag"
        >
          <svg :viewBox="svgValue.viewBox" class="scalable-svg" v-html="svgValue.content"></svg>
        </div>
      </div>
    </Transition>
  </NCard>
</template>

<style scoped>
.mermaid-fade-enter-active,
.mermaid-fade-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.mermaid-fade-enter-from,
.mermaid-fade-leave-to {
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
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 6px;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}
.svg-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  transition: transform 0.2s ease-out;
  will-change: transform;
  transform-origin: top left;
  width: 100%;
  height: 100%;
}
.scalable-svg {
  transform-origin: center center;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: block;
  width: auto;
  height: auto;
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
