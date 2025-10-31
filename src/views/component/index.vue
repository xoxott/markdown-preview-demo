<!--
 * @Author: yangtao 212920320@qq.com
 * @Date: 2025-10-31 09:17:17
 * @LastEditors: yangtao 212920320@qq.com
 * @LastEditTime: 2025-10-31 10:46:40
 * @FilePath: \markdown-preview-demo\src\views\component\index.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<template>
  <div>
     组件示例
     <custom-upload directory-dnd multiple directory @change="handleChange" abstract/>
  </div>
</template>
<script lang="ts" setup>
import customUpload from '@/components/customUpload';

const handleChange = (files: File[]) => {
  console.log('上传的文件:', files);
}

</script>