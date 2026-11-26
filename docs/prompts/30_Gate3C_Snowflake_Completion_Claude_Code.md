# Claude Code 실행 프롬프트 — Gate 3C: Snowflake Completion Moment Study

**이번 과제는 14→15일 목표 달성 순간의 축하 연출 C0/C1/C2/C3를 구현하는 개발 전용 디자인 스터디다.**

**사용자에게 보고하는 모든 내용은 한국어로 작성해 줘.** 작업 중 테스트가 실패하면 원인을 고쳐 재실행하고, 미완성/미검증 항목은 있는 그대로 보고해.

## 0. 전제와 사용자 선택

- Gate 3B의 **R3(중심에서 바깥으로 피어나는 R2 성장 구조 + 초기 Echo 보강)**를 사용자가 잠정 선호. **Gate 2G의 R3와 다른 뜻**이다.
- 눈꽃의 **완성형**은 Gate 2I **I3**: 검은 후광 없음, 중앙 코어의 실제 국소 3D 움직임, Gate 2G **R2의 20초 실제 전면/후면 구절 교대**, Gate 2H H3의 차가운 겨울빛과 소수의 옅은 파스텔 파티클. 기존 fixture 수·배치·순서·빛을 바꾸지 말 것.
- 사용자는 **14일과 15일의 형태 변화만으로는 목표 달성 보상감이 약하다**고 판단. 실제 diary 글자들이 눈꽃 **주변/배경에 흩날리는 효과**, 눈꽃 중심에서 팔로 **서리빛이 퍼지는 효과**, 그리고 조합을 동일 조건에서 비교하고 싶어함.
- **15일은 정규형 테스트 fixture**. 2026년 12월 특별 목표일은 미정. completion trigger는 `monthId, targetDays, count(distinct entryDate)` 기반으로 시뮬레이션하며 제품 정책과 DB에 15를 하드코딩하지 말 것.
- 이번 Gate는 **최종 시안 선정이 아닌 시각 검수 자료 제작**. C3가 좋다고 임의 확정하지 마.

## 1. 안전하게 시작하기

로컬 경로: `C:\Users\User\diary\praise-diary`

1. `git status --short` 및 2A~2I/3A/3B의 tracked/untracked 소스·영상·산출물/fixture 중 주요 파일 해시를 기록해. 미커밋 로컬 자료는 GitHub에 없을 수 있으니 원격 코드로 덮지 마.
2. **`git pull`, `git checkout`, `git reset`, `git restore`, `git clean` 금지**. 이번 연구의 commit/push/PR 금지.
3. `git fetch origin feat/design-system-prototype` 후 아래 명세를 `git show origin/feat/design-system-prototype:docs/spec/30_Gate3C_Snowflake_Completion_Moment_Study_v1.0.md`로 **전부 읽고**, 상세 구현 기준으로 삼아. 이번 프롬프트보다 해당 명세의 세부 제약이 우선.
4. `AGENTS.md`, `docs/spec/12_날짜설정_기록접근_특별목표_정책.md`, `docs/spec/29_Gate3A_Snowflake_Daily_Growth_Structure_Study_v1.0.md`, `docs/spec/28_Gate2I_H3_Visual_Refinement_Performance_Study_v1.0.md`, `docs/decisions/27_12월_눈꽃_겨울빛_다색반짝임_월별테마확장_방향합의_v1.0.md`를 읽어.
5. **실제 로컬** Gate 3B의 `src/dev/snowflakeRadialGrowth/`, `src/dev/SnowflakeRadialGrowthStudyPage.tsx`, Gate 2I `src/dev/h3Refinement/`, 기존 H3 renderer, `artifacts/snowflake-radial-growth-review/README.md`, `metrics.json`, I3 최종 fixture/tests를 직접 점검해. 존재하지 않는 API/slot 명칭 추측 금지.

## 2. 구현할 비교 시안과 공통 시나리오

