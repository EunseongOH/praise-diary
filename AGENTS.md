# Praise Diary — implementation and design rules

1. Source of truth: `docs/spec/01_서비스_누적_PRD.md`, then the newest decision in `docs/spec/12_날짜설정_기록접근_특별목표_정책.md`. Preserve `[확정]`, `[제안]`, `[보류]`, `[검증 필요]` status in discussions; do not turn proposals into requirements by accident.
2. Read `design-system/principles.md` and `design-system/component-inventory.md` before editing UI. Read `src/content/copy.ts` before creating text.
3. Do not invent category chips, raw status codes, AI-style dashboard labels, sparkle tiles, giant progress bars, abundant decorative icons, purple gradients or generic pep-talk quotes.
4. The monthly typographic artwork is the hero. Calm UI chrome, consistent 8px-based rhythm, visible focus, >=44px hit targets and `prefers-reduced-motion`.
5. Reuse AppBar, BottomNavigation, PrimaryButton, TextAction, SegmentedChoice, Switch, InlineNotice, MonthTile, DiaryList, ConfirmDialog, GraphicArtwork. New components need a distinct user problem.
6. The default diary day rolls over at 00:00 KST and can be changed; do not retroactively move saved diary dates. Today + yesterday only for new entries; creation date and diary attribution date differ.
7. Count monthly progress with unique `entryDate`; letter rediscovery unlocks after 10 individual entries and remains unlocked if entries are deleted. List access is always available independently.
8. Notifications are FEATURE-GATED until Apps-in-Toss policy and template approval. Never send or promise unapproved reminders.
9. The current app uses example entries and sessionStorage for design prototype ONLY. Replace with authenticated backend before launch. Never log body text or send it to analytics.
10. Only commit code and safe fake examples; no auth keys, credentials, real journal text, unpublished sensitive user data or font files. The GitHub repository is currently public.

11. User-supplied reference palette (candidate only): `#B8D68A`, `#61AE72`, `#FFFFFF`, `#FAD89E`, `#A6C5D3`. Use semantic AA-contrast tokens, not raw pastel colors for normal text. See `design-system/color-system.md`.
12. Do not claim production completeness: sessionStorage and fake preview data are demo-only; `npm run build` has not yet been run successfully in the constrained environment.

13. Immersive graphics: home/saved/detail are one uninterrupted canvas without a differently colored, rounded or bordered artwork card. Dark default #0C1111; a later light theme must preserve no-card layout. Maintain legible text and visual-state contrast.
