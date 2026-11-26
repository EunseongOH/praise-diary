import { forwardRef, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes, CSSProperties } from 'react';
import { Icon, type IconName } from './icons';

/** Shared icon control, v0.5: 44px target, 20px SVG, internal focus. */
export function IconButton({ icon, label, ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className' | 'style' | 'aria-label'> & { icon: IconName; label: string }) {
  return <button {...props} type="button" className="ui-icon-button" aria-label={label}><Icon name={icon}/></button>;
}

type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger';
type ActionDensity = 'standard' | 'toolbar';
export function Button({ children, variant = 'primary', disabled = false, onClick, type = 'button', className = '', size = 'standard' }: {
  children: ReactNode; variant?: ButtonVariant; disabled?: boolean; onClick?: () => void;
  type?: 'button' | 'submit'; className?: string; size?: 'standard' | 'compact';
}) {
  return <button type={type} disabled={disabled} onClick={onClick} data-size={size} className={`ui-button ui-button--${variant} ${className}`.trim()}>{children}</button>;
}
export function TextAction({ children, onClick, className = '', density = 'standard', icon, disabled = false }: {
  children: ReactNode; onClick: () => void; className?: string; density?: ActionDensity; icon?: IconName; disabled?: boolean;
}) {
  return <button type="button" onClick={onClick} disabled={disabled} data-density={density} className={`ui-text-action ${className}`.trim()}>{icon && <Icon name={icon} size="inline"/>}{children}</button>;
}
/** Select-only combobox: shared menu surface, separate selection semantics. */
export function CompactSelect<T extends string>({label,value,options,onChange,density='toolbar'}:{
  label:string;value:T;options:{label:string;value:T}[];onChange:(value:T)=>void;density?:ActionDensity;
}){
 const id=useId(),trigger=useRef<HTMLButtonElement>(null),popup=useRef<HTMLDivElement>(null);
 const [open,setOpen]=useState(false),[active,setActive]=useState(0);
 const [position,setPosition]=useState<CSSProperties>({visibility:'hidden'});
 const selected=Math.max(0,options.findIndex(o=>o.value===value));
 const current=options[selected];
 const close=()=>setOpen(false);
 const show=(i=selected)=>{setActive(Math.max(0,Math.min(options.length-1,i)));setPosition({visibility:'hidden'});setOpen(true)};
 const choose=(i:number)=>{const next=options[i];if(next)onChange(next.value);close();trigger.current?.focus({preventScroll:true})};
 useLayoutEffect(()=>{
  if(!open)return;
  const place=()=>{
   const t=trigger.current,p=popup.current;if(!t||!p)return;
   const r=t.getBoundingClientRect(),root=getComputedStyle(document.documentElement);
   const gutter=parseFloat(root.getPropertyValue('--space-5'))||20,gap=parseFloat(root.getPropertyValue('--space-1'))||4;
   const minimum=parseFloat(root.getPropertyValue('--menu-min-width'))||144,limit=parseFloat(root.getPropertyValue('--select-popup-max-height'))||320,rowHeight=parseFloat(root.getPropertyValue('--touch-comfort'))||48;
   const viewport=document.documentElement.clientWidth;
   const width=Math.min(viewport-2*gutter,Math.max(r.width,minimum,p.scrollWidth+2));
   const below=window.innerHeight-r.bottom-gap-gutter,above=r.top-gap-gutter;
   const height=Math.min(p.scrollHeight+2,Math.max(below,above),limit);
   const top=below>=height||below>=above?r.bottom+gap:r.top-gap-height;
   setPosition({width,left:Math.max(gutter,Math.min(r.left,viewport-gutter-width)),top:Math.max(gutter,top),maxHeight:Math.max(rowHeight,height),visibility:'visible'});
  };
  place();window.addEventListener('resize',place);window.addEventListener('scroll',place,true);
  return()=>{window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true)};
 },[open,options.length]);
 useEffect(()=>{
  if(!open)return;
  const outside=(e:Event)=>{const node=e.target as Node;if(!trigger.current?.contains(node)&&!popup.current?.contains(node))close()};
  document.addEventListener('pointerdown',outside);document.addEventListener('focusin',outside);
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('focusin',outside)};
 },[open]);
 useEffect(()=>{if(open)popup.current?.querySelector<HTMLElement>('[data-active=true]')?.scrollIntoView({block:'nearest'})},[open,active]);
 return <div className="ui-compact-select" data-density={density}>
  <button ref={trigger} type="button" className="ui-compact-select__trigger" role="combobox" aria-label={label}
   aria-expanded={open} aria-haspopup="listbox" aria-controls={open?id:undefined}
   aria-activedescendant={open?id+'-'+active:undefined} data-value={value}
   onClick={()=>open?close():show()}
   onKeyDown={e=>{
    if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();close();return}
    if(e.key==='Tab'){close();return}
    if(e.key==='Enter'||e.key===' '){e.preventDefault();open?choose(active):show();return}
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const d=e.key==='ArrowDown'?1:-1;if(open)setActive(i=>Math.max(0,Math.min(options.length-1,i+d)));else show();return}
    if(e.key==='Home'||e.key==='End'){e.preventDefault();const i=e.key==='Home'?0:options.length-1;if(open)setActive(i);else show(i)}
   }}>
   <span className="ui-compact-select__label">{current?.label??value}</span><Icon name="chevron-down" size="inline"/>
  </button>
  {open&&createPortal(<div ref={popup} id={id} role="listbox" aria-label={label} className="ui-select-popup" style={position}>
   {options.map((o,i)=><div key={o.value} id={id+'-'+i} role="option" aria-selected={o.value===value} data-active={active===i} className="ui-menu-item ui-select-option"
    onPointerMove={()=>setActive(i)} onPointerDown={e=>e.preventDefault()} onClick={()=>choose(i)}>
    <span>{o.label}</span><span className="ui-select-check" aria-hidden="true">{o.value===value&&<Icon name="check" size="inline"/>}</span>
   </div>)}
  </div>,document.body)}
 </div>;
}
type LayoutGap = 'text' | 'inline' | 'controls' | 'toolbar' | 'component' | 'section' | 'field-actions';
export function Stack({children,gap='component'}:{children:ReactNode;gap?:LayoutGap}) {
  return <div className="ui-stack" style={{'--layout-gap':`var(--gap-${gap})`} as CSSProperties}>{children}</div>;
}
export function Inline({children,gap='controls',wrap=false}:{children:ReactNode;gap?:LayoutGap;wrap?:boolean}) {
  return <div className="ui-inline" data-wrap={wrap} style={{'--layout-gap':`var(--gap-${gap})`} as CSSProperties}>{children}</div>;
}
export function ActionGroup({children}:{children:ReactNode}) {return <div className="ui-action-group">{children}</div>}
type FieldVariant = 'plain' | 'outline';
export function FieldShell({children,variant='plain',density='standard',multiline=false,disabled=false}:{children:ReactNode;variant?:FieldVariant;density?:'standard'|'compact';multiline?:boolean;disabled?:boolean}) {
  return <div className="ui-field-shell" data-variant={variant} data-density={density} data-multiline={multiline} data-disabled={disabled}>{children}</div>;
}
type InputProps=Omit<InputHTMLAttributes<HTMLInputElement>,'className'|'style'|'size'> & {variant?:FieldVariant};
export const TextInput=forwardRef<HTMLInputElement,InputProps>(function TextInput({variant='plain',...props},ref){
  return <FieldShell variant={variant} disabled={props.disabled}><input {...props} ref={ref} className="ui-field"/></FieldShell>;
});
type AreaProps=Omit<TextareaHTMLAttributes<HTMLTextAreaElement>,'className'|'style'> & {variant?:FieldVariant;density?:'standard'|'compact'};
export const Textarea=forwardRef<HTMLTextAreaElement,AreaProps>(function Textarea({variant='plain',density='standard',...props},ref){
  return <FieldShell variant={variant} density={density} multiline disabled={props.disabled}><textarea {...props} ref={ref} className="ui-field"/></FieldShell>;
});
export function RemovableField({children,onRemove,label}:{children:ReactNode;onRemove:()=>void;label:string}) {
  return <div className="ui-removable-field">{children}<IconButton icon="close" label={label} onClick={onRemove}/></div>;
}
export function Collapsible({label,open,onOpenChange,children}:{label:string;open:boolean;onOpenChange:(open:boolean)=>void;children:ReactNode}) {
  const id=useId(),trigger=useRef<HTMLButtonElement>(null),panel=useRef<HTMLDivElement>(null);
  return <div className="ui-collapsible"><button ref={trigger} className="ui-disclosure" type="button" aria-expanded={open} aria-controls={id} onClick={()=>{if(open&&panel.current?.contains(document.activeElement))trigger.current?.focus();onOpenChange(!open)}}><span>{label}</span><Icon name="chevron-down" size="inline"/></button><div ref={panel} id={id} className="ui-collapsible-panel" hidden={!open}>{children}</div></div>;
}
export type ActionMenuItem={id:string;label:string;tone?:'default'|'danger';disabled?:boolean;onSelect:()=>void};
export function MenuItem({item,onSelect}:{item:ActionMenuItem;onSelect:()=>void}) {
  return <button type="button" className="ui-menu-item" data-tone={item.tone??'default'} disabled={item.disabled} onClick={onSelect}><span>{item.label}</span></button>;
}
/** Native button disclosure, keyboard Tab and Escape, no misleading ARIA menu role. */
export function ActionMenu({label,items,leading}:{label:string;items:ActionMenuItem[];leading?:ReactNode}) {
  const [open,setOpen]=useState(false),[above,setAbove]=useState(false);
  const id=useId(),root=useRef<HTMLDivElement>(null),panel=useRef<HTMLDivElement>(null);
  const trigger=()=>root.current?.querySelector<HTMLButtonElement>('button[aria-controls]');
  useEffect(()=>{if(!open)return;
    const box=panel.current?.getBoundingClientRect(),anchor=root.current?.getBoundingClientRect();
    if(box&&anchor)setAbove(box.bottom>window.innerHeight&&anchor.top>=box.height+4);
    panel.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({preventScroll:true});
    const outside=(e:Event)=>{if(!root.current?.contains(e.target as Node))setOpen(false)};
    document.addEventListener('pointerdown',outside);document.addEventListener('focusin',outside);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('focusin',outside)};
  },[open]);
  return <div ref={root} className="ui-menu-anchor" onKeyDown={e=>{if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();setOpen(false);trigger()?.focus()}}}>
    <div className="ui-menu-leading">{leading}</div><IconButton icon="more" label={label} aria-expanded={open} aria-controls={id} onClick={()=>{setAbove(false);setOpen(v=>!v)}}/>
    <div ref={panel} id={id} className="ui-action-menu" role="group" aria-label={label} hidden={!open} data-placement={above?'above':'below'}>{items.map(item=><MenuItem key={item.id} item={item} onSelect={()=>{setOpen(false);trigger()?.focus({preventScroll:true});item.onSelect()}}/>)}</div>
  </div>;
}

