<!--
 * @Author: yang 212920320@qq.com
 * @Date: 2025-11-01 21:48:56
 * @LastEditors: yang 212920320@qq.com
 * @LastEditTime: 2025-11-01 23:43:22
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
        <custom-upload
          :multiple="true"
          :maxCount="5"
          :accept="'.png,.jpg,.jpeg,.gif'"
          @change="handleChange"
          abstract
        />
      </n-form-item>

      <n-form-item label="倒计时组件" class="flex items-center">
        <countdownTimer
          :seconds="35"
          label="预计剩余时间:"
          :showTrend="true"
        />
      </n-form-item>

      <n-form-item label="可编辑文本组件" class="flex items-center">
        <editableText
         value="可编辑内容"
        />
        </n-form-item>
    </n-form>
  </n-card>
</template>

<script lang="ts" setup>
import customUpload from '@/components/CustomUpload'
import countdownTimer from '@/components/custom/countdown-timer.vue'
import editableText from '@/components/custom/editable-text.vue'

const handleChange = (files: File[]) => {
  console.log('上传的文件:', files)
}
</script>
