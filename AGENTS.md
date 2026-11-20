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

13. **Immersive canvas requirement (2026-11-21):** Never wrap monthly artwork in a differently colored/rounded/bordered card. Home, saved animation, and graphic detail must share one uninterrupted page backdrop including app bar and nav. The prototype defaults to dark `#0C1111`. Do not quietly reintroduce a `hero card` while adding other screens. A light mode is acceptable only if the artwork remains visually continuous with the page.
14. Treat user-provided screenshots as composition references (full-bleed canvas, typography, spaciousness), NOT authorization to reproduce their product copy or artwork. Contrast: text ≥ 4.5:1, meaningful graphic-state strokes ≥ 3:1, with text progress redundancy.


## 타이포/아트 후속 기준 (v0.3)
- UI 타이포 토큰은 `design-system/typography.md`/`src/styles/tokens.css`를 우선 읽고 준수. 제목/원문 16px/보조 정보의 역할을 임의로 뒤섞지 않음.
- 폰트 SUIT Variable은 **후보**. 폰트/색을 임의로 최종 브랜드 결정처럼 사용하거나 장식적 세리프를 추가하지 않음.
- 월별 실루엣을 불투명한 ghost로 미리 모두 표시하지 않음: 글자는 **기존 날짜 수가 허용하는 아래쪽 영역 안에서만** 노출. 동일 날짜 추가 일기는 높이 유지. `design-system/graphic-growth.md` 참고.
- SVG 결과물은 규칙 검증용. 완성형 고퀄리티 그래픽이라고 표현하지 않음.

### 상징물 기반 타이포그래픽 아트 규칙 (v0.4)
- 여섯 갈래 눈꽃 글자를 화면에 무작위로 흩뿌리지 않는다. 각 글자의 기준각은 줄기 또는 가지의 접선과 일치해야 한다.
- 글자 진동을 만들 때 그룹의 자기 뿌리를 중심으로 ±0.3~1.3° 정도의 매우 느린 회전을 사용한다. 전역 흔들기, 독립적인 매 프레임 random jitter, 과장된 glow/spin은 금지.
- 눈꽃이 아래에서 위로 차는 고유 날짜 정책과 이미 찬 부분에만 글자가 추가되는 같은 날짜 정책을 지킨다.
- 사용자 색은 아직 후보이며, 디자인 심사 전에 그래픽을 '완성'이라고 표현하지 않는다.
- `design-system/illustration-motion.md`의 아트 QA와 남은 결함을 확인한다.

## 그래픽 상세 확대 UX v0.6
- 확대 기능은 숨겨진 선택 기능이다. 화면 위에 `+`, `-`, 배율 표시 등 조작 버튼이나 조작 힌트 문구를 추가하지 않는다.
- `GestureArtwork`에 핀치·팬 동작을 모아 구현하며, 아트 영역에는 윤곽 박스·툴바를 추가하지 않는다.
- 확대하지 않아도 감상/기록 조회가 가능해야 하며, 키보드용 대체 입력은 화면에 아이콘을 붙이지 않고 지원한다.

## Claude Code 협업·응답 언어 (2026-11-21)
- **사용자에게 전달하는 진행 보고, 질문, 최종 보고, 테스트 결과 설명, 미해결 문제는 모두 한국어로 작성한다.** 코드의 함수명/변수명, 터미널 명령, 원문 오류 로그, 외부 라이브러리 명칭은 원어를 유지해도 된다.
- 제품 정책·아트 디렉션·UI/UX 라이팅은 사용자가 ChatGPT와 먼저 합의한다. Claude Code는 확정된 명세의 구현·테스트를 맡고, 미확정 미적/제품 결정을 임의로 확정하지 않는다.
- 눈꽃 2.5D A/B 비교 작업 시 `docs/spec/19_눈꽃_2.5D_AB_Playground_구현명세.md`와 `docs/design/칭찬일기_눈꽃_아트디렉션_v1.0_제안.md`를 먼저 읽는다. A/B 결과는 디자인 실험이며 사용자 승인 전 실제 앱의 `GraphicArtwork`를 교체하지 않는다.
- Playwright MCP는 직접 브라우저 점검용, Playwright Test는 자동 재현 검사용, Chrome Performance는 렌더링 병목 진단용이다. 설치·테스트·측정이 실패하거나 미실행이면 한국어로 정확한 이유를 보고한다.
