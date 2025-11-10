import{p as w}from"./chunk-4BMEZGHF-CiIWa_KU.js";import{_ as n,s as B,a as S,v as F,t as z,b as P,d as W,F as v,K as T,h as A,A as D,G as _,H as E,l as x}from"./index.vue_vue_type_style_index_0_lang-DcpF90Fn.js";import{p as N}from"./radar-MK3ICKWK-DCQl00qK.js";import"./index-D3pJGQdL.js";import"./Check-C7VvBDFl.js";import"./installCanvasRenderer-DsW6pPxT.js";import"./use-theme-vars-CxNnKqFN.js";import"./_basePickBy-D4d0p967.js";import"./_baseUniq-BmV2y-xr.js";import"./clone-BN02OB2h.js";var C={packet:[]},u=structuredClone(C),L=E.packet,Y=n(()=>{const t=v({...L,..._().packet});return t.showBits&&(t.paddingY+=10),t},"getConfig"),G=n(()=>u.packet,"getPacket"),H=n(t=>{t.length>0&&u.packet.push(t)},"pushWord"),I=n(()=>{D(),u=structuredClone(C)},"clear"),m={pushWord:H,getPacket:G,getConfig:Y,clear:I,setAccTitle:W,getAccTitle:P,setDiagramTitle:z,getDiagramTitle:F,getAccDescription:S,setAccDescription:B},K=1e4,M=n(t=>{w(t,m);let e=-1,o=[],s=1;const{bitsPerRow:i}=m.getConfig();for(let{start:a,end:r,label:p}of t.blocks){if(r&&r<a)throw new Error(`Packet block ${a} - ${r} is invalid. End must be greater than start.`);if(a!==e+1)throw new Error(`Packet block ${a} - ${r??a} is not contiguous. It should start from ${e+1}.`);for(e=r??a,x.debug(`Packet block ${a} - ${e} with label ${p}`);o.length<=i+1&&m.getPacket().length<K;){const[b,c]=O({start:a,end:r,label:p},s,i);if(o.push(b),b.end+1===s*i&&(m.pushWord(o),o=[],s++),!c)break;({start:a,end:r,label:p}=c)}}m.pushWord(o)},"populate"),O=n((t,e,o)=>{if(t.end===void 0&&(t.end=t.start),t.start>t.end)throw new Error(`Block start ${t.start} is greater than block end ${t.end}.`);return t.end+1<=e*o?[t,void 0]:[{start:t.start,end:e*o-1,label:t.label},{start:e*o,end:t.end,label:t.label}]},"getNextFittingBlock"),R={parse:n(async t=>{const e=await N("packet",t);x.debug(e),M(e)},"parse")},U=n((t,e,o,s)=>{const i=s.db,a=i.getConfig(),{rowHeight:r,paddingY:p,bitWidth:b,bitsPerRow:c}=a,h=i.getPacket(),l=i.getDiagramTitle(),g=r+p,d=g*(h.length+1)-(l?0:r),k=b*c+2,f=T(e);f.attr("viewbox",`0 0 ${k} ${d}`),A(f,d,k,a.useMaxWidth);for(const[$,y]of h.entries())X(f,y,$,a);f.append("text").text(l).attr("x",k/2).attr("y",d-g/2).attr("dominant-baseline","middle").attr("text-anchor","middle").attr("class","packetTitle")},"draw"),X=n((t,e,o,{rowHeight:s,paddingX:i,paddingY:a,bitWidth:r,bitsPerRow:p,showBits:b})=>{const c=t.append("g"),h=o*(s+a)+a;for(const l of e){const g=l.start%p*r+1,d=(l.end-l.start+1)*r-i;if(c.append("rect").attr("x",g).attr("y",h).attr("width",d).attr("height",s).attr("class","packetBlock"),c.append("text").attr("x",g+d/2).attr("y",h+s/2).attr("class","packetLabel").attr("dominant-baseline","middle").attr("text-anchor","middle").text(l.label),!b)continue;const k=l.end===l.start,f=h-2;c.append("text").attr("x",g+(k?d/2:0)).attr("y",f).attr("class","packetByte start").attr("dominant-baseline","auto").attr("text-anchor",k?"middle":"start").text(l.start),k||c.append("text").attr("x",g+d).attr("y",f).attr("class","packetByte end").attr("dominant-baseline","auto").attr("text-anchor","end").text(l.end)}},"drawWord"),j={draw:U},q={byteFontSize:"10px",startByteColor:"black",endByteColor:"black",labelColor:"black",labelFontSize:"12px",titleColor:"black",titleFontSize:"14px",blockStrokeColor:"black",blockStrokeWidth:"1",blockFillColor:"#efefef"},J=n(({packet:t}={})=>{const e=v(q,t);return`
	.packetByte {
		font-size: ${e.byteFontSize};
	}
	.packetByte.start {
		fill: ${e.startByteColor};
	}
	.packetByte.end {
		fill: ${e.endByteColor};
	}
	.packetLabel {
		fill: ${e.labelColor};
		font-size: ${e.labelFontSize};
	}
	.packetTitle {
		fill: ${e.titleColor};
		font-size: ${e.titleFontSize};
	}
	.packetBlock {
		stroke: ${e.blockStrokeColor};
		stroke-width: ${e.blockStrokeWidth};
		fill: ${e.blockFillColor};
	}
	`},"styles"),st={parser:R,db:m,renderer:j,styles:J};export{st as diagram};
