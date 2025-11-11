<script setup lang="ts">
import { computed, ref } from 'vue';
import { NInput, useThemeVars } from 'naive-ui';
// import { MarkdownPreview } from '@/components/markdown';
import markdown from '@/components/markdown/index.vue';
import README from './README.md?raw';
const themeVars = useThemeVars();

const content = ref(README);

/**
 * 逐字打印工具函数
 *
 * @param fullText 要打印的完整文本
 * @param onUpdate 每次更新调用的回调，传入当前累积的文本
 * @param delay 每个字符之间的延迟（毫秒）
 */
async function typewriterEffect(fullText: string, onUpdate: (current: string) => void, delay = 10) {
  let currentText = '';
  for (let i = 0; i < fullText.length; i++) {
    currentText += fullText[i];
    onUpdate(currentText);
    // eslint-disable-next-line no-await-in-loop
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

const clickHandle = () => {
  typewriterEffect(
    content.value,
    currentText => {
      content.value = currentText;
    },
    10
  );
};
const editorStyle = computed(() => ({
  backgroundColor: themeVars.value.bodyColor
}));

const leftStyle = computed(() => ({
  backgroundColor: themeVars.value.bodyColor,
  borderColor: themeVars.value.borderColor,
  color: themeVars.value.textColorBase
}));

const rightStyle = computed(() => ({
  backgroundColor: themeVars.value.bodyColor,
  color: themeVars.value.textColorBase
}));

const previewStyle = computed(() => ({
  backgroundColor: themeVars.value.cardColor,
  color: themeVars.value.textColorBase,
  borderColor: themeVars.value.borderColor
}));
</script>

<template>
  <div class="h-full flex bg-gray-50" :style="editorStyle">
    <!-- 左侧输入框 -->
    <div class="w-1/3 overflow-y-auto border-r border-gray-200 p-4" :style="leftStyle">
      <div class="mb-2 text-lg font-semibold">
        Markdown 输入
        <NButton @click="clickHandle">流式渲染</NButton>
      </div>
      <NInput
        v-model:value="content"
        type="textarea"
        :autosize="{ minRows: 20 }"
        placeholder="请输入 Markdown 内容..."
        class="w-full text-sm font-mono"
      />
    </div>

    <!-- 右侧预览框 -->
    <div class="w-2/3 overflow-y-auto p-4" :style="rightStyle">
      <div class="mb-2 text-lg font-semibold">预览结果</div>
      <div class="border border-gray-200 rounded-md p-4 shadow" :style="previewStyle">
        <markdown :content="content" />
      </div>
    </div>
  </div>
</template>
