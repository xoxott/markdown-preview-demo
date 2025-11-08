<!--
 * @Author: yangtao 212920320@qq.com
 * @Date: 2025-11-08 09:20:48
 * @LastEditors: yangtao 212920320@qq.com
 * @LastEditTime: 2025-11-08 11:38:30
 * @FilePath: \markdown-preview-demo\src\views\file-manager\index.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<template>
  <file-explorer></file-explorer>
  <!-- <div class="h-200px">
      <ResizableLayout>
        <template #left>
           左侧 sidebar
        </template>
<div>
  <p v-for="item in 100">主体内容 main</p>
</div>
<template #right>
          右侧 sidebar or preview
        </template>
</ResizableLayout>
</div> -->

  <NSelectionRect auto-scroll >
    <NScrollbar class="w-100 h-50">
      <p 
        v-for="index in 50" 
        :key="index"
        :data-selectable-id="`${index}`"
        :style="{ 
          marginTop: index === 50 ? '50px' : '', 
          marginBottom: index === 1 ? '50px' : '' 
        }"
      >
        在此区域内拖动鼠标进行圈选 {{ index }}
      </p>
    </NScrollbar>
  </NSelectionRect>
</template>
<script lang="tsx" setup>
import ResizableLayout from '@/components/file-explorer/layout/ResizableLayout';
import NSelectionRect from '@/components/file-explorer/interaction/NSelectionRect';
import FileExplorer from '@/components/file-explorer/FileExplorer';
import { NScrollbar } from 'naive-ui';
import { nextTick, onMounted, ref } from 'vue';
</script>