// Trusted, deterministic SVG artwork extracted from the approved V10 lab.
// No diary data, DOM global, dev controls, or user-provided markup in this renderer.
const NOTE_SCALE=1.15;
const pileStyle='side',curlDirection='inside',materialMode='softglass',corkMode='natural',rollStyle='soft';
export const DRAW_DURATION=2700;
export const stackCount=n=>n===0?0:n<3?1:n<10?3:5;
const PILES={overlap:{label:"A · 포개진 구도",notes:[[143,290,-5],[185,282,16],[156,270,-13]],order:[2,1,0]},side:{label:"B · 나란히 쌓인 구도",notes:[[132,290,7],[190,286,-8],[161,272,-16]],order:[2,1,0]},lean:{label:"C · 병벽에 기대는 구도",notes:[[160,292,-2],[121,273,-39],[196,272,39]],order:[1,2,0]}};
const notePositions=(n)=>n===0?[]:n===1?[[160,290,-5]]:n===5?[...PILES[pileStyle].notes,[124,266,-23],[195,263,19]]:PILES[pileStyle].notes;
const pileOrder=n=>n===0?[]:n===1?[0]:n===5?[3,4,...PILES[pileStyle].order]:PILES[pileStyle].order;
const SUPPORT_SETTLE={
 3:{0:[[2,-22,16,13,330,690]],1:[[2,20,13,8,330,690]],2:[]},
 5:{0:[[2,-24,16,13,330,700],[3,9,17,18,405,805],[4,-9,9,-7,470,850]],1:[[2,24,13,9,330,700],[4,-9,17,-20,405,805],[3,9,8,8,470,850]],2:[[3,16,9,13,360,745],[4,-15,11,-19,390,785]],3:[],4:[]}
};
function settlePose(n,pick,i,t){const base=notePositions(n)[i];let rule;
 if(pileStyle==='side')rule=SUPPORT_SETTLE[n]?.[pick]?.find(r=>r[0]===i);
 else if(n>1&&base[1]<notePositions(n)[pick][1]-8&&Math.abs(base[0]-notePositions(n)[pick][0])<75){const p=notePositions(n)[pick];rule=[i,Math.max(-24,Math.min(24,(p[0]-base[0])*.55)),Math.min(18,p[1]-base[1]-2),base[2]>0?-12:12,350,780]}
 if(!rule)return base;
 const [,dx,dy,dr,start,end]=rule,u=clamp((t-start)/(end-start)),fall=u*u,rest=seg(t,end,end+170),bounce=t>end?Math.sin(Math.PI*rest)*2:0;
 return [base[0]+dx*fall,base[1]+dy*fall-bounce,base[2]+dr*fall+(t>end?Math.sin(Math.PI*rest)*1.7:0)];
}
const designs={
 round:{label:'A. 둥근 기억병',sub:'짧은 목 · 둥근 어깨',body:'M126 91 L126 119 C126 132 111 139 96 152 C70 174 64 207 68 246 C71 279 91 300 119 305 Q160 312 201 305 C229 300 249 279 252 246 C256 207 250 174 224 152 C209 139 194 132 194 119 L194 91 Z',neck:[126,194,91],notes:[[158,286,-5],[117,269,-27],[201,269,24],[159,252,8]],highlight:'M111 151 C87 171 78 196 80 224 M81 235 Q82 246 86 255',right:'M216 156 C237 177 244 203 241 234',base:'M100 289 Q160 309 220 289',rim:8},
 slim:{label:'B. 타원형 기억병',sub:'세로 곡선 · 부드러운 어깨',body:'M130 80 L130 113 Q130 127 113 139 C89 158 81 185 81 230 C81 275 97 300 126 306 Q160 312 194 306 C223 300 239 275 239 230 C239 185 231 158 207 139 Q190 127 190 113 L190 80 Z',neck:[130,190,80],notes:[[160,287,-5],[121,267,-29],[196,265,25],[157,244,-8]],highlight:'M119 145 Q94 171 93 213 M93 225 Q93 248 97 259',right:'M205 147 Q228 173 228 223',base:'M110 291 Q160 308 210 291',rim:7},
 message:{label:'C. 작은 메시지 보틀',sub:'긴 목 · 슬림한 몸통',body:'M137 65 L137 124 Q137 140 120 151 C101 164 91 184 91 204 L91 278 Q91 302 115 306 Q160 311 205 306 Q229 302 229 278 L229 204 C229 184 219 164 200 151 Q183 140 183 124 L183 65 Z',neck:[137,183,65],notes:[[160,287,-5],[125,267,-33],[192,265,27],[159,244,8]],highlight:'M119 161 Q102 177 102 206 L102 249 M102 259 V275',right:'M201 162 Q218 180 218 205 L218 255',base:'M111 291 Q160 304 209 291',rim:6}
};
const palette=[['#b4a5c4','#c9bad5','#827391'],['#bcb0a9','#d0c2b8','#92837e'],['#a69ab9','#c1b2cc','#796b8c'],['#b0a1c0','#c6b5d1','#827391']];
// PaperSurface: one constant-length ribbon, projected from (x,y,z) into SVG.
// The outer free edge is anchored; the remaining coil travels along the page.
const PAPER={length:48,width:64,steps:96};
const ROLLS={soft:{label:'A1 · 부드러운 말림',outer:8.4,inner:3.65,tilt:-.075,skew:.60,lip:2.8},loose:{label:'A2 · 느슨한 끝',outer:8.8,inner:4.0,tilt:-.15,skew:.74,lip:4.0},tight:{label:'A3 · 단정한 말림',outer:7.0,inner:2.9,tilt:-.07,skew:.62,lip:1.1}};
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;const ease=t=>{t=clamp(t);return t*t*(3-2*t)};
const seg=(t,a,b)=>ease((t-a)/(b-a));
const hex=(h)=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
function blend(a,b,t){const p=hex(a),q=hex(b);return '#'+p.map((v,i)=>Math.round(mix(v,q[i],clamp(t))).toString(16).padStart(2,'0')).join('')}
function paperCurve(progress,kind=rollStyle){
 const cfg=ROLLS[kind], flat=PAPER.length*clamp(progress),remaining=PAPER.length-flat;let y=0,z=0,theta=0;const out=[{y,z,theta}];const ds=PAPER.length/PAPER.steps;
 for(let k=0;k<PAPER.steps;k++){const a=k*ds,b=(k+1)*ds;const integrate=(lo,hi,rolled)=>{if(hi<=lo)return;const mid=(lo+hi)/2,dl=hi-lo;let curv=0;if(rolled){const q=clamp((mid-flat)/Math.max(remaining,.01));const r=mix(cfg.outer,cfg.inner,Math.pow(q,.8));const lip=clamp((mid-flat)/cfg.lip);curv=mix(.25,1,ease(lip))/r;}theta+=curv*dl*.5;y+=Math.cos(theta)*dl;z+=(curlDirection==='inside'?1:-1)*Math.sin(theta)*dl;theta+=curv*dl*.5};integrate(a,Math.min(b,flat),false);integrate(Math.max(a,flat),b,true);out.push({y,z,theta})}return out}
