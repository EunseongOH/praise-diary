import { forwardRef, useId, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, ReactNode, InputHTMLAttributes, TextareaHTMLAttributes, CSSProperties } from 'react';
import { Icon } from './icons';
import type { IconName, IconSize } from './icons';
export type Tone = 'strong'|'default'|'quiet'|'danger';
type ActionProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>,'children'|'className'|'style'> & {tone?:Tone};
export function IconButton({icon,label,tone='default',comfort=false,size='control',...props}:ActionProps & {icon:IconName;label:string;comfort?:boolean;size?:IconSize}) {
 return <button {...props} type="button" aria-label={label} data-tone={tone} data-comfort={comfort} className="dj-action dj-icon-button"><Icon name={icon} size={size}/></button>;
}
export function TextAction({children,icon,tone='default',...props}:ActionProps & {children:ReactNode;icon?:IconName}) {
 return <button {...props} type="button" data-tone={tone} className="dj-action dj-text-action">{icon&&<Icon name={icon} size="inline"/>}{children}</button>;
}
export function PrimaryButton({children,tone,...props}:ActionProps & {children:ReactNode}) {return <button {...props} type={props.type??'button'} data-tone={tone} className="dj-action dj-primary">{children}</button>}
type DisclosureProps={label:string;prefix?:IconName;open:boolean;onOpenChange:(open:boolean)=>void;children:ReactNode;disabled?:boolean;variant?:'quiet'|'standard';heading?:boolean};
export function Collapsible({label,prefix,open,onOpenChange,children,disabled=false,variant='quiet',heading=false}:DisclosureProps) {
 const id=useId(), trigger=useRef<HTMLButtonElement>(null), panel=useRef<HTMLDivElement>(null);
 function toggle(){if(open&&panel.current?.contains(document.activeElement))trigger.current?.focus();onOpenChange(!open)}
 const control=<button ref={trigger} id={`${id}-trigger`} type="button" className="dj-action dj-disclosure-trigger" data-variant={variant} aria-expanded={open} aria-controls={`${id}-panel`} disabled={disabled} onClick={toggle}>{prefix&&<Icon name={prefix} size="inline"/>}<span className="dj-disclosure-label">{label}</span><Icon name="chevron-down" size="inline" className="dj-chevron"/></button>;
 return <div>{heading?<h3 style={{margin:0}}>{control}</h3>:control}<div ref={panel} id={`${id}-panel`} className="dj-panel" hidden={!open}>{children}</div></div>;
}
export function Accordion({items,multiple=false}:{items:{id:string;label:string;content:ReactNode;disabled?:boolean}[];multiple?:boolean}) {
 const [open,setOpen]=useState<string[]>([]);
 return <div>{items.map(item=><Collapsible key={item.id} heading variant="standard" label={item.label} open={open.includes(item.id)} disabled={item.disabled} onOpenChange={next=>setOpen(prev=>next?(multiple?[...prev,item.id]:[item.id]):prev.filter(x=>x!==item.id))}>{item.content}</Collapsible>)}</div>;
}
export function AppHeader({start,title,end}:{start:ReactNode;title:ReactNode;end:ReactNode}) {return <header className="dj-header">{start}<div className="dj-header-title">{title}</div>{end}</header>}

// Layout owns spacing; children keep their full interaction boxes.
type LayoutGap = 'text'|'inline'|'controls'|'toolbar'|'component'|'section';
export function Stack({children,gap='component'}:{children:ReactNode;gap?:LayoutGap}) {return <div className="dj-stack" style={{'--dj-layout-gap':`var(--dj-gap-${gap})`} as CSSProperties}>{children}</div>}
export function Inline({children,gap='controls',wrap=false}:{children:ReactNode;gap?:LayoutGap;wrap?:boolean}) {return <div className="dj-inline" data-wrap={wrap} style={{'--dj-layout-gap':`var(--dj-gap-${gap})`} as CSSProperties}>{children}</div>}
type FieldVariant='plain'|'outline';
type InputProps=Omit<InputHTMLAttributes<HTMLInputElement>,'className'|'style'|'size'> & {variant?:FieldVariant; onClear?:()=>void; clearLabel?:string};
export const TextInput=forwardRef<HTMLInputElement,InputProps>(function TextInput({variant='plain',onClear,clearLabel='입력 내용 지우기',...props},ref){
 const own=useRef<HTMLInputElement|null>(null);
 return <div className="dj-field-shell" data-variant={variant} data-disabled={!!props.disabled}><input {...props} ref={node=>{own.current=node;if(typeof ref==='function')ref(node);else if(ref)ref.current=node}} className="dj-field"/>{onClear&&<div className="dj-field-tail"><IconButton icon="close" label={clearLabel} size="inline" tone="quiet" disabled={props.disabled||props.readOnly||!props.value} onClick={()=>{onClear();own.current?.focus()}}/></div>}</div>;
});
type AreaProps=Omit<TextareaHTMLAttributes<HTMLTextAreaElement>,'className'|'style'> & {variant?:FieldVariant};
export const Textarea=forwardRef<HTMLTextAreaElement,AreaProps>(function Textarea({variant='plain',...props},ref){return <div className="dj-field-shell" data-variant={variant} data-multiline="true" data-disabled={!!props.disabled}><textarea {...props} ref={ref} className="dj-field"/></div>});
export function RemovableField({children,onRemove,label}:{children:ReactNode;onRemove:()=>void;label:string}) {return <div className="dj-title-row">{children}<IconButton icon="close" size="inline" label={label} tone="quiet" onClick={onRemove}/></div>}
