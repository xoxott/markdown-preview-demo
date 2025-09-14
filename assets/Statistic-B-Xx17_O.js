import{I as u,J as l,K as L,L as T,M as v,O as n,d as _,z as s,A as w,E as P,D as f,P as B,Q as I,R as N,c as S,S as k,T as V,U as M,V as H,W as b,X as F}from"./index-BKJWDojW.js";const W=u([l("list",`
 --n-merged-border-color: var(--n-border-color);
 --n-merged-color: var(--n-color);
 --n-merged-color-hover: var(--n-color-hover);
 margin: 0;
 font-size: var(--n-font-size);
 transition:
 background-color .3s var(--n-bezier),
 color .3s var(--n-bezier),
 border-color .3s var(--n-bezier);
 padding: 0;
 list-style-type: none;
 color: var(--n-text-color);
 background-color: var(--n-merged-color);
 `,[v("show-divider",[l("list-item",[u("&:not(:last-child)",[n("divider",`
 background-color: var(--n-merged-border-color);
 `)])])]),v("clickable",[l("list-item",`
 cursor: pointer;
 `)]),v("bordered",`
 border: 1px solid var(--n-merged-border-color);
 border-radius: var(--n-border-radius);
 `),v("hoverable",[l("list-item",`
 border-radius: var(--n-border-radius);
 `,[u("&:hover",`
 background-color: var(--n-merged-color-hover);
 `,[n("divider",`
 background-color: transparent;
 `)])])]),v("bordered, hoverable",[l("list-item",`
 padding: 12px 20px;
 `),n("header, footer",`
 padding: 12px 20px;
 `)]),n("header, footer",`
 padding: 12px 0;
 box-sizing: border-box;
 transition: border-color .3s var(--n-bezier);
 `,[u("&:not(:last-child)",`
 border-bottom: 1px solid var(--n-merged-border-color);
 `)]),l("list-item",`
 position: relative;
 padding: 12px 0; 
 box-sizing: border-box;
 display: flex;
 flex-wrap: nowrap;
 align-items: center;
 transition:
 background-color .3s var(--n-bezier),
 border-color .3s var(--n-bezier);
 `,[n("prefix",`
 margin-right: 20px;
 flex: 0;
 `),n("suffix",`
 margin-left: 20px;
 flex: 0;
 `),n("main",`
 flex: 1;
 `),n("divider",`
 height: 1px;
 position: absolute;
 bottom: 0;
 left: 0;
 right: 0;
 background-color: transparent;
 transition: background-color .3s var(--n-bezier);
 pointer-events: none;
 `)])]),L(l("list",`
 --n-merged-color-hover: var(--n-color-hover-modal);
 --n-merged-color: var(--n-color-modal);
 --n-merged-border-color: var(--n-border-color-modal);
 `)),T(l("list",`
 --n-merged-color-hover: var(--n-color-hover-popover);
 --n-merged-color: var(--n-color-popover);
 --n-merged-border-color: var(--n-border-color-popover);
 `))]),A=Object.assign(Object.assign({},f.props),{size:{type:String,default:"medium"},bordered:Boolean,clickable:Boolean,hoverable:Boolean,showDivider:{type:Boolean,default:!0}}),y=V("n-list"),U=_({name:"List",props:A,slots:Object,setup(o){const{mergedClsPrefixRef:e,inlineThemeDisabled:r,mergedRtlRef:a}=w(o),d=P("List",a,e),c=f("List","-list",W,B,o,e);I(y,{showDividerRef:N(o,"showDivider"),mergedClsPrefixRef:e});const t=S(()=>{const{common:{cubicBezierEaseInOut:m},self:{fontSize:h,textColor:p,color:g,colorModal:x,colorPopover:z,borderColor:C,borderColorModal:R,borderColorPopover:$,borderRadius:j,colorHover:E,colorHoverModal:D,colorHoverPopover:O}}=c.value;return{"--n-font-size":h,"--n-bezier":m,"--n-text-color":p,"--n-color":g,"--n-border-radius":j,"--n-border-color":C,"--n-border-color-modal":R,"--n-border-color-popover":$,"--n-color-modal":x,"--n-color-popover":z,"--n-color-hover":E,"--n-color-hover-modal":D,"--n-color-hover-popover":O}}),i=r?k("list",void 0,t,o):void 0;return{mergedClsPrefix:e,rtlEnabled:d,cssVars:r?void 0:t,themeClass:i==null?void 0:i.themeClass,onRender:i==null?void 0:i.onRender}},render(){var o;const{$slots:e,mergedClsPrefix:r,onRender:a}=this;return a==null||a(),s("ul",{class:[`${r}-list`,this.rtlEnabled&&`${r}-list--rtl`,this.bordered&&`${r}-list--bordered`,this.showDivider&&`${r}-list--show-divider`,this.hoverable&&`${r}-list--hoverable`,this.clickable&&`${r}-list--clickable`,this.themeClass],style:this.cssVars},e.header?s("div",{class:`${r}-list__header`},e.header()):null,(o=e.default)===null||o===void 0?void 0:o.call(e),e.footer?s("div",{class:`${r}-list__footer`},e.footer()):null)}}),X=_({name:"ListItem",slots:Object,setup(){const o=M(y,null);return o||H("list-item","`n-list-item` must be placed in `n-list`."),{showDivider:o.showDividerRef,mergedClsPrefix:o.mergedClsPrefixRef}},render(){const{$slots:o,mergedClsPrefix:e}=this;return s("li",{class:`${e}-list-item`},o.prefix?s("div",{class:`${e}-list-item__prefix`},o.prefix()):null,o.default?s("div",{class:`${e}-list-item__main`},o):null,o.suffix?s("div",{class:`${e}-list-item__suffix`},o.suffix()):null,this.showDivider&&s("div",{class:`${e}-list-item__divider`}))}}),K=l("statistic",[n("label",`
 font-weight: var(--n-label-font-weight);
 transition: .3s color var(--n-bezier);
 font-size: var(--n-label-font-size);
 color: var(--n-label-text-color);
 `),l("statistic-value",`
 margin-top: 4px;
 font-weight: var(--n-value-font-weight);
 `,[n("prefix",`
 margin: 0 4px 0 0;
 font-size: var(--n-value-font-size);
 transition: .3s color var(--n-bezier);
 color: var(--n-value-prefix-text-color);
 `,[l("icon",{verticalAlign:"-0.125em"})]),n("content",`
 font-size: var(--n-value-font-size);
 transition: .3s color var(--n-bezier);
 color: var(--n-value-text-color);
 `),n("suffix",`
 margin: 0 0 0 4px;
 font-size: var(--n-value-font-size);
 transition: .3s color var(--n-bezier);
 color: var(--n-value-suffix-text-color);
 `,[l("icon",{verticalAlign:"-0.125em"})])])]),J=Object.assign(Object.assign({},f.props),{tabularNums:Boolean,label:String,value:[String,Number]}),q=_({name:"Statistic",props:J,slots:Object,setup(o){const{mergedClsPrefixRef:e,inlineThemeDisabled:r,mergedRtlRef:a}=w(o),d=f("Statistic","-statistic",K,F,o,e),c=P("Statistic",a,e),t=S(()=>{const{self:{labelFontWeight:m,valueFontSize:h,valueFontWeight:p,valuePrefixTextColor:g,labelTextColor:x,valueSuffixTextColor:z,valueTextColor:C,labelFontSize:R},common:{cubicBezierEaseInOut:$}}=d.value;return{"--n-bezier":$,"--n-label-font-size":R,"--n-label-font-weight":m,"--n-label-text-color":x,"--n-value-font-weight":p,"--n-value-font-size":h,"--n-value-prefix-text-color":g,"--n-value-suffix-text-color":z,"--n-value-text-color":C}}),i=r?k("statistic",void 0,t,o):void 0;return{rtlEnabled:c,mergedClsPrefix:e,cssVars:r?void 0:t,themeClass:i==null?void 0:i.themeClass,onRender:i==null?void 0:i.onRender}},render(){var o;const{mergedClsPrefix:e,$slots:{default:r,label:a,prefix:d,suffix:c}}=this;return(o=this.onRender)===null||o===void 0||o.call(this),s("div",{class:[`${e}-statistic`,this.themeClass,this.rtlEnabled&&`${e}-statistic--rtl`],style:this.cssVars},b(a,t=>s("div",{class:`${e}-statistic__label`},this.label||t)),s("div",{class:`${e}-statistic-value`,style:{fontVariantNumeric:this.tabularNums?"tabular-nums":""}},b(d,t=>t&&s("span",{class:`${e}-statistic-value__prefix`},t)),this.value!==void 0?s("span",{class:`${e}-statistic-value__content`},this.value):b(r,t=>t&&s("span",{class:`${e}-statistic-value__content`},t)),b(c,t=>t&&s("span",{class:`${e}-statistic-value__suffix`},t))))}});export{q as N,U as a,X as b};
