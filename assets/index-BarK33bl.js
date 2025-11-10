import{as as k}from"./index.vue_vue_type_style_index_0_lang-DcpF90Fn.js";import{d as w,F as x,c as l,a as g,o as M,b as a,e as u,f as c,w as S,B,g as V,S as E,J as s}from"./index-D3pJGQdL.js";import{u as _}from"./use-theme-vars-CxNnKqFN.js";import"./Check-C7VvBDFl.js";import"./installCanvasRenderer-DsW6pPxT.js";const h=`# 📝 Markdown 编辑器演示

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
  return \`你好，\\\${name}！\`;
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

---`,N={class:"mb-2 text-lg font-semibold"},D=w({name:"markdownedit",__name:"index",setup(J){const e=_(),o=x(h);async function m(t,n,d=10){let r="";for(let i=0;i<t.length;i++)r+=t[i],n(r),await new Promise(C=>setTimeout(C,d))}const p=()=>{m(o.value,t=>{o.value=t},80)},v=l(()=>({backgroundColor:e.value.bodyColor})),f=l(()=>({backgroundColor:e.value.bodyColor,borderColor:e.value.borderColor,color:e.value.textColorBase})),b=l(()=>({backgroundColor:e.value.bodyColor,color:e.value.textColorBase})),y=l(()=>({backgroundColor:e.value.cardColor,color:e.value.textColorBase,borderColor:e.value.borderColor}));return(t,n)=>{const d=B;return M(),g("div",{class:"h-full flex bg-gray-50",style:s(v.value)},[a("div",{class:"w-1/3 overflow-y-auto border-r border-gray-200 p-4",style:s(f.value)},[a("div",N,[n[2]||(n[2]=c(" Markdown 输入 ")),u(d,{onClick:p},{default:S(()=>n[1]||(n[1]=[c("流式渲染")])),_:1})]),u(V(E),{value:o.value,"onUpdate:value":n[0]||(n[0]=r=>o.value=r),type:"textarea",autosize:{minRows:20},placeholder:"请输入 Markdown 内容...",class:"w-full text-sm font-mono"},null,8,["value"])],4),a("div",{class:"w-2/3 overflow-y-auto p-4",style:s(b.value)},[n[3]||(n[3]=a("div",{class:"mb-2 text-lg font-semibold"},"预览结果",-1)),a("div",{class:"border border-gray-200 rounded-md p-4 shadow",style:s(y.value)},[u(k,{content:o.value},null,8,["content"])],4)],4)],4)}}});export{D as default};