`C0` — Baseline: Gate 3B R3의 14→15일 기본 성장 상태. 추가 축하 효과 없음.

`C1` — Praise Letterfall: 15일 조형이 완성된 직후, **이미 실제로 쓴 일기에서 나온 글자 복제 렌더 인스턴스**가 눈꽃 뒤와 주변 여백에 서서히 흩날림. 조용한 겨울빛 중심, 다색은 아주 드물게. 일반 눈송이 SVG/별/색종이/가짜 글자는 금지.

`C2` — Final Crystal Bloom: 마지막 글자가 결합된 뒤 **원래 I3 눈꽃 글자**를 따라 국소적인 서리빛이 중심→팔→외곽으로 잠깐 퍼짐. 전체 화면 플래시·영구 후광·반짝이는 외곽선 추가 금지.

`C3` — Bloom + Letterfall: C2 개화 직후 C1 글자 흩날림이 시간차로 겹치며 부드럽게 이어짐. 전체 강도를 무조건 높이는 것이 아니라 차분한 우아함과 보상감을 함께 평가.

**동일 조건**: 동일 base/short/ultrashort/long/mixed 가상 fixture의 `D14`에서 시작하고, eventTime=0에 새로운 **15번째 고유 entryDate의 실제 작성 완료 이벤트**를 모사한 뒤 `D15`로 진입. 0초 직전에는 D15 원문/글자가 없고, C0~C3 **동일한 기본 14→15 transition**이 적용되어야 함. 작품의 카메라·scale·art clock·기존 H3 파티클·색·일기 source IDs는 모두 동일.

**이번 기본 비교는 C0~C3 4개 필수, C4(글자 궤도)는 구현하지 않아도 됨.**

## 3. 5초 연구용 타임라인

다음은 디자인 연구값이며 제품 확정 시간이 아니다.

- `-0.8→0s`: 14일 R3 눈꽃. 15일 글자 선노출 절대 금지.
- `0→0.9s`: 마지막 기록의 글자가 열린 최종 모티프에 결합, 모두 동일한 기본 transition.
- `0.8→1.8s`: C2/C3만 코어→여섯 팔→외곽 글자에 찬 서리빛 파동 한 번. 코어/팔 본체의 20초 2.5D 회전은 유지.
- `1.3→3.9s`: C1/C3만 배경의 글자가 각기 다른 시점에 등장, 조용히 아래/옆으로 이동하며 작게 회전, 점점 사라짐.
- `3.9→5s`: 효과 레이어를 fade out 후 **완전 해제**.
- `5.1s 이후`: 같은 art clock 시각의 기존 I3 day15와 pixel-perfect. 추가 glow/particle/RAF/DOM 계속 남으면 오류.

5초 연출 외 전체 길이 3.5/6.5초, letterfall low(12~18개)/medium(24~32개)/high(40~55개), Bloom 강도 0.5/1/1.5를 debug 옵션으로 비교. 총 등장 글자 수와 **동시 표시 글자 수**를 구분(초기 동시 4~10개 수준을 연구 상한으로 시험). 기존 H3의 15일 기본 50개 파티클(파스텔 6개)은 그대로 두고 새 효과 glyph 수는 별도 계산해.

## 4. 원문·정체성·조형 안전

