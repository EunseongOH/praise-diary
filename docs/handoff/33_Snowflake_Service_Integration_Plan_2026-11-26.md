# 다정록 — Gate 3E 눈꽃 그래픽 실서비스 프로토타입 통합 계획 v1.0

> 2026-11-26 · **[사용자 승인]** 3E 단계의 눈꽃을 우선 앱에 연결해 화면 전체에서 직접 보며 검수. **[미확정]** 미감 최종 완성, 3E 각 비교안 확정, 실제 사용자/앱인토스 배포, 2026년 12월 특별 목표일 수.
>
> **현재 GitHub 코드만으로 통합 완료 주장 금지.** Gate 2I I3, Gate 3B R3, Gate 3E.1 T2와 최신 G1/G2 + SB-Gentle/Balanced 소스는 사용자 PC `C:\Users\User\diary\praise-diary\src\dev\...` 내 미커밋 연구 파일로 보고되었음. 본 GitHub 브랜치에는 해당 소스가 아직 없음. GitHub에서 현재 확인된 것은 **통합 지점 `src/graphics/ArtworkSlot.tsx`가 플레이스홀더**라는 사실이다.
>
> 브랜치 전략: **`feat/mvp-integration` (실제 통합 앱 코드)** → **`feat/snowflake-service-integration` (이번 작업)** → Draft PR base **`feat/mvp-integration`**에서 검수 → 사용자 검수 후 merge. `main` 직접 수정/병합/배포 금지. GitHub 현재 `develop` 브랜치 없음. `feat/design-system-prototype`는 실험/문서 보존용이므로 전체 merge, reset, rebase하지 말 것. 두 브랜치는 서로 달라짐(diverged); 제품 UI가 최신인 `feat/mvp-integration` 우선. 로컬 미커밋 연구 코드를 잃지 않도록 **별도 git worktree**에서 포팅.
>
> 선행: `docs/handoff/31_MVP_통합_작업기준_2026-11-26.md`, `docs/IMPLEMENTATION_STATUS.md`, `AGENTS.md`, `docs/spec/12_날짜설정_기록접근_특별목표_정책.md`.
>
> 상세 연구: `feat/design-system-prototype` 브랜치의 `docs/spec/31_Gate3E_Snowflake_Growth_Replay_Snowglobe_Reward_Study_v1.0.md` 및 `docs/prompts/31_Gate3E_Snowflake_Growth_Replay_Claude_Code.md`. 3E.1b+3E.2은 최근 사용자 보고에만 존재할 수 있으므로 해당 로컬 `src/dev/snowflakeGrowthReward/`와 `artifacts/snowflake-growth-reward-review/README.md`를 직접 열어 **실제 모듈, 로직, 메트릭**을 확인할 것. 이 문서 자체는 로컬 연구 코드 내용 전부를 본 것이 아니다.

## 1. MVP 통합 목적과 명시적 비범위

**목표:** 기존 앱의 현재 디자인/기록 플로우를 유지한 채 **12월 눈꽃**을 플레이스홀더 대신 실제 글자 기반 작품으로 렌더. 홈 / 작성 저장 완료 / 도감 카드(160px급) / 월 상세 / 핀치 상세는 동일한 source adapter를 재사용. 0일 빈 상태, 1~15일 연구형 성장(중심→바깥), 같은 날짜 추가 기록 밀도, 실제 diary 원문/출처, 편집/삭제, reduced motion, 성능 및 배경 연속성 검수. 저장 완료 'complete'일 때만 **선택한 성장 리플레이+눈꽃가루 보상 이벤트**를 재생하며 이후 I3로 복귀.

**이 단계는 시연용 UI 앱에 작품을 '붙여 보는' 통합이며 출시/서비스 배포가 아니다.** 현재 `feat/mvp-integration` 앱은 브라우저 `sessionStorage` + 가상 데이터 기반. 인증·영속 DB·Toss SDK·실기기 접근성·최종 미감 검수가 끝나지 않음. 공개 GitHub에 사용자 실제 일기 본문·캡처·시드·폰트 바이너리·로그·비밀키 저장 금지.

