const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["js/vendor-DcIUhThl.js","js/vue-vendor-B0CRajcZ.js","js/monaco-editor-_4fVdjRp.js","css/monaco-editor-BjXEa1oT.css","css/vue-vendor-DN7q_TBP.css","css/vendor-CI2TfMtd.css"])))=>i.map(i=>d[i]);
var Te=Object.defineProperty;var Pe=(t,a,l)=>a in t?Te(t,a,{enumerable:!0,configurable:!0,writable:!0,value:l}):t[a]=l;var ne=(t,a,l)=>Pe(t,typeof a!="symbol"?a+"":a,l);import{N as Re,F as Me}from"./FilePreview-CoT_Akvm.js";import{C as ke}from"./index-CRgwkwN6.js";import{h as M,r as v,j as W,w as be,a as ze,P as e,q as Ue,e as u,f as he,E as j}from"./vue-vendor-B0CRajcZ.js";import{G as S,B as F,W as ye,q as Oe,P as T,X as _,H as $e,I as J,S as ae,s as L,L as U,Y as ue,J as Fe,U as V,K as Q,C as Ie,v as Ne,g as xe,t as Ce,V as R}from"./naive-ui-DXV6QiKv.js";import{dp as je,dm as B,dq as d,dr as r,ds as q,dt as O,dn as g,du as $,dv as we,dw as _e,dx as Le,dy as se}from"./vendor-DcIUhThl.js";import{B as Ve}from"./index-C2-SSMui.js";import{_ as qe}from"./monaco-editor-_4fVdjRp.js";import{M as ee}from"./MonacoEditor-Cu_7ATYT.js";import{u as He,E as We}from"./index-DxkQ0Yr6.js";import{r as Ge,S as Z,T as ie,D as le,a as re}from"./TablePage-B7L5TkXC.js";import"./vueuse-BYFd2pJT.js";import"./echarts-AQqpYUDV.js";const Je=M({name:"CountdownTimer",props:{seconds:{type:Number,required:!0},label:{type:String,default:"预计剩余:"},showTrend:{type:Boolean,default:!1},updateThreshold:{type:Number,default:5}},setup(t){const a=v(""),l=v("stable");let n=0,s=0,m=0,c=null;function f(b){if(b<=0)return"即将完成";const A=Math.floor(b/3600),H=Math.floor(b%3600/60),G=Math.floor(b%60);return A>0?`${A}小时${H}分钟`:H>0?`${H}分${G}秒`:`${G}秒`}function o(){c&&clearInterval(c),n=t.seconds,s=Date.now(),a.value=f(n),c=window.setInterval(()=>{const b=Date.now(),A=(b-s)/1e3;n=Math.max(0,n-A),s=b,a.value=f(n),n<=0&&p()},1e3)}function p(){c&&(clearInterval(c),c=null)}function w(b){if(m===0)l.value="stable";else{const A=b-m;A>3?l.value="up":A<-3?l.value="down":l.value="stable"}m=b}const k=W(()=>n<=0?"completed":n<30?"warning":"normal"),y=W(()=>`trend-${l.value}`),x=W(()=>{switch(l.value){case"up":return"⬆️";case"down":return"⬇️";default:return"→"}});return be(()=>t.seconds,b=>{const A=Math.abs(b-n);(A>t.updateThreshold||c===null)&&(console.log(`🕐 时间更新: ${n.toFixed(0)}s -> ${b}s (差异: ${A.toFixed(1)}s)`),w(b),o())},{immediate:!0}),ze(()=>{p()}),()=>e("div",{class:"countdown-timer"},[e("span",{class:"label"},[t.label]),e("span",{class:["time",k.value]},[a.value]),t.showTrend&&e("span",{class:["trend",y.value]},[x.value])])}}),Ze=M({name:"EditableText",props:{value:{type:String,required:!0},textPrefix:{type:String,default:""},placeholder:{type:String,default:"请输入"},isHovering:{type:Boolean,default:!0}},emits:["update:modelValue","success"],setup(t,{emit:a}){const l=v(!1),n=v(t.value),s=v();be(()=>t.value,o=>{l.value||(n.value=o)});function m(){l.value=!0,n.value=t.value,Ue(()=>{var o;(o=s.value)==null||o.focus()})}function c(){l.value=!1,a("update:modelValue",n.value),a("success",n.value)}function f(o){o.key==="Enter"&&c()}return()=>e("div",{class:"flex items-center"},[l.value?e(Oe,{ref:s,value:n.value,"onUpdate:value":o=>n.value=o,size:"small",placeholder:t.placeholder,autofocus:!0,class:"h-8 w-full",style:{"--n-height":"32px"},onBlur:c,onKeyup:f},null):e("div",{class:"group flex items-center py-0.5"},[e(S,null,{default:()=>[t.textPrefix+t.value]}),t.isHovering&&e(F,{quaternary:!0,size:"tiny",circle:!0,class:"h-5 w-5 flex items-center justify-center",onClick:m},{default:()=>[e(ye,null,{default:()=>[e(je,null,null)]})]})])])}});function Ke(t){return typeof t=="function"||Object.prototype.toString.call(t)==="[object Object]"&&!he(t)}const Xe=M({name:"BasicComponentsExample",setup(){const t=a=>{console.log("上传的文件:",a)};return()=>{let a;return e(T,{bordered:!0},{default:()=>[e(_,{class:"border-b pb-2 text-lg font-semibold"},{default:()=>[u("基础组件示例:")]}),e($e,{"label-placement":"left","show-label":!0},{default:()=>[e(J,{label:"自定义上传组件",class:"flex items-center"},{default:()=>[e(ke,{multiple:!0,"max-count":5,accept:".png,.jpg,.jpeg,.gif",abstract:!0,onChange:t},null)]}),e(J,{label:"倒计时组件",class:"flex items-center"},{default:()=>[e(Je,{seconds:35,label:"预计剩余时间:","show-trend":!0},null)]}),e(J,{label:"可编辑文本组件",class:"flex items-center"},{default:()=>[e(Ze,{value:"可编辑内容"},null)]}),e(S,{class:"text-red"},{default:()=>[u("支持圈选自动横向、纵向滚动 注：通过插槽插入 NScrollbar 使用")]}),e(J,{label:"圈选组件",class:"flex items-center"},{default:()=>[e(Re,null,{default:()=>[e(ae,{class:"h-50 w-100","x-scrollable":!0},Ke(a=Array.from({length:50},(l,n)=>{const s=n+1;return e("div",{key:s,"data-selectable-id":`${s}`,class:"whitespace-nowrap",style:{width:"1200px",marginTop:s===50?"50px":"",marginBottom:s===1?"50px":""}},[u("在此区域内拖动鼠标进行圈选在此区域内拖动鼠标进行圈选在此区域内拖动鼠标进行圈选在此区域内拖动鼠标进行圈选"),s])}))?a:{default:()=>[a]})]})]})]})]})}}}),Ye={level:2,enabled:!0,prefix:"[Flow]"};class Qe{constructor(a={}){ne(this,"config");this.config={...Ye,...a}}debug(a,...l){this.shouldLog(0)&&console.log(`${this.config.prefix} [DEBUG] ${a}`,...l)}info(a,...l){this.shouldLog(1)&&console.log(`${this.config.prefix} [INFO] ${a}`,...l)}warn(a,...l){this.shouldLog(2)&&console.warn(`${this.config.prefix} [WARN] ${a}`,...l)}error(a,...l){this.shouldLog(3)&&console.error(`${this.config.prefix} [ERROR] ${a}`,...l)}shouldLog(a){return this.config.enabled&&a>=this.config.level}setLevel(a){this.config.level=a}setEnabled(a){this.config.enabled=a}}new Qe;const el=B({x:d(),y:d()}),ll=B({width:d().positive(),height:d().positive()}),tl=B({id:g().min(1),type:O(["source","target"]),position:O(["top","bottom","left","right"]),style:q(g(),$()).optional(),hidden:r().optional(),connectable:r().optional()});B({id:g().min(1),type:g(),position:el,data:$(),size:ll.optional(),style:q(g(),$()).optional(),class:g().optional(),selected:r().optional(),draggable:r().optional(),connectable:r().optional(),selectable:r().optional(),deletable:r().optional(),locked:r().optional(),handles:we(tl).optional()});B({id:g().min(1),source:g().min(1),target:g().min(1),sourceHandle:g().optional(),targetHandle:g().optional(),type:g().optional(),style:q(g(),$()).optional(),class:g().optional(),selected:r().optional(),animated:r().optional(),showArrow:r().optional(),label:g().optional(),data:$().optional()});B({x:d(),y:d(),zoom:d().positive()});const al=B({minZoom:d().min(.01).max(1).optional(),maxZoom:d().min(1).max(10).optional(),defaultZoom:d().positive().optional(),zoomStep:d().positive().optional(),showGrid:r().optional(),gridType:O(["dots","lines","none"]).optional(),gridSize:d().positive().optional(),gridColor:g().optional(),gridOpacity:d().min(0).max(1).optional(),backgroundColor:g().optional(),fitViewOnInit:r().optional(),fitViewOnResize:r().optional(),fitViewPadding:d().min(0).max(1).optional(),panOnDrag:_e([r(),we(d())]).optional(),zoomOnScroll:r().optional(),zoomOnPinch:r().optional(),zoomOnDoubleClick:r().optional()}),ol=B({defaultWidth:d().positive().optional(),defaultHeight:d().positive().optional(),minWidth:d().positive().optional(),minHeight:d().positive().optional(),borderRadius:d().min(0).optional(),draggable:r().optional(),selectable:r().optional(),connectable:r().optional(),deletable:r().optional(),portSize:d().positive().optional(),portSpacing:d().min(0).optional(),portOffset:d().min(0).optional(),nodeTypes:q(g(),$()).optional()}),nl=B({defaultType:O(["bezier","straight","step","smoothstep","smart"]).optional(),defaultStrokeWidth:d().positive().optional(),defaultStrokeColor:g().optional(),selectedStrokeWidth:d().positive().optional(),selectedStrokeColor:g().optional(),hoverStrokeWidth:d().positive().optional(),hoverStrokeColor:g().optional(),showArrow:r().optional(),arrowSize:d().positive().optional(),clickAreaWidth:d().positive().optional(),bezierControlOffset:d().min(0).max(1).optional(),stepRadius:d().min(0).optional(),animationDuration:d().positive().optional(),selectable:r().optional(),deletable:r().optional(),animated:r().optional(),edgeTypes:q(g(),$()).optional(),edgePathGenerators:q(g(),$()).optional()}),ul=B({enableMultiSelection:r().optional(),multiSelectKey:O(["ctrl","shift","alt","meta"]).optional(),enableBoxSelection:r().optional(),boxSelectionKey:O(["ctrl","shift","alt","meta"]).optional(),enableContextMenu:r().optional(),enableCanvasPan:r().optional(),enableWheelZoom:r().optional(),connectOnClick:r().optional(),connectionMode:O(["strict","loose"]).optional(),dragThreshold:d().min(0).optional(),doubleClickDelay:d().positive().optional(),nodesDraggable:r().optional(),nodesConnectable:r().optional(),nodesSelectable:r().optional(),edgesSelectable:r().optional(),edgesDeletable:r().optional()}),sl=B({enableRAFThrottle:r().optional(),enableVirtualScroll:r().optional(),virtualScrollBuffer:d().positive().optional(),enableViewportCulling:r().optional(),enableGPUAcceleration:r().optional(),enableEdgeCanvasRendering:r().optional(),edgeCanvasThreshold:d().positive().optional(),maxHistorySize:d().positive().optional(),enableConfigCache:r().optional(),cacheSizeLimit:d().positive().optional()}),il=B({mode:O(["light","dark","auto"]).optional(),primaryColor:g().optional(),successColor:g().optional(),warningColor:g().optional(),errorColor:g().optional(),infoColor:g().optional(),fontFamily:g().optional(),fontSize:d().positive().optional(),borderRadius:d().min(0).optional(),boxShadow:g().optional()});B({canvas:al.optional(),nodes:ol.optional(),edges:nl.optional(),interaction:ul.optional(),performance:sl.optional(),theme:il.optional()});const D=Ve({baseURL:"https://jsonplaceholder.typicode.com",timeout:1e4,headers:{"Content-Type":"application/json"}}),rl=M({name:"RequestClientExample",setup(){const t=v(!1),a=v(null),l=v(null),n=v([]),s=v(0),m=v(0),c=v(null),f=v(null),o=i=>{const C=new Date().toLocaleTimeString();n.value.unshift(`[${C}] ${i}`),n.value.length>50&&n.value.pop()},p=async()=>{t.value=!0,l.value=null,a.value=null,o("开始基础请求...");try{const i=await D.get("/posts/1");a.value=i,o("基础请求成功")}catch(i){l.value=i.message||"请求失败",o(`基础请求失败: ${l.value}`)}finally{t.value=!1}},w=async()=>{t.value=!0,l.value=null,a.value=null,o("开始缓存请求（第一次，会发送请求）...");try{const i=Date.now(),C=await D.get("/posts/2",void 0,{cache:!0,cacheExpireTime:6e4}),E=Date.now()-i;a.value={...C,_duration:E,_fromCache:!1},o(`缓存请求成功（耗时: ${E}ms）`),setTimeout(async()=>{o("开始缓存请求（第二次，应该从缓存读取）...");const P=Date.now(),Y=await D.get("/posts/2",void 0,{cache:!0,cacheExpireTime:6e4}),oe=Date.now()-P;a.value={...Y,_duration:oe,_fromCache:!0},o(`缓存请求成功（从缓存读取，耗时: ${oe}ms）`),t.value=!1},100)}catch(i){l.value=i.message||"请求失败",o(`缓存请求失败: ${l.value}`),t.value=!1}},k=async()=>{t.value=!0,l.value=null,a.value=null,o("开始重试请求（会失败并重试）...");try{const i=await D.get("/posts/99999",void 0,{retry:{retry:!0,retryCount:3,retryOnTimeout:!1}});a.value=i,o("重试请求成功")}catch(i){l.value=i.message||"请求失败",o(`重试请求失败（已重试）: ${l.value}`)}finally{t.value=!1}},y=async()=>{t.value=!0,l.value=null,a.value=null,o("开始去重请求（同时发送3个相同请求，应该只发送1个）...");try{const i=[D.get("/posts/3",void 0,{dedupe:!0}),D.get("/posts/3",void 0,{dedupe:!0}),D.get("/posts/3",void 0,{dedupe:!0})],C=await Promise.all(i);a.value={count:C.length,data:C[0],message:"3个请求被去重为1个"},o("去重请求成功（3个请求被去重为1个）")}catch(i){l.value=i.message||"请求失败",o(`去重请求失败: ${l.value}`)}finally{t.value=!1}},x=async()=>{t.value=!0,l.value=null,a.value=null,o("开始队列请求（发送10个请求，最大并发5个）...");try{const i=Array.from({length:10},(E,P)=>D.get(`/posts/${P+1}`,void 0,{queue:{maxConcurrent:5,queueStrategy:"fifo"},priority:10-P})),C=await Promise.all(i);a.value={count:C.length,message:"10个请求通过队列管理（最大并发5个）"},o("队列请求成功（10个请求通过队列管理）")}catch(i){l.value=i.message||"请求失败",o(`队列请求失败: ${l.value}`)}finally{t.value=!1}},b=async()=>{t.value=!0,l.value=null,a.value=null,s.value=0,m.value=0,o("开始进度监控请求...");try{const i=await D.post("/posts",{title:"Test Post",body:"This is a test post",userId:1},{onUploadProgress:C=>{const E=C;E.total&&(s.value=Math.round(E.loaded*100/E.total),o(`上传进度: ${s.value}%`))},onDownloadProgress:C=>{const E=C;E.total&&(m.value=Math.round(E.loaded*100/E.total),o(`下载进度: ${m.value}%`))}});a.value=i,o("进度监控请求成功")}catch(i){l.value=i.message||"请求失败",o(`进度监控请求失败: ${l.value}`)}finally{t.value=!1}},A=async()=>{var C,E;t.value=!0,l.value=null,a.value=null,o("开始可中止请求...");const i=new AbortController;f.value=i,c.value=`request-${Date.now()}`;try{const P=D.get("/posts",void 0,{abortable:!0,requestId:c.value,signal:i.signal});setTimeout(()=>{o("中止请求..."),i.abort()},3e3);const Y=await P;a.value=Y,o("可中止请求成功")}catch(P){P.name==="AbortError"||(C=P.message)!=null&&C.includes("canceled")||(E=P.message)!=null&&E.includes("aborted")?(l.value="请求已被中止",o("请求已被中止")):(l.value=P.message||"请求失败",o(`可中止请求失败: ${l.value}`))}finally{t.value=!1,f.value=null}},H=()=>{f.value&&(f.value.abort(),o("手动中止请求"))},G=async()=>{t.value=!0,l.value=null,a.value=null,o("开始 POST 请求...");try{const i=await D.post("/posts",{title:"New Post",body:"This is a new post",userId:1});a.value=i,o("POST 请求成功")}catch(i){l.value=i.message||"请求失败",o(`POST 请求失败: ${l.value}`)}finally{t.value=!1}},De=async()=>{t.value=!0,l.value=null,a.value=null,o("开始 PUT 请求...");try{const i=await D.put("/posts/1",{id:1,title:"Updated Post",body:"This post has been updated",userId:1});a.value=i,o("PUT 请求成功")}catch(i){l.value=i.message||"请求失败",o(`PUT 请求失败: ${l.value}`)}finally{t.value=!1}},Se=async()=>{t.value=!0,l.value=null,a.value=null,o("开始 DELETE 请求...");try{await D.delete("/posts/1"),a.value={message:"删除成功"},o("DELETE 请求成功")}catch(i){l.value=i.message||"请求失败",o(`DELETE 请求失败: ${l.value}`)}finally{t.value=!1}},Be=async()=>{t.value=!0,l.value=null,a.value=null,o("开始完整配置请求（包含所有功能）...");try{const i=await D.get("/posts/1",void 0,{cache:!0,cacheExpireTime:6e4,retry:{retry:!0,retryCount:3,retryOnTimeout:!1},dedupe:!0,abortable:!0,logEnabled:!0,logger:{enabled:!0,logRequest:!0,logResponse:!0,logError:!0},queue:{maxConcurrent:5,queueStrategy:"fifo"},priority:10});a.value=i,o("完整配置请求成功")}catch(i){l.value=i.message||"请求失败",o(`完整配置请求失败: ${l.value}`)}finally{t.value=!1}},Ae=()=>{n.value=[],o("日志已清空")};return()=>e("div",{class:"space-y-6"},[e(T,{bordered:!0},{default:()=>[e(_,{class:"mb-4 border-b pb-2 text-lg font-semibold"},{default:()=>[u("RequestClient 功能示例")]}),e(S,{class:"mb-4 block text-gray-500"},{default:()=>[u("展示业务层封装的请求客户端功能，包括缓存、重试、熔断、去重、队列、日志、进度监控、请求取消等。")]}),e("div",{class:"space-y-4"},[e(L,null,{default:()=>[u("基础功能")]}),e(U,{wrap:!0},{default:()=>[e(F,{type:"primary",onClick:p,loading:t.value},{default:()=>[u("基础请求")]}),e(F,{type:"info",onClick:G,loading:t.value},{default:()=>[u("POST 请求")]}),e(F,{type:"warning",onClick:De,loading:t.value},{default:()=>[u("PUT 请求")]}),e(F,{type:"error",onClick:Se,loading:t.value},{default:()=>[u("DELETE 请求")]})]}),e(L,null,{default:()=>[u("高级功能")]}),e(U,{wrap:!0},{default:()=>[e(F,{type:"success",onClick:w,loading:t.value},{default:()=>[u("缓存功能")]}),e(F,{type:"info",onClick:k,loading:t.value},{default:()=>[u("重试功能")]}),e(F,{type:"warning",onClick:y,loading:t.value},{default:()=>[u("去重功能")]}),e(F,{type:"primary",onClick:x,loading:t.value},{default:()=>[u("队列功能")]})]}),e(L,null,{default:()=>[u("其他功能")]}),e(U,{wrap:!0},{default:()=>[e(F,{type:"success",onClick:b,loading:t.value},{default:()=>[u("进度监控")]}),e(F,{type:"error",onClick:A,loading:t.value},{default:()=>[u("可中止请求")]}),f.value&&e(F,{type:"error",onClick:H},{default:()=>[u("手动中止")]}),e(F,{type:"primary",onClick:Be,loading:t.value},{default:()=>[u("完整配置")]})]})]),(s.value>0||m.value>0)&&e("div",{class:"mt-4 space-y-2"},[s.value>0&&e("div",null,[e(S,{class:"text-sm"},{default:()=>[u("上传进度:")]}),e(ue,{percentage:s.value},null)]),m.value>0&&e("div",null,[e(S,{class:"text-sm"},{default:()=>[u("下载进度:")]}),e(ue,{percentage:m.value},null)])]),l.value&&e(Fe,{type:"error",class:"mt-4"},{default:()=>[l.value]}),a.value&&e("div",{class:"mt-4"},[e(S,{class:"mb-2 block text-sm font-semibold"},{default:()=>[u("请求结果:")]}),e(ae,{style:"max-height: 300px;"},{default:()=>[e(V,{language:"json",code:JSON.stringify(a.value,null,2)},null)]})])]}),e(T,{bordered:!0},{default:()=>[e("div",{class:"mb-4 flex items-center justify-between"},[e(_,{class:"text-lg font-semibold"},{default:()=>[u("请求日志")]}),e(F,{size:"small",onClick:Ae},{default:()=>[u("清空日志")]})]),e(ae,{style:"max-height: 400px;"},{default:()=>[e("div",{class:"space-y-1"},[n.value.length===0?e(S,{class:"text-gray-400"},{default:()=>[u("暂无日志")]}):n.value.map((i,C)=>e("div",{key:C,class:"rounded px-2 py-1 text-sm text-gray-700 font-mono hover:bg-gray-50"},[i]))])]})]})])}});function dl(t){return typeof t=="function"||Object.prototype.toString.call(t)==="[object Object]"&&!he(t)}function h(t,a,l){return{id:`mock-${t}`,name:t,type:(l==null?void 0:l.type)??"file",path:`/mock/${t}`,extension:a,size:l==null?void 0:l.size,modifiedAt:new Date("2026-04-29"),createdAt:new Date("2026-01-15"),mimeType:l==null?void 0:l.mimeType}}function cl(t=400,a=300){const l=document.createElement("canvas");l.width=t,l.height=a;const n=l.getContext("2d"),s=n.createLinearGradient(0,0,t,a);s.addColorStop(0,"#1890ff"),s.addColorStop(1,"#722ed1"),n.fillStyle=s,n.fillRect(0,0,t,a),n.fillStyle="#fff",n.font="bold 32px sans-serif",n.textAlign="center",n.fillText("图片预览测试",t/2,a/2-20),n.font="18px sans-serif",n.fillText(`${t} x ${a} PNG`,t/2,a/2+20);for(let m=0;m<6;m++)n.beginPath(),n.arc(Math.random()*t,Math.random()*a,15+Math.random()*30,0,Math.PI*2),n.fillStyle=`rgba(255,255,255,${.1+Math.random()*.2})`,n.fill();return new Promise((m,c)=>{l.toBlob(f=>{f?m(f):c(new Error("Canvas toBlob failed"))},"image/png")})}function pl(){return`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#52c41a;stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#1890ff;stop-opacity:1"/>
    </linearGradient>
  </defs>
  <rect x="10" y="10" width="280" height="180" rx="16" fill="url(#grad1)"/>
  <text x="150" y="90" text-anchor="middle" fill="#fff" font-size="28" font-weight="bold">SVG 预览</text>
  <text x="150" y="120" text-anchor="middle" fill="#fff" font-size="16">支持缩放/拖拽/下载</text>
  <circle cx="50" cy="50" r="20" fill="rgba(255,255,255,0.3)"/>
  <circle cx="250" cy="150" r="25" fill="rgba(255,255,255,0.2)"/>
</svg>`}function fl(){const t=`%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 134 >>
stream
BT
/F1 24 Tf
100 700 Td
(PDF 预览测试) Tj
/F1 16 Tf
100 660 Td
(这是由组件示例页面动态生成的 PDF 文件) Tj
/F1 12 Tf
100 620 Td
(支持 vue-pdf-embed 渲染，可翻页查看) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000266 00000 n
0000000450 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
515
%%EOF`;return new Blob([t],{type:"application/pdf"})}async function ml(){return(await fetch("https://www.w3schools.com/html/mov_bbb.mp4")).blob()}function gl(){const o=new ArrayBuffer(88244),p=new DataView(o);K(p,0,"RIFF"),p.setUint32(4,88236,!0),K(p,8,"WAVE"),K(p,12,"fmt "),p.setUint32(16,16,!0),p.setUint16(20,1,!0),p.setUint16(22,1,!0),p.setUint32(24,22050,!0),p.setUint32(28,44100,!0),p.setUint16(32,2,!0),p.setUint16(34,16,!0),K(p,36,"data"),p.setUint32(40,88200,!0);for(let w=0;w<44100;w++){const k=w/22050,y=.5*(1-k/2),x=Math.sin(2*Math.PI*440*k)*y,b=Math.max(-32768,Math.min(32767,Math.floor(x*32767)));p.setInt16(44+w*2,b,!0)}return new Blob([o],{type:"audio/wav"})}function K(t,a,l){for(let n=0;n<l.length;n++)t.setUint8(a+n,l.charCodeAt(n))}async function vl(){const a=(await qe(()=>import("./vendor-DcIUhThl.js").then(n=>n.j),__vite__mapDeps([0,1,2,3,4,5]))).default,l=new a;return l.file("README.md",`# 项目说明

这是一个示例项目。`),l.file("src/index.ts",`import { createApp } from 'vue';
import App from './App.vue';

createApp(App).mount('#app');`),l.file("src/App.vue",`<template>
  <div>Hello</div>
</template>

<script setup>
<\/script>`),l.file("src/styles/main.css",`body { margin: 0; }
.app { padding: 16px; }`),l.folder("public").file("favicon.ico",""),l.generateAsync({type:"blob"})}async function bl(){return(await fetch("https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.20/files/inter-latin-400-normal.woff2")).blob()}const I=[{label:"Markdown",icon:"📝",file:h("README.md","md",{size:2048}),getContent:()=>`# 文件预览组件示例

## 功能特性

- **注册表架构**: 通过 \`previewRegistry\` 注册文件类型与预览器映射
- **策略模式**: 新增文件类型只需注册，无需修改核心逻辑
- **13个预览器**: 图片/视频/音频/PDF/Markdown/代码/SVG/Mermaid/ECharts/思维导图/Office/压缩包/字体

## 代码示例

\`\`\`typescript
import { registerPreviewer } from '@/components/file-explorer/preview';

registerPreviewer({
  category: 'epub',
  extensions: ['epub'],
  component: EpubPreviewer
});
\`\`\`

> 支持暗色主题切换，所有预览器自动适配。
`},{label:"图片 PNG",icon:"🖼️",file:h("banner.png","png",{size:15360,mimeType:"image/png"}),getContent:()=>cl()},{label:"SVG 文件",icon:"🎨",file:h("diagram.svg","svg",{size:1024,mimeType:"image/svg+xml"}),getContent:()=>pl()},{label:"PDF",icon:"📄",file:h("document.pdf","pdf",{size:20480,mimeType:"application/pdf"}),getContent:()=>fl()},{label:"视频 MP4",icon:"🎬",file:h("intro.mp4","mp4",{size:512e3,mimeType:"video/mp4"}),getContent:()=>ml()},{label:"音频 WAV",icon:"🎵",file:h("notification.wav","wav",{size:88200,mimeType:"audio/wav"}),getContent:()=>gl()},{label:"压缩包 ZIP",icon:"📦",file:h("project.zip","zip",{size:4096,mimeType:"application/zip"}),getContent:()=>vl()},{label:"字体 WOFF2",icon:"🔤",file:h("Inter-Regular.woff2","woff2",{size:65536}),getContent:()=>bl()},{label:"Mermaid",icon:"📊",file:h("flowchart.mmd","mermaid",{size:512}),getContent:()=>`graph TD
    A[用户请求] --> B{文件类型判断}
    B -->|图片| C[ImagePreviewer]
    B -->|视频| D[VideoPreviewer]
    B -->|代码| E[CodePreviewer]
    B -->|PDF| F[PDFPreviewer]
    B -->|Markdown| G[MarkdownPreviewer]
    B -->|不支持| H[UnsupportedPreview]
    C --> I[渲染预览]
    D --> I
    E --> I
    F --> I
    G --> I`},{label:"ECharts",icon:"📈",file:h("chart.echarts","echarts",{size:640}),getContent:()=>`{
  "title": { "text": "文件类型分布" },
  "tooltip": { "trigger": "item" },
  "series": [{
    "type": "pie",
    "radius": "60%",
    "data": [
      { "value": 1048, "name": "代码文件" },
      { "value": 735, "name": "图片文件" },
      { "value": 580, "name": "文档文件" },
      { "value": 484, "name": "视频文件" },
      { "value": 300, "name": "其他文件" }
    ]
  }]
}`},{label:"思维导图",icon:"🧠",file:h("mindmap.mm","markmap",{size:256}),getContent:()=>`# 文件预览系统
## 核心架构
### 注册表模式
### 策略模式
## 预览器列表
### 图片
### 视频
### 音频
### PDF
### 代码
### Markdown
### SVG
### Mermaid
### ECharts`},{label:"JavaScript",icon:"⚡",file:h("app.js","js",{size:1536}),getContent:()=>`/**
 * 应用入口文件
 */
import { createApp } from 'vue';
import App from './App.vue';

const app = createApp(App);
app.mount('#app');

export default app;
`},{label:"TypeScript",icon:"🔷",file:h("types.ts","ts",{size:3200}),getContent:()=>`/** 用户信息接口 */
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'user' | 'guest';
  createdAt: Date;
}

export function createDefaultUser(): User {
  return {
    id: '1',
    name: 'Guest',
    email: 'guest@example.com',
    role: 'guest',
    createdAt: new Date()
  };
}
`},{label:"JSON",icon:"📋",file:h("config.json","json",{size:512}),getContent:()=>`{
  "name": "markdown-preview-demo",
  "version": "1.3.13",
  "dependencies": {
    "vue": "3.5.13",
    "naive-ui": "2.41.0",
    "echarts": "5.6.0"
  }
}`},{label:"HTML",icon:"🌐",file:h("index.html","html",{size:768}),getContent:()=>`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Markdown Preview Demo</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"><\/script>
</body>
</html>`},{label:"CSS",icon:"🎨",file:h("style.css","css",{size:256}),getContent:()=>`/* 全局样式 */
:root {
  --primary-color: #1890ff;
  --border-radius: 8px;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px;
}`},{label:"Vue SFC",icon:"💚",file:h("Component.vue","vue",{size:1024}),getContent:()=>`<template>
  <div class="component">
    <h2>{{ title }}</h2>
    <p>{{ description }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
const title = ref('Vue 组件示例');
const description = ref('这是一个 Vue SFC 组件');
<\/script>

<style scoped>
.component { padding: 16px; border-radius: 8px; }
</style>`},{label:"YAML",icon:"⚙️",file:h("docker-compose.yml","yml",{size:384}),getContent:()=>`version: '3.8'
services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./dist:/usr/share/nginx/html
  api:
    image: node:18-alpine
    working_dir: /app
    command: npm start
    ports:
      - "3000:3000"`},{label:"Shell",icon:"🖥️",file:h("deploy.sh","sh",{size:128}),getContent:()=>`#!/bin/bash
echo "开始部署..."
pnpm build
scp -r dist/* server:/var/www/html/
echo "部署完成!"
`},{label:"Python",icon:"🐍",file:h("main.py","py",{size:384}),getContent:()=>`"""主程序入口"""
import os
import sys

def main():
    print("Hello, World!")
    env = os.getenv("ENV", "development")
    print(f"当前环境: {env}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
`},{label:"不支持类型",icon:"❓",file:h("data.bin","bin",{size:4096}),getContent:()=>""}],de={文本类:"#1890ff",图片类:"#52c41a",媒体类:"#722ed1",数据可视化:"#fa8c16",代码类:"#eab308",其他:"#6b7280"},hl=[{name:"文本类",indices:[0]},{name:"图片类",indices:[1,2]},{name:"媒体类",indices:[3,4,5]},{name:"文档类",indices:[6,7]},{name:"数据可视化",indices:[8,9,10]},{name:"代码类",indices:[11,12,13,14,15,16,17,18,19]},{name:"其他",indices:[20]}],yl=M({name:"FilePreviewExample",setup(){const t=v(0),a=v(I[0].file),l=v(void 0),n=v(!1),s=I.map((c,f)=>({label:`${c.icon} ${c.label} (.${c.file.extension})`,value:f})),m=async c=>{t.value=c,a.value=I[c].file,n.value=!0;try{const f=I[c].getContent();f instanceof Promise?l.value=await f:l.value=f}catch{l.value=void 0}finally{n.value=!1}};return m(0),()=>e(T,{bordered:!0},{default:()=>[e("div",{class:"mb-4 flex items-center gap-3 border-b pb-3"},[e(ye,{size:24,style:{color:"#1890ff"}},{default:()=>[e(Le,null,null)]}),e(S,{strong:!0,class:"text-lg"},{default:()=>[u("文件预览组件测试")]}),e(Q,{type:"info",size:"small",bordered:!1},{default:()=>[u("13 种预览器")]}),e(Q,{type:"success",size:"small",bordered:!1},{default:()=>[u("真实 Blob 渲染")]})]),e(U,{vertical:!0,size:12},{default:()=>[e("div",{class:"flex items-center gap-2"},[e(S,{depth:3,class:"text-sm"},{default:()=>[u("选择文件类型：")]}),e(Ie,{value:t.value,options:s,onUpdateValue:m,style:{width:"320px"},size:"small"},null)]),hl.map(c=>{let f;return e("div",{key:c.name,class:"flex items-center gap-2"},[e(Q,{size:"small",bordered:!1,style:{backgroundColor:`${de[c.name]}15`,color:de[c.name]}},{default:()=>[c.name]}),e(U,{size:4},dl(f=c.indices.map(o=>e(F,{key:o,size:"tiny",type:t.value===o?"primary":"default",onClick:()=>m(o)},{default:()=>[I[o].icon,u(" "),I[o].label]})))?f:{default:()=>[f]})])}),e("div",{class:"overflow-hidden border rounded-lg",style:{height:"500px",minHeight:"400px"}},[e(Me,{file:a.value,content:l.value,loading:n.value},null)]),e(S,{depth:3,class:"text-xs"},{default:()=>[u("图片/音频使用 Canvas/WebAudio API 动态生成真实 Blob；PDF 为手动构造的极简 PDF 结构；ZIP 使用 JSZip 实时打包。 视频因编码复杂度使用最小 ftyp box 演示结构。")]})]})]})}}),ce=`export function greet(name: string) {
  return \`Hello, \${name}!\`;
}

console.log(greet('Monaco'));
`,Fl=`<MonacoEditor
  v-model={code}
  filename="demo.ts"
  language="typescript"
  :height="320"
/>`,xl=`const toolbar = useMonacoEditorToolbar({
  readonly: true,
  folding: true,
  baseHeight: '320px'
});

<div ref={toolbar.wrapperRef} class="flex flex-col" style={toolbar.shellStyle.value}>
  <EditorToolbar
    language="typescript"
    readonly
    folding
    actions={toolbar.actions.value}
    isFolded={toolbar.isFolded.value}
    isFullscreen={toolbar.isFullscreen.value}
    onCopy={toolbar.handleCopy}
    onToggleFold={toolbar.handleToggleFold}
    onToggleFullscreen={toolbar.handleToggleFullscreen}
  />
  <MonacoEditor
    v-model={code}
    filename="demo.ts"
    height="100%"
    readonly
    onReady={toolbar.bindEditor}
  />
</div>`,Cl=`<div class="flex h-80 min-h-0 flex-col overflow-hidden">
  <MonacoEditor v-model={code} filename="demo.ts" height="100%" />
</div>`,wl=M({name:"MonacoEditorExample",setup(){const t=v(ce),a=v(ce),l=v(!0),n=He({readonly:()=>l.value,baseHeight:"320px"});return()=>e("div",{class:"space-y-6"},[e(T,{bordered:!0},{default:()=>[e(_,{class:"mb-1 text-lg font-semibold"},{default:()=>[u("MonacoEditor — 固定高度")]}),e(S,{depth:3,class:"mb-4 block"},{default:()=>[u("仅编辑器本体，无工具栏。适合页面自有工具栏或 Drawer 内嵌（如文件编辑器）。")]}),e(ee,{modelValue:t.value,filename:"demo.ts",language:"typescript",height:320,minimap:!0,"onUpdate:modelValue":s=>{t.value=s}},null),e(L,null,null),e(V,{language:"typescript",code:Fl,wordWrap:!0},null)]}),e(T,{bordered:!0},{default:()=>[e(_,{class:"mb-1 text-lg font-semibold"},{default:()=>[u("EditorToolbar + useMonacoEditorToolbar")]}),e(S,{depth:3,class:"mb-4 block"},{default:()=>[u("工具栏 UI 与逻辑分离：用 composable 处理复制/折叠/全屏，按需组合。")]}),e(U,{align:"center",class:"mb-3"},{default:()=>[e(S,null,{default:()=>[u("只读")]}),e(Ne,{value:l.value,"onUpdate:value":s=>l.value=s},null)]}),e("div",{ref:n.wrapperRef,class:"flex flex-col overflow-hidden border border-gray-200 rounded dark:border-gray-700",style:n.shellStyle.value},[e(We,{language:"typescript",readonly:l.value,folding:!0,actions:n.actions.value,isFolded:n.isFolded.value,isFullscreen:n.isFullscreen.value,onCopy:n.handleCopy,onFormat:n.handleFormat,onToggleFold:n.handleToggleFold,onToggleFullscreen:n.handleToggleFullscreen},null),e(ee,{modelValue:a.value,filename:"demo.ts",language:"typescript",readonly:l.value,height:"100%","onUpdate:modelValue":s=>{a.value=s},onReady:n.bindEditor},null)]),e(L,null,null),e(V,{language:"typescript",code:xl,wordWrap:!0},null)]}),e(T,{bordered:!0},{default:()=>[e(_,{class:"mb-1 text-lg font-semibold"},{default:()=>[u('height="100%" — 铺满 flex 父级')]}),e(S,{depth:3,class:"mb-4 block"},{default:()=>[u("Drawer / 分屏场景：父级使用 flex 列 + min-h-0，编辑器 height 传 100%（内部 flex:1）。")]}),e("div",{class:"h-80 flex flex-col overflow-hidden border border-gray-200 rounded dark:border-gray-700"},[e(ee,{modelValue:t.value,filename:"demo.ts",language:"typescript",height:"100%","onUpdate:modelValue":s=>{t.value=s}},null)]),e(L,null,null),e(V,{language:"html",code:Cl,wordWrap:!0},null)]})])}}),te=[{label:"是",value:1},{label:"否",value:0}],X=[{type:"input",field:"search",label:"关键词",placeholder:"请输入关键词",icon:"i-carbon-search",width:"220px"},{type:"select",field:"status",label:"状态",placeholder:"请选择状态",width:"130px",options:[{label:"启用",value:1},{label:"停用",value:0}]}],z=[{type:"input",field:"search",label:"关键词",placeholder:"请输入关键词",icon:"i-carbon-search",width:"200px"},{type:"input",field:"email",label:"邮箱",placeholder:"请输入邮箱",icon:"i-carbon-email",width:"200px"},{type:"input",field:"username",label:"用户名",placeholder:"请输入用户名",icon:"i-carbon-user",width:"160px"},{type:"select",field:"isActive",label:"状态",placeholder:"请选择",width:"120px",options:te},{type:"select",field:"isOnline",label:"在线",placeholder:"请选择",width:"120px",options:te},{type:"select",field:"isBlacklisted",label:"黑名单",placeholder:"请选择",width:"120px",options:te},{type:"select",field:"roleCode",label:"角色",placeholder:"请选择角色",width:"130px",options:[{label:"管理员",value:"admin"},{label:"用户",value:"user"}]},{type:"date-range",field:"createdAtRange",label:"注册时间",placeholder:"选择日期范围",width:"280px"},{type:"date-range",field:"lastLoginAtRange",label:"最后登录",placeholder:"选择日期范围",width:"280px"},{type:"select",field:"sortBy",label:"排序字段",placeholder:"请选择",width:"140px",options:[{label:"注册时间",value:"createdAt"},{label:"最后登录",value:"lastLoginAt"}]},{type:"select",field:"sortOrder",label:"排序方向",placeholder:"请选择",width:"120px",options:[{label:"升序",value:"asc"},{label:"降序",value:"desc"}]},{type:"date",field:"updatedAfter",label:"更新于（起）",placeholder:"选择日期",width:"160px"},{type:"date",field:"updatedBefore",label:"更新于（止）",placeholder:"选择日期",width:"160px"}];function N(t){const a={};for(const l of t)a[l.field]=Ge(l);return a}const pe=[{key:"id",title:"ID",width:80},{key:"name",title:"名称",width:160}],fe=[{id:1,name:"示例 A"},{id:2,name:"示例 B"}],El=M({name:"TablePageSearchExample",setup(){const t=xe(),a=v("few"),l=v([]),n=j(N(X)),s=j(N(z)),m=j(N(z)),c=(y,x,b)=>{y[x]=b},f=(y,x)=>{const b=`[${new Date().toLocaleTimeString()}] ${y}: ${JSON.stringify({...x})}`;l.value=[b,...l.value].slice(0,8)},o={onSearch:()=>{f("少量字段 · 搜索",n),t.success("触发搜索")},onReset:()=>{Object.assign(n,N(X)),f("少量字段 · 重置",n),t.info("已重置")},onUpdate:(y,x)=>c(n,y,x)},p={onSearch:()=>{f("多字段可折叠 · 搜索",s),t.success("触发搜索")},onReset:()=>{Object.assign(s,N(z)),f("多字段可折叠 · 重置",s),t.info("已重置")},onUpdate:(y,x)=>c(s,y,x)},w={onSearch:()=>{f("独立 SearchBar · 搜索",m),t.success("触发搜索")},onReset:()=>{Object.assign(m,N(z)),f("独立 SearchBar · 重置",m),t.info("已重置")},onUpdate:(y,x)=>c(m,y,x)},k=W(()=>a.value==="few"||a.value==="label-top"?JSON.stringify(n,null,2):a.value==="many"||a.value==="table-page"||a.value==="section-collapse"?JSON.stringify(s,null,2):JSON.stringify(m,null,2));return()=>e("div",{class:"space-y-16px"},[e("div",{class:"flex flex-col gap-16px"},[e(Ce,{value:a.value,"onUpdate:value":y=>a.value=y,type:"line",class:"min-w-0 w-full"},{default:()=>[e(R,{name:"few",tab:"少量字段（不折叠）"},{default:()=>[e(Z,{config:X,model:n,onSearch:o.onSearch,onReset:o.onReset,onUpdateModel:o.onUpdate},null)]}),e(R,{name:"many",tab:"多字段 + 可折叠"},{default:()=>[e(Z,{config:z,model:s,collapsible:!0,defaultCollapsed:!0,onSearch:p.onSearch,onReset:p.onReset,onUpdateModel:p.onUpdate},null)]}),e(R,{name:"table-page",tab:"TablePage 集成"},{default:()=>[e("div",{class:"h-360px overflow-hidden border border-gray-200 rounded-8px"},[e(ie,{searchConfig:z,searchModel:s,onUpdateSearchField:p.onUpdate,onSearch:p.onSearch,onReset:p.onReset,columns:pe,data:fe,loading:!1,showSelection:!1,showIndex:!1,searchSectionCollapsible:!1,searchDefaultCollapsed:!0,searchCardBordered:!1,showActionCard:!1,padded:!1,class:"h-full"},null)])]}),e(R,{name:"section-collapse",tab:"整区折叠"},{default:()=>[e("div",{class:"h-360px overflow-hidden border border-gray-200 rounded-8px"},[e(ie,{searchConfig:z,searchModel:s,onUpdateSearchField:p.onUpdate,onSearch:p.onSearch,onReset:p.onReset,columns:pe,data:fe,loading:!1,showSelection:!1,showIndex:!1,searchSectionDefaultExpanded:!1,searchCardBordered:!1,showActionCard:!1,padded:!1,class:"h-full"},null)])]}),e(R,{name:"standalone",tab:"独立 SearchBar"},{default:()=>[e(Z,{config:z,model:m,collapsible:!0,defaultCollapsed:!0,onSearch:w.onSearch,onReset:w.onReset,onUpdateModel:w.onUpdate},null)]}),e(R,{name:"label-top",tab:"标签在上"},{default:()=>[e(Z,{config:X,model:n,labelPlacement:"top",onSearch:o.onSearch,onReset:o.onReset,onUpdateModel:o.onUpdate},null)]})]}),e(T,{title:"当前 model / 事件",class:"w-full flex-shrink-0",contentClass:"flex flex-col gap-12px"},{default:()=>[e("div",{class:"text-12px text-gray-500"},[u("表单快照")]),e(V,{code:k.value,language:"json",wordWrap:!0,class:"max-h-180px overflow-auto text-12px"},null),e("div",{class:"text-12px text-gray-500"},[u("最近操作")]),e("div",{class:"max-h-160px overflow-auto text-12px leading-relaxed space-y-6px"},[l.value.length===0?e("span",{class:"text-gray-400"},[u("点击搜索或重置后显示")]):l.value.map((y,x)=>e("div",{key:x,class:"break-all border-b border-gray-100 pb-6px"},[y]))])]})])])}}),Dl=[{label:"草稿",value:"draft"},{label:"已发布",value:"published"},{label:"已下线",value:"archived"}],Ee=[{label:"公告",value:"notice"},{label:"活动",value:"event"},{label:"系统",value:"system"}],Sl=[{type:"input",field:"keyword",placeholder:"关键词",icon:"i-carbon-search",width:"200px"},{type:"select",field:"category",placeholder:"分类",width:"160px",options:Ee}],me=[{type:"input",field:"name",label:"名称",placeholder:"请输入名称"},{type:"input-number",field:"amount",label:"数量",componentProps:{min:0,precision:0}},{type:"select",field:"category",label:"分类",placeholder:"请选择",options:Ee},{type:"radio-group",field:"status",label:"状态",options:Dl},{type:"switch",field:"enabled",label:"启用"},{type:"date-range",field:"period",label:"有效期",placeholder:"选择日期范围"},{type:"textarea",field:"remark",label:"备注",placeholder:"备注说明",span:2,componentProps:{rows:3}}];function ge(){return{keyword:"",category:null}}function ve(){return{name:"",amount:1,category:null,status:"draft",enabled:!0,period:null,remark:""}}function Bl(){const t=se().subtract(7,"day").startOf("day").valueOf(),a=se().add(7,"day").startOf("day").valueOf();return{name:"季度活动公告",amount:128,category:"event",status:"published",enabled:!0,period:[t,a],remark:""}}const Al=M({name:"DeclarativeFormExample",setup(){const t=xe(),a=v("inline"),l=j(ge()),n=j(ve()),s=j(Bl()),m=(o,p,w)=>{o[p]=w},c=W(()=>{let o;return a.value==="inline"?o=l:a.value==="readonly"?o=s:o=n,JSON.stringify(o,null,2)}),f=()=>{t.success("行内检索 · Enter / 查询")};return()=>e("div",{class:"space-y-16px"},[e(Fe,{type:"info",showIcon:!1},{default:()=>[u('通过 `fields` 配置驱动 Naive 表单控件；`layout="grid"` + `showLabel` 适合弹窗编辑，`layout="inline"` 适合检索栏。`readonly` 时仅展示标签与文本值，空字段为 `-`；可用 `renderReadonly` 单字段覆盖。')]}),e("div",{class:"flex flex-col gap-16px lg:flex-row"},[e(Ce,{value:a.value,"onUpdate:value":o=>a.value=o,type:"line",class:"min-w-0 flex-1"},{default:()=>[e(R,{name:"inline",tab:"行内检索"},{default:()=>[e(T,{title:"layout=inline",size:"small",bordered:!1,class:"!bg-transparent"},{default:()=>[e(le,{fields:Sl,model:l,onUpdateModel:(o,p)=>m(l,o,p),inline:!0,wrap:!0,onInputEnterPress:f},{suffix:()=>e(U,null,{default:()=>[e(F,{onClick:()=>Object.assign(l,ge())},{default:()=>[u("重置")]}),e(F,{type:"primary",onClick:f},{default:()=>[u("查询")]})]})})]})]}),e(R,{name:"dialog",tab:"栅格弹窗"},{default:()=>[e(T,{title:"layout=grid（弹窗表单）",size:"small",bordered:!1,class:"!bg-transparent"},{default:()=>[e(le,{fields:me,model:n,onUpdateModel:(o,p)=>m(n,o,p),layout:"grid",gridCols:re,suffixPlacement:"below-grid",labelPlacement:"left",labelWidth:80,showLabel:!0},{suffix:()=>e(U,{justify:"end"},{default:()=>[e(F,{onClick:()=>Object.assign(n,ve())},{default:()=>[u("重置")]}),e(F,{type:"primary",onClick:()=>t.success("已提交（示例）")},{default:()=>[u("提交")]})]})})]})]}),e(R,{name:"readonly",tab:"只读详情"},{default:()=>[e(T,{title:"readonly + showLabel",size:"small",bordered:!1,class:"!bg-transparent"},{default:()=>[e(le,{readonly:!0,fields:me,model:s,onUpdateModel:()=>{},layout:"grid",gridCols:re,labelPlacement:"left",labelWidth:80,showLabel:!0},null)]})]})]}),e(T,{title:"model 快照",size:"small",class:"w-full shrink-0 lg:w-320px"},{default:()=>[e(V,{code:c.value,language:"json",wordWrap:!0},null)]})])])}}),Ll=M({name:"ComponentExample",setup(){return()=>e("div",{class:"p-4 space-y-6"},[e("section",{class:"space-y-4"},[e("div",{class:"mb-4 flex items-center gap-3"},[e("div",{class:"h-1 w-12 rounded bg-green-500"},null),e("h1",{class:"text-3xl text-gray-900 font-bold"},[u("基础组件")]),e("div",{class:"h-1 flex-1 rounded bg-gray-200"},null)]),e("div",{class:"rounded-lg bg-white p-6 shadow-sm"},[e(Xe,null,null)])]),e("section",{class:"space-y-4"},[e("div",{class:"mb-4 flex items-center gap-3"},[e("div",{class:"h-1 w-12 rounded bg-blue-500"},null),e("h1",{class:"text-3xl text-gray-900 font-bold"},[u("文件预览")]),e("div",{class:"h-1 flex-1 rounded bg-gray-200"},null)]),e(yl,null,null)]),e("section",{class:"space-y-4"},[e("div",{class:"mb-4 flex items-center gap-3"},[e("div",{class:"h-1 w-12 rounded bg-indigo-500"},null),e("h1",{class:"text-3xl text-gray-900 font-bold"},[u("Monaco 编辑器")]),e("div",{class:"h-1 flex-1 rounded bg-gray-200"},null)]),e(wl,null,null)]),e("section",{class:"space-y-4"},[e("div",{class:"mb-4 flex items-center gap-3"},[e("div",{class:"h-1 w-12 rounded bg-cyan-500"},null),e("h1",{class:"text-3xl text-gray-900 font-bold"},[u("声明式动态表单")]),e("div",{class:"h-1 flex-1 rounded bg-gray-200"},null)]),e("div",{class:"rounded-lg bg-white p-6 shadow-sm"},[e(Al,null,null)])]),e("section",{class:"space-y-4"},[e("div",{class:"mb-4 flex items-center gap-3"},[e("div",{class:"h-1 w-12 rounded bg-teal-500"},null),e("h1",{class:"text-3xl text-gray-900 font-bold"},[u("TablePage 检索区")]),e("div",{class:"h-1 flex-1 rounded bg-gray-200"},null)]),e("div",{class:"rounded-lg bg-white p-6 shadow-sm"},[e(El,null,null)])]),e("section",{class:"space-y-4"},[e("div",{class:"mb-4 flex items-center gap-3"},[e("div",{class:"h-1 w-12 rounded bg-orange-500"},null),e("h1",{class:"text-3xl text-gray-900 font-bold"},[u("RequestClient")]),e("div",{class:"h-1 flex-1 rounded bg-gray-200"},null)]),e("div",{class:"rounded-lg bg-white p-6 shadow-sm"},[e(rl,null,null)])])])}});export{Ll as default};
