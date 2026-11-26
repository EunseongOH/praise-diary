import { useRef } from 'react';
import { Icon } from './icons';
import { FieldShell, IconButton } from './ui';

export function SearchField({value,onChange,disabled=false,label='칭찬 검색',placeholder='칭찬을 검색해 보세요'}:{
 value:string;onChange:(value:string)=>void;disabled?:boolean;label?:string;placeholder?:string;
}){
 const input=useRef<HTMLInputElement>(null);
 return <div className="ui-search-field" role="search">
  <FieldShell variant="outline" disabled={disabled}>
   <span className="ui-search-field__leading"><Icon name="search" size="control"/></span>
   <input ref={input} className="ui-field" type="search" aria-label={label} value={value} placeholder={placeholder} disabled={disabled} onChange={e=>onChange(e.target.value)} onKeyDown={e=>{if(e.key==='Escape'&&value){e.preventDefault();onChange('')}}}/>
   <span className="ui-search-field__trailing">{value&&<IconButton icon="close" label="검색어 지우기" disabled={disabled} onClick={()=>{onChange('');input.current?.focus()}}/>}</span>
  </FieldShell>
 </div>;
}
export function FilterToggle({label,pressed,onChange,disabled=false}:{label:string;pressed:boolean;onChange:(pressed:boolean)=>void;disabled?:boolean}){
 return <button type="button" className="ui-filter-toggle" aria-pressed={pressed} disabled={disabled} onClick={()=>onChange(!pressed)}><Icon name="message" size="inline"/><span>{label}</span>{pressed&&<Icon name="check" size="inline"/>}</button>;
}
export function ListSectionHeader({label,id}:{label:string;id:string}){
 return <h2 className="ui-list-section-header" id={id}>{label}</h2>;
}
