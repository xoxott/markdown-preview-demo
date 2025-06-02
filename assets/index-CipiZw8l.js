import{at as $}from"./index.vue_vue_type_style_index_0_lang-t8n68fXS.js";import{I as _,J as g,K as O,L as z,d as I,z as y,M as B,T as E,A as V,D as R,O as P,c as k,P as j,F as W,Q as A,R as H,r as h,S as L,a as w,o as S,b as T,e as b,w as N,U as D,V as J,W as K,X as M,g as x,Y as U,N as F,f as Q,B as X,Z as Y,a0 as Z}from"./index-CKwbowp9.js";import"./installCanvasRenderer-BimRMGna.js";import"./Space-B7KjECqM.js";const q=_([_("@keyframes spin-rotate",`
 from {
 transform: rotate(0);
 }
 to {
 transform: rotate(360deg);
 }
 `),g("spin-container",`
 position: relative;
 `,[g("spin-body",`
 position: absolute;
 top: 50%;
 left: 50%;
 transform: translateX(-50%) translateY(-50%);
 `,[O()])]),g("spin-body",`
 display: inline-flex;
 align-items: center;
 justify-content: center;
 flex-direction: column;
 `),g("spin",`
 display: inline-flex;
 height: var(--n-size);
 width: var(--n-size);
 font-size: var(--n-size);
 color: var(--n-color);
 `,[z("rotate",`
 animation: spin-rotate 2s linear infinite;
 `)]),g("spin-description",`
 display: inline-block;
 font-size: var(--n-font-size);
 color: var(--n-text-color);
 transition: color .3s var(--n-bezier);
 margin-top: 8px;
 `),g("spin-content",`
 opacity: 1;
 transition: opacity .3s var(--n-bezier);
 pointer-events: all;
 `,[z("spinning",`
 user-select: none;
 -webkit-user-select: none;
 pointer-events: none;
 opacity: var(--n-opacity-spinning);
 `)])]),G={small:20,medium:18,large:16},ee=Object.assign(Object.assign({},R.props),{contentClass:String,contentStyle:[Object,String],description:String,stroke:String,size:{type:[String,Number],default:"medium"},show:{type:Boolean,default:!0},strokeWidth:Number,rotate:{type:Boolean,default:!0},spinning:{type:Boolean,validator:()=>!0,default:void 0},delay:Number}),te=I({name:"Spin",props:ee,slots:Object,setup(l){const{mergedClsPrefixRef:u,inlineThemeDisabled:e}=V(l),s=R("Spin","-spin",q,P,l,u),c=k(()=>{const{size:i}=l,{common:{cubicBezierEaseInOut:n},self:m}=s.value,{opacitySpinning:C,color:a,textColor:r}=m,t=typeof i=="number"?j(i):m[W("size",i)];return{"--n-bezier":n,"--n-opacity-spinning":C,"--n-size":t,"--n-color":a,"--n-text-color":r}}),d=e?A("spin",k(()=>{const{size:i}=l;return typeof i=="number"?String(i):i[0]}),c,l):void 0,f=H(l,["spinning","show"]),v=h(!1);return L(i=>{let n;if(f.value){const{delay:m}=l;if(m){n=window.setTimeout(()=>{v.value=!0},m),i(()=>{clearTimeout(n)});return}}v.value=f.value}),{mergedClsPrefix:u,active:v,mergedStrokeWidth:k(()=>{const{strokeWidth:i}=l;if(i!==void 0)return i;const{size:n}=l;return G[typeof n=="number"?"medium":n]}),cssVars:e?void 0:c,themeClass:d==null?void 0:d.themeClass,onRender:d==null?void 0:d.onRender}},render(){var l,u;const{$slots:e,mergedClsPrefix:s,description:c}=this,d=e.icon&&this.rotate,f=(c||e.description)&&y("div",{class:`${s}-spin-description`},c||((l=e.description)===null||l===void 0?void 0:l.call(e))),v=e.icon?y("div",{class:[`${s}-spin-body`,this.themeClass]},y("div",{class:[`${s}-spin`,d&&`${s}-spin--rotate`],style:e.default?"":this.cssVars},e.icon()),f):y("div",{class:[`${s}-spin-body`,this.themeClass]},y(B,{clsPrefix:s,style:e.default?"":this.cssVars,stroke:this.stroke,"stroke-width":this.mergedStrokeWidth,class:`${s}-spin`}),f);return(u=this.onRender)===null||u===void 0||u.call(this),e.default?y("div",{class:[`${s}-spin-container`,this.themeClass],style:this.cssVars},y("div",{class:[`${s}-spin-content`,this.active&&`${s}-spin-content--spinning`,this.contentClass],style:this.contentStyle},e),y(E,{name:"fade-in-transition"},{default:()=>this.active?v:null})):v}});async function se(l,u,e="openChat",s={}){try{const c=new AbortController,d=s.timeout?setTimeout(()=>c.abort(),s.timeout):null,f=await fetch("http://localhost:11434/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:e,prompt:l,stream:!0}),signal:s.signal||c.signal});if(!f.ok)throw new Error(`请求失败: ${f.status} ${f.statusText}`);if(!f.body)throw new Error("响应体不可读");const v=f.body.getReader(),i=new TextDecoder("utf-8");let n="",m=!1;await(async()=>{try{for(;!m;){const{done:a,value:r}=await v.read();if(a){if(m=!0,n.trim())try{const o=JSON.parse(n);o.response&&u(o.response)}catch(o){console.warn("流结束时的缓冲区解析失败:",n,o)}break}n+=i.decode(r,{stream:!0});const t=n.split(`
`);n=t.pop()||"";for(const o of t)if(o.trim())try{const p=JSON.parse(o);if(p.done){m=!0;break}console.log(p),p.response&&(console.log(p),u(p.response))}catch(p){console.warn("流响应解析失败:",o,p),n=o+`
`+n;break}}}catch(a){if(a.name!=="AbortError")throw a}finally{d&&clearTimeout(d),v.releaseLock()}})()}catch(c){throw c.name==="AbortError"?new Error("请求超时"):c}}const ne={class:"chat-page"},ae={class:"chat-container"},oe={key:0,class:"message ai loading"},ie={class:"chat-input"},re=20,le=I({name:"chat",__name:"index",setup(l){const u=h(""),e=h([]),s=h(!1),c=h([]),d=h(!1),f=h(null),v=h(!1),i=h(0),n=a=>{const r=a.target,t=r.scrollTop,o=r.scrollHeight,p=r.clientHeight;v.value=t<i.value,o-(t+p)<50&&(v.value=!1),i.value=t},m=()=>{if(c.value.length===0||d.value)return;d.value=!0;const{index:a,token:r}=c.value.shift();e.value[a].displayContent||(e.value[a].displayContent="");let t=0;const o=setInterval(()=>{t<r.length?(e.value[a].displayContent+=r.charAt(t),t++):(clearInterval(o),d.value=!1,Y(()=>{c.value.length>0&&m()}))},re)},C=async()=>{var o;const a=u.value.trim();if(!a)return;e.value.push({role:"user",content:a,displayContent:a}),u.value="",s.value=!0;const r={role:"ai",content:"",displayContent:"▋"};e.value.push(r);const t=e.value.length-1;try{await se(a,p=>{c.value.push({index:t,token:p}),e.value[t].content+=p,d.value||m()})}catch(p){e.value[t].displayContent="⚠️ AI 响应失败",console.error(p)}finally{(o=e.value[t].displayContent)!=null&&o.endsWith("▋")&&(e.value[t].displayContent=e.value[t].displayContent.slice(0,-1)),s.value=!1}};return(a,r)=>(S(),w("div",ne,[T("div",ae,[b(x(U),{ref_key:"scrollbarRef",ref:f,class:"chat-messages",onScroll:n,trigger:"none"},{default:N(()=>[(S(!0),w(J,null,K(e.value,(t,o)=>(S(),w("div",{key:o,class:M(["message",t.role])},[b($,{content:t.content},null,8,["content"])],2))),128)),s.value?(S(),w("div",oe,[b(x(te),{size:"small"})])):D("",!0)]),_:1},512),T("div",ie,[b(x(F),{value:u.value,"onUpdate:value":r[0]||(r[0]=t=>u.value=t),type:"textarea",placeholder:"请输入你的问题...",disabled:s.value,autosize:{minRows:5,maxRows:5}},null,8,["value","disabled"]),b(x(X),{type:"primary",onClick:C,disabled:s.value||!u.value.trim(),loading:s.value},{default:N(()=>r[1]||(r[1]=[Q(" 发送 ")])),_:1},8,["disabled","loading"])])])]))}}),fe=Z(le,[["__scopeId","data-v-cccd7bbe"]]);export{fe as default};