- 원문에서 실제 grapheme와 연속 phrase만 선택, `entryId/sourceStart/sourceEnd/copyIndex` 추적. 랜덤 문자/인공지능 생성 칭찬 문구 금지.
- 별도 **effect-only render clone**은 허용, 그러나 실제 diary entry, U unique day, Anchor/Echo ledger, R3 초기 scaffold, I3 본체 글자 수·슬롯·모션을 변경하면 실패.
- 글자가 흩날리며 눈꽃 코어/줄기를 지나치게 가리지 않도록 화면 주변의 여백을 우선. C1/C3의 전후 깊이 느낌은 layer/scale/alpha/blur의 절제된 조합으로, H3 본체의 앞뒤 글자 가림을 속이지 말 것.
- C2/C3 glow는 **실제 I3 glyph/각 팔의 현재 pose**를 따라가야 함. 캔버스에 커다란 동심원/원형 효과·새로운 외곽 라인/네온을 덧그려 눈꽃 모양을 속이지 않음.
- 사용자 실제 diary 본문·외부 레퍼런스 사진/영상/프레임/URL을 파일/fixture/metrics/로그/소스에 저장하거나 GitHub에 보내지 마. 공개 가능한 가상 기록 fixture만.

## 5. 완료 이벤트 상태 — 연구용 스텁

연구 페이지에 trigger/replay/seen 상태 컨트롤을 제공하고, `count(distinct(entryDate))`가 `targetDays-1 → targetDays`가 되어 실제 저장 완료되었다는 이벤트에서만 완료를 자동 트리거해.

- 같은 날짜 두 번째 글 작성으로 전체 **일기 편수**가 15가 되어도 발동 금지.
- 단순 페이지 재방문이나 재렌더에 자동으로 다시 재생하지 않음.
- 삭제 후 다시 달성, 과거 날짜 backfill 달성, 수동 replay는 dev 컨트롤과 QA에서 분리해 재현 가능하게 함.
- **연구 기본 권장**은 최초 달성 자동 1회. 감소→재달성 재자동재생 여부와 replay 제품 UX는 미결정으로 보고.
- `targetDays=10/15/20`은 trigger 로직 비교용 연구 값이며 **모든 목표값에서 I3 15일 최종형이 자동 완성된 척하면 안 됨**. 다른 목표의 조형 매핑은 보류.
- 실제 DB, 앱 저장소, analytics, 알림, 제품 UI 카피, 영속 상태 만들지 말 것.

## 6. 페이지와 코드 위치

새 개발 route:
`/__dev/snowflake-completion-study`

신규 파일 예시(실제 프로젝트 규칙에 맞춰 조정 가능):
`src/dev/snowflakeCompletion/{types.ts,timeline.ts,letterfall.ts,bloom.ts,CompletionCanvas.tsx,metrics.ts}`
`src/dev/SnowflakeCompletionStudyPage.tsx`
`tests/e2e/snowflakeCompletion.logic.spec.ts`
`tests/e2e/snowflakeCompletion.spec.ts`
`tests/e2e/snowflakeCompletion.capture.ts`
`tests/e2e/snowflakeCompletion.perf.ts`

I3/3B 코드는 import/use만 해. **기존 파일에 직접 로직 수정 금지**. 꼭 필요한 dev 라우트/테스트 등록만 `src/main.tsx`, `playwright.config.ts`, `package.json`의 기존 내용 보존하며 최소 변경 가능.

개발 페이지는 C0/C1/C2/C3 2×2 비교, solo, timeline scrub/play/pause, 전/후 날짜 U, 진입/revisit/replay, density, bloom 강도, 160/320/375/430px, full/core/arm crop, base/short/ultrashort/long/mixed, reduced-motion, source/debug·active effect count·FPS, art clock 고정/재생 기능을 지원.

**개발 페이지는 회색 카드를 씌운 제품 UI 시안이 아니라** 기존 full-bleed 눈꽃 작품만 비교하는 연구 화면으로 작성.

## 7. 필수 산출물

새 결과 폴더: `artifacts/snowflake-completion-review/`; 기존 Gate output 수정/덮어쓰기 금지.

