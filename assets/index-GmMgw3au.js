import{as as k,at as w}from"./index.vue_vue_type_style_index_0_lang-Dg2lAxjR.js";import{d as x,s as g,c as l,a as M,o as S,b as a,e as u,f as c,w as B,B as V,g as E,N,n as s}from"./index-BKJWDojW.js";import"./installCanvasRenderer-DC8Qm7K1.js";import"./Space-4Ks3rbFV.js";const _=`# 📝 Markdown 编辑器演示

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

---`,h={class:"mb-2 text-lg font-semibold"},z=x({name:"markdownedit",__name:"index",setup(T){const e=k(),o=g(_);async function m(t,n,d=100){let r="";for(let i=0;i<t.length;i++)r+=t[i],n(r),await new Promise(C=>setTimeout(C,d))}const p=()=>{m(o.value,t=>{o.value=t},100)},v=l(()=>({backgroundColor:e.value.bodyColor})),b=l(()=>({backgroundColor:e.value.bodyColor,borderColor:e.value.borderColor,color:e.value.textColorBase})),f=l(()=>({backgroundColor:e.value.bodyColor,color:e.value.textColorBase})),y=l(()=>({backgroundColor:e.value.cardColor,color:e.value.textColorBase,borderColor:e.value.borderColor}));return(t,n)=>{const d=V;return S(),M("div",{class:"h-full flex bg-gray-50",style:s(v.value)},[a("div",{class:"w-1/3 overflow-y-auto border-r border-gray-200 p-4",style:s(b.value)},[a("div",h,[n[2]||(n[2]=c(" Markdown 输入 ")),u(d,{onClick:p},{default:B(()=>n[1]||(n[1]=[c("流式渲染")])),_:1})]),u(E(N),{value:o.value,"onUpdate:value":n[0]||(n[0]=r=>o.value=r),type:"textarea",autosize:{minRows:20},placeholder:"请输入 Markdown 内容...",class:"w-full text-sm font-mono"},null,8,["value"])],4),a("div",{class:"w-2/3 overflow-y-auto p-4",style:s(f.value)},[n[3]||(n[3]=a("div",{class:"mb-2 text-lg font-semibold"},"预览结果",-1)),a("div",{class:"border border-gray-200 rounded-md p-4 shadow",style:s(y.value)},[u(w,{content:o.value},null,8,["content"])],4)],4)],4)}}});export{z as default};
