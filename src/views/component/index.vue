<!--
 * @Author: yang 212920320@qq.com
 * @Date: 2025-11-01 21:48:56
 * @LastEditors: yangtao 212920320@qq.com
 * @LastEditTime: 2025-11-08 10:14:23
 * @FilePath: \markdown-preview-demo\src\views\component\index.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<template>
  <n-card bordered>
    <n-h3 class="text-lg font-semibold border-b pb-2">
      组件示例:
    </n-h3>
    <n-form label-placement="left" :show-label="true">
      <n-form-item label="自定义上传组件" class="flex items-center">
        <custom-upload :multiple="true" :maxCount="5" :accept="'.png,.jpg,.jpeg,.gif'" @change="handleChange"
          abstract />
      </n-form-item>

      <n-form-item label="倒计时组件" class="flex items-center">
        <countdownTimer :seconds="35" label="预计剩余时间:" :showTrend="true" />
      </n-form-item>

      <n-form-item label="可编辑文本组件" class="flex items-center">
        <editableText value="可编辑内容" />
      </n-form-item>

      <n-form-item label="圈选组件" class="flex items-center">
        <SelectionRect auto-scroll :selection-change="handleSelectionChange" scrollContainerSelector=".select-node"
          :selection-start="handleSelectionStart" :selection-end="handleSelectionEnd">
          <div class="w-100 h-50 rounded border-2 border-dashed overflow-auto select-node">
            <p v-for="(item, index) in 50" :data-selectable-id="`${index}`"
              :style="{ marginTop: index === 49 ? '50px' : '', marginBottom: index === 0 ? '50px' : '' }">{{
                `在此区域内拖动鼠标进行圈选${index}` }}</p>
          </div>
        </SelectionRect>
      </n-form-item>
    </n-form>

    <ResizableLayout>
        <template #left>
           左侧 sidebar
        </template>
        <div >
            <p v-for="item in 100">主体内容 main</p>
        </div>
        <template #right>
          右侧 sidebar or preview
        </template>
    </ResizableLayout>
  </n-card>
</template>

<script lang="ts" setup>
import customUpload from '@/components/custom-upload'
import countdownTimer from '@/components/custom/countdown-timer.vue'
import editableText from '@/components/custom/editable-text.vue'
import SelectionRect from '@/components/file-explorer/interaction/SelectionRect'
import { FileItem } from '@/components/file-explorer/types/file-explorer'
import ResizableLayout from '@/components/file-explorer/layout/ResizableLayout'

const handleChange = (files: File[]) => {
  console.log('上传的文件:', files)
}

const handleSelectionChange = (selected: FileItem[]) => {
  console.log('圈选的文件:', selected)
}

const handleSelectionStart = (selected: FileItem[]) => {
  console.log('开始圈选', selected)
}

const handleSelectionEnd = (selected: FileItem[]) => {
  console.log('结束圈选', selected)
}
</script>