1. `01_C0_C1_C2_C3_storyboard.png`: 동일 14→15, 0/0.9/1.7/3/5초 4시안 비교
2. `02_C0_C1_C2_C3_side_by_side.mp4`: 같은 시작 시각/동일 시간축 영상 (최소 6초 이상)
3. `03_letterfall_density_low_mid_high.png`
4. `04_bloom_intensity_and_wave.png`
5. `05_combined_C3_full_motion.mp4`
6. `06_160_375px_mobile_comparison.png`
7. `07_effect_source_and_z_debug.png`
8. `08_end_state_I3_pixel_parity.png`
9. `09_reduced_motion_and_completion_state.png`
10. `10_performance.json`, `metrics.json`, `README.md`

MP4가 오프라인 frame assembly라면 **실시간 성능으로 주장하지 말고**, README에 오프라인 합성이라고 명시. MP4 생성 실패 시 실패 원인/대체 PNG storyboard 제공.

## 8. 자동 테스트와 품질 판단

- C0 기준 baseline 영상과 C1/C2/C3의 기본 14→15 전환 동일.
- save event 이전 `D15` 원문/새 영역/파티클 노출 0.
- C1 효과는 letterfall만, C2는 bloom만, C3는 두 개 조합; 기존 R3 성장·I3 본체는 각 비교안 동일.
- letterfall effect source metadata 정확/가짜 글자 0, 중복된 실제 entry/slot 0, R3 temporary echo identity 무단 재할당 0.
- Bloom의 실제 glyph 위치/빛 전파가 코어→팔→외곽 순서인지, 본체 20초 실제 전면/후면 교대 유지되는지 확인.
- t=5.1s 이후 effect layer 제거 + **동일 art clock의 I3 day15 canvas 픽셀 diff=0**, 렌더 상태/observer/RAF 이벤트 정리.
- Dev timeline seek/replay를 반복해도 같은 프레임 픽셀과 active glyph IDs 결정적 재현.
- `prefers-reduced-motion`: 반복 모션 없이 완성 작품을 바로 보여주고, 완료 여부는 별도 텍스트로 접근 가능하게 제공.
- 160px 썸네일 자동 눈보라 재생 금지; 전체/확대/다른 배경/저사양 검수.
- goal trigger: U distinct, partial delete, backfill, undo, remount/revisit/replay, targetDays 10/15/20 (단 15day visual test와 분리).
- 단일 작품 375px DPR1/1.5/2에서 C0~C3의 event-frame p95 frametime, draw calls, FPS, effect glyph count, memory 가능 시, CPU1× 10초×3회. 2×2 동시 재생 FPS와 혼동 금지. 실기기 Apps-in-Toss WebView 미검증 기록.
- 신규 테스트 및 이전 Gate 회귀 테스트. `glyphLayout.ts:193`의 기존 TS 오류 등과 신규 결함 구분, 통과 기준 임의 완화 금지.
- 원본 코드/산출물 변경 0. 실서비스 번들에 이번 dev code 미포함. commit/push/PR 0.

## 9. 최종 보고(한국어)

1. 사용자용 짧은 결론과 미적 우열 **미판정** 명시
2. C0/C1/C2/C3가 언제/무슨 효과를 보여주는지 표
3. 비교 영상 02, 05와 시트 01의 절대 경로 + dev page URL
4. Letterfall 실제 diary 출처(가상 fixture), 생성 글자 수, 동시 개수, 깊이·빛 강도
5. Bloom 실제 glyph path와 I3 본체 보존 증거
6. 유일 작성일 완료 트리거와 재방문/삭제·재달성 정책 시뮬레이션
7. 끝난 뒤 동일 I3 픽셀 parity, reduced-motion/모바일 테스트
8. 성능/메모리/실기기 미검증, 테스트 및 회귀 결과
9. 기존 Git/worktree/레퍼런스 보호 상황, 새 파일·변경 파일 목록 및 commit/push/PR 미실행 확인
10. 사용자가 미감으로 선택할 부분(편안한지, 보상이 충분한지, 글자 수·빛 강도·시간)

**즉시 연구용 구현·테스트·산출물 생성까지 진행해.** 사용자 검수 전 제품 디자인으로 확정/배포하지 마.
