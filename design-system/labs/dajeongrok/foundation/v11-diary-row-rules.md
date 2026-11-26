# v0.11 — DiaryRow component specification
User confirmed collection B continuous two-column layout. Current first, past known months descending, next two months ascending. No review switch. A preserved as research only.
## Row anatomy
DiaryRow = one button (no nested controls), optional metadata row → optional title → body preview. All-record, date, month lists use it. Parent controls list grouping/gap; row controls own padding and text. Record counts derived from reflections, never a separate click target. Original body preserved; previews collapse whitespace to avoid isolated ellipsis. Title whitespace-only treated absent.
## Variant properties
- title: present/absent (derived). Present title16/500/1.5, body14/400/1.6 max2 lines. Absent no title slot, body16/400/1.6 max3 lines.
- reflection: present/absent (derived count >0); no zero badge, no empty gap. Date visible → count next to date. Grouped date → count in same metadata slot, without date; no metadata row if count zero. This prevents count being interpreted as group total and avoids icon alongside multi-line body. Grouped placement is review proposal.
- date: visible/grouped. Header date in C list, row date in A/B.
- surface: plain/card. Plain no background, optional 1px divider on bottom inset without shifting geometry; card inset border, surface fill. All row variants same content/padding. Existing A/B/C list review retained (not yet approved).
- states: default/hover/pressed/focus-visible; hover/pressed surface-green, focus inset2, geometry unchanged. Row whole width/min48. No disabled variant required for actual readable entry.
## Geometry and tokens
Page gutter20; row padding12×12; row internal vertical gap4; meta display flex align-items:center (not baseline), wrap for text enlargement. Date/number Pretendard13/400/1.5 same line box; existing icon16, center aligned with number. Date↔count8, icon↔number4. Same muted color, no badge. A row divider bottom; B card gap12; C group gap24, group date→row8, group date text starts at row text x. No screen-local override or negative margins. All styles owned by components.css; old app.css row rules removed. Long text wraps without horizontal overflow. Actual title/body remain unchanged on save/read.
## Verification
320/390/430/635 widths, four content combos in A/B/C, metadata center delta <1 CSS px, 8/4 gap, font+line-height equality, hover rect unchanged, 200% overflow, original content read. Captures in CI artifacts. Geometry tests do not replace visual inspection/actual device checks.
