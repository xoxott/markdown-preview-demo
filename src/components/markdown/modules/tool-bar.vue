<script setup lang="ts">
import {
  Check,
  Code,
  Copy,
  Download,
  LayoutBoard,
  PlayerPlay,
  Refresh,
  RotateClockwise2,
  ZoomIn,
  ZoomOut
} from '@vicons/tabler';
defineOptions({
  name: 'ToolBar'
});
interface Props {
  showCode?: boolean;
  copyFeedback: boolean;
  langName: string;
  errorMessage?: string | null | undefined;
  theme: 'dark' | 'light';
  isSvg: boolean;
}
type direction = 'in' | 'out' | 'reset';
type EmitEvents = {
  (e: 'toggleCode'): void;
  (e: 'zoom', key: direction): void;
  (e: 'download'): void;
  (e: 'copy'): void;
  (e: 'retry'): void;
  (e: 'run'): void;
};
const emit = defineEmits<EmitEvents>();
const props = defineProps<Props>();
</script>

<template>
  <div class="controls">
    <NTag
      size="small"
      type="default"
      :bordered="false"
      :theme-overrides="{
        color: props.theme === 'dark' ? '#27272a' : '#f4f4f5',
        textColor: props.theme === 'dark' ? '#e4e4e7' : '#71717a'
      }"
    >
      {{ props.langName }}
    </NTag>
    <div class="item-center flex gap-0.5rem">
      <NButton v-if="props.isSvg" size="small" @click="emit('toggleCode')">
        <NIcon v-if="props.showCode">
          <LayoutBoard />
        </NIcon>
        <NIcon v-else>
          <Code />
        </NIcon>
      </NButton>
      <template v-if="!props.showCode && !props.errorMessage && props.isSvg">
        <NButton size="small" title="放大" @click="emit('zoom', 'in')">
          <NIcon><ZoomIn /></NIcon>
        </NButton>
        <NButton size="small" title="缩小" @click="emit('zoom', 'out')">
          <NIcon>
            <ZoomOut />
          </NIcon>
        </NButton>
        <NButton size="small" title="重置缩放" @click="emit('zoom', 'reset')">
          <NIcon>
            <Refresh />
          </NIcon>
        </NButton>
        <NButton size="small" title="下载SVG" @click="emit('download')">
          <NIcon>
            <Download />
          </NIcon>
        </NButton>
      </template>
      <NButton size="small" title="复制代码" @click="emit('copy')">
        <NIcon v-if="props.copyFeedback">
          <Check />
        </NIcon>
        <NIcon v-else>
          <Copy />
        </NIcon>
      </NButton>
      <NButton
        v-if="props.langName === 'vue' || props.langName === 'javascript'"
        size="small"
        title="运行代码"
        @click="emit('run')"
      >
        <NIcon><PlayerPlay /></NIcon>
      </NButton>
      <NButton v-if="props.errorMessage" size="small" title="重试" @click="emit('retry')">
        <NIcon>
          <RotateClockwise2 />
        </NIcon>
      </NButton>
    </div>
  </div>
</template>

<style scoped>
.controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}
</style>
