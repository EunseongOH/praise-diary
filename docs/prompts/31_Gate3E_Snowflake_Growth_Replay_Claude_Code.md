# Claude Code 실행 프롬프트 — Gate 3E.1 Snowflake Growth Replay

**모든 진행/결과/문제/테스트 보고는 한국어로 작성해 줘.**

## 0. 꼭 먼저 읽을 단 하나의 최신 상세 명세

로컬 프로젝트: `C:\Users\User\diary\praise-diary`

GitHub: `EunseongOH/praise-diary`, 브랜치 `feat/design-system-prototype`

먼저 `git status --short`를 보고 2A~3D 실험의 미커밋 tracked/untracked 소스와 주요 산출물의 해시/경로를 보호한 후, `git fetch origin feat/design-system-prototype`로 문서만 갱신하고 아래 명세 전체를 반드시 읽어:

```bash
git show origin/feat/design-system-prototype:docs/spec/31_Gate3E_Snowflake_Growth_Replay_Snowglobe_Reward_Study_v1.0.md
```

**이 상세 명세가 본 프롬프트보다 우선한다. 명세를 읽기 전에 구현 시작하지 마.**

추가로 확인:
- `AGENTS.md`
- `docs/spec/12_날짜설정_기록접근_특별목표_정책.md`
- `docs/spec/28_Gate2I_H3_Visual_Refinement_Performance_Study_v1.0.md`
- `docs/spec/29_Gate3A_Snowflake_Daily_Growth_Structure_Study_v1.0.md`
- `docs/spec/30_Gate3C_Snowflake_Completion_Moment_Study_v1.0.md`
- `docs/decisions/25_Living_Typography_Sculpture_조형_방향합의_v1.0.md`
- `docs/decisions/27_12월_눈꽃_겨울빛_다색반짝임_월별테마확장_방향합의_v1.0.md`
- 실제 로컬 `src/dev/snowflakeRadialGrowth/`, `src/dev/snowflakeCrystalBloom/`, Gate2I/I3 렌더러·Gate3C/SB 연구, `artifacts/snowflake-radial-growth-review/`, `artifacts/snowflake-crystal-bloom-review/`, 각 README/metrics/tests.

**안전 규칙:** `git pull` / `checkout` / `reset` / `restore` / `clean` 절대 금지. 2A~3D 기존 파일/산출물 및 사용자 레퍼런스 미디어 덮어쓰기·업로드 금지. 이번 로컬 코드 commit/push/PR 금지. 실서비스 앱 화면, `GraphicArtwork`, 디자인 시스템/DB/analytics 수정 금지. dev route 등록을 위한 `src/main.tsx`, `playwright.config.ts`, `package.json`에 한한 기존 줄 보존형 최소 추가 허용.

## 1. 이번에 구현할 것은 Gate 3E.1 — 성장 타임랩스까지만

사용자는 Gate 3D B2 영상을 '여섯 갈래가 용수철처럼 요동친다, 고급스럽지 않고 보상감도 없다'고 평가했다. **기존 879자/여섯 팔의 반경 압축(8~18%)→복원, 변위·스케일·탄성 포즈, 코어 응축→에너지 발사, 강한 glow sweep를 재활용하지 마.**

새 목표는 **'완성 목표 달성 → 1일차 중앙 결정 씨앗까지 글자가 시각적으로 사라짐 → 실제 1~15일의 성장 이력이 빠르게 다시 펼쳐짐 → 최종 I3 눈꽃 완성'**이다.

이때 **글자 위치가 움직여서 성장하는 것이 아니라**, 중심에서 바깥으로 각 motif의 **실제 일기 글자가 원래 슬롯에서 추가로 나타나며** 성장한다. 기존 안정 Anchor의 기준 좌표는 이동하지 않는다. R3 정지 조형의 실제 단계/원문 출처를 사용해야 하며 가짜 선화/눈꽃 도형·미래 기록 문구·무의미한 칭찬 생성 금지.

사용자가 승인한 전체 최종 콘셉트에는 눈꽃 완성 **이후에만** 스노우볼처럼 흩날리는 글자눈/서리 가루/반짝임이 있지만, **이번 실행은 1차 구조 성장 모션 연구만 완료**해. Snowglobe/particle/sparkle 구현은 건너뛰고 stub/인터페이스 정도만 남겨. **실제 1차 성장 영상을 사용자가 검수/승인한 후에야 2차를 진행**하므로 지금 성급히 구현하지 마.

## 2. 첫 번째 할 일: 실제 로컬 구현 탐색/기술 충돌 보고