function paperSurface(progress=0,i=0,dark=0,flatProjection=0,kind=rollStyle){
 const cfg=ROLLS[kind],curve=paperCurve(progress,kind), [paper,light,ink]=palette[i%4], w=PAPER.width/2;
 // Resting roll presents its overlap edge, then turns naturally towards the reader as it opens.
 const turn=curlDirection==='inside'?-2.65*(1-seg(progress,0,.42)):0;
 const pivotY=3,pivotZ=8;
 const posed=curve.map(p=>{const dy=p.y-pivotY,dz=p.z-pivotZ;return {...p,y:dy*Math.cos(turn)-dz*Math.sin(turn)+pivotY,z:dy*Math.sin(turn)+dz*Math.cos(turn)+pivotZ,theta:p.theta+turn};});
 const perspective=1-flatProjection, tilt=cfg.tilt*perspective, skew=cfg.skew*perspective, pitch=.25*perspective;
 // Positive z curls towards the reader; the concave inner face becomes the reading face.
 const project=(x,p)=>[x*mix(.78,1,flatProjection)+p.z*skew,p.y-p.z*pitch+x*tilt];const pt=(x,p)=>project(x,p).map(v=>v.toFixed(2)).join(' ');const faces=[];
 const edge=blend(ink,'#51475d',dark), shade=blend(paper,ink,.22);
 for(let k=0;k<posed.length-1;k++){
   const a=posed[k],b=posed[k+1],t=(a.theta+b.theta)/2;
   const lit=clamp(.50+.38*Math.cos(t-.35));
   const inner=Math.cos(t)>=0;
   const base=blend(shade,light,lit*(inner?1:.84));
   const col=blend(base,'#302a3a',dark);
   // Render the thin paper edges in depth order, not an opaque ellipse or a separate cap.
   faces.push({depth:(a.z+b.z)/2,svg:`<path d="M${pt(-w,a)}L${pt(w,a)}L${pt(w,b)}L${pt(-w,b)}Z" fill="${col}" stroke="${col}" stroke-width=".38"/><path d="M${pt(-w,a)}L${pt(-w,b)} M${pt(w,a)}L${pt(w,b)}" stroke="${edge}" stroke-width=".58" stroke-linecap="round" fill="none"/>${k===0||k===curve.length-2?`<path d="M${pt(-w,k===0?a:b)}L${pt(w,k===0?a:b)}" stroke="${edge}" stroke-width=".76" stroke-linecap="round" fill="none"/>`:''}`});
 }
 faces.sort((a,b)=>a.depth-b.depth);return faces.map(f=>f.svg).join('');
}
function glassV7(gid,d,l,r,y){
 const soft=materialMode==='softglass';
 return `<g class="jar-body glass-front material-v7" pointer-events="none" clip-path="url(#${gid('inside')})">
 <defs>
 <linearGradient id="${gid('v7edge')}" gradientUnits="userSpaceOnUse" x1="67" y1="0" x2="253" y2="0"><stop stop-color="#c3b5d5" stop-opacity=".085"/><stop offset=".16" stop-color="#c3b5d5" stop-opacity=".028"/><stop offset=".48" stop-color="#c3b5d5" stop-opacity=".012"/><stop offset=".83" stop-color="#c3b5d5" stop-opacity=".024"/><stop offset="1" stop-color="#c3b5d5" stop-opacity=".07"/></linearGradient>
 <linearGradient id="${gid('v7light')}" gradientUnits="userSpaceOnUse" x1="0" y1="145" x2="0" y2="278"><stop stop-color="#e6daef" stop-opacity="0"/><stop offset=".16" stop-color="#e6daef" stop-opacity=".76"/><stop offset=".63" stop-color="#d7c9e5" stop-opacity=".50"/><stop offset="1" stop-color="#c6b8d6" stop-opacity="0"/></linearGradient>
 <radialGradient id="${gid('v7diffuse')}"><stop stop-color="#d8c8eb" stop-opacity=".095"/><stop offset=".48" stop-color="#d8c8eb" stop-opacity=".035"/><stop offset="1" stop-color="#d8c8eb" stop-opacity="0"/></radialGradient>
 <linearGradient id="${gid('v7heel')}" gradientUnits="userSpaceOnUse" x1="0" y1="282" x2="0" y2="308"><stop stop-color="#b6a7cc" stop-opacity="0"/><stop offset=".67" stop-color="#c9badb" stop-opacity=".065"/><stop offset="1" stop-color="#c9badb" stop-opacity=".11"/></linearGradient>
 </defs>
 <path d="${d.body}" fill="url(#${gid('v7edge')})"/>
 ${soft?`<ellipse cx="91" cy="208" rx="16" ry="64" transform="rotate(8 91 208)" fill="url(#${gid('v7diffuse')})"/><ellipse cx="231" cy="227" rx="10" ry="53" fill="url(#${gid('v7diffuse')})"/>`:''}
 <path d="M72 282 Q160 304 248 282 V313 H72Z" fill="url(#${gid('v7heel')})"/>
 <g fill="none" stroke-linecap="round" stroke-linejoin="round">
 <path d="M109 153 C92 169 81 194 81 222 C81 241 85 257 92 269" stroke="url(#${gid('v7light')})" stroke-width="${soft?2.1:1.45}"/>
 <path d="M104 160 C91 176 87 190 86 205" stroke="#e3d7ec" stroke-opacity=".23" stroke-width=".6"/>
 <path d="M216 159 C236 179 244 206 241 235" stroke="#b9a8cf" stroke-width=".85" opacity=".38"/>
 <path d="M239 246 C235 264 226 278 215 286" stroke="#bbaad1" stroke-width=".65" opacity=".24"/>
 <path d="M77 243 C81 271 96 290 119 298 Q160 310 201 298 C225 290 240 272 244 246" stroke="#8f80a2" stroke-width=".7" opacity=".48"/>
 <path d="M99 285 C115 298 139 302 160 303 C184 303 207 297 221 288" stroke="#d4c6e2" stroke-width=".95" opacity=".52"/>
 <path d="M108 286 Q128 294 149 295" stroke="#e2d6ed" stroke-width=".9" opacity="${soft?.36:.25}"/>
 <path d="M168 295 Q194 293 211 285" stroke="#bcaad2" stroke-width=".65" opacity=".22"/>
 <path d="M${l+4} ${y+12} Q160 ${y+19} ${r-4} ${y+12}" stroke="#bcaed0" stroke-width=".75" opacity=".54"/>
 <path d="M${l+4} ${y+19} L${l+4} ${y+29} Q${l+4} ${y+39} ${l-7} ${y+48}" stroke="#c9b9dc" stroke-width=".7" opacity=".40"/>
 </g></g>`;
}
// Subtle organic cork: a continuous rounded taper, shallow bevel, irregular lenticels.
function corkV7(gid,l,r,y,variant=corkMode){
 const tall=variant==='slender', w=r-l, a=160-w*(tall?.44:.49),b=320-a,top=y-(tall?32:26),bottom=y+7,br=w*.40,ry=tall?5.5:6.8;
 const side=`M${a} ${top} C${a} ${top+3} ${a+.6} ${top+5} ${a+1.8} ${top+8} L${160-br} ${bottom-4} Q${160-br+.5} ${bottom} ${160-br+5} ${bottom+1} Q160 ${bottom+9} ${160+br-5} ${bottom+1} Q${160+br-.5} ${bottom} ${160+br} ${bottom-4} L${b-1.8} ${top+8} Q${b} ${top+3} ${b} ${top}Z`;
 const seed=(i,k)=>{let q=Math.sin(i*127.1+k*311.7+4.23)*43758.5453;return q-Math.floor(q)};
 const pores=Array.from({length:57},(_,i)=>{const x=a+2+seed(i,1)*(b-a-4),z=top+3+seed(i,2)*(bottom-top-2),len=.55+Math.pow(seed(i,3),2)*3.6,ht=.25+seed(i,4)*.48,angle=(seed(i,5)-.5)*75;
 return `<g transform="translate(${x.toFixed(2)} ${z.toFixed(2)}) rotate(${angle.toFixed(1)})"><path d="M${(-len/2).toFixed(2)} 0 Q${(-len*.15).toFixed(2)} ${(-ht).toFixed(2)} ${ (len/2).toFixed(2)} -.12 Q${(len*.21).toFixed(2)} ${ht.toFixed(2)} ${(-len/2).toFixed(2)} 0Z" fill="${i%7===0?'#d9c5ab':'#6c5145'}" opacity="${i%7===0?.27:.20+seed(i,6)*.27}"/></g>`;}).join('');
 const tops=Array.from({length:23},(_,i)=>{const angle=seed(i,7)*Math.PI*2,rad=Math.sqrt(seed(i,8))*.91,x=160+Math.cos(angle)*(b-a)/2*rad,z=top+Math.sin(angle)*ry*rad;return `<ellipse cx="${x.toFixed(2)}" cy="${z.toFixed(2)}" rx="${(.28+seed(i,9)*.95).toFixed(2)}" ry="${(.18+seed(i,10)*.23).toFixed(2)}" fill="#74574a" opacity="${.21+seed(i,11)*.20}"/>`;}).join('');
 return `<g class="jar-lid" style="--lid-y:${y}px"><defs><clipPath id="${gid('v7corkclip')}"><path d="${side}"/></clipPath><linearGradient id="${gid('v7cork')}"><stop stop-color="#99816e"/><stop offset=".28" stop-color="#b8a08a"/><stop offset=".58" stop-color="#ae9580"/><stop offset="1" stop-color="#897363"/></linearGradient><linearGradient id="${gid('v7top')}" x1="0" y1="0" x2=".5" y2="1"><stop stop-color="#ceb79b"/><stop offset="1" stop-color="#b29a83"/></linearGradient></defs>
 <path d="${side}" fill="url(#${gid('v7cork')})" stroke="#c4ae98" stroke-width=".9" stroke-linejoin="round"/>
 <g clip-path="url(#${gid('v7corkclip')})">${pores}<path d="M${a+3} ${top+6} Q160 ${top+17} ${b-3} ${top+6}" fill="none" stroke="#e0cbb0" stroke-width=".6" opacity=".24"/><path d="M${160-br} ${y-2} Q160 ${y+6} ${160+br} ${y-2}" stroke="#59463e" stroke-width="1.1" fill="none" opacity=".36"/></g>
 <ellipse cx="160" cy="${top}" rx="${(b-a)/2}" ry="${ry}" fill="url(#${gid('v7top')})" stroke="#d3bda3" stroke-width=".8"/>${tops}<path d="M${a+4} ${top-1} Q160 ${top-ry*1.65} ${b-5} ${top-1}" fill="none" stroke="#e8d3b8" stroke-width=".6" opacity=".42"/>
 </g>`;
}
export {notePositions,pileOrder,settlePose,paperCurve,paperSurface,seg,mix};

