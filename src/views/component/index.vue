<!--
 * @Author: yangtao 212920320@qq.com
 * @Date: 2025-10-31 09:17:17
 * @LastEditors: yang 212920320@qq.com
 * @LastEditTime: 2025-11-01 22:41:55
 * @FilePath: \markdown-preview-demo\src\views\component\index.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<template>
  <div>
     <n-h3>组件实例:</n-h3>
     <n-form>
       <n-form-item label="自定义上传组件:">
        <CustomUpload 
          :multiple="true"
          :maxCount="5"
          :accept="'.png,.jpg,.jpeg,.gif'"
          @change="handleChange"
          abstract
        />
      </n-form-item>
     </n-form>
    
  </div>
</template>
<script lang="ts" setup>
import CustomUpload from '@/components/CustomUpload';

const handleChange = (files: File[]) => {
  console.log('上传的文件:', files);
}

</script>