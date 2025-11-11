<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Component } from 'vue';
import { NEmpty, NIcon, NTag, NVirtualList } from 'naive-ui';
import { ChevronDownOutline } from '@vicons/ionicons5';

interface Props {
  title: string;
  icon: Component;
  count: number;
  items: any[];
  tagType?: 'info' | 'success' | 'warning' | 'error' | 'primary';
  defaultCollapsed?: boolean;
  maxHeight?: string;
  itemSize?: number;
}

const props = withDefaults(defineProps<Props>(), {
  tagType: 'info',
  defaultCollapsed: false,
  maxHeight: '400px',
  itemSize: 48
});
const itemsWithIndex = computed(() => props.items.map((item, i) => ({ ...item, _index: i })));

const isCollapsed = ref(props.defaultCollapsed);
const contentRef = ref<HTMLElement>();

// TODO: 计算实际高度，限制最大高度
const computedHeight = computed(() => {
  const realHeight = props.items.length * props.itemSize; // 16px padding
  const max = Number.parseInt(props.maxHeight);
  return `${Math.min(realHeight, max)}px`;
});

const toggleCollapse = () => {
  if (props.items.length === 0) return;
  isCollapsed.value = !isCollapsed.value;
};

// 暴露方法供父组件调用
defineExpose({
  toggleCollapse,
  isCollapsed
});
</script>

<template>
  <div
    class="overflow-hidden border border-gray-100 rounded-lg bg-white shadow-sm transition-colors duration-300 dark:border-gray-700 dark:bg-gray-800"
  >
    <!-- Header -->
    <div
      class="flex cursor-pointer items-center justify-between border-b border-gray-100 px-4 py-3 transition-colors dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
      @click="toggleCollapse"
    >
      <h3 class="m-0 flex items-center gap-2 text-lg text-gray-600 font-semibold dark:text-gray-300">
        <NIcon :component="icon" :size="20" />
        {{ title }}
      </h3>
      <div class="flex items-center gap-2">
        <NTag :type="tagType" :bordered="false" round size="small">
          {{ count }}
        </NTag>
        <NIcon
          :size="20"
          class="text-gray-300 transition-transform duration-300 ease-in-out dark:text-gray-500 group-hover:text-primary"
          :style="{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }"
        >
          <ChevronDownOutline />
        </NIcon>
      </div>
    </div>

    <!-- List Container with Smooth Transition -->
    <div
      ref="contentRef"
      class="overflow-hidden transition-all duration-300 ease-in-out"
      :style="{
        maxHeight: !isCollapsed ? '0px' : maxHeight,
        opacity: !isCollapsed ? 0 : 1
      }"
    >
      <div :style="{ height: maxHeight, overflow: 'hidden' }">
        <NVirtualList
          v-if="items.length > 0"
          v-show="isCollapsed"
          :items="itemsWithIndex"
          :item-size="itemSize"
          :item-resizable="false"
          :style="{ height: maxHeight }"
          class="virtual-list-container"
        >
          <template #default="{ item, index }">
            <slot name="item" :item="item" :index="item._index" />
          </template>
        </NVirtualList>
        <NEmpty v-else-if="items.length === 0" description="暂无数据" size="small" class="py-8" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.virtual-list-container {
  /* 确保虚拟列表容器有明确的高度 */
  position: relative;
}

/* 优化滚动性能 */
.virtual-list-container :deep(.n-scrollbar-container) {
  will-change: transform;
}

/* 防止内容溢出 */
.virtual-list-container :deep(.n-virtual-list) {
  overflow-y: auto !important;
  overflow-x: hidden;
}
</style>
