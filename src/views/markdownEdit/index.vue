<script setup lang="ts">
import { computed, ref } from 'vue';
import { NInput, useThemeVars } from 'naive-ui';
import MarkDown from '@/components/markdown/index.vue';
const themeVars = useThemeVars();

const content = ref(`# 📝 Markdown 编辑器演示

欢迎使用本编辑器！它支持多种增强功能，包括图表渲染、代码运行、组件预览等。

---

## ✨ 基础 Markdown 功能

- 支持 **加粗**、*斜体*、\`行内代码\`
- 支持 [超链接](https://example.com)
- 支持图片、引用、列表等常规 Markdown 语法
- 分隔线与标题：\`---\` 与 \`# / ## / ###\`

---

## 🎨 Mermaid 图表

支持流程图、时序图、状态图等，基于 Mermaid 渲染：

\`\`\`mermaid
sequenceDiagram
  participant 用户
  participant 系统
  用户->>系统: 登录请求
  系统-->>用户: 返回Token
  用户->>系统: 获取用户信息
  系统-->>用户: 返回用户数据
\`\`\`

---

## 🧠 思维导图（Markmap）

自动将 Markdown 大纲结构转为交互式思维导图：

\`\`\`markmap
# Vue 组件通信

- Props 和 Emits
- 插槽（Slots）
- 跨组件通信
  - provide/inject
  - 事件总线（event）
  - 全局状态管理（如 Pinia）
\`\`\`

> ✅ 当前编辑器已支持 Markmap 思维导图渲染

---

## 📊 ECharts 图表支持

通过 JSON 直接生成 ECharts 图表：

\`\`\`echarts
{
  "title": { "text": "周销售额" },
  "tooltip": {},
  "xAxis": { "data": ["周一", "周二", "周三", "周四"] },
  "yAxis": {},
  "series": [{ "type": "line", "data": [120, 200, 150, 80] }]
}
\`\`\`

---

## ⚙️ JavaScript 代码运行（Web Worker）

可直接运行 JS 代码，支持输出与错误捕获：

\`\`\`javascript
function greet(name) {
  return \`你好，\${name}！\`;
}
console.log(greet("编辑器用户"));
\`\`\`

---

## 🧩 Vue 3 组件运行（@vue/repl）

实时运行 Vue 3 单文件组件（SFC）：

\`\`\`vue
<template>
  <div class="p-2 text-green-600 border rounded">
    ✅ 这是一个运行中的 Vue 组件！
  </div>
</template>
\`\`\`

---
`);

/**
 * 逐字打印工具函数
 *
 * @param fullText 要打印的完整文本
 * @param onUpdate 每次更新调用的回调，传入当前累积的文本
 * @param delay 每个字符之间的延迟（毫秒）
 */
async function typewriterEffect(fullText: string, onUpdate: (current: string) => void, delay = 100) {
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
    100
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
        <MarkDown :content="content" />
      </div>
    </div>
  </div>
</template>
