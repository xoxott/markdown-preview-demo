import{as as C,at as w}from"./index.vue_vue_type_style_index_0_lang-Dl039krD.js";import{d as g,r as k,c as s,a as B,o as _,b as r,e as i,f as c,w as M,B as S,g as V,N as h,n}from"./index-C86yfZIf.js";import"./installCanvasRenderer-BY7aeYK_.js";import"./Space-k-LUDtue.js";const N={class:"text-lg font-semibold mb-2"},A=g({name:"markdownedit",__name:"index",setup(T){const o=C(),t=k(`# Markdown 编辑器演示

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
`);async function m(a,e,d=100){let l="";for(let u=0;u<a.length;u++)l+=a[u],e(l),await new Promise(x=>setTimeout(x,d))}const v=()=>{m(t.value,a=>{t.value=a},100)},p=s(()=>({backgroundColor:o.value.bodyColor})),b=s(()=>({backgroundColor:o.value.bodyColor,borderColor:o.value.borderColor,color:o.value.textColorBase})),f=s(()=>({backgroundColor:o.value.bodyColor,color:o.value.textColorBase})),y=s(()=>({backgroundColor:o.value.cardColor,color:o.value.textColorBase,borderColor:o.value.borderColor}));return(a,e)=>{const d=S;return _(),B("div",{class:"flex h-full bg-gray-50",style:n(p.value)},[r("div",{class:"w-1/3 p-4 border-r border-gray-200 overflow-y-auto",style:n(b.value)},[r("div",N,[e[2]||(e[2]=c(" Markdown 输入 ")),i(d,{onClick:v},{default:M(()=>e[1]||(e[1]=[c("流式渲染")])),_:1})]),i(V(h),{value:t.value,"onUpdate:value":e[0]||(e[0]=l=>t.value=l),type:"textarea",autosize:{minRows:20},placeholder:"请输入 Markdown 内容...",class:"w-full font-mono text-sm"},null,8,["value"])],4),r("div",{class:"w-2/3 p-4 overflow-y-auto",style:n(f.value)},[e[3]||(e[3]=r("div",{class:"text-lg font-semibold mb-2"},"预览结果",-1)),r("div",{class:"rounded-md p-4 shadow border border-gray-200",style:n(y.value)},[i(w,{content:t.value},null,8,["content"])],4)],4)],4)}}});export{A as default};