**완성형 기준:** Gate2I I3(2G R2 20초 실제 strand front/back 교대, 코어 국소 3D 회전, 검은 후광 제거, H3 겨울빛/희소 파스텔). Gate3B R3 중심 방사형 성장+Echo 보강. 현재 Gate3E 1b+2 후보: G1/G2 smoothing, SB-Gentle/Balanced; 사용자 미적 승인 전 **G1+Balanced를 잠정 기본 미리보기**로만 두고, 최종 출시 효과로 확정 금지. 미완성 부분·장시간 프레임 단발 hitch를 숨기지 않음. Gate3D 용수철/압축·반동 금지.

## 2. 실제 원격 앱 코드의 결합 지점 (확인된 파일)

`feat/mvp-integration`에서 확인:

- **`src/graphics/ArtworkSlot.tsx`** = 현재 명시적 통합 seam, 내부는 `<div role="img">작품 준비 중</div>` 플레이스홀더. Props는 `theme?: MonthTheme; writtenDays: number; letterCount: number; reducedMotion?: boolean; small?: boolean; letterSource?: string; entries?: DiaryEntry[]; fromWrittenDays?: number`. 이 공개 contract를 최대한 보존.
- **`src/screens/HomeShell.tsx`** = 홈 `<ArtworkSlot theme={...} writtenDays={days.size} letterCount={entries.length} entries={entries} reducedMotion={...} letterSource={...}/>`와 작품 상세 진입.
- **`src/screens/App.tsx`** = 저장 성공 후 `page.screen==='saved'`, 이미 `page.mode = 'growth'|'addition'|'complete'`와 `previousWrittenDays`를 `ArtworkSlot`에 전달. 현재 `mode='complete'`는 `theme.targetDays != null && beforeDays < targetDays && afterDays >= targetDays`인 경우에만 발생. 저장 성공 후에만 실행하도록 연동.
- **`src/components/content.tsx`** = `MonthTile` -> `ArtworkSlot small` (도감에서 애니메이션/반짝임 파티클 상시 재생 금지).
- **`src/screens/CollectionScreen.tsx`** = `MonthlyGraphicDetail` -> `ArtworkSlot`, 월별 기록 조회 및 확대(기존 경로/제스처 구현 실제 확인).
- **`src/graphics/GraphicArtwork.tsx`** = 기존 구형 SVG prototype(아래→위 reveal). 이를 눈꽃 정식 렌더러라고 오인하거나 미적인 fallback으로 강제로 노출하지 말 것. 1월 sheep은 새 renderer 없는 상태에서 기존 통합 계약/플레이스홀더 유지.
- **`src/data/types.ts`** = `DiaryEntry {id,entryDate,createdAt,title?,body,referencePrompt?}`, `MonthTheme {month,title,kind:'snowflake'|'sheep',targetDays:number|null}`.
- **`src/data/themes.ts`** = 2026-12 눈꽃 `targetDays:null` **정책대로 미정**, 2027-01 양과 해 15. 눈꽃 통합 때문에 12월 숫자를 15로 고치지 마.
- **`src/data/store.ts`** = 월별 작성일 distinct `entryDate`, `DiaryReflection`는 원문과 독립. 마음 덧붙이기/꺼내보기 코멘트는 그래픽 성장·작성일·추첨에 가산하지 않음.
- **`src/components/GestureArtwork.tsx`** = 핀치/팬/키보드 확대 1~3.2배, 버튼 없음. `MonthlyGraphicDetail`에 실제로 연결되어 있는지 확인하고 미연결이면 기존 상세 화면 구조를 유지하면서 올바르게 사용.
- **`src/styles/tokens.css`, `src/styles/app.css`, `src/styles/components.css`** = 페이지 full-bleed `#0C1111`와 앱 인터페이스 간 연결 검수. 별도 어두운 카드/경계/테두리 생성 금지.

**중요 발견:** 연구 눈꽃 그래픽은 remote branch의 `src/graphics/ArtworkSlot.tsx` 내에 존재하지 않는다. 이번 통합에서 로컬 미커밋 연구 엔진의 **필요한 코드와 의존성만 선택적으로 포팅**해야 한다. `src/dev/` 전체를 복사하거나 테스트용 7 fixture/PNG/MP4, Playwright, 개인 데이터/refs를 앱 런타임 import하는 것은 금지.

