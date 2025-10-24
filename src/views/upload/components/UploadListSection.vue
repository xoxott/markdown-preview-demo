<template>
  <n-collapse-transition :show="true">
    <div class="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-300">
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <h3 class="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-gray-100 m-0">
          <n-icon :component="icon" :size="20" />
          {{ title }}
        </h3>
        <n-tag :type="tagType" :bordered="false" round size="small">
          {{ count }}
        </n-tag>
      </div>

      <!-- List -->
      <n-scrollbar class="max-h-72 transition-all duration-300">
        <n-list hoverable clickable class="!bg-transparent">
          <slot />
        </n-list>
      </n-scrollbar>
    </div>
  </n-collapse-transition>
</template>

<script setup lang="ts">
import { NIcon, NTag, NList, NScrollbar, NCollapseTransition } from 'naive-ui';
import type { Component } from 'vue';

interface Props {
  title: string;
  icon: Component;
  count: number;
  tagType?: 'info' | 'success' | 'warning' | 'error' | 'primary';
}

withDefaults(defineProps<Props>(), {
  tagType: 'info'
});
</script>