export function jarMarkup(count,pick,prefix){
 const n=[0,1,3,5].includes(count)?count:0;
 const selected=Number.isInteger(pick)&&pick>=0&&pick<n?pick:-1;
 const gid=x=>'jar'+String(prefix).replace(/[^a-zA-Z0-9_-]/g,'')+'-'+x;
 const d=designs.round,[l,r,y]=d.neck,w=r-l,positions=notePositions(n);
 const defs=`<defs><linearGradient id="${gid('glass')}" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#b8a8d6" stop-opacity=".09"/><stop offset=".22" stop-color="#a99bc6" stop-opacity=".015"/><stop offset=".77" stop-color="#a99bc6" stop-opacity=".012"/><stop offset="1" stop-color="#c4b5dd" stop-opacity=".07"/></linearGradient><linearGradient id="${gid('baseShade')}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#b5a5cb" stop-opacity="0"/><stop offset=".80" stop-color="#b5a5cb" stop-opacity=".015"/><stop offset="1" stop-color="#b5a5cb" stop-opacity=".10"/></linearGradient><clipPath id="${gid('inside')}"><path d="${d.body}"/></clipPath></defs>`;
 const stationary=pileOrder(n).map(i=>{const [x,z,rot]=positions[i];return `<g class="note-pos${i===selected?' picked':''}" data-note-index="${i}" style="transform:translate(${x}px,${z}px) rotate(${rot}deg)"><g class="note-fold" ${i===selected?'data-moving-surface=""':''}><g transform="translate(0 -3) scale(${NOTE_SCALE*.83})">${paperSurface(0,i)}</g></g></g>`}).join('');
 return `<svg viewBox="0 0 320 330" role="presentation" aria-hidden="true">${defs}<g class="jar-body"><ellipse cx="160" cy="309" rx="91" ry="4" fill="#0c0a11" opacity=".2"/><path d="${d.body}" fill="url(#${gid('glass')})" stroke="#b9accd" stroke-width="1.55" stroke-linejoin="round"/><ellipse cx="160" cy="${y}" rx="${w/2+4}" ry="${d.rim}" fill="#211d2b" stroke="#b7a9c9" stroke-width="1.2"/><ellipse cx="160" cy="${y}" rx="${w/2-2}" ry="${d.rim-3}" fill="none" stroke="#7e718f" stroke-width=".75"/><path d="${d.body}" fill="url(#${gid('baseShade')})"/><g class="pile-interior" clip-path="url(#${gid('inside')})">${stationary}</g></g><g class="extraction-layer"></g>${glassV7(gid,d,l,r,y)}${corkV7(gid,l,r,y)}<g class="jar-body" fill="none"><path d="M${l-4} ${y} Q160 ${y+d.rim*2} ${r+4} ${y}" stroke="#d0c1df" stroke-width="1.4" stroke-linecap="round"/><path d="M${l-4} ${y} L${l-4} ${y+5} Q160 ${y+d.rim*2+6} ${r+4} ${y+5} L${r+4} ${y}" stroke="#8e7e9f" stroke-width=".85" stroke-linejoin="round"/></g></svg>`;
}
// V10 timeline; React controls lifecycle/navigation, this function only owns SVG transforms.
export function applyJarFrame(root,overlay,n,pick,t){
 const [x,y,rot]=notePositions(n)[pick],picked=root.querySelector('.picked'),surface=root.querySelector('[data-moving-surface]'),lid=root.querySelector('.jar-lid'),jar=root.querySelector('svg');
 if(!picked||!surface||!lid||!jar)return;
 const interior=jar.querySelector('.pile-interior'),out=jar.querySelector('.extraction-layer');
 if(t>=640&&picked.parentNode!==out)out.append(picked);
 if(t<640&&picked.parentNode!==interior){const order=pileOrder(n),rank=order.indexOf(pick),next=[...interior.children].find(el=>order.indexOf(Number(el.dataset.noteIndex))>rank);interior.insertBefore(picked,next||null)}
 interior.querySelectorAll('.note-pos:not(.picked)').forEach(el=>{const i=Number(el.dataset.noteIndex),[nx,ny,nr]=settlePose(n,pick,i,t);el.style.transform=`translate(${nx}px,${ny}px) rotate(${nr}deg)`});
 const c=seg(t,50,530),shift=seg(t,240,640),rise=seg(t,640,1130),center=seg(t,1120,1430),unroll=seg(t,1430,2070),fade=seg(t,1120,1530),lift=2.5*Math.sin(Math.PI*seg(t,80,260));
 let px=mix(x,160,shift),py=mix(y-lift,178,shift),angle=mix(rot,-90,shift),scale=NOTE_SCALE*.83;
 if(t>=640){px=160;py=mix(178,42,rise);angle=-90;}
 if(t>=1120){px=160;py=mix(42,106,center);angle=mix(-90,0,center);scale=mix(NOTE_SCALE*.83,1.85,center);}
 const progress=unroll,dark=seg(t,1770,2070),projection=seg(t,1670,2070),anchorY=py-24*unroll;
 scale=mix(scale,2.6,seg(t,1500,2070));
 picked.style.transform=`translate(${px}px,${anchorY}px) rotate(${angle}deg) scale(${scale})`;
 // Recompute the curved surface only while it is changing (V10 geometry preserved).
 const key=[progress,dark,projection].join(':');
 if(surface.dataset.frame!==key){surface.innerHTML=`<g transform="translate(0 -3)">${paperSurface(progress,pick,dark,projection)}</g>`;surface.dataset.frame=key}
 lid.style.transform=`translate(${mix(0,-91,seg(t,300,620))}px,${-33*c}px) rotate(${-22*seg(t,300,620)}deg)`;lid.style.opacity=1-fade;
 root.querySelectorAll('.jar-body').forEach(el=>el.style.opacity=1-fade);
 const section=root.closest('.rediscover-screen');const copy=section?.querySelector('.rediscover-copy'),actions=section?.querySelector('.rediscover-actions');
 if(copy)copy.style.opacity=1-seg(t,1110,1550);if(actions)actions.style.opacity=1-seg(t,1410,1770);
 root.dataset.phase=t<260?'select':t<640?'settle':t<1130?'extract':t<1430?'align':t<2070?'unroll':t<2480?'handoff':'read';
 const read=overlay?.querySelector('.diary-paper');
 if(!overlay||!read){picked.style.opacity=1-seg(t,2070,2480);return}
 if(t<2070){overlay.style.opacity=0;picked.style.opacity=1;read.style.transform='none';read.style.opacity=0;return}
 overlay.style.opacity=1;const p=seg(t,2070,2480);read.style.transform='none';
 const target=read.getBoundingClientRect(),source=surface.getBoundingClientRect();
 if(target.width&&target.height){const sx=source.width/target.width,sy=source.height/target.height,tx=source.left-target.left,ty=source.top-target.top;read.style.transformOrigin='top left';read.style.transform=`translate(${tx*(1-p)}px,${ty*(1-p)}px) scale(${mix(sx,1,p)},${mix(sy,1,p)})`}
 picked.style.opacity=1-seg(t,2070,2160);read.style.opacity=seg(t,2070,2160);
 const reveal=seg(t,2470,2680);read.querySelectorAll('.diary-original,.reflection-section').forEach(el=>el.style.opacity=reveal);
 overlay.querySelectorAll('.diary-reader-header,.diary-add-action').forEach(el=>el.style.opacity=seg(t,2420,2700));
}
