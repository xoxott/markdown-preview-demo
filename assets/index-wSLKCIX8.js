import{as as w,at as k}from"./index.vue_vue_type_style_index_0_lang-t8n68fXS.js";import{d as x,r as g,c as s,a as B,o as M,b as r,e as i,f as m,w as S,B as V,g as h,N as E,n}from"./index-CKwbowp9.js";import"./installCanvasRenderer-BimRMGna.js";import"./Space-B7KjECqM.js";const N={class:"mb-2 text-lg font-semibold"},P=x({name:"markdownedit",__name:"index",setup(_){const o=w(),t=g(`# 📝 Markdown 编辑器演示

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
graph TD
  A[开始] --> B{条件判断}
  B -- 是 --> C[执行操作A]
  B -- 否 --> D[执行操作B]
  C --> E[结束]
  D --> E
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
`);async function c(a,e,d=100){let l="";for(let u=0;u<a.length;u++)l+=a[u],e(l),await new Promise(y=>setTimeout(y,d))}const v=()=>{c(t.value,a=>{t.value=a},100)},p=s(()=>({backgroundColor:o.value.bodyColor})),b=s(()=>({backgroundColor:o.value.bodyColor,borderColor:o.value.borderColor,color:o.value.textColorBase})),f=s(()=>({backgroundColor:o.value.bodyColor,color:o.value.textColorBase})),C=s(()=>({backgroundColor:o.value.cardColor,color:o.value.textColorBase,borderColor:o.value.borderColor}));return(a,e)=>{const d=V;return M(),B("div",{class:"h-full flex bg-gray-50",style:n(p.value)},[r("div",{class:"w-1/3 overflow-y-auto border-r border-gray-200 p-4",style:n(b.value)},[r("div",N,[e[2]||(e[2]=m(" Markdown 输入 ")),i(d,{onClick:v},{default:S(()=>e[1]||(e[1]=[m("流式渲染")])),_:1})]),i(h(E),{value:t.value,"onUpdate:value":e[0]||(e[0]=l=>t.value=l),type:"textarea",autosize:{minRows:20},placeholder:"请输入 Markdown 内容...",class:"w-full text-sm font-mono"},null,8,["value"])],4),r("div",{class:"w-2/3 overflow-y-auto p-4",style:n(f.value)},[e[3]||(e[3]=r("div",{class:"mb-2 text-lg font-semibold"},"预览结果",-1)),r("div",{class:"border border-gray-200 rounded-md p-4 shadow",style:n(C.value)},[i(k,{content:t.value},null,8,["content"])],4)],4)],4)}}});export{P as default};