## 3. 로컬 코드 이식의 안전 절차 (필수)

1. 현재 사용자 로컬 디렉터리 `C:\Users\User\diary\praise-diary`는 Gate2A~3E 미커밋 작업이 있을 수 있음. 시작 전 `git status --short`, `git branch --show-current`, `git worktree list`, 중요한 untracked/modified 연구 파일 SHA256 체크. **어떤 경우에도 reset/clean/checkout/restore/pull/force push 금지.**
2. `git fetch origin feat/mvp-integration feat/snowflake-service-integration feat/design-system-prototype`. 기존 working tree를 유지하고 새로운 인접 경로(예: `C:\Users\User\diary\praise-diary-service-integration`)에 `git worktree add`로 **원격 `feat/snowflake-service-integration` 기반 로컬 작업 브랜치**를 생성. 로컬 브랜치 이름 충돌 시 다른 이름 사용; 기존 브랜치 강제 이동 금지.
3. 별도 worktree의 앱은 최신 `feat/mvp-integration` 코드가 기준. 연구 작업 트리에서 **필요한 TS/TSX/mjs 소스·소형 source config만** 선택 복사(원본 보존). `src/dev/snowflake...` 및 `src/dev/h3Refinement` 의 dependency graph를 실제 import 순서로 읽고, `src/graphics/snowflake/` (권장) 아래 **프로덕트-안전 모듈**로 정리. dev UI, fixture, PNG, video, 개인 데이터, Playwright 설정 전체 덮어쓰기 금지. dev 연구 컴포넌트를 앱에서 직접 import하지 말 것.
4. 런타임 source를 `src/graphics/snowflake/`에 분리: `types`, `sourceAdapter`, `core/geometry`, `render`, `growth`, `completion`, `SnowflakeArtwork` 등 실제 엔진 구조에 맞춤. React lifecycle wrapper에서 `ResizeObserver`, `visibilitychange`, DPR 변화, unmount, reduced motion, editor/entry CRUD를 처리. 계산·출처 ledger와 Canvas presentation 분리.
5. `ArtworkSlot`는 테마에 따라 snowflake를 게이트 뒤에 선택해서 render하고 non-snowflake/unsupported는 이전 placeholder나 정확한 개발 fallback 유지. **fallback이 임의 완성 눈꽃처럼 보이게 만들지 말 것.** 0일에는 원문 텍스트 0, 도감 empty 시 artwork disabled.
6. 개발·검수 feature flag 예: `VITE_SNOWFLAKE_ARTWORK=1` 및 `VITE_SNOWFLAKE_COMPLETION_REPLAY=1`을 별도로 제공. 앱 내 사용자 노출 토글 만들지 말고 local preview/build env에서 설정. 비활성화 시 기존 슬롯/fallback 정상 유지. **정식 배포 이전엔 기본 OFF가 안전.** 검수용 `.env.local`은 커밋 금지. 리뷰 환경에서 활성화 절차 README 명시.
7. `src/data/themes.ts`의 2026-12 `targetDays:null` 보존. 연구 1~15일 조형 preview는 `visualStageDays=15` (비즈니스 목표와 분리된 연구 설정)로만 사용 가능. 사용자 UI에는 '15일 달성' 같은 미확정 주장/완성 배지를 쓰지 않음. 완성 보상은 **실제 `theme.targetDays`가 정해진 월에 before<target<=after 조건일 때만** 앱에서 자동 발생. 2026-12 검수는 dev-only mock scenario/test flag로 시뮬레이션 가능하지만 제품 문구/목표 설정을 바꾸지 말 것.
8. 연구/제품 호환 이슈, side effects, 15일 이후 추가 기록/밀도, `DiaryReflection` 독립/삭제 영향, 동일 일기 2편, 수정/과거 작성, 글자 인스턴스 안정성을 QA.

## 4. 최소 변경 포인트와 Props 계약 확장

현재 `ArtworkSlotProps`를 그대로 유지하면서 **필요할 때만**:
- `mode?: 'idle'|'growth'|'addition'|'complete'|'detail'|'tile'` 또는 현재 `page.mode`를 매핑하는 `playback?: {kind, beforeWrittenDays, eventId}` 추가,
- `onComplete?: () => void`는 saved UX가 플레이어 완료를 기다려야 할 때만 추가,
- `artworkVersion`/render mode 개발·검수 설정은 내부로 제한.

