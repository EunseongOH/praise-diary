import { useRef, useState } from 'react';
import { Icon } from './icons';
import { FieldShell, IconButton } from './ui';

export function SearchField({value,onChange,disabled=false,label='칭찬 검색',placeholder='칭찬을 검색해 보세요',variant='outline',onCommit,onFocusInput}:{
 value:string;onChange:(value:string)=>void;disabled?:boolean;label?:string;placeholder?:string;variant?:'outline'|'plain';onCommit?:(v:string)=>void;onFocusInput?:(el:HTMLInputElement|null)=>void;
}){
 const input=useRef<HTMLInputElement>(null);
 const [composing,setComposing]=useState(false);
 return <div className="ui-search-field" data-variant={variant} role="search">
  <FieldShell variant={variant} disabled={disabled}>
   <span className="ui-search-field__leading"><Icon name="search" size="control"/></span>
   <input ref={el=>{input.current=el;onFocusInput?.(el)}} className="ui-field" type="search" enterKeyHint="search" autoComplete="off" aria-label={label} value={value} placeholder={placeholder} disabled={disabled} onCompositionStart={()=>setComposing(true)} onCompositionEnd={e=>{setComposing(false);onChange(e.currentTarget.value);onCommit?.(e.currentTarget.value)}} onChange={e=>{onChange(e.target.value);if(!composing&&!((e.nativeEvent as InputEvent).isComposing))onCommit?.(e.target.value)}} onKeyDown={e=>{if(e.key==='Enter'&&!composing&&!e.nativeEvent.isComposing){e.preventDefault();input.current?.blur()}}}/>
   <span className="ui-search-field__trailing">{value&&<IconButton icon="close" label="검색어 지우기" disabled={disabled} onClick={()=>{onChange('');onCommit?.('');input.current?.focus()}}/>}</span>
  </FieldShell>
 </div>;
}
export function FilterToggle({label,pressed,onChange,disabled=false,variant='outline'}:{label:string;pressed:boolean;onChange:(pressed:boolean)=>void;disabled?:boolean;variant?:'outline'|'text'}){
 return <button type="button" className={variant==='text'?'ui-filter-text ui-filter-toggle--text':'ui-filter-toggle'} aria-pressed={pressed} disabled={disabled} onClick={()=>onChange(!pressed)}><Icon name="message" size="inline"/><span>{label}</span></button>;
}
export function ListSectionHeader({label,id}:{label:string;id:string}){
 return <h2 className="ui-list-section-header" id={id}>{label}</h2>;
}
