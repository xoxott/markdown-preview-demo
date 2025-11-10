import{al as ye,am as pe,j as Se,an as J,q as C,s as $,k as xe,d as A,v as R,ao as le,F as B,x as re,y as q,ap as ne,c as P,D as se,ab as ae,ad as x,p as F,aq as Ce,ar as we,ae as K,i as Te,as as Re,ah as Q,at as H,a as Be,o as Ie,b as V,au as G,av as Le,aw as U,m as ie,a4 as ce,e as w,ax as Ee,a0 as ze,ay as Pe,a3 as ke}from"./index-D3pJGQdL.js";import{u as de}from"./use-theme-vars-CxNnKqFN.js";import{p as ue,l as Me}from"./interface-CXSiFg0w.js";function $e(e){const{baseColor:l,textColor2:n,bodyColor:g,cardColor:i,dividerColor:d,actionColor:s,scrollbarColor:I,scrollbarColorHover:m,invertedColor:u}=e;return{textColor:n,textColorInverted:"#FFF",color:g,colorEmbedded:s,headerColor:i,headerColorInverted:u,footerColor:s,footerColorInverted:u,headerBorderColor:d,headerBorderColorInverted:u,footerBorderColor:d,footerBorderColorInverted:u,siderBorderColor:d,siderBorderColorInverted:u,siderColor:i,siderColorInverted:u,siderToggleButtonBorder:`1px solid ${d}`,siderToggleButtonColor:l,siderToggleButtonIconColor:n,siderToggleButtonIconColorInverted:n,siderToggleBarColor:J(g,I),siderToggleBarColorHover:J(g,m),__invertScrollbar:"true"}}const fe=ye({name:"Layout",common:Se,peers:{Scrollbar:pe},self:$e}),Oe=C("layout",`
 color: var(--n-text-color);
 background-color: var(--n-color);
 box-sizing: border-box;
 position: relative;
 z-index: auto;
 flex: auto;
 overflow: hidden;
 transition:
 box-shadow .3s var(--n-bezier),
 background-color .3s var(--n-bezier),
 color .3s var(--n-bezier);
`,[C("layout-scroll-container",`
 overflow-x: hidden;
 box-sizing: border-box;
 height: 100%;
 `),$("absolute-positioned",`
 position: absolute;
 left: 0;
 right: 0;
 top: 0;
 bottom: 0;
 `)]),Ne={embedded:Boolean,position:ue,nativeScrollbar:{type:Boolean,default:!0},scrollbarProps:Object,onScroll:Function,contentClass:String,contentStyle:{type:[String,Object],default:""},hasSider:Boolean,siderPlacement:{type:String,default:"left"}},ge=xe("n-layout");function he(e){return A({name:e?"LayoutContent":"Layout",props:Object.assign(Object.assign({},q.props),Ne),setup(l){const n=B(null),g=B(null),{mergedClsPrefixRef:i,inlineThemeDisabled:d}=re(l),s=q("Layout","-layout",Oe,fe,l,i);function I(h,y){if(l.nativeScrollbar){const{value:T}=n;T&&(y===void 0?T.scrollTo(h):T.scrollTo(h,y))}else{const{value:T}=g;T&&T.scrollTo(h,y)}}ae(ge,l);let m=0,u=0;const O=h=>{var y;const T=h.target;m=T.scrollLeft,u=T.scrollTop,(y=l.onScroll)===null||y===void 0||y.call(l,h)};ne(()=>{if(l.nativeScrollbar){const h=n.value;h&&(h.scrollTop=u,h.scrollLeft=m)}});const k={display:"flex",flexWrap:"nowrap",width:"100%",flexDirection:"row"},N={scrollTo:I},_=P(()=>{const{common:{cubicBezierEaseInOut:h},self:y}=s.value;return{"--n-bezier":h,"--n-color":l.embedded?y.colorEmbedded:y.color,"--n-text-color":y.textColor}}),L=d?se("layout",P(()=>l.embedded?"e":""),_,l):void 0;return Object.assign({mergedClsPrefix:i,scrollableElRef:n,scrollbarInstRef:g,hasSiderStyle:k,mergedTheme:s,handleNativeElScroll:O,cssVars:d?void 0:_,themeClass:L==null?void 0:L.themeClass,onRender:L==null?void 0:L.onRender},N)},render(){var l;const{mergedClsPrefix:n,hasSider:g}=this;(l=this.onRender)===null||l===void 0||l.call(this);const i=g?this.hasSiderStyle:void 0,d=[this.themeClass,e&&`${n}-layout-content`,`${n}-layout`,`${n}-layout--${this.position}-positioned`];return R("div",{class:d,style:this.cssVars},this.nativeScrollbar?R("div",{ref:"scrollableElRef",class:[`${n}-layout-scroll-container`,this.contentClass],style:[this.contentStyle,i],onScroll:this.handleNativeElScroll},this.$slots):R(le,Object.assign({},this.scrollbarProps,{onScroll:this.onScroll,ref:"scrollbarInstRef",theme:this.mergedTheme.peers.Scrollbar,themeOverrides:this.mergedTheme.peerOverrides.Scrollbar,contentClass:this.contentClass,contentStyle:[this.contentStyle,i]}),this.$slots))}})}const _e=he(!1),je=he(!0),We=C("layout-sider",`
 flex-shrink: 0;
 box-sizing: border-box;
 position: relative;
 z-index: 1;
 color: var(--n-text-color);
 transition:
 color .3s var(--n-bezier),
 border-color .3s var(--n-bezier),
 min-width .3s var(--n-bezier),
 max-width .3s var(--n-bezier),
 transform .3s var(--n-bezier),
 background-color .3s var(--n-bezier);
 background-color: var(--n-color);
 display: flex;
 justify-content: flex-end;
`,[$("bordered",[x("border",`
 content: "";
 position: absolute;
 top: 0;
 bottom: 0;
 width: 1px;
 background-color: var(--n-border-color);
 transition: background-color .3s var(--n-bezier);
 `)]),x("left-placement",[$("bordered",[x("border",`
 right: 0;
 `)])]),$("right-placement",`
 justify-content: flex-start;
 `,[$("bordered",[x("border",`
 left: 0;
 `)]),$("collapsed",[C("layout-toggle-button",[C("base-icon",`
 transform: rotate(180deg);
 `)]),C("layout-toggle-bar",[F("&:hover",[x("top",{transform:"rotate(-12deg) scale(1.15) translateY(-2px)"}),x("bottom",{transform:"rotate(12deg) scale(1.15) translateY(2px)"})])])]),C("layout-toggle-button",`
 left: 0;
 transform: translateX(-50%) translateY(-50%);
 `,[C("base-icon",`
 transform: rotate(0);
 `)]),C("layout-toggle-bar",`
 left: -28px;
 transform: rotate(180deg);
 `,[F("&:hover",[x("top",{transform:"rotate(12deg) scale(1.15) translateY(-2px)"}),x("bottom",{transform:"rotate(-12deg) scale(1.15) translateY(2px)"})])])]),$("collapsed",[C("layout-toggle-bar",[F("&:hover",[x("top",{transform:"rotate(-12deg) scale(1.15) translateY(-2px)"}),x("bottom",{transform:"rotate(12deg) scale(1.15) translateY(2px)"})])]),C("layout-toggle-button",[C("base-icon",`
 transform: rotate(0);
 `)])]),C("layout-toggle-button",`
 transition:
 color .3s var(--n-bezier),
 right .3s var(--n-bezier),
 left .3s var(--n-bezier),
 border-color .3s var(--n-bezier),
 background-color .3s var(--n-bezier);
 cursor: pointer;
 width: 24px;
 height: 24px;
 position: absolute;
 top: 50%;
 right: 0;
 border-radius: 50%;
 display: flex;
 align-items: center;
 justify-content: center;
 font-size: 18px;
 color: var(--n-toggle-button-icon-color);
 border: var(--n-toggle-button-border);
 background-color: var(--n-toggle-button-color);
 box-shadow: 0 2px 4px 0px rgba(0, 0, 0, .06);
 transform: translateX(50%) translateY(-50%);
 z-index: 1;
 `,[C("base-icon",`
 transition: transform .3s var(--n-bezier);
 transform: rotate(180deg);
 `)]),C("layout-toggle-bar",`
 cursor: pointer;
 height: 72px;
 width: 32px;
 position: absolute;
 top: calc(50% - 36px);
 right: -28px;
 `,[x("top, bottom",`
 position: absolute;
 width: 4px;
 border-radius: 2px;
 height: 38px;
 left: 14px;
 transition: 
 background-color .3s var(--n-bezier),
 transform .3s var(--n-bezier);
 `),x("bottom",`
 position: absolute;
 top: 34px;
 `),F("&:hover",[x("top",{transform:"rotate(12deg) scale(1.15) translateY(-2px)"}),x("bottom",{transform:"rotate(-12deg) scale(1.15) translateY(2px)"})]),x("top, bottom",{backgroundColor:"var(--n-toggle-bar-color)"}),F("&:hover",[x("top, bottom",{backgroundColor:"var(--n-toggle-bar-color-hover)"})])]),x("border",`
 position: absolute;
 top: 0;
 right: 0;
 bottom: 0;
 width: 1px;
 transition: background-color .3s var(--n-bezier);
 `),C("layout-sider-scroll-container",`
 flex-grow: 1;
 flex-shrink: 0;
 box-sizing: border-box;
 height: 100%;
 opacity: 0;
 transition: opacity .3s var(--n-bezier);
 max-width: 100%;
 `),$("show-content",[C("layout-sider-scroll-container",{opacity:1})]),$("absolute-positioned",`
 position: absolute;
 left: 0;
 top: 0;
 bottom: 0;
 `)]),Ae=A({props:{clsPrefix:{type:String,required:!0},onClick:Function},render(){const{clsPrefix:e}=this;return R("div",{onClick:this.onClick,class:`${e}-layout-toggle-bar`},R("div",{class:`${e}-layout-toggle-bar__top`}),R("div",{class:`${e}-layout-toggle-bar__bottom`}))}}),De=A({name:"LayoutToggleButton",props:{clsPrefix:{type:String,required:!0},onClick:Function},render(){const{clsPrefix:e}=this;return R("div",{class:`${e}-layout-toggle-button`,onClick:this.onClick},R(Ce,{clsPrefix:e},{default:()=>R(we,null)}))}}),Fe={position:ue,bordered:Boolean,collapsedWidth:{type:Number,default:48},width:{type:[Number,String],default:272},contentClass:String,contentStyle:{type:[String,Object],default:""},collapseMode:{type:String,default:"transform"},collapsed:{type:Boolean,default:void 0},defaultCollapsed:Boolean,showCollapsedContent:{type:Boolean,default:!0},showTrigger:{type:[Boolean,String],default:!1},nativeScrollbar:{type:Boolean,default:!0},inverted:Boolean,scrollbarProps:Object,triggerClass:String,triggerStyle:[String,Object],collapsedTriggerClass:String,collapsedTriggerStyle:[String,Object],"onUpdate:collapsed":[Function,Array],onUpdateCollapsed:[Function,Array],onAfterEnter:Function,onAfterLeave:Function,onExpand:[Function,Array],onCollapse:[Function,Array],onScroll:Function},Z=A({name:"LayoutSider",props:Object.assign(Object.assign({},q.props),Fe),setup(e){const l=Te(ge),n=B(null),g=B(null),i=B(e.defaultCollapsed),d=Re(Q(e,"collapsed"),i),s=P(()=>K(d.value?e.collapsedWidth:e.width)),I=P(()=>e.collapseMode!=="transform"?{}:{minWidth:K(e.width)}),m=P(()=>l?l.siderPlacement:"left");function u(v,c){if(e.nativeScrollbar){const{value:b}=n;b&&(c===void 0?b.scrollTo(v):b.scrollTo(v,c))}else{const{value:b}=g;b&&b.scrollTo(v,c)}}function O(){const{"onUpdate:collapsed":v,onUpdateCollapsed:c,onExpand:b,onCollapse:D}=e,{value:j}=d;c&&H(c,!j),v&&H(v,!j),i.value=!j,j?b&&H(b):D&&H(D)}let k=0,N=0;const _=v=>{var c;const b=v.target;k=b.scrollLeft,N=b.scrollTop,(c=e.onScroll)===null||c===void 0||c.call(e,v)};ne(()=>{if(e.nativeScrollbar){const v=n.value;v&&(v.scrollTop=N,v.scrollLeft=k)}}),ae(Me,{collapsedRef:d,collapseModeRef:Q(e,"collapseMode")});const{mergedClsPrefixRef:L,inlineThemeDisabled:h}=re(e),y=q("Layout","-layout-sider",We,fe,e,L);function T(v){var c,b;v.propertyName==="max-width"&&(d.value?(c=e.onAfterLeave)===null||c===void 0||c.call(e):(b=e.onAfterEnter)===null||b===void 0||b.call(e))}const p={scrollTo:u},W=P(()=>{const{common:{cubicBezierEaseInOut:v},self:c}=y.value,{siderToggleButtonColor:b,siderToggleButtonBorder:D,siderToggleBarColor:j,siderToggleBarColorHover:Y}=c,z={"--n-bezier":v,"--n-toggle-button-color":b,"--n-toggle-button-border":D,"--n-toggle-bar-color":j,"--n-toggle-bar-color-hover":Y};return e.inverted?(z["--n-color"]=c.siderColorInverted,z["--n-text-color"]=c.textColorInverted,z["--n-border-color"]=c.siderBorderColorInverted,z["--n-toggle-button-icon-color"]=c.siderToggleButtonIconColorInverted,z.__invertScrollbar=c.__invertScrollbar):(z["--n-color"]=c.siderColor,z["--n-text-color"]=c.textColor,z["--n-border-color"]=c.siderBorderColor,z["--n-toggle-button-icon-color"]=c.siderToggleButtonIconColor),z}),E=h?se("layout-sider",P(()=>e.inverted?"a":"b"),W,e):void 0;return Object.assign({scrollableElRef:n,scrollbarInstRef:g,mergedClsPrefix:L,mergedTheme:y,styleMaxWidth:s,mergedCollapsed:d,scrollContainerStyle:I,siderPlacement:m,handleNativeElScroll:_,handleTransitionend:T,handleTriggerClick:O,inlineThemeDisabled:h,cssVars:W,themeClass:E==null?void 0:E.themeClass,onRender:E==null?void 0:E.onRender},p)},render(){var e;const{mergedClsPrefix:l,mergedCollapsed:n,showTrigger:g}=this;return(e=this.onRender)===null||e===void 0||e.call(this),R("aside",{class:[`${l}-layout-sider`,this.themeClass,`${l}-layout-sider--${this.position}-positioned`,`${l}-layout-sider--${this.siderPlacement}-placement`,this.bordered&&`${l}-layout-sider--bordered`,n&&`${l}-layout-sider--collapsed`,(!n||this.showCollapsedContent)&&`${l}-layout-sider--show-content`],onTransitionend:this.handleTransitionend,style:[this.inlineThemeDisabled?void 0:this.cssVars,{maxWidth:this.styleMaxWidth,width:K(this.width)}]},this.nativeScrollbar?R("div",{class:[`${l}-layout-sider-scroll-container`,this.contentClass],onScroll:this.handleNativeElScroll,style:[this.scrollContainerStyle,{overflow:"auto"},this.contentStyle],ref:"scrollableElRef"},this.$slots):R(le,Object.assign({},this.scrollbarProps,{onScroll:this.onScroll,ref:"scrollbarInstRef",style:this.scrollContainerStyle,contentStyle:this.contentStyle,contentClass:this.contentClass,theme:this.mergedTheme.peers.Scrollbar,themeOverrides:this.mergedTheme.peerOverrides.Scrollbar,builtinThemeOverrides:this.inverted&&this.cssVars.__invertScrollbar==="true"?{colorHover:"rgba(255, 255, 255, .4)",color:"rgba(255, 255, 255, .3)"}:void 0}),this.$slots),g?g==="bar"?R(Ae,{clsPrefix:l,class:n?this.collapsedTriggerClass:this.triggerClass,style:n?this.collapsedTriggerStyle:this.triggerStyle,onClick:this.handleTriggerClick}):R(De,{clsPrefix:l,class:n?this.collapsedTriggerClass:this.triggerClass,style:n?this.collapsedTriggerStyle:this.triggerStyle,onClick:this.handleTriggerClick}):null,this.bordered?R("div",{class:`${l}-layout-sider__border`}):null)}}),Ye={xmlns:"http://www.w3.org/2000/svg","xmlns:xlink":"http://www.w3.org/1999/xlink",viewBox:"0 0 24 24"},He=A({name:"Dots",render:function(l,n){return Ie(),Be("svg",Ye,n[0]||(n[0]=[V("g",{fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round"},[V("circle",{cx:"5",cy:"12",r:"1"}),V("circle",{cx:"12",cy:"12",r:"1"}),V("circle",{cx:"19",cy:"12",r:"1"})],-1)]))}});function Ve(e){return typeof e=="function"||Object.prototype.toString.call(e)==="[object Object]"&&!Pe(e)}const ee={SCROLLBAR:".n-scrollbar",CONTAINER:".n-scrollbar-container"},X={x:0,y:0},te={left:0,top:0,width:0,height:0},oe=16,Ue="1.5s",Ge=A({name:"NSelectionRect",props:{disabled:{type:Boolean,default:!1},className:{type:String,default:""},rectStyle:{type:Object,default:()=>({})},threshold:{type:Number,default:5},autoScroll:{type:Boolean,default:!0},scrollSpeed:{type:Number,default:10},scrollEdge:{type:Number,default:10},selectableSelector:{type:String,default:"[data-selectable-id]"},preventDragSelector:{type:String,default:"data-prevent-selection"},onSelectionStart:Function,onSelectionChange:Function,onSelectionEnd:Function,onClearSelection:Function},setup(e,{slots:l,attrs:n}){const g=de(),i=G(),d=G(),s=B({isSelecting:!1,isMouseDown:!1,startPoint:{...X},currentPoint:{...X},selectedIds:new Set}),I=B(),m=G(),u=()=>{var o;return(o=d.value)==null?void 0:o.element},O=async()=>{if(await ze(),!i.value)return;const o=i.value.querySelector(ee.SCROLLBAR);if(!o){console.warn("[SelectionRect] NScrollbar 组件未找到");return}const t=o.querySelector(ee.CONTAINER);if(!t){console.warn("[SelectionRect] 滚动容器未找到");return}const r=o.__vueParentComponent,a=r==null?void 0:r.exposed;d.value={element:t,instance:a}},k=P(()=>{const o=u();if(!i.value||!o)return te;const{startPoint:t,currentPoint:r}=s.value,a=Math.max(0,Math.min(t.x,r.x)),f=Math.max(0,Math.min(t.y,r.y)),S=Math.min(o.scrollWidth,Math.max(t.x,r.x)),M=Math.min(o.scrollHeight,Math.max(t.y,r.y));return{left:a,top:f,width:S-a,height:M-f}}),N=P(()=>{const o=u();if(!o)return te;const t=k.value;return{left:t.left-o.scrollLeft,top:t.top-o.scrollTop,width:t.width,height:t.height}}),_=(o,t)=>{if(o.size!==t.size)return!1;for(const r of o)if(!t.has(r))return!1;return!0},L=(o,t)=>{const r=u();if(!i.value||!r)return!1;const a=i.value.getBoundingClientRect(),f=o.getBoundingClientRect(),S={left:f.left-a.left+r.scrollLeft,top:f.top-a.top+r.scrollTop,right:f.right-a.left+r.scrollLeft,bottom:f.bottom-a.top+r.scrollTop};return!(S.right<t.left||S.left>t.left+t.width||S.bottom<t.top||S.top>t.top+t.height)},h=o=>{var a;if(!i.value)return;const t=new Set,r=Array.from(i.value.querySelectorAll(e.selectableSelector));for(const f of r){const S=f.dataset.selectableId;S&&L(f,o)&&t.add(S)}_(s.value.selectedIds,t)||(s.value.selectedIds=t,(a=e.onSelectionChange)==null||a.call(e,Array.from(t)))},y=o=>{const t=u();if(!t)return{dx:0,dy:0};const{clientX:r,clientY:a}=o,f=t.getBoundingClientRect();let S=0,M=0;return a-f.top<e.scrollEdge&&t.scrollTop>0?M=-e.scrollSpeed:f.bottom-a<e.scrollEdge&&t.scrollTop<t.scrollHeight-t.clientHeight&&(M=e.scrollSpeed),r-f.left<e.scrollEdge&&t.scrollLeft>0?S=-e.scrollSpeed:f.right-r<e.scrollEdge&&t.scrollLeft<t.scrollWidth-t.clientWidth&&(S=e.scrollSpeed),{dx:S,dy:M}},T=()=>{var f;if(!e.autoScroll||!m.value)return;const{dx:o,dy:t}=y(m.value);if(o===0&&t===0)return;const r=u();if(!r)return;const a=(f=d.value)==null?void 0:f.instance;if(a!=null&&a.scrollBy?a.scrollBy({left:o,top:t,behavior:"auto"}):r.scrollBy({left:o,top:t,behavior:"auto"}),i.value){const S=i.value.getBoundingClientRect(),{clientX:M,clientY:me}=m.value;s.value.currentPoint={x:M-S.left+r.scrollLeft,y:me-S.top+r.scrollTop}}},p=()=>{I.value||(I.value=window.setInterval(()=>{T(),s.value.isSelecting&&h(k.value)},oe))},W=()=>{I.value&&(clearInterval(I.value),I.value=void 0)},E=o=>!o.closest(`[${e.preventDragSelector}]`),v=o=>{const t=u();if(!i.value||!t)return null;const r=i.value.getBoundingClientRect();return{x:o.clientX-r.left+t.scrollLeft,y:o.clientY-r.top+t.scrollTop}},c=o=>{if(e.disabled||o.button!==0||!E(o.target))return;o.preventDefault();const t=v(o);t&&(s.value={isSelecting:!1,isMouseDown:!0,startPoint:t,currentPoint:{...t},selectedIds:new Set},m.value=o)},b=Le(o=>{var a;if(!s.value.isMouseDown)return;m.value=o;const t=v(o);if(!t)return;s.value.currentPoint=t,Math.hypot(t.x-s.value.startPoint.x,t.y-s.value.startPoint.y)>e.threshold&&(s.value.isSelecting||(s.value.isSelecting=!0,(a=e.onSelectionStart)==null||a.call(e)),h(k.value),e.autoScroll&&p())},oe),D=o=>{var a,f;if(!s.value.isMouseDown)return;const t=s.value.isSelecting,r=Array.from(s.value.selectedIds);W(),t&&((a=e.onSelectionEnd)==null||a.call(e,r),(f=o==null?void 0:o.stopPropagation)==null||f.call(o)),s.value={isSelecting:!1,isMouseDown:!1,startPoint:{...X},currentPoint:{...X},selectedIds:new Set},m.value=void 0},j=o=>{var r;if(s.value.isSelecting)return;const t=o.target;!t.closest(e.selectableSelector)&&!t.closest("[data-dropdown-option]")&&(s.value.selectedIds.clear(),(r=e.onClearSelection)==null||r.call(e))},Y=()=>{s.value.isSelecting&&h(k.value)},z=()=>{W();const o=u();o&&o.removeEventListener("scroll",Y)};U(document,"mousedown",j),U(document,"mousemove",b),U(document,"mouseup",D),U(i,"selectstart",o=>{(s.value.isSelecting||s.value.isMouseDown)&&o.preventDefault()}),ie(async()=>{await O();const o=u();o&&o.addEventListener("scroll",Y,{passive:!0})}),ce(z);const ve=P(()=>{const o=g.value.primaryColor,t=g.value.primaryColorHover;return`
        .selection-container {
          position: relative;
          user-select: none;
        }
        .selection-wrapper {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 9999;
        }
        .selection-rect {
          position: absolute;
          pointer-events: none;
          border: 2px solid ${o};
          background: ${t}14;
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          transition: opacity 0.1s ease;
        }
        .selection-rect-border {
          position: absolute;
          inset: -1px;
          border: 1px solid ${t}66;
          border-radius: 4px;
          animation: selection-pulse ${Ue} ease-in-out infinite;
        }
        @keyframes selection-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(0.98); }
        }
      `}),be=()=>{const{isSelecting:o}=s.value,{width:t,height:r,left:a,top:f}=N.value;if(!o||t<=0||r<=0)return null;const S=g.value.primaryColor,M=g.value.primaryColorHover;return w("div",{class:"selection-wrapper",style:{position:"absolute",inset:"0",overflow:"hidden",pointerEvents:"none",zIndex:9999}},[w("div",{class:"selection-rect",style:{position:"absolute",left:`${a}px`,top:`${f}px`,width:`${t}px`,height:`${r}px`,border:`2px solid ${S}`,background:`${M}14`,borderRadius:"4px",boxShadow:"0 2px 8px rgba(0,0,0,0.08)",...e.rectStyle}},[w("div",{class:"selection-rect-border",style:{position:"absolute",inset:"-1px",border:`1px solid ${M}66`,borderRadius:"4px"}},null)])])};return()=>{var r;const o=be(),t=u();return w("div",{ref:i,class:["selection-container",e.className,n.class],style:"display: flex; flex-direction: column; flex: 1; min-height: 0;",onMousedown:c},[(r=l.default)==null?void 0:r.call(l),t&&o?w(Ee,{to:t},Ve(o)?o:{default:()=>[o]}):o,w("style",null,[ve.value])])}}}),Je=A({name:"ResizableLayout",props:{config:{type:Object,default:()=>({leftWidth:180,rightWidth:200,minRightWidth:120,maxRightWidth:1e3,showLeft:!0,showRight:!0})},collapsed:{type:Boolean,default:!1}},emits:["update:collapsed","update:config"],setup(e,{slots:l,emit:n}){const g=de(),i=B(e.config.leftWidth),d=B(e.config.rightWidth),s=B(e.config.showLeft??!0),I=B(e.config.showRight??!0),m=B(!1),u=B(0),O=B(0),k=P(()=>e.config.minRightWidth??200),N=P(()=>e.config.maxRightWidth??600),_=()=>{n("update:collapsed",!e.collapsed),n("update:config",{...e.config})},L=p=>{p.preventDefault(),p.stopPropagation(),m.value=!0,u.value=p.clientX,O.value=d.value,document.body.style.cursor="col-resize",document.body.style.userSelect="none"},h=p=>{if(m.value){const W=u.value-p.clientX,E=O.value+W;E>=k.value&&E<=N.value&&(d.value=E,n("update:config",{...e.config,rightWidth:d.value}))}},y=()=>{m.value&&(m.value=!1,document.body.style.cursor="",document.body.style.userSelect="")};ie(()=>{document.addEventListener("mousemove",h),document.addEventListener("mouseup",y)}),ce(()=>{document.removeEventListener("mousemove",h),document.removeEventListener("mouseup",y)});const T=()=>w("div",{class:"absolute top-0 left-0 bottom-0 w-4 cursor-col-resize group transition-all",onMousedown:L},[w("div",{class:"absolute top-0 left-1/2 bottom-0 w-[1px] -translate-x-1/2",style:{backgroundColor:g.value.dividerColor}},null),w("div",{class:"absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-6 flex items-center justify-center rounded transition-all",style:{backgroundColor:g.value.dividerColor}},[w(ke,{size:"10"},{default:()=>[w(He,null,null)]})])]);return()=>w(_e,{class:"h-full",hasSider:!0},{default:()=>[s.value&&w(Z,{width:i.value,collapsedWidth:64,nativeScrollbar:!1,collapsed:e.collapsed,collapseMode:"width",showTrigger:"arrow-circle",bordered:!0,"onUpdate:collapsed":_},{default:()=>{var p;return[(p=l.left)==null?void 0:p.call(l)]}}),w(je,{nativeScrollbar:!1,contentClass:"h-full"},{default:()=>{var p;return[(p=l.default)==null?void 0:p.call(l)]}}),I.value&&w(Z,{width:d.value,nativeScrollbar:!1,collapsed:!1,showTrigger:!1,style:{transition:m.value?"none":"width 0.2s ease",position:"relative"}},{default:()=>{var p;return[T(),w("div",{style:"padding-left: 16px; height: 100%;"},[(p=l.right)==null?void 0:p.call(l)])]}})]})}});export{Ge as N,Je as R};
