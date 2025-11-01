<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-300">
    <!-- Header -->
    <div 
      class="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      @click="toggleCollapse"
    >
      <h3 class="flex items-center gap-2 text-lg font-semibold text-gray-600 dark:text-gray-300 m-0">
        <n-icon :component="icon" :size="20" />
        {{ title }}
      </h3>
      <div class="flex items-center gap-2">
        <n-tag :type="tagType" :bordered="false" round size="small">
          {{ count }}
        </n-tag>
        <n-icon 
          :size="20" 
           class="transition-transform duration-300 ease-in-out text-gray-300 dark:text-gray-500 group-hover:text-primary "
          :style="{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)'}"
        >
       <ChevronDownOutline/>
      </n-icon>
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
        <n-virtual-list
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
        </n-virtual-list>
        <n-empty 
          v-else-if="items.length === 0"
          description="暂无数据" 
          size="small"
          class="py-8"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { 
  NIcon, 
  NTag, 
  NVirtualList,
  NEmpty 
} from 'naive-ui';
import { ChevronDownOutline } from '@vicons/ionicons5';
import type { Component } from 'vue';

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
const itemsWithIndex = computed(() =>
  props.items.map((item, i) => ({ ...item, _index: i }))
);


const isCollapsed = ref(props.defaultCollapsed);
const contentRef = ref<HTMLElement>();

// TODO: 计算实际高度，限制最大高度
const computedHeight = computed(() => {
  const realHeight = props.items.length * props.itemSize; // 16px padding
  const max = parseInt(props.maxHeight)
  return `${Math.min(realHeight, max)}px`
})

const toggleCollapse = () => {
   if (props.items.length === 0) return
  isCollapsed.value = !isCollapsed.value;
};

// 暴露方法供父组件调用
defineExpose({
  toggleCollapse,
  isCollapsed
});
</script>

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