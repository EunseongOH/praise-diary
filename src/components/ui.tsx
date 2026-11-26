import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger';

export function Button({ children, variant = 'primary', disabled = false, onClick, type = 'button', className = '' }: {
  children: ReactNode; variant?: ButtonVariant; disabled?: boolean; onClick?: () => void;
  type?: 'button' | 'submit'; className?: string;
}) {
  return <button type={type} disabled={disabled} onClick={onClick} className={`ui-button ui-button--${variant} ${className}`.trim()}>{children}</button>;
}

export function TextAction({ children, onClick, className = '' }: {
  children: ReactNode; onClick: () => void; className?: string;
}) {
  return <button type="button" onClick={onClick} className={`ui-text-action ${className}`.trim()}>{children}</button>;
}

export function AppBar({ title, onBack, action, onAction }: {
  title: string; onBack?: () => void; action?: string; onAction?: () => void;
}) {
  return <header className="app-bar">
    {onBack ? <button type="button" className="app-bar__back" onClick={onBack} aria-label="뒤로가기">←</button> : null}
    <span className="app-bar__title">{title}</span>
    {action && onAction ? <button type="button" onClick={onAction} className="app-bar__action">{action}</button> : null}
  </header>;
}

export type MainTab = 'home' | 'rediscover' | 'collection';

export function BottomNavigation({ active, onChange }: { active: MainTab; onChange: (tab: MainTab) => void }) {
  const tabs: { id: MainTab; label: string }[] = [
    { id: 'home', label: '홈' }, { id: 'rediscover', label: '꺼내보기' }, { id: 'collection', label: '도감' },
  ];
  return <nav className="bottom-navigation" aria-label="주 메뉴">
    {tabs.map(({ id, label }) => <button key={id} type="button" onClick={() => onChange(id)}
      className={`bottom-navigation__item ${active === id ? 'is-active' : ''}`}
      aria-current={active === id ? 'page' : undefined}>{label}</button>)}
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
    <input className="sr-only switch-native" type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span className={`switch ${checked ? 'switch--active' : ''}`} aria-hidden="true"><span className="switch__thumb" /></span>
  </label>;
}

export function SettingRow({ title, detail, onClick }: { title: string; detail?: string; onClick: () => void }) {
  return <button type="button" className="setting-row" onClick={onClick}>
    <span>{title}</span>
    <span className="setting-row__value">{detail ? detail : <span aria-hidden="true">›</span>}</span>
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
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {children}
      <div className="dialog__actions">
        <Button variant="secondary" onClick={onCancel}>취소</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={confirmDisabled}>{confirmLabel}</Button>
      </div>
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