1. Gate 3B의 R3의 실제 `prefix(k)` 상태 생성 API와 Echo 임시 재배치 방식을 조사해.
2. `S(k)=R3(prefix through kth unique entryDate)`를 k=1..15 모두 생성하고, 정적 R3 결과와 같은 art clock, seed, viewport에서 비교해.
3. 기존 Gate 2I I3에서 글자 draw, 2G R2 앞/뒤 교대, core, H3 빛, 20초 모션이 어디서 계산되는지 확인해. 원본 구현을 손대지 않는 dev-only adapter 접근이 가능한지 확인.
4. 날짜 사이 instance identity를 STABLE/REVEAL/ECHO_REASSIGN/REMOVE 등으로 분류하는 ledger를 만들어. `entryId/sourceOffset/copyIndex/strandId/slotId`의 실제 타입/키를 확인해. R3 원본 Echo 재할당 문제를 있는 그대로 드러내고, 미래 원문을 써서 숨기지 마.
5. 3B의 day14 832→day15 879(증가 47)과 3D의 '새롭게 보이는 266'이라는 서로 다른 수치를 정의별로 대조해. 새 고유 diary 글자/새 공개 슬롯/동일 글자 재배치/일시적 렌더 재공개 각각 집계해. 기계적 해결을 가정하지 마.

## 3. T1/T2 두 재생 방식 (같은 이력·빛·카메라)

- **T1 Daily Replay**: S1..S15 실재 상태를 짧은 hold+fade로 넘기되 뚝뚝 끊기는 슬라이드쇼는 피함. 구조 변화 단계가 분명한 기준선.
- **T2 Continuous Crystallization**: S1..S15와 동일한 endpoint를 매번 거치면서, 각 날 새로 열린 parent→spine→branch→tip의 glyph alpha 공개를 시간 내에 분산해 **하나의 결정이 피어나는 것 같은** 연속 모션. 팔을 접었다 펴거나 글자 좌표를 이동시키지 마.
- 두 안 모두 안정 anchor position zero drift; Echo 교체는 identity-aware soft dissolve만, 동일 instance가 두 자리에 동시에 생기거나 굵은 글자 덩어리가 번쩍이지 않아야 함.
- 핵심 시퀀스: D14 → D1 seed → D1..D15 빠른 재성장. 이전 D14가 실제 데이터상 D1로 되감기는 **시각 효과만**, DB/progress U는 일시적으로 감소시키지 마.

### 기본 6.5초 연구용 시각

- eventTime<0: 원본 D14.
- 0~0.45s: 외곽→중앙 순으로 글자 visibility가 줄어 실재 D1 씨앗에 도달. **전체 눈꽃을 축소하지 않음.**
- 0.45~0.8s: D1의 작은 결정 고요하게 잠시 표시.
- 0.8~3.55s: D2→D15를 순서대로, T1 또는 T2 방식으로 글자·모티프 늘리며 공개. D1~3 코어, D4~6 팔 뿌리, D7~10 줄기, D11~13 가지, D14~15 끝 결정과 외곽 보강. 정확한 구조는 3B의 실제 stage 매핑 우선.
- 3.55~4.0s: 최종 I3 눈꽃 안정화. 별도 큰 glow/reward particles는 이번 Gate 3E.1에서 구현하지 않음.
- 4.0~6.5s: **완료 I3 상태만** 유지하는 Phase2 placeholder. 6.5초는 전체 이벤트 목표이고 이번 1차 실제 모션 영상은 0~4초 주요 부분이 핵심. '눈결 보상이 나온다'고 거짓으로 설명하지 마.
- `duration=5.5|6.5|7.5` 비교, 시간축 비율 스케일.

`t=0`에는 15번째 고유 날짜의 일기가 **저장 성공**한 것이며, t<0에 15일 원문·구조 표시 금지. S(k)는 `entryDate` 오름차순 prefix이며 같은 날짜 다중 일기는 모두 포함.

## 4. 구현 위치/개발 페이지

- route: `/__dev/snowflake-growth-replay-study`
- 신규 경로 예시:
  - `src/dev/snowflakeGrowthReplay/{snapshots.ts,identityLedger.ts,diff.ts,timeline.ts,motifReveal.ts,rendererAdapter.ts,metrics.ts,GrowthReplayCanvas.tsx}`
  - `src/dev/SnowflakeGrowthReplayStudyPage.tsx`
  - `tests/e2e/snowflakeGrowthReplay.{logic.spec,spec,capture,perf}.ts`
