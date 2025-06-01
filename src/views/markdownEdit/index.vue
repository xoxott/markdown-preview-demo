<script setup lang="ts">
import { ref,computed } from "vue";
import { NInput,useThemeVars} from "naive-ui";
import MarkDown from "@/components/markdown/index.vue";
const themeVars = useThemeVars();

const content = ref(`# Markdown 编辑器演示

欢迎使用本编辑器，支持如下功能：

## ✨ 基础 Markdown 功能

- 支持 **加粗** / *斜体* / \`代码片段\`
- 支持 [链接](https://example.com)
- 支持有序 / 无序列表
---

## 🎨 Mermaid 图表

支持流程图、状态图、序列图等，使用标准 Mermaid 语法：

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

## 📊 ECharts 图表

以 JSON 形式编写图表配置，支持柱状图、折线图等：

\`\`\`echarts
{
  "title": { "text": "柱状图示例" },
  "tooltip": {},
  "xAxis": { "data": ["Mon", "Tue", "Wed", "Thu"] },
  "yAxis": {},
  "series": [{ "type": "bar", "data": [5, 20, 36, 10] }]
}
\`\`\`

---

## ⚙️ JavaScript 代码运行（Web Worker 执行）

\`\`\`javascript
function say(name) {
  return \`Hello, \${name}!\`;
}
console.log(say("世界"));
\`\`\`

---

## 🧩 Vue 3 组件运行（基于 @vue/repl）

\`\`\`vue
<template>
  <div class="text-blue-500 font-bold">
    👋 Hello from Vue 3!
  </div>
</template>
\`\`\`

---
`);

/**
 * 逐字打印工具函数
 * @param fullText 要打印的完整文本
 * @param onUpdate 每次更新调用的回调，传入当前累积的文本
 * @param delay 每个字符之间的延迟（毫秒）
 */
async function typewriterEffect(
  fullText: string,
  onUpdate: (current: string) => void,
  delay = 100
) {
  let currentText = "";
  for (let i = 0; i < fullText.length; i++) {
    currentText += fullText[i];
    onUpdate(currentText);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

const clickHandle = () => {
  typewriterEffect(
    content.value,
    (currentText) => {
      content.value = currentText;
    },
    100
  );
};
const editorStyle = computed(() => ({
  backgroundColor: themeVars.value.bodyColor
}))

const leftStyle = computed(() => ({
  backgroundColor: themeVars.value.bodyColor,
  borderColor: themeVars.value.borderColor,
  color: themeVars.value.textColorBase
}))

const rightStyle = computed(() => ({
  backgroundColor: themeVars.value.bodyColor,
  color: themeVars.value.textColorBase,
}))

const previewStyle = computed(() => ({
  backgroundColor: themeVars.value.cardColor,
  color: themeVars.value.textColorBase,
  borderColor: themeVars.value.borderColor
}))

</script>

<template>
  <div class="flex h-full bg-gray-50" :style="editorStyle">
    <!-- 左侧输入框 -->
    <div class="w-1/3 p-4 border-r border-gray-200 overflow-y-auto" :style="leftStyle">
      <div class="text-lg font-semibold mb-2">
        Markdown 输入 <n-button @click="clickHandle">流式渲染</n-button>
      </div>
      <NInput
        v-model:value="content"
        type="textarea"
        :autosize="{ minRows: 20 }"
        placeholder="请输入 Markdown 内容..."
        class="w-full font-mono text-sm"
      />
    </div>

    <!-- 右侧预览框 -->
    <div class="w-2/3 p-4 overflow-y-auto" :style="rightStyle">
      <div class="text-lg font-semibold mb-2">预览结果</div>
      <div class="rounded-md p-4 shadow border border-gray-200" :style="previewStyle">
        <MarkDown :content="content" />
      </div>
    </div>
  </div>
</template>
