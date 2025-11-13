<!--
 * @Author: yang 212920320@qq.com
 * @Date: 2025-11-01 21:48:56
 * @LastEditors: yangtao 212920320@qq.com
 * @LastEditTime: 2025-11-08 14:34:28
 * @FilePath: \markdown-preview-demo\src\views\component\index.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script lang="ts" setup>
import customUpload from '@/components/custom-upload';
import countdownTimer from '@/components/custom/countdown-timer.vue';
import editableText from '@/components/custom/editable-text.vue';
import type { FileItem } from '@/components/file-explorer/types/file-explorer';
import NSelectionRect from '@/components/file-explorer/interaction/NSelectionRect';
import ResizableLayout from '@/components/file-explorer/layout/ResizableLayout';

const handleChange = (files: File[]) => {
  console.log('上传的文件:', files);
};

const handleSelectionChange = (selected: FileItem[]) => {
  console.log('圈选的文件:', selected);
};

const handleSelectionStart = (selected: FileItem[]) => {
  console.log('开始圈选', selected);
};

const handleSelectionEnd = (selected: FileItem[]) => {
  console.log('结束圈选', selected);
};
</script>

<template>
  <NCard bordered>
    <NH3 class="border-b pb-2 text-lg font-semibold">组件示例:</NH3>
    <NForm label-placement="left" :show-label="true">
      <NFormItem label="自定义上传组件" class="flex items-center">
        <CustomUpload :multiple="true" :max-count="5" accept=".png,.jpg,.jpeg,.gif" abstract @change="handleChange" />
      </NFormItem>

      <NFormItem label="倒计时组件" class="flex items-center">
        <CountdownTimer :seconds="35" label="预计剩余时间:" :show-trend="true" />
      </NFormItem>

      <NFormItem label="可编辑文本组件" class="flex items-center">
        <EditableText value="可编辑内容" />
      </NFormItem>
      <NText class="text-red">支持圈选自动横向、纵向滚动 注：通过插槽插入 NScrollbar 使用</NText>
      <NFormItem label="圈选组件" class="flex items-center">
        <NSelectionRect>
          <NScrollbar class="h-50 w-100" x-scrollable>
            <div
              v-for="index in 50"
              :key="index"
              :data-selectable-id="`${index}`"
              class="whitespace-nowrap"
              :style="{
                width: '1200px',
                marginTop: index === 50 ? '50px' : '',
                marginBottom: index === 1 ? '50px' : ''
              }"
            >
              在此区域内拖动鼠标进行圈选在此区域内拖动鼠标进行圈选在此区域内拖动鼠标进行圈选在此区域内拖动鼠标进行圈选
              {{ index }}
            </div>
          </NScrollbar>
        </NSelectionRect>
      </NFormItem>
    </NForm>
  </NCard>
</template>