- 기존 renderer API를 직접 확인하고 합리적으로 파일을 조정해. **사용할 수 없는 API를 추측해서 호출하지 마.** 실제 I3 렌더러를 중복으로 동시에 그리는 비싼 overlay보다 dev-only visibility adapter 또는 단일 재생 renderer를 우선 연구해.
- page: T1/T2 single/side-by-side, 0~6.5s timeline scrub, frame stepping, stage 1~15, seed/arm/core zoom, five fixture types, source/echo/debug, replay, 160/320/375/430px, DPR, reducedMotion, fixed/live art clock, goal U scenarios, FPS/frame p95/p99/max, `mode=structureOnly` 기본값. phase2 button 비활성(미구현) 표시.
- 160px 타일 자동 애니메이션 없음. 실제 제품 코드/도감은 수정하지 마.

## 5. 필수 검증

**구조/데이터**
- 이벤트 저장 전 R3 day14 완전 동일, 미래 D15 원문 보이는 순간 0.
- D1 씨앗 및 각 Dk의 endpoint에서 정적 R3 S(k) 동일성(같은 fixture/time/renderer). Stage skipped 0.
- parent/child motif 등장 순서, 신규 글자/신규 구조의 연결성, 기존 anchor layout drift 0.
- ECHO_REASSIGN 충돌/갑작스런 깜박임/다른 글자 순간 2중 렌더 감지. 미래 원문 누출 0.
- final after event = 같은 `artTime`의 기존 I3 day15와 byte/pixel difference=0 (optim/reference, reduced motion, DPR, 5 fixtures). I3 본래 20초 전면/후면 교대와 H3 반짝임 보존.
- cleanup: 별도 canvas/RAF/observer/listener 0, replay/seek/unmount/resize에서도 오류/중복 없음.
- 같은 날 +2, 소급, 일기 수정/삭제/되돌리기, 최초 완료/재방문, `targetDays` 10/15/20 trigger연구. 10/20일 조형 매핑/2026-12 특별 목표 미확정, 임의 15일 확정 금지.

**성능/품질**
- DPR2 375px 동일 실행 I3 vs T1 vs T2 3회 이상 paired FPS, p95/p99/max frametime, 특히 save 프레임과 15개 스냅샷 준비 비용 분석. 이전 Gate 3D 167~283ms 저장 준비 정지 재발 방지.
- CPU 없는 GPU/실기기 WebView 미측정 별도 표기. 목표 30fps 이상이더라도 200ms hitch가 있으면 '문제 없음'이라고 쓰지 마.
- 신규 테스트 + 기존 회귀를 가능하면 실행하고 회귀를 못 돌렸으면 이유 공개.
- 실서비스 bundle dev code 제외, 기존 산출물/소스 삭제·변경 0(허용 등록 파일 제외), commit/push/PR 없음.

## 6. Gate 3E.1 결과물 (1차 성장만)

새 폴더 `artifacts/snowflake-growth-replay-review/phase1/`:

1. `01_T1_T2_structure_only_side_by_side.mp4`
2. `02_T2_structure_only_full_motion.mp4`
3. `03_seed_to_six_arms_zoom.mp4`
4. `04_D01_to_D15_stage_storyboard.png`
5. `05_echo_identity_debug.png`
6. `06_14_to_seed_reset_contact.png`
7. `07_final_I3_pixel_parity.png`
8. `08_performance.json`, `metrics.json`, `README.md`

영상은 실제 source/glyph 렌더를 frame-by-frame 캡처해 실제 타임라인대로 재생할 수 있어야 해. FFmpeg 오프라인 합성이면 실시간 FPS 측정과 혼동하지 마.

**이번 작업의 끝은 반드시 3E.1의 성장 모션 비교 영상 생성·검증·한국어 보고까지.** 사용자가 T1/T2 영상을 직접 보고 방향을 고르기 전에는 **3E.2 글자눈·서리입자·반짝임을 구현하거나 추천안을 확정하지 마.**

최종 보고에는 특히 다음을 명확히 적어:
- T1/T2 핵심 구조와 실제 1일 씨앗→15일 성장 재생 모습
- 전체/확대 영상 경로와 개발 주소
- 3B 47 vs 3D 266 glyph 수 불일치 해석
- Echo 교체 문제 실제 해결/미해결과 원본 상태 동일성
- final I3 픽셀 일치, 저장 프레임 긴 끊김, FPS 및 테스트
- 로컬 미커밋 원본 보호, 새/추가 파일 목록, 제품 비배포
- **3E.2 보상 효과는 사용자 별도 시각 승인 이후**라는 미완료 상태.
