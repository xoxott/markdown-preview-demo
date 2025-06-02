import{as as k,at as w}from"./index.vue_vue_type_style_index_0_lang-DfpaHmod.js";import{d as x,r as g,c as s,a as M,o as S,b as r,e as u,f as c,w as B,B as V,g as N,N as _,n}from"./index-CaOsx7GB.js";import"./installCanvasRenderer-ClJTgc7i.js";import"./Space-CkXPMJO5.js";const h={class:"mb-2 text-lg font-semibold"},z=x({name:"markdownedit",__name:"index",setup(E){const o=k(),t=g(`# 📝 Markdown 编辑器演示

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
`);async function m(a,e,d=100){let l="";for(let i=0;i<a.length;i++)l+=a[i],e(l),await new Promise(C=>setTimeout(C,d))}const p=()=>{m(t.value,a=>{t.value=a},100)},v=s(()=>({backgroundColor:o.value.bodyColor})),b=s(()=>({backgroundColor:o.value.bodyColor,borderColor:o.value.borderColor,color:o.value.textColorBase})),f=s(()=>({backgroundColor:o.value.bodyColor,color:o.value.textColorBase})),y=s(()=>({backgroundColor:o.value.cardColor,color:o.value.textColorBase,borderColor:o.value.borderColor}));return(a,e)=>{const d=V;return S(),M("div",{class:"h-full flex bg-gray-50",style:n(v.value)},[r("div",{class:"w-1/3 overflow-y-auto border-r border-gray-200 p-4",style:n(b.value)},[r("div",h,[e[2]||(e[2]=c(" Markdown 输入 ")),u(d,{onClick:p},{default:B(()=>e[1]||(e[1]=[c("流式渲染")])),_:1})]),u(N(_),{value:t.value,"onUpdate:value":e[0]||(e[0]=l=>t.value=l),type:"textarea",autosize:{minRows:20},placeholder:"请输入 Markdown 内容...",class:"w-full text-sm font-mono"},null,8,["value"])],4),r("div",{class:"w-2/3 overflow-y-auto p-4",style:n(f.value)},[e[3]||(e[3]=r("div",{class:"mb-2 text-lg font-semibold"},"预览结果",-1)),r("div",{class:"border border-gray-200 rounded-md p-4 shadow",style:n(y.value)},[u(w,{content:t.value},null,8,["content"])],4)],4)],4)}}});export{z as default};
