<!--
 * @Author: yang 212920320@qq.com
 * @Date: 2025-09-14 18:47:49
 * @LastEditors: yang 212920320@qq.com
 * @LastEditTime: 2025-10-19 00:31:01
 * @FilePath: \markdown-preview-demo\src\views\utils\index.vue
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
<script setup lang="ts">
// import README from '~/packages/changelog/docs/README.md?raw';
import MarkDown from '@/components/markdown/index.vue';
import {  computed,ref,watch  } from 'vue';
import { useThemeVars } from 'naive-ui';
import { useRoute } from 'vue-router';
const docs = import.meta.glob('~/packages/changelog/docs/*.md', { as: 'raw' });
const themeVars = useThemeVars();
const previewStyle = computed(() => ({
  backgroundColor: themeVars.value.cardColor,
  color: themeVars.value.textColorBase,
  borderColor: themeVars.value.borderColor
}));
const content = ref('');
const route = useRoute();

async function loadDoc(path) {
  const key = `/packages/changelog/docs${path}`;
  if (docs[key]) {
    return docs[key](); // 返回的是 Promise<string>
  } else {
    throw new Error(`文档不存在: ${path}`);
  }
}

async function fetchDocFromHash() {
  const hash = route.hash.replace(/^#/, ''); // '#/cli.md' → '/cli.md'
    try {
      content.value = await loadDoc(hash || '/README.md');
    } catch (e) {
      content.value = '# 文档未找到';
    }
}

watch(
  () => route.hash,
  fetchDocFromHash,
  { immediate: true }
);

// const content = computed(()=> README)
</script>
<template>
    <div class="border border-gray-200 rounded-md p-4 shadow w-full text-12px w-full  flex items-center justify-center " :style="previewStyle">
        <MarkDown :content="content" />
   </div>
</template>