export function AppBar({ title, onBack, action, onAction, trailing }: {
  title: string; onBack?: () => void; action?: string; onAction?: () => void; trailing?: ReactNode;
}) {
  return <header className="app-bar">
    {onBack ? <IconButton icon="arrow-left" label="뒤로가기" onClick={onBack}/> : null}
    <span className="app-bar__title">{title}</span>
    {action && onAction ? <TextAction density="toolbar" onClick={onAction}>{action}</TextAction> : null}
    {trailing}
  </header>;
}

export type MainTab = 'home' | 'rediscover' | 'collection';

export function BottomNavigation({ active, onChange }: { active: MainTab; onChange: (tab: MainTab) => void }) {
  const tabs: { id: MainTab; label: string; icon: IconName }[] = [
    { id: 'home', label: '홈', icon: 'home' }, { id: 'rediscover', label: '꺼내보기', icon: 'book' }, { id: 'collection', label: '도감', icon: 'collection' },
  ];
  return <nav className="bottom-navigation" aria-label="주 메뉴">
    {tabs.map(({ id, label, icon }) => <button key={id} type="button" onClick={() => onChange(id)}
      className={`bottom-navigation__item ${active === id ? 'is-active' : ''}`}
      aria-current={active === id ? 'page' : undefined}><Icon name={icon} size="navigation"/><span>{label}</span></button>)}
  </nav>;
}

