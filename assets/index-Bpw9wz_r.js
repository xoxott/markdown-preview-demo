import{av as y}from"./MarkdownPreview-CUEz8Zi4.js";import{d as h,r as k,c as l,a as C,o as V,b as r,e as d,f as u,w as M,B,g as m,a0 as S,R as i}from"./index-saEpKK3w.js";import{u as E}from"./use-theme-vars-BIXdptPX.js";import"./FileCode-DY-iW2wB.js";import"./Space-DXVLf2rs.js";import"./installCanvasRenderer-B4Gou539.js";const A=`# 📝 Markdown 编辑器演示

欢迎使用本编辑器！它支持多种增强功能，包括图表渲染、代码运行、组件预览等。

---

## ✨ 基础 Markdown 功能

- 支持 **加粗**、*斜体*、\`行内代码\`
- 支持 [超链接](https://example.com)
- 支持图片、引用、列表等常规 Markdown 语法
- 分隔线与标题：\`---\` 与 \`#  ##  ###\`

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

\`\`\`svg
<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="80" fill="steelblue" />
  <text x="100" y="100" text-anchor="middle" fill="white" font-size="20">
    SVG
  </text>
</svg>
\`\`\`

| 功能                       | 示例                            | 说明         |
| :----------------------- | :---------------------------- | :--------- |
| **加粗**                   | \`**bold**\` → **bold**         | 强调关键词或标题   |
| *斜体*                     | \`*italic*\` → *italic*         | 突出重点内容     |
| \`代码块\`                    | \`\` \`code\` \`\` → \`code\`         | 适合短代码或变量名  |
| [超链接](https://vuejs.org) | \`[Vue.js](https://vuejs.org)\` | 点击跳转外部网站   |
| 图片                       | \`![](url)\`                    | 可嵌入外链或本地图片 |

| 日期     | 访问量 (PV) | 独立访客 (UV) |    转化率   |
| :----- | -------: | --------: | :------: |
| 周一     |     1024 |       768 |   5.2%   |
| 周二     |     1540 |      1120 |   6.1%   |
| 周三     |     1875 |      1320 |   6.8%   |
| 周四     |     1322 |      1010 |   5.9%   |
| **合计** | **5761** |  **4218** | **6.0%** |

\`\`\`echarts
{
  "title": { "text": "月度销售趋势", "left": "center" },
  "tooltip": { "trigger": "axis" },
  "legend": { "data": ["线上", "线下"], "top": "10%" },
  "xAxis": { "type": "category", "data": ["1月", "2月", "3月", "4月", "5月", "6月"] },
  "yAxis": { "type": "value" },
  "series": [
    { "name": "线上", "type": "bar", "data": [820, 932, 901, 934, 1290, 1330] },
    { "name": "线下", "type": "line", "data": [620, 732, 801, 734, 1090, 1130] }
  ]
}
\`\`\`
\`\`\`markmap
# 前端工程化
- 构建工具
  - Vite
  - Webpack
- 框架生态
  - Vue 3
  - React
- 状态管理
  - Pinia
  - Redux
\`\`\`
\`\`\`mermaid
graph TD
  用户 -->|访问| 前端
  前端 -->|API 请求| 后端
  后端 -->|返回数据| 数据库
  数据库 --> 后端
  后端 --> 前端
  前端 -->|渲染页面| 用户
\`\`\`
\`\`\`vue
<template>
  <div class="p-4 border rounded-md text-center text-green-600 bg-green-50">
    <n-button type="primary" @click="count++">点击次数：{{ count }}</n-button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const count = ref(0)
<\/script>
\`\`\`
\`\`\`javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log("前 10 个斐波那契数列：", Array.from({ length: 10 }, (_, i) => fibonacci(i)));
\`\`\`
\`\`\`svg
<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
  <rect width="300" height="200" rx="16" fill="#1E40AF" />
  <circle cx="80" cy="100" r="40" fill="#F59E0B" />
  <circle cx="220" cy="100" r="40" fill="#10B981" />
  <text x="150" y="105" text-anchor="middle" fill="white" font-size="22">SVG</text>
</svg>
\`\`\`
| 功能模块          | 支持状态 | 说明              |
| :------------ | :--: | :-------------- |
| Markdown 基础语法 |   ✅  | 支持标题、引用、列表等     |
| 表格语法          |   ✅  | 自动样式美化          |
| Mermaid 图     |   ✅  | 支持流程图、时序图       |
| ECharts 图表    |   ✅  | JSON 一键渲染       |
| Markmap 思维导图  |   ✅  | 自动解析大纲          |
| Vue 组件运行      |   ✅  | 实时渲染 SFC        |
| JS 代码执行       |   ✅  | Web Worker 隔离运行 |
| SVG 内嵌图形      |   ✅  | 支持矢量展示          |
`,N={class:"mb-2 text-lg font-semibold"},F=h({name:"markdownedit",__name:"index",setup(_){const e=E(),t=k(A);async function p(o,n,s=10){let a="";for(let c=0;c<o.length;c++)a+=o[c],n(a),await new Promise(w=>setTimeout(w,s))}const v=()=>{p(t.value,o=>{t.value=o},20)},f=l(()=>({backgroundColor:e.value.bodyColor})),g=l(()=>({backgroundColor:e.value.bodyColor,borderColor:e.value.borderColor,color:e.value.textColorBase})),x=l(()=>({backgroundColor:e.value.bodyColor,color:e.value.textColorBase})),b=l(()=>({backgroundColor:e.value.cardColor,color:e.value.textColorBase,borderColor:e.value.borderColor}));return(o,n)=>{const s=B;return V(),C("div",{class:"h-full flex bg-gray-50",style:i(f.value)},[r("div",{class:"w-1/3 overflow-y-auto border-r border-gray-200 p-4",style:i(g.value)},[r("div",N,[n[2]||(n[2]=u(" Markdown 输入 ")),d(s,{onClick:v},{default:M(()=>n[1]||(n[1]=[u("流式渲染")])),_:1})]),d(m(S),{value:t.value,"onUpdate:value":n[0]||(n[0]=a=>t.value=a),type:"textarea",autosize:{minRows:20},placeholder:"请输入 Markdown 内容...",class:"w-full text-sm font-mono"},null,8,["value"])],4),r("div",{class:"w-2/3 overflow-y-auto p-4",style:i(x.value)},[n[3]||(n[3]=r("div",{class:"mb-2 text-lg font-semibold"},"预览结果",-1)),r("div",{class:"border border-gray-200 rounded-md p-4 shadow",style:i(b.value)},[d(m(y),{content:t.value},null,8,["content"])],4)],4)],4)}}});export{F as default};