`App.tsx`에서 `page.mode`, `page.day`, `previousWrittenDays`를 알고 있는 곳은 **저장 성공 뒤의 saved 화면**. 이벤트를 클릭할 때마다/컴포넌트 re-render·브라우저 뒤로가기로 다시 재생하지 않도록 `save event id` 또는 세션 내 안정 identity를 설계하되 제품 DB 모델을 임의 도입하지 않는다.
- home: 사용자가 볼 때 월별 실제 `entries` + U distinct로 정상 정지/idle; 3B R3 구조(완성 원형 I3), H3의 적절한 idle motion.
- saved(new different day): 실제 저널 저장 성공 후에만 월 성장 transitions. **same day extra** → density only, 성장/complete rewind 금지.
- saved(complete): 정식 목표일 비-null일 때만 3E G1 + SB-Balanced 후보 reward. 연구 표기는 내부 기본값일 뿐 외부 프로덕트에 영구 확정처럼 넣지 않음. 14→seed→15 타임랩스의 스프링/과잉 글로우 금지; event ends I3 clean.
- collection month tile small: static/reduced motion, 160px 레이아웃, 성능 캐시/resize, no auto reward.
- detail: 1x normal, pinch 3.2x, no zoom +/- controls; passive render while zooming, user text privacy preserved.
- empty/locked/unknown month: 기존 플로우 유지.
- 1월 양과 해: 그대로, 눈꽃 엔진·서리 파티클 적용 금지.

**연출 데이터/보안**: 기존 원문 `body`를 런타임 입력으로만 사용; scene glyph/provenance에서 `entryId, entryDate, source offset, copyIndex` 추적, `DiaryReflection` body는 source로 사용하지 않음. Canvas pixel/DOM dataset에 실제 diary body 넣지 말고 console/analytics/이벤트 telemetry에 원문/부분 문장 저장하지 말 것. React 키와 logs에서 개인정보 추적 피하기.

## 5. 기존 시연 앱/SDK·성능/접근성 원칙

- 이 앱은 **여전히 시연용** `sessionStorage` 기반. 그래픽만 붙였다고 앱인토스 출시 준비가 끝난 것은 아님. 실제 인증/DB/SDK/개인정보 처리/릴리스는 별도.
- 디바이스 320/375/390/430px, DPR1/2/3, 160px tile, 1x~3.2x zoom, AppBar/BottomNav 포함한 몰입형 `#0C1111` 배경 연속성, 200% text, 모바일 터치/핀치, keyboard+/-/0/arrow, React StrictMode 재마운트 검사.
- `prefers-reduced-motion` 또는 앱 `reducedMotion`이면 성장 리플레이/입자 자동 재생 생략, 고유 날짜 증가 및 완성 상태를 **문자**로 명확히 전달. off-screen/reduced 데이터에서 RAF 0/clock cleanup.
- GPU 무/headless와 실제 iOS/Android Apps-in-Toss WebView는 구분. 현재 연구 Gate에는 저장 순간 100~180ms 준비 프레임이 남아 있음; 메인 스레드 long task/fps p95/p99/max를 비교하고 masked loader로 은폐하는 허위 '완전 부드러움' 주장 금지. Worker가 Vite로 정상 번들되는지, `new URL(..., import.meta.url)` 경로·CSP/폰트 렌더러 호환 확인.
- 퇴장/unmount/page visibility/동일 기록 편집 이벤트 시 worker·RAF·context/canvas/observer release, event onComplete 중복 방지.
- 2026-12 targetDays null/기록 일수 0,1,3,8,14,15,16+ test; 같은 날 2편·삭제·복원·소급 작성 후 글자 identity; R3 Echo/Anchor stage endpoint; 2027-01 sheep placeholder unchanged.
- 접근성 이미지 semantics `role=img` 및 의미 있는 accessible name, `aria-hidden` canvas 내부, 실제 일기 본문을 accessibility label에 삽입하지 않음. 완성 상태는 시각 효과만으로 전달하지 않음.

## 6. 테스트/CI/PR 계획

