import {useEffect,useId,useMemo,useRef} from 'react';
import type {ReactNode} from 'react';
import {DRAW_DURATION,applyJarFrame,jarMarkup,stackCount} from '../graphics/rediscover-motion.mjs';
type Props={entryCount:number;pick?:number;onComplete?:()=>void;reducedMotion:boolean;preview?:ReactNode};
export function JarArtwork({entryCount,pick=-1,onComplete,reducedMotion,preview}:Props){
 const id=useId(),root=useRef<HTMLDivElement>(null),overlay=useRef<HTMLDivElement>(null),done=useRef(onComplete);
 done.current=onComplete;
 const count=stackCount(entryCount),drawing=pick>=0&&pick<count;
 const markup=useMemo(()=>({__html:jarMarkup(count,pick,id)}),[count,pick,id]);
 useEffect(()=>{
  if(!drawing||!root.current)return;
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  if(reducedMotion||media.matches){done.current?.();return}
  let raf=0,start:number|undefined,active=true;
  const finish=()=>{if(!active)return;active=false;cancelAnimationFrame(raf);done.current?.()};
  const change=()=>{if(media.matches)finish()};
  media.addEventListener('change',change);
  const tick=(now:number)=>{if(!active||!root.current)return;start??=now;const elapsed=Math.min(DRAW_DURATION,now-start);applyJarFrame(root.current,overlay.current,count,pick,elapsed);if(elapsed>=DRAW_DURATION)finish();else raf=requestAnimationFrame(tick)};
  raf=requestAnimationFrame(tick);
  return()=>{active=false;cancelAnimationFrame(raf);media.removeEventListener('change',change)};
 },[count,pick,drawing,reducedMotion]);
 return <>
  <div ref={root} className="rediscover-jar" data-note-count={count} data-phase={drawing?'select':'closed'} aria-hidden="true" dangerouslySetInnerHTML={markup}/>
  {drawing&&preview&&<div ref={el=>{overlay.current=el;el?.setAttribute('inert','')}} className="rediscover-handoff" aria-hidden="true">{preview}</div>}
 </>;
}
