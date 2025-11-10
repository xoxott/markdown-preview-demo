import{q as w,s as l,d as h,v as i,x as B,y as g,U as $,c as u,C as T,D as z,E as R,a as V,o as S,b as a}from"./index-D3pJGQdL.js";const j=w("text",`
 transition: color .3s var(--n-bezier);
 color: var(--n-text-color);
`,[l("strong",`
 font-weight: var(--n-font-weight-strong);
 `),l("italic",{fontStyle:"italic"}),l("underline",{textDecoration:"underline"}),l("code",`
 line-height: 1.4;
 display: inline-block;
 font-family: var(--n-font-famliy-mono);
 transition: 
 color .3s var(--n-bezier),
 border-color .3s var(--n-bezier),
 background-color .3s var(--n-bezier);
 box-sizing: border-box;
 padding: .05em .35em 0 .35em;
 border-radius: var(--n-code-border-radius);
 font-size: .9em;
 color: var(--n-code-text-color);
 background-color: var(--n-code-color);
 border: var(--n-code-border);
 `)]),M=Object.assign(Object.assign({},g.props),{code:Boolean,type:{type:String,default:"default"},delete:Boolean,strong:Boolean,italic:Boolean,underline:Boolean,depth:[String,Number],tag:String,as:{type:String,validator:()=>!0,default:void 0}}),D=h({name:"Text",props:M,setup(e){const{mergedClsPrefixRef:r,inlineThemeDisabled:o}=B(e),n=g("Typography","-text",j,$,e,r),s=u(()=>{const{depth:d,type:c}=e,x=c==="default"?d===void 0?"textColor":`textColor${d}Depth`:T("textColor",c),{common:{fontWeightStrong:m,fontFamilyMono:f,cubicBezierEaseInOut:v},self:{codeTextColor:b,codeBorderRadius:p,codeColor:C,codeBorder:y,[x]:k}}=n.value;return{"--n-bezier":v,"--n-text-color":k,"--n-font-weight-strong":m,"--n-font-famliy-mono":f,"--n-code-border-radius":p,"--n-code-text-color":b,"--n-code-color":C,"--n-code-border":y}}),t=o?z("text",u(()=>`${e.type[0]}${e.depth||""}`),s,e):void 0;return{mergedClsPrefix:r,compitableTag:R(e,["as","tag"]),cssVars:o?void 0:s,themeClass:t==null?void 0:t.themeClass,onRender:t==null?void 0:t.onRender}},render(){var e,r,o;const{mergedClsPrefix:n}=this;(e=this.onRender)===null||e===void 0||e.call(this);const s=[`${n}-text`,this.themeClass,{[`${n}-text--code`]:this.code,[`${n}-text--delete`]:this.delete,[`${n}-text--strong`]:this.strong,[`${n}-text--italic`]:this.italic,[`${n}-text--underline`]:this.underline}],t=(o=(r=this.$slots).default)===null||o===void 0?void 0:o.call(r);return this.code?i("code",{class:s,style:this.cssVars},this.delete?i("del",null,t):t):this.delete?i("del",{class:s,style:this.cssVars},t):i(this.compitableTag||"span",{class:s,style:this.cssVars},t)}}),O={xmlns:"http://www.w3.org/2000/svg","xmlns:xlink":"http://www.w3.org/1999/xlink",viewBox:"0 0 512 512"},N=h({name:"CloudUploadOutline",render:function(r,o){return S(),V("svg",O,o[0]||(o[0]=[a("path",{d:"M320 367.79h76c55 0 100-29.21 100-83.6s-53-81.47-96-83.6c-8.89-85.06-71-136.8-144-136.8c-69 0-113.44 45.79-128 91.2c-60 5.7-112 43.88-112 106.4s54 106.4 120 106.4h56",fill:"none",stroke:"currentColor","stroke-linecap":"round","stroke-linejoin":"round","stroke-width":"32"},null,-1),a("path",{fill:"none",stroke:"currentColor","stroke-linecap":"round","stroke-linejoin":"round","stroke-width":"32",d:"M320 255.79l-64-64l-64 64"},null,-1),a("path",{fill:"none",stroke:"currentColor","stroke-linecap":"round","stroke-linejoin":"round","stroke-width":"32",d:"M256 448.21V207.79"},null,-1)]))}});export{N as C,D as N};