export function SegmentedChoice<T extends string>({ options, value, onChange, label }: {
  options: { label: string; value: T }[]; value: T; onChange: (value: T) => void; label: string;
}) {
  return <div className="segmented-choice" role="group" aria-label={label}>
    {options.map((item) => <button type="button" key={item.value} onClick={() => onChange(item.value)}
      aria-pressed={value === item.value} className={`segmented-choice__item ${value === item.value ? 'is-active' : ''}`}>{item.label}</button>)}
  </div>;
}

export function Toggle({ label, description, checked, onChange }: {
  label: string; description?: string; checked: boolean; onChange: (checked: boolean) => void;
}) {
  return <label className="setting-switch-row">
    <span className="setting-switch-row__copy"><strong>{label}</strong>{description && <small>{description}</small>}</span>
    <input className="sr-only switch-native" type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span className={`switch ${checked ? 'switch--active' : ''}`} aria-hidden="true"><span className="switch__thumb" /></span>
  </label>;
}

export function SettingRow({ title, detail, onClick }: { title: string; detail?: string; onClick: () => void }) {
  return <button type="button" className="setting-row" onClick={onClick}>
    <span>{title}</span>
    <span className="setting-row__value">{detail && <span>{detail}</span>}<Icon name="chevron-right" size="inline"/></span>
  </button>;
}

export function Dialog({ title, description, children, confirmLabel, confirmDisabled, onConfirm, onCancel, danger = false }: {
  title: string; description?: string; children?: ReactNode; confirmLabel: string; confirmDisabled?: boolean;
  onConfirm: () => void; onCancel: () => void; danger?: boolean;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;
  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const initial = dialogRef.current?.querySelector<HTMLInputElement>('input:not([disabled])')
      ?? dialogRef.current?.querySelector<HTMLButtonElement>('button:not([disabled])');
    initial?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); cancelRef.current(); return; }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ) ?? []);
      if (focusable.length === 0) return;
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('keydown', handleKey); previouslyFocused?.focus(); };
  }, []);
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
    <section ref={dialogRef} className="dialog" role="alertdialog" aria-modal="true" aria-label={title}>
      <Stack gap="component">
        <Stack gap="controls"><h2>{title}</h2>{description && <p>{description}</p>}{children}</Stack>
        <ActionGroup><TextAction onClick={onCancel}>취소</TextAction><Button size="compact" variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={confirmDisabled}>{confirmLabel}</Button></ActionGroup>
      </Stack>
    </section>
  </div>;
}

export function Toast({ message }: { message: string }) {
  return <div className="toast" role="status" aria-live="polite">{message}</div>;
}

export function EmptyState({ title, description, action }: {
  title: string; description?: string; action?: ReactNode;
}) {
  return <div className="empty-state"><h2>{title}</h2>{description && <p>{description}</p>}{action}</div>;
}
