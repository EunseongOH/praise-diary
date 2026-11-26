# 12월 눈꽃 — 서비스 통합 (검수용 프로토타입)

> 시연 앱(`sessionStorage`, 가상 데이터)에 연구 눈꽃을 **붙여 보는** 통합이다. 출시·배포·미감 확정이 아니다.
> 기본값은 **꺼짐**: 기능 플래그 없이 빌드하면 `ArtworkSlot`은 기존 플레이스홀더 그대로이고 엔진 코드·worker는 번들에 없다.

## 무엇이 어디서 왔나

| 서비스 경로 | 연구 원본 (`feat/design-system-prototype` 로컬 미커밋 작업, 2026-11-26) | 변경 |
|---|---|---|
| `core/<gate>/…` 28개 파일 | `src/dev/<gate>/…` (Gate 2A~2I 엔진 사슬, 2I I3 `RefineCanvas`, 3B R3 `buildRadial`, 3E.1 스냅샷·원장·재생 렌더러, 3E.1b G1 일정, 3E.2 SB 보상) | import 경로 줄만 (`../../graphics/snowflake/` → `../../`, RefineCanvas의 시계·색 상수 import 3줄) |
| `engine.ts` | `src/graphics/snowflake/engine.ts` (grapheme 분해) | 없음 |
| `clock.ts` | Gate 2C `SnowglobeCanvas.tsx`의 `PresentationClock`/`Stats` 클래스 | 연구 캔버스 컴포넌트는 미포함 |
| `eventClock.ts` | Gate 3C `CompletionCanvas.tsx`의 `EventTimeline` 클래스 | 컴포넌트 미포함 |
| `researchConstants.ts` | `INK`, `STRAND_COLORS` 값 2개 | 값만 |
| `studyFixtures.ts`, `core/multiHelix/fixtures.ts` | 연구 fixture | **원문 없는 스텁** (엔진의 데이터셋 도우미만 참조, 앱은 호출하지 않음 — 호출 시 오류) |

원본 파일의 SHA-256 앞 16자리(통합 시점):

```
ec354d269def1ac4  src/dev/adaptiveSnowflake/engine.ts
7dfaadf40040d6f8  src/dev/foregroundTextRotation/engine.ts
5a6e4ec0a1d3c154  src/dev/frostedLighting/engine.ts
ac546b06dd305ef3  src/dev/frostedLighting/theme.ts
effa9570677d9195  src/dev/fullSnowflake/engine.ts
b77041ab633dcc23  src/dev/h3Refinement/engine.ts
ccc52bfe48f6e292  src/dev/h3Refinement/RefineCanvas.tsx
b849e55ea548bad2  src/dev/layeredCrystal/engine.ts
38da085fa4b477fb  src/dev/livingTypography/engine.ts
f33d226509afee57  src/dev/multiHelix/engine.ts
cf200f461f46c561  src/dev/sculpturalSnowflake/engine.ts
aedcc3b14cf0d7dc  src/dev/snowflakeDailyGrowth/engine.ts
65b0289efd750eee  src/dev/snowflakeDailyGrowth/schedule.ts
e9dadfbb8e2737b0  src/dev/snowflakeRadialGrowth/classify.ts
37a3fdc5aad62de9  src/dev/snowflakeRadialGrowth/echo.ts
12fc1d2bb1162ff9  src/dev/snowflakeRadialGrowth/engine.ts
9b1b15a0da9c28da  src/dev/snowflakeRadialGrowth/schedule.ts
ce76e525c5ccd212  src/dev/snowflakeCompletion/timeline.ts
0daf298f2855fe3d  src/dev/snowflakeGrowthReplay/snapshots.ts
30688a1142c0ce73  src/dev/snowflakeGrowthReplay/snapshotWorker.ts
a23de8001f0e09ec  src/dev/snowflakeGrowthReplay/snapshotStore.ts
f101b4a23977e582  src/dev/snowflakeGrowthReplay/identityLedger.ts
84b42cbe4504d113  src/dev/snowflakeGrowthReplay/rendererAdapter.ts
15a15e59d741ae56  src/dev/snowflakeGrowthReplay/timeline.ts
365c6279d8a0dfe1  src/dev/snowflakeGrowthReward/smoothReveal.ts
0954cf8611fbe5c8  src/dev/snowflakeGrowthReward/snowglobe.ts
cc19cffee4bab6b3  src/dev/snowflakeGrowthReward/theme.ts
332d52725d82e03b  src/dev/snowflakeGrowthReward/timeline.ts
254a53c630e04b64  src/graphics/snowflake/engine.ts
```

