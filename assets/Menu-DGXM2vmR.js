import{l as He}from"./interface-CXSiFg0w.js";import{d as M,v as h,k as Q,p as x,q as g,s as z,aR as _,ad as f,aS as Ee,aT as K,aq as Te,i as F,c as b,aa as ee,aU as Fe,aV as X,W as Me,ab as L,aW as W,aX as Oe,F as O,aY as Ke,aZ as ke,x as _e,y as he,a_ as Le,a$ as Z,G as de,ah as se,as as ve,E as $e,D as je,ai as Be,b0 as Ve,a2 as De,at as E}from"./index-D3pJGQdL.js";const Ue=M({name:"ChevronDownFilled",render(){return h("svg",{viewBox:"0 0 16 16",fill:"none",xmlns:"http://www.w3.org/2000/svg"},h("path",{d:"M3.20041 5.73966C3.48226 5.43613 3.95681 5.41856 4.26034 5.70041L8 9.22652L11.7397 5.70041C12.0432 5.41856 12.5177 5.43613 12.7996 5.73966C13.0815 6.0432 13.0639 6.51775 12.7603 6.7996L8.51034 10.7996C8.22258 11.0668 7.77743 11.0668 7.48967 10.7996L3.23966 6.7996C2.93613 6.51775 2.91856 6.0432 3.20041 5.73966Z",fill:"currentColor"}))}}),$=Q("n-menu"),oe=Q("n-submenu"),te=Q("n-menu-item-group"),ue=[x("&::before","background-color: var(--n-item-color-hover);"),f("arrow",`
 color: var(--n-arrow-color-hover);
 `),f("icon",`
 color: var(--n-item-icon-color-hover);
 `),g("menu-item-content-header",`
 color: var(--n-item-text-color-hover);
 `,[x("a",`
 color: var(--n-item-text-color-hover);
 `),f("extra",`
 color: var(--n-item-text-color-hover);
 `)])],me=[f("icon",`
 color: var(--n-item-icon-color-hover-horizontal);
 `),g("menu-item-content-header",`
 color: var(--n-item-text-color-hover-horizontal);
 `,[x("a",`
 color: var(--n-item-text-color-hover-horizontal);
 `),f("extra",`
 color: var(--n-item-text-color-hover-horizontal);
 `)])],Ge=x([g("menu",`
 background-color: var(--n-color);
 color: var(--n-item-text-color);
 overflow: hidden;
 transition: background-color .3s var(--n-bezier);
 box-sizing: border-box;
 font-size: var(--n-font-size);
 padding-bottom: 6px;
 `,[z("horizontal",`
 max-width: 100%;
 width: 100%;
 display: flex;
 overflow: hidden;
 padding-bottom: 0;
 `,[g("submenu","margin: 0;"),g("menu-item","margin: 0;"),g("menu-item-content",`
 padding: 0 20px;
 border-bottom: 2px solid #0000;
 `,[x("&::before","display: none;"),z("selected","border-bottom: 2px solid var(--n-border-color-horizontal)")]),g("menu-item-content",[z("selected",[f("icon","color: var(--n-item-icon-color-active-horizontal);"),g("menu-item-content-header",`
 color: var(--n-item-text-color-active-horizontal);
 `,[x("a","color: var(--n-item-text-color-active-horizontal);"),f("extra","color: var(--n-item-text-color-active-horizontal);")])]),z("child-active",`
 border-bottom: 2px solid var(--n-border-color-horizontal);
 `,[g("menu-item-content-header",`
 color: var(--n-item-text-color-child-active-horizontal);
 `,[x("a",`
 color: var(--n-item-text-color-child-active-horizontal);
 `),f("extra",`
 color: var(--n-item-text-color-child-active-horizontal);
 `)]),f("icon",`
 color: var(--n-item-icon-color-child-active-horizontal);
 `)]),_("disabled",[_("selected, child-active",[x("&:focus-within",me)]),z("selected",[T(null,[f("icon","color: var(--n-item-icon-color-active-hover-horizontal);"),g("menu-item-content-header",`
 color: var(--n-item-text-color-active-hover-horizontal);
 `,[x("a","color: var(--n-item-text-color-active-hover-horizontal);"),f("extra","color: var(--n-item-text-color-active-hover-horizontal);")])])]),z("child-active",[T(null,[f("icon","color: var(--n-item-icon-color-child-active-hover-horizontal);"),g("menu-item-content-header",`
 color: var(--n-item-text-color-child-active-hover-horizontal);
 `,[x("a","color: var(--n-item-text-color-child-active-hover-horizontal);"),f("extra","color: var(--n-item-text-color-child-active-hover-horizontal);")])])]),T("border-bottom: 2px solid var(--n-border-color-horizontal);",me)]),g("menu-item-content-header",[x("a","color: var(--n-item-text-color-horizontal);")])])]),_("responsive",[g("menu-item-content-header",`
 overflow: hidden;
 text-overflow: ellipsis;
 `)]),z("collapsed",[g("menu-item-content",[z("selected",[x("&::before",`
 background-color: var(--n-item-color-active-collapsed) !important;
 `)]),g("menu-item-content-header","opacity: 0;"),f("arrow","opacity: 0;"),f("icon","color: var(--n-item-icon-color-collapsed);")])]),g("menu-item",`
 height: var(--n-item-height);
 margin-top: 6px;
 position: relative;
 `),g("menu-item-content",`
 box-sizing: border-box;
 line-height: 1.75;
 height: 100%;
 display: grid;
 grid-template-areas: "icon content arrow";
 grid-template-columns: auto 1fr auto;
 align-items: center;
 cursor: pointer;
 position: relative;
 padding-right: 18px;
 transition:
 background-color .3s var(--n-bezier),
 padding-left .3s var(--n-bezier),
 border-color .3s var(--n-bezier);
 `,[x("> *","z-index: 1;"),x("&::before",`
 z-index: auto;
 content: "";
 background-color: #0000;
 position: absolute;
 left: 8px;
 right: 8px;
 top: 0;
 bottom: 0;
 pointer-events: none;
 border-radius: var(--n-border-radius);
 transition: background-color .3s var(--n-bezier);
 `),z("disabled",`
 opacity: .45;
 cursor: not-allowed;
 `),z("collapsed",[f("arrow","transform: rotate(0);")]),z("selected",[x("&::before","background-color: var(--n-item-color-active);"),f("arrow","color: var(--n-arrow-color-active);"),f("icon","color: var(--n-item-icon-color-active);"),g("menu-item-content-header",`
 color: var(--n-item-text-color-active);
 `,[x("a","color: var(--n-item-text-color-active);"),f("extra","color: var(--n-item-text-color-active);")])]),z("child-active",[g("menu-item-content-header",`
 color: var(--n-item-text-color-child-active);
 `,[x("a",`
 color: var(--n-item-text-color-child-active);
 `),f("extra",`
 color: var(--n-item-text-color-child-active);
 `)]),f("arrow",`
 color: var(--n-arrow-color-child-active);
 `),f("icon",`
 color: var(--n-item-icon-color-child-active);
 `)]),_("disabled",[_("selected, child-active",[x("&:focus-within",ue)]),z("selected",[T(null,[f("arrow","color: var(--n-arrow-color-active-hover);"),f("icon","color: var(--n-item-icon-color-active-hover);"),g("menu-item-content-header",`
 color: var(--n-item-text-color-active-hover);
 `,[x("a","color: var(--n-item-text-color-active-hover);"),f("extra","color: var(--n-item-text-color-active-hover);")])])]),z("child-active",[T(null,[f("arrow","color: var(--n-arrow-color-child-active-hover);"),f("icon","color: var(--n-item-icon-color-child-active-hover);"),g("menu-item-content-header",`
 color: var(--n-item-text-color-child-active-hover);
 `,[x("a","color: var(--n-item-text-color-child-active-hover);"),f("extra","color: var(--n-item-text-color-child-active-hover);")])])]),z("selected",[T(null,[x("&::before","background-color: var(--n-item-color-active-hover);")])]),T(null,ue)]),f("icon",`
 grid-area: icon;
 color: var(--n-item-icon-color);
 transition:
 color .3s var(--n-bezier),
 font-size .3s var(--n-bezier),
 margin-right .3s var(--n-bezier);
 box-sizing: content-box;
 display: inline-flex;
 align-items: center;
 justify-content: center;
 `),f("arrow",`
 grid-area: arrow;
 font-size: 16px;
 color: var(--n-arrow-color);
 transform: rotate(180deg);
 opacity: 1;
 transition:
 color .3s var(--n-bezier),
 transform 0.2s var(--n-bezier),
 opacity 0.2s var(--n-bezier);
 `),g("menu-item-content-header",`
 grid-area: content;
 transition:
 color .3s var(--n-bezier),
 opacity .3s var(--n-bezier);
 opacity: 1;
 white-space: nowrap;
 color: var(--n-item-text-color);
 `,[x("a",`
 outline: none;
 text-decoration: none;
 transition: color .3s var(--n-bezier);
 color: var(--n-item-text-color);
 `,[x("&::before",`
 content: "";
 position: absolute;
 left: 0;
 right: 0;
 top: 0;
 bottom: 0;
 `)]),f("extra",`
 font-size: .93em;
 color: var(--n-group-text-color);
 transition: color .3s var(--n-bezier);
 `)])]),g("submenu",`
 cursor: pointer;
 position: relative;
 margin-top: 6px;
 `,[g("menu-item-content",`
 height: var(--n-item-height);
 `),g("submenu-children",`
 overflow: hidden;
 padding: 0;
 `,[Ee({duration:".2s"})])]),g("menu-item-group",[g("menu-item-group-title",`
 margin-top: 6px;
 color: var(--n-group-text-color);
 cursor: default;
 font-size: .93em;
 height: 36px;
 display: flex;
 align-items: center;
 transition:
 padding-left .3s var(--n-bezier),
 color .3s var(--n-bezier);
 `)])]),g("menu-tooltip",[x("a",`
 color: inherit;
 text-decoration: none;
 `)]),g("menu-divider",`
 transition: background-color .3s var(--n-bezier);
 background-color: var(--n-divider-color);
 height: 1px;
 margin: 6px 18px;
 `)]);function T(e,n){return[z("hover",e,n),x("&:hover",e,n)]}const pe=M({name:"MenuOptionContent",props:{collapsed:Boolean,disabled:Boolean,title:[String,Function],icon:Function,extra:[String,Function],showArrow:Boolean,childActive:Boolean,hover:Boolean,paddingLeft:Number,selected:Boolean,maxIconSize:{type:Number,required:!0},activeIconSize:{type:Number,required:!0},iconMarginRight:{type:Number,required:!0},clsPrefix:{type:String,required:!0},onClick:Function,tmNode:{type:Object,required:!0},isEllipsisPlaceholder:Boolean},setup(e){const{props:n}=F($);return{menuProps:n,style:b(()=>{const{paddingLeft:r}=e;return{paddingLeft:r&&`${r}px`}}),iconStyle:b(()=>{const{maxIconSize:r,activeIconSize:c,iconMarginRight:a}=e;return{width:`${r}px`,height:`${r}px`,fontSize:`${c}px`,marginRight:`${a}px`}})}},render(){const{clsPrefix:e,tmNode:n,menuProps:{renderIcon:r,renderLabel:c,renderExtra:a,expandIcon:d}}=this,s=r?r(n.rawNode):K(this.icon);return h("div",{onClick:p=>{var v;(v=this.onClick)===null||v===void 0||v.call(this,p)},role:"none",class:[`${e}-menu-item-content`,{[`${e}-menu-item-content--selected`]:this.selected,[`${e}-menu-item-content--collapsed`]:this.collapsed,[`${e}-menu-item-content--child-active`]:this.childActive,[`${e}-menu-item-content--disabled`]:this.disabled,[`${e}-menu-item-content--hover`]:this.hover}],style:this.style},s&&h("div",{class:`${e}-menu-item-content__icon`,style:this.iconStyle,role:"none"},[s]),h("div",{class:`${e}-menu-item-content-header`,role:"none"},this.isEllipsisPlaceholder?this.title:c?c(n.rawNode):K(this.title),this.extra||a?h("span",{class:`${e}-menu-item-content-header__extra`}," ",a?a(n.rawNode):K(this.extra)):null),this.showArrow?h(Te,{ariaHidden:!0,class:`${e}-menu-item-content__arrow`,clsPrefix:e},{default:()=>d?d(n.rawNode):h(Ue,null)}):null)}}),D=8;function re(e){const n=F($),{props:r,mergedCollapsedRef:c}=n,a=F(oe,null),d=F(te,null),s=b(()=>r.mode==="horizontal"),p=b(()=>s.value?r.dropdownPlacement:"tmNodes"in e?"right-start":"right"),v=b(()=>{var u;return Math.max((u=r.collapsedIconSize)!==null&&u!==void 0?u:r.iconSize,r.iconSize)}),I=b(()=>{var u;return!s.value&&e.root&&c.value&&(u=r.collapsedIconSize)!==null&&u!==void 0?u:r.iconSize}),N=b(()=>{if(s.value)return;const{collapsedWidth:u,indent:w,rootIndent:A}=r,{root:R,isGroup:P}=e,H=A===void 0?w:A;return R?c.value?u/2-v.value/2:H:d&&typeof d.paddingLeftRef.value=="number"?w/2+d.paddingLeftRef.value:a&&typeof a.paddingLeftRef.value=="number"?(P?w/2:w)+a.paddingLeftRef.value:0}),y=b(()=>{const{collapsedWidth:u,indent:w,rootIndent:A}=r,{value:R}=v,{root:P}=e;return s.value||!P||!c.value?D:(A===void 0?w:A)+R+D-(u+R)/2});return{dropdownPlacement:p,activeIconSize:I,maxIconSize:v,paddingLeft:N,iconMarginRight:y,NMenu:n,NSubmenu:a}}const ne={internalKey:{type:[String,Number],required:!0},root:Boolean,isGroup:Boolean,level:{type:Number,required:!0},title:[String,Function],extra:[String,Function]},qe=M({name:"MenuDivider",setup(){const e=F($),{mergedClsPrefixRef:n,isHorizontalRef:r}=e;return()=>r.value?null:h("div",{class:`${n.value}-menu-divider`})}}),fe=Object.assign(Object.assign({},ne),{tmNode:{type:Object,required:!0},disabled:Boolean,icon:Function,onClick:Function}),We=ee(fe),Ze=M({name:"MenuOption",props:fe,setup(e){const n=re(e),{NSubmenu:r,NMenu:c}=n,{props:a,mergedClsPrefixRef:d,mergedCollapsedRef:s}=c,p=r?r.mergedDisabledRef:{value:!1},v=b(()=>p.value||e.disabled);function I(y){const{onClick:u}=e;u&&u(y)}function N(y){v.value||(c.doSelect(e.internalKey,e.tmNode.rawNode),I(y))}return{mergedClsPrefix:d,dropdownPlacement:n.dropdownPlacement,paddingLeft:n.paddingLeft,iconMarginRight:n.iconMarginRight,maxIconSize:n.maxIconSize,activeIconSize:n.activeIconSize,mergedTheme:c.mergedThemeRef,menuProps:a,dropdownEnabled:X(()=>e.root&&s.value&&a.mode!=="horizontal"&&!v.value),selected:X(()=>c.mergedValueRef.value===e.internalKey),mergedDisabled:v,handleClick:N}},render(){const{mergedClsPrefix:e,mergedTheme:n,tmNode:r,menuProps:{renderLabel:c,nodeProps:a}}=this,d=a==null?void 0:a(r.rawNode);return h("div",Object.assign({},d,{role:"menuitem",class:[`${e}-menu-item`,d==null?void 0:d.class]}),h(Fe,{theme:n.peers.Tooltip,themeOverrides:n.peerOverrides.Tooltip,trigger:"hover",placement:this.dropdownPlacement,disabled:!this.dropdownEnabled||this.title===void 0,internalExtraClass:["menu-tooltip"]},{default:()=>c?c(r.rawNode):K(this.title),trigger:()=>h(pe,{tmNode:r,clsPrefix:e,paddingLeft:this.paddingLeft,iconMarginRight:this.iconMarginRight,maxIconSize:this.maxIconSize,activeIconSize:this.activeIconSize,selected:this.selected,title:this.title,extra:this.extra,disabled:this.mergedDisabled,icon:this.icon,onClick:this.handleClick})}))}}),ge=Object.assign(Object.assign({},ne),{tmNode:{type:Object,required:!0},tmNodes:{type:Array,required:!0}}),Xe=ee(ge),Ye=M({name:"MenuOptionGroup",props:ge,setup(e){L(oe,null);const n=re(e);L(te,{paddingLeftRef:n.paddingLeft});const{mergedClsPrefixRef:r,props:c}=F($);return function(){const{value:a}=r,d=n.paddingLeft.value,{nodeProps:s}=c,p=s==null?void 0:s(e.tmNode.rawNode);return h("div",{class:`${a}-menu-item-group`,role:"group"},h("div",Object.assign({},p,{class:[`${a}-menu-item-group-title`,p==null?void 0:p.class],style:[(p==null?void 0:p.style)||"",d!==void 0?`padding-left: ${d}px;`:""]}),K(e.title),e.extra?h(Me,null," ",K(e.extra)):null),h("div",null,e.tmNodes.map(v=>ie(v,c))))}}});function Y(e){return e.type==="divider"||e.type==="render"}function Je(e){return e.type==="divider"}function ie(e,n){const{rawNode:r}=e,{show:c}=r;if(c===!1)return null;if(Y(r))return Je(r)?h(qe,Object.assign({key:e.key},r.props)):null;const{labelField:a}=n,{key:d,level:s,isGroup:p}=e,v=Object.assign(Object.assign({},r),{title:r.title||r[a],extra:r.titleExtra||r.extra,key:d,internalKey:d,level:s,root:s===0,isGroup:p});return e.children?e.isGroup?h(Ye,W(v,Xe,{tmNode:e,tmNodes:e.children,key:d})):h(J,W(v,Qe,{key:d,rawNodes:r[n.childrenField],tmNodes:e.children,tmNode:e})):h(Ze,W(v,We,{key:d,tmNode:e}))}const xe=Object.assign(Object.assign({},ne),{rawNodes:{type:Array,default:()=>[]},tmNodes:{type:Array,default:()=>[]},tmNode:{type:Object,required:!0},disabled:Boolean,icon:Function,onClick:Function,domId:String,virtualChildActive:{type:Boolean,default:void 0},isEllipsisPlaceholder:Boolean}),Qe=ee(xe),J=M({name:"Submenu",props:xe,setup(e){const n=re(e),{NMenu:r,NSubmenu:c}=n,{props:a,mergedCollapsedRef:d,mergedThemeRef:s}=r,p=b(()=>{const{disabled:u}=e;return c!=null&&c.mergedDisabledRef.value||a.disabled?!0:u}),v=O(!1);L(oe,{paddingLeftRef:n.paddingLeft,mergedDisabledRef:p}),L(te,null);function I(){const{onClick:u}=e;u&&u()}function N(){p.value||(d.value||r.toggleExpand(e.internalKey),I())}function y(u){v.value=u}return{menuProps:a,mergedTheme:s,doSelect:r.doSelect,inverted:r.invertedRef,isHorizontal:r.isHorizontalRef,mergedClsPrefix:r.mergedClsPrefixRef,maxIconSize:n.maxIconSize,activeIconSize:n.activeIconSize,iconMarginRight:n.iconMarginRight,dropdownPlacement:n.dropdownPlacement,dropdownShow:v,paddingLeft:n.paddingLeft,mergedDisabled:p,mergedValue:r.mergedValueRef,childActive:X(()=>{var u;return(u=e.virtualChildActive)!==null&&u!==void 0?u:r.activePathRef.value.includes(e.internalKey)}),collapsed:b(()=>a.mode==="horizontal"?!1:d.value?!0:!r.mergedExpandedKeysRef.value.includes(e.internalKey)),dropdownEnabled:b(()=>!p.value&&(a.mode==="horizontal"||d.value)),handlePopoverShowChange:y,handleClick:N}},render(){var e;const{mergedClsPrefix:n,menuProps:{renderIcon:r,renderLabel:c}}=this,a=()=>{const{isHorizontal:s,paddingLeft:p,collapsed:v,mergedDisabled:I,maxIconSize:N,activeIconSize:y,title:u,childActive:w,icon:A,handleClick:R,menuProps:{nodeProps:P},dropdownShow:H,iconMarginRight:U,tmNode:k,mergedClsPrefix:j,isEllipsisPlaceholder:G,extra:B}=this,S=P==null?void 0:P(k.rawNode);return h("div",Object.assign({},S,{class:[`${j}-menu-item`,S==null?void 0:S.class],role:"menuitem"}),h(pe,{tmNode:k,paddingLeft:p,collapsed:v,disabled:I,iconMarginRight:U,maxIconSize:N,activeIconSize:y,title:u,extra:B,showArrow:!s,childActive:w,clsPrefix:j,icon:A,hover:H,onClick:R,isEllipsisPlaceholder:G}))},d=()=>h(Ke,null,{default:()=>{const{tmNodes:s,collapsed:p}=this;return p?null:h("div",{class:`${n}-submenu-children`,role:"menu"},s.map(v=>ie(v,this.menuProps)))}});return this.root?h(Oe,Object.assign({size:"large",trigger:"hover"},(e=this.menuProps)===null||e===void 0?void 0:e.dropdownProps,{themeOverrides:this.mergedTheme.peerOverrides.Dropdown,theme:this.mergedTheme.peers.Dropdown,builtinThemeOverrides:{fontSizeLarge:"14px",optionIconSizeLarge:"18px"},value:this.mergedValue,disabled:!this.dropdownEnabled,placement:this.dropdownPlacement,keyField:this.menuProps.keyField,labelField:this.menuProps.labelField,childrenField:this.menuProps.childrenField,onUpdateShow:this.handlePopoverShowChange,options:this.rawNodes,onSelect:this.doSelect,inverted:this.inverted,renderIcon:r,renderLabel:c}),{default:()=>h("div",{class:`${n}-submenu`,role:"menu","aria-expanded":!this.collapsed,id:this.domId},a(),this.isHorizontal?null:d())}):h("div",{class:`${n}-submenu`,role:"menu","aria-expanded":!this.collapsed,id:this.domId},a(),d())}}),eo=Object.assign(Object.assign({},he.props),{options:{type:Array,default:()=>[]},collapsed:{type:Boolean,default:void 0},collapsedWidth:{type:Number,default:48},iconSize:{type:Number,default:20},collapsedIconSize:{type:Number,default:24},rootIndent:Number,indent:{type:Number,default:32},labelField:{type:String,default:"label"},keyField:{type:String,default:"key"},childrenField:{type:String,default:"children"},disabledField:{type:String,default:"disabled"},defaultExpandAll:Boolean,defaultExpandedKeys:Array,expandedKeys:Array,value:[String,Number],defaultValue:{type:[String,Number],default:null},mode:{type:String,default:"vertical"},watchProps:{type:Array,default:void 0},disabled:Boolean,show:{type:Boolean,default:!0},inverted:Boolean,"onUpdate:expandedKeys":[Function,Array],onUpdateExpandedKeys:[Function,Array],onUpdateValue:[Function,Array],"onUpdate:value":[Function,Array],expandIcon:Function,renderIcon:Function,renderLabel:Function,renderExtra:Function,dropdownProps:Object,accordion:Boolean,nodeProps:Function,dropdownPlacement:{type:String,default:"bottom"},responsive:Boolean,items:Array,onOpenNamesChange:[Function,Array],onSelect:[Function,Array],onExpandedNamesChange:[Function,Array],expandedNames:Array,defaultExpandedNames:Array}),ro=M({name:"Menu",inheritAttrs:!1,props:eo,setup(e){const{mergedClsPrefixRef:n,inlineThemeDisabled:r}=_e(e),c=he("Menu","-menu",Ge,Le,e,n),a=F(He,null),d=b(()=>{var i;const{collapsed:m}=e;if(m!==void 0)return m;if(a){const{collapseModeRef:o,collapsedRef:l}=a;if(o.value==="width")return(i=l.value)!==null&&i!==void 0?i:!1}return!1}),s=b(()=>{const{keyField:i,childrenField:m,disabledField:o}=e;return Z(e.items||e.options,{getIgnored(l){return Y(l)},getChildren(l){return l[m]},getDisabled(l){return l[o]},getKey(l){var C;return(C=l[i])!==null&&C!==void 0?C:l.name}})}),p=b(()=>new Set(s.value.treeNodes.map(i=>i.key))),{watchProps:v}=e,I=O(null);v!=null&&v.includes("defaultValue")?de(()=>{I.value=e.defaultValue}):I.value=e.defaultValue;const N=se(e,"value"),y=ve(N,I),u=O([]),w=()=>{u.value=e.defaultExpandAll?s.value.getNonLeafKeys():e.defaultExpandedNames||e.defaultExpandedKeys||s.value.getPath(y.value,{includeSelf:!1}).keyPath};v!=null&&v.includes("defaultExpandedKeys")?de(w):w();const A=$e(e,["expandedNames","expandedKeys"]),R=ve(A,u),P=b(()=>s.value.treeNodes),H=b(()=>s.value.getPath(y.value).keyPath);L($,{props:e,mergedCollapsedRef:d,mergedThemeRef:c,mergedValueRef:y,mergedExpandedKeysRef:R,activePathRef:H,mergedClsPrefixRef:n,isHorizontalRef:b(()=>e.mode==="horizontal"),invertedRef:se(e,"inverted"),doSelect:U,toggleExpand:j});function U(i,m){const{"onUpdate:value":o,onUpdateValue:l,onSelect:C}=e;l&&E(l,i,m),o&&E(o,i,m),C&&E(C,i,m),I.value=i}function k(i){const{"onUpdate:expandedKeys":m,onUpdateExpandedKeys:o,onExpandedNamesChange:l,onOpenNamesChange:C}=e;m&&E(m,i),o&&E(o,i),l&&E(l,i),C&&E(C,i),u.value=i}function j(i){const m=Array.from(R.value),o=m.findIndex(l=>l===i);if(~o)m.splice(o,1);else{if(e.accordion&&p.value.has(i)){const l=m.findIndex(C=>p.value.has(C));l>-1&&m.splice(l,1)}m.push(i)}k(m)}const G=i=>{const m=s.value.getPath(i??y.value,{includeSelf:!1}).keyPath;if(!m.length)return;const o=Array.from(R.value),l=new Set([...o,...m]);e.accordion&&p.value.forEach(C=>{l.has(C)&&!m.includes(C)&&l.delete(C)}),k(Array.from(l))},B=b(()=>{const{inverted:i}=e,{common:{cubicBezierEaseInOut:m},self:o}=c.value,{borderRadius:l,borderColorHorizontal:C,fontSize:Ae,itemHeight:Ne,dividerColor:Pe}=o,t={"--n-divider-color":Pe,"--n-bezier":m,"--n-font-size":Ae,"--n-border-color-horizontal":C,"--n-border-radius":l,"--n-item-height":Ne};return i?(t["--n-group-text-color"]=o.groupTextColorInverted,t["--n-color"]=o.colorInverted,t["--n-item-text-color"]=o.itemTextColorInverted,t["--n-item-text-color-hover"]=o.itemTextColorHoverInverted,t["--n-item-text-color-active"]=o.itemTextColorActiveInverted,t["--n-item-text-color-child-active"]=o.itemTextColorChildActiveInverted,t["--n-item-text-color-child-active-hover"]=o.itemTextColorChildActiveInverted,t["--n-item-text-color-active-hover"]=o.itemTextColorActiveHoverInverted,t["--n-item-icon-color"]=o.itemIconColorInverted,t["--n-item-icon-color-hover"]=o.itemIconColorHoverInverted,t["--n-item-icon-color-active"]=o.itemIconColorActiveInverted,t["--n-item-icon-color-active-hover"]=o.itemIconColorActiveHoverInverted,t["--n-item-icon-color-child-active"]=o.itemIconColorChildActiveInverted,t["--n-item-icon-color-child-active-hover"]=o.itemIconColorChildActiveHoverInverted,t["--n-item-icon-color-collapsed"]=o.itemIconColorCollapsedInverted,t["--n-item-text-color-horizontal"]=o.itemTextColorHorizontalInverted,t["--n-item-text-color-hover-horizontal"]=o.itemTextColorHoverHorizontalInverted,t["--n-item-text-color-active-horizontal"]=o.itemTextColorActiveHorizontalInverted,t["--n-item-text-color-child-active-horizontal"]=o.itemTextColorChildActiveHorizontalInverted,t["--n-item-text-color-child-active-hover-horizontal"]=o.itemTextColorChildActiveHoverHorizontalInverted,t["--n-item-text-color-active-hover-horizontal"]=o.itemTextColorActiveHoverHorizontalInverted,t["--n-item-icon-color-horizontal"]=o.itemIconColorHorizontalInverted,t["--n-item-icon-color-hover-horizontal"]=o.itemIconColorHoverHorizontalInverted,t["--n-item-icon-color-active-horizontal"]=o.itemIconColorActiveHorizontalInverted,t["--n-item-icon-color-active-hover-horizontal"]=o.itemIconColorActiveHoverHorizontalInverted,t["--n-item-icon-color-child-active-horizontal"]=o.itemIconColorChildActiveHorizontalInverted,t["--n-item-icon-color-child-active-hover-horizontal"]=o.itemIconColorChildActiveHoverHorizontalInverted,t["--n-arrow-color"]=o.arrowColorInverted,t["--n-arrow-color-hover"]=o.arrowColorHoverInverted,t["--n-arrow-color-active"]=o.arrowColorActiveInverted,t["--n-arrow-color-active-hover"]=o.arrowColorActiveHoverInverted,t["--n-arrow-color-child-active"]=o.arrowColorChildActiveInverted,t["--n-arrow-color-child-active-hover"]=o.arrowColorChildActiveHoverInverted,t["--n-item-color-hover"]=o.itemColorHoverInverted,t["--n-item-color-active"]=o.itemColorActiveInverted,t["--n-item-color-active-hover"]=o.itemColorActiveHoverInverted,t["--n-item-color-active-collapsed"]=o.itemColorActiveCollapsedInverted):(t["--n-group-text-color"]=o.groupTextColor,t["--n-color"]=o.color,t["--n-item-text-color"]=o.itemTextColor,t["--n-item-text-color-hover"]=o.itemTextColorHover,t["--n-item-text-color-active"]=o.itemTextColorActive,t["--n-item-text-color-child-active"]=o.itemTextColorChildActive,t["--n-item-text-color-child-active-hover"]=o.itemTextColorChildActiveHover,t["--n-item-text-color-active-hover"]=o.itemTextColorActiveHover,t["--n-item-icon-color"]=o.itemIconColor,t["--n-item-icon-color-hover"]=o.itemIconColorHover,t["--n-item-icon-color-active"]=o.itemIconColorActive,t["--n-item-icon-color-active-hover"]=o.itemIconColorActiveHover,t["--n-item-icon-color-child-active"]=o.itemIconColorChildActive,t["--n-item-icon-color-child-active-hover"]=o.itemIconColorChildActiveHover,t["--n-item-icon-color-collapsed"]=o.itemIconColorCollapsed,t["--n-item-text-color-horizontal"]=o.itemTextColorHorizontal,t["--n-item-text-color-hover-horizontal"]=o.itemTextColorHoverHorizontal,t["--n-item-text-color-active-horizontal"]=o.itemTextColorActiveHorizontal,t["--n-item-text-color-child-active-horizontal"]=o.itemTextColorChildActiveHorizontal,t["--n-item-text-color-child-active-hover-horizontal"]=o.itemTextColorChildActiveHoverHorizontal,t["--n-item-text-color-active-hover-horizontal"]=o.itemTextColorActiveHoverHorizontal,t["--n-item-icon-color-horizontal"]=o.itemIconColorHorizontal,t["--n-item-icon-color-hover-horizontal"]=o.itemIconColorHoverHorizontal,t["--n-item-icon-color-active-horizontal"]=o.itemIconColorActiveHorizontal,t["--n-item-icon-color-active-hover-horizontal"]=o.itemIconColorActiveHoverHorizontal,t["--n-item-icon-color-child-active-horizontal"]=o.itemIconColorChildActiveHorizontal,t["--n-item-icon-color-child-active-hover-horizontal"]=o.itemIconColorChildActiveHoverHorizontal,t["--n-arrow-color"]=o.arrowColor,t["--n-arrow-color-hover"]=o.arrowColorHover,t["--n-arrow-color-active"]=o.arrowColorActive,t["--n-arrow-color-active-hover"]=o.arrowColorActiveHover,t["--n-arrow-color-child-active"]=o.arrowColorChildActive,t["--n-arrow-color-child-active-hover"]=o.arrowColorChildActiveHover,t["--n-item-color-hover"]=o.itemColorHover,t["--n-item-color-active"]=o.itemColorActive,t["--n-item-color-active-hover"]=o.itemColorActiveHover,t["--n-item-color-active-collapsed"]=o.itemColorActiveCollapsed),t}),S=r?je("menu",b(()=>e.inverted?"a":"b"),B,e):void 0,q=Be(),le=O(null),Ce=O(null);let ae=!0;const ce=()=>{var i;ae?ae=!1:(i=le.value)===null||i===void 0||i.sync({showAllItemsBeforeCalculate:!0})};function be(){return document.getElementById(q)}const V=O(-1);function ze(i){V.value=e.options.length-i}function ye(i){i||(V.value=-1)}const Ie=b(()=>{const i=V.value;return{children:i===-1?[]:e.options.slice(i)}}),we=b(()=>{const{childrenField:i,disabledField:m,keyField:o}=e;return Z([Ie.value],{getIgnored(l){return Y(l)},getChildren(l){return l[i]},getDisabled(l){return l[m]},getKey(l){var C;return(C=l[o])!==null&&C!==void 0?C:l.name}})}),Re=b(()=>Z([{}]).treeNodes[0]);function Se(){var i;if(V.value===-1)return h(J,{root:!0,level:0,key:"__ellpisisGroupPlaceholder__",internalKey:"__ellpisisGroupPlaceholder__",title:"···",tmNode:Re.value,domId:q,isEllipsisPlaceholder:!0});const m=we.value.treeNodes[0],o=H.value,l=!!(!((i=m.children)===null||i===void 0)&&i.some(C=>o.includes(C.key)));return h(J,{level:0,root:!0,key:"__ellpisisGroup__",internalKey:"__ellpisisGroup__",title:"···",virtualChildActive:l,tmNode:m,domId:q,rawNodes:m.rawNode.children||[],tmNodes:m.children||[],isEllipsisPlaceholder:!0})}return{mergedClsPrefix:n,controlledExpandedKeys:A,uncontrolledExpanededKeys:u,mergedExpandedKeys:R,uncontrolledValue:I,mergedValue:y,activePath:H,tmNodes:P,mergedTheme:c,mergedCollapsed:d,cssVars:r?void 0:B,themeClass:S==null?void 0:S.themeClass,overflowRef:le,counterRef:Ce,updateCounter:()=>{},onResize:ce,onUpdateOverflow:ye,onUpdateCount:ze,renderCounter:Se,getCounter:be,onRender:S==null?void 0:S.onRender,showOption:G,deriveResponsiveState:ce}},render(){const{mergedClsPrefix:e,mode:n,themeClass:r,onRender:c}=this;c==null||c();const a=()=>this.tmNodes.map(v=>ie(v,this.$props)),s=n==="horizontal"&&this.responsive,p=()=>h("div",De(this.$attrs,{role:n==="horizontal"?"menubar":"menu",class:[`${e}-menu`,r,`${e}-menu--${n}`,s&&`${e}-menu--responsive`,this.mergedCollapsed&&`${e}-menu--collapsed`],style:this.cssVars}),s?h(Ve,{ref:"overflowRef",onUpdateOverflow:this.onUpdateOverflow,getCounter:this.getCounter,onUpdateCount:this.onUpdateCount,updateCounter:this.updateCounter,style:{width:"100%",display:"flex",overflow:"hidden"}},{default:a,counter:this.renderCounter}):a());return s?h(ke,{onResize:this.onResize},{default:p}):p()}});export{ro as N};
