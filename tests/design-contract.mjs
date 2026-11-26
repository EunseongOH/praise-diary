import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const tokens=read('src/styles/tokens.css'), css=read('src/styles/components.css'), main=read('src/main.tsx');
for(const [name,value] of Object.entries({'touch':'44px','touch-comfort':'48px','cta-height':'52px','field-padding':'var(--space-3)','gap-field-actions':'var(--gap-component)','gap-action-group':'var(--gap-controls)','menu-min-width':'144px','menu-inset':'var(--space-1)','menu-gap':'var(--gap-text)','menu-row-height':'var(--touch-comfort)','menu-row-padding-x':'var(--space-3)','menu-row-padding-y':'var(--space-2)','focus-width':'2px','menu-anchor-gap':'var(--gap-text)','dialog-padding':'var(--gutter)'})){
  assert.ok(tokens.includes('--'+name+':'+value),'Missing or changed token '+name);
}
for(const fragment of ['padding:var(--menu-row-padding-y) var(--menu-row-padding-x)','min-height:var(--menu-row-height)','gap:var(--menu-gap)','padding:var(--field-padding)','gap:var(--gap-action-group)','outline-offset:calc(-1 * var(--focus-width))','box-shadow:inset 0 0 0 var(--focus-width) var(--focus)'])assert.ok(css.includes(fragment),fragment);
assert.ok(main.indexOf('./styles/components.css')>main.indexOf('./styles/app.css'),'Shared component rules load last');
const app=read('src/screens/App.tsx');assert.ok(!/<(?:textarea|input)\b[^>]*className="form-(?:textarea|input)"/.test(app),'Use shared fields, not legacy form styles');
assert.ok(read('src/components/DiaryContent.tsx').includes('gap="field-actions"'),'Semantic field-actions layout');
console.log('PASS — v0.5 source contract (not a computed-layout browser test)');

for(const f of ['--select-label-gap:var(--gap-inline)','--calendar-mark-size:36px','--calendar-mark-gap:var(--gap-controls)','--gap-writer-meta:var(--gap-controls)'])assert.ok(tokens.includes(f),f);
for(const f of ['.ui-compact-select__trigger:focus-visible{outline:var(--focus-width) solid var(--focus);outline-offset:calc(-1 * var(--focus-width))}','inline-size:min(var(--calendar-mark-size),calc(100% - var(--calendar-mark-gap)))','gap:var(--gap-tile-row) var(--gap-tile-column)'])assert.ok(css.includes(f),f);
assert.ok(!read('src/styles/app.css').includes('margin-inline:calc((100% - 308px) / 2)'),'No negative calendar margin');
assert.ok(read('src/screens/HomeShell.tsx').includes('<CompactSelect'),'Reuse shared selector');
assert.ok(read('src/screens/WriterLayout.tsx').includes('<Textarea'),'Reuse shared writer fields');
console.log('PASS — v0.6 selection, calendar surface, writer layout source contracts');

for(const f of ['--select-trigger-padding-x:var(--space-3)','--gap-disclosure-panel:var(--gap-controls)','--list-row-padding-x:var(--space-3)','--list-group-gap:var(--gap-section)'])assert.ok(tokens.includes(f),f);
console.log('PASS — v0.7 select, disclosure, record rows');