연구 UI(스터디 페이지·디버그 패널), 테스트 fixture, 스크린샷·영상, Playwright 설정은 가져오지 않았다. Gate 3D(팔 압축·용수철)는 사용하지 않는다.

## 앱 계층

| 파일 | 역할 |
|---|---|
| `flags.ts` | `VITE_SNOWFLAKE_ARTWORK`, `VITE_SNOWFLAKE_COMPLETION_REPLAY` (빌드 시 고정). 연구 시각 단계 수 15 (`VISUAL_STAGE_DAYS`, 목표일 아님) |
| `sourceAdapter.ts` | `DiaryEntry` → 엔진 입력. **본문(body)만** 글자 원천. 제목·질문·덧붙인 마음은 쓰지 않음 |
| `snapshots.ts` | 화면 공통 상태 캐시 + worker(`snapshotWorker.ts`, Vite가 별도 청크로 번들) |
| `SnowflakeStatic.tsx` | 홈·상세(I3 idle: 20초 교대·코어·H3 빛)·도감 타일(정지). 화면 밖·숨은 탭이면 rAF 0 |
| `SnowflakeEvent.tsx` | 저장 화면 이벤트 플레이어 (이전 상태 → G1 성장 → 원본 I3 캔버스로 넘김 → [완성] SB-Balanced 보상) |
| `SnowflakeArtwork.tsx` | 화면별 선택, 저장당 1회 재생(이벤트 id = 저장된 일기 id, StrictMode 재마운트는 같은 재생) |
| `events.ts` | 이벤트 규칙(순수) |
| `reviewScenario.ts`, `reviewHooks.ts` | 검수 빌드 전용 가상 시나리오(`?snowflakeDays=N`)·테스트 훅. 플래그 꺼짐 빌드에서는 제거 |

## 제품 규칙

- 단계 = 이달 고유 작성일 수(연구 15단계에 매핑, 16일 이상은 15단계 + 기록 밀도). 같은 날 추가 기록은 밀도만 바뀐다.
- 저장 화면:
  - 새 날짜(`growth`): 그날의 실제 변화를 1.6초 G1로 재생한다.
  - 같은 날(`addition`): 밀도 변화를 같은 방식으로 재생한다.
  - 완성(`complete`): **실제 `targetDays`가 정해진 달에서 그 목표를 넘긴 저장**일 때만 자동으로 재생한다.
- **2026-12 `targetDays`는 `null`(미정) 그대로다.** 15일 완성 연출은 검수 빌드(`VITE_SNOWFLAKE_COMPLETION_REPLAY=1`)에서만, 연구 시각 단계 14 → 15를 넘는 저장에서 재생한다. 앱 문구는 바꾸지 않아 완성을 주장하지 않는다.
- 움직임 줄이기(앱 설정 또는 OS): 재생과 입자 없이 저장 후 상태를 정지 화면으로 보여 준다.
- 2027-01 양과 해와 테마가 없는 달은 기존 플레이스홀더를 유지한다.

## 검수 방법

```bash
npm install
node scripts/snowflake-review.mjs dev        # http://localhost:5173 (데모 날짜 2026-12-20, 플래그 ON)
#   /?snowflakeDays=8      → 가상 8일 기록 (앱 샘플 문장 재사용)
#   /?snowflakeDays=14     → 오늘 저장하면 14 → 15 완성 재생 + 스노우볼 보상
#   &snowflakeSameDay=1    → 마지막 날 2편
node scripts/snowflake-review.mjs build && node scripts/snowflake-review.mjs preview   # http://127.0.0.1:4175
npm run test:e2e                              # app(플래그 OFF) + snowflake(플래그 ON) 프로젝트
```

## 알려진 차이 / 남은 일

- 연구 화면의 글꼴은 SUIT Variable, 앱은 디자인 시스템의 Pretendard Variable(`--font-body`)이다. 같은 글꼴을 쓰면 서비스 홈 캔버스는 연구 Gate 2I I3 페이지와 바이트 동일하다. 글꼴이 다르면 글자 모양이 다르게 보인다.
- 저장 직후 숨긴 최종 캔버스 준비 프레임(원본 렌더러의 비트맵 생성 비용)이 남아 있다. 15단계 완성은 스냅샷 15개를 worker에서 준비하는 동안(약 1~2초) 저장 전 눈꽃을 그대로 보여 준다.
- 상세 핀치 확대는 기존 `GestureArtwork`의 CSS 확대라 3.2배에서 글자가 흐려진다.
- 실기기·앱인토스 WebView·GPU 환경은 검증하지 않았다.
