<!--
 * @Author: yang 212920320@qq.com
 * @Date: 2025-11-01 21:48:56
 * @LastEditors: yang 212920320@qq.com
 * @LastEditTime: 2025-11-01 22:45:56
 * @FilePath: \markdown-preview-demo\src\views\mobile\index.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->

<template>
<div class="flex items-center justify-center ">
  <MobilePage :header-config="headerConfig"/>
</div>
</template>
<script setup lang="ts">
import { MobilePage } from '@/components/mobile/base/MobilePage';

const headerConfig = {
  show:false
}
</script>