### Worktree에서 먼저
- `npm install`, `npm run check`, `npm run test:e2e` (실제 package/CI 스크립트 확인), 새 service-snowflake E2E, 정적 디자인 contract 및 기존 3B/2I core regression tests 일부 이식. 타입/기존 glyphLayout 문제를 새 브랜치의 실제 기준으로 구분.
- **브라우저에서 직접 실행·스크린샷**: home/day0, home/day1, home/day8, day15 preview, same-day +2, saved new-day, saved complete(목표 시뮬레이션), collection tile, collection detail, zoom. 320/390/430.
- 픽셀 동일성: 원본 2I I3 / 3B R3 / 3E G1 study와 포팅한 서비스 renderer를 **동일 seed/fixture/artTime/DPR** 조건에서 비교. viewport/container scale 차이는 사전 정규화, '픽셀 동일' 실제 증거 없으면 선언 금지.
- 기능 플래그 ON/OFF 모두 App 정상 동작, 배포 번들 내부 source 검사, dev tests/artifacts 미포함, font file/실제 일기/민감 metadata 미포함.
- 신규 screenshots/report in `artifacts/snowflake-service-review/` **가상 fixture만**. GitHub 커밋에는 민감 데이터/이미지/원본 비디오 포함 금지. public repo 고려.
- CI workflow `.github/workflows/verify.yml` 현재 PR base=main만 자동 실행하므로 이번 **`feat/mvp-integration` 대상 PR도 CI가 실행되도록 workflow를 해당 작업 브랜치에서 최소 보완**하거나 푸시 브랜치 검사 추가. PR checks 및 브라우저 검사까지 검증하고 실패시 원인 기록.

### Commit/Push 전략 — 이번 작업부터 허용
사용자가 **GitHub에 실제 화면 통합**을 요청했으므로, 이전 Gate의 '코드 commit/push 금지'는 **연구 원본 보호 대상**이며 **이 신규 격리 worktree의 선별 통합 코드에 한해** 사용자 요청을 근거로 작은 commit/push 가능.
1. 새 worktree에서 **타입/엔진 포팅**(가능하면 빌드 단위) 커밋.
2. `ArtworkSlot` 및 화면 연동(홈/저장/도감/상세) + feature flag 커밋.
3. E2E/성능/README/CI 커밋.
4. `git push origin HEAD:feat/snowflake-service-integration` **기존 branch를 force push하지 않음**. 기존 원본 작업 트리 push 금지.
5. Draft PR `feat/snowflake-service-integration` → `feat/mvp-integration`는 코드가 실제 올라간 뒤 리뷰. **사용자 검수 전 merge 금지**. `main` 직접 push/merge/배포 금지.
6. 코드 이식이 기술적으로 불가능/미완료라면 텍스트 docs만 올라갔다고 '서비스에 붙였다'고 보고하지 말 것. PR에는 구현 상태·미해결 성능/미적 잔여를 정확히 적을 것.

## 7. 완료 조건 — 이번 통합은 aesthetic signoff가 아님

- `ArtworkSlot`가 2026-12에서 **실제 글자 기반 눈꽃**을 렌더하고 홈/저장/도감/상세가 같은 아트 엔진을 공유한다. 정상 0일·미정 목표·2027-01은 기존 UI 규칙과 충돌하지 않는다.
- 실제 entryId/entryDate/body로 stage/밀도 표현, 같은 날 +2/Reflection/일기 수정·삭제 stable.
- 저장 성공 후 올바른 growth/complete event, reduced motion, replay only once; 완료로 간주할 목표일은 미정이면 트리거 없음.
- full-bleed·tile·zoom 모두 모바일 검수, art lifecycle cleanup, 최종 상태 I3, FPS/hitch 수치 공개.
- 최소 `npm run build` + 관련 e2e/CI 통과 또는 실패 사유를 정확히 보고. 다른 회귀 미실행이면 사용자에게 명시.
- **로컬 기존 연구 작업/자료 손실 0**, 신규 격리 feature branch에만 commit/push, Draft PR (미병합).
- 사용자에게 4화면 스크린샷과 실제 브라우저 검수 주소를 제시. GitHub branch/PR 링크 제시. 정확한 URL은 실제 만들어진 것만 공유.
