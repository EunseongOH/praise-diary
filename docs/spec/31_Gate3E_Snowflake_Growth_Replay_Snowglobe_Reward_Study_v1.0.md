# 칭찬일기 — Gate 3E: Snowflake Growth Replay & Snowglobe Reward Study v1.0

> 작성: 2026-11-26 · Repository: `EunseongOH/praise-diary` · Branch: `feat/design-system-prototype`.
>
> **[사용자 승인 — 콘셉트]** 목표일을 달성하면 지금까지 자라온 눈꽃을 **1일차 중앙 결정 씨앗 수준으로 일시적으로 되돌린 후, 실제 1~15일 성장 과정을 빠르게 다시 재생**하여 여섯 갈래가 끝까지 자라게 한다. **완성 후에만** 실제 일기 글자눈 + 비문자 서리 가루가 **스노우볼처럼 은은히 반짝이며 흩날린다**. 글자가 보이는 수와 구조가 줄었다 늘어나는 것이 핵심이다.
>
> **[사용자 피드백 — 기존 안 기각]** Gate 3D B1/B2의 기존 팔 8~18% 반경 압축→복원과 전체 879글자 개화 pose는 '용수철처럼 요동친다'며 미적 목표에 부합하지 않았다. Gate 3C/Snowglobe reward의 강한 코어 응축→방사형 빛 방출은 히어로물 에너지 효과로 느껴져 기각. **기존 완성 눈꽃의 물리적 압축/반동, 전체 글자 밀기/당기기, 중심 폭발 효과 재사용 금지.**
>
> **[연구 승인 — 아직 미적 채택 아님]** T1(날짜별 단계감 있는 실제 성장 이력 리플레이)과 T2(구조적으로 부드러운 연속 결정 개화)를 **동일 이력·동일 화면·동일 art clock**에서 비교한다. 현재 T2 우선 가설. **소스 분석→성장 모션 1차 영상→사용자 미감 검수→눈결 보상 2차 결합** 순서를 지킨다.
>
> **[실험 변수/보류]** 전체 시간 5.5/6.5/7.5초, 씨앗 체류 시간, 글자 개별 등장 방식/시간, Echo 교체 브리지, 눈결 입자 수/수명·반짝임, 실서비스 도입, 최초/재달성 보상 정책, 2026년 12월 특별 목표일 수 모두 미확정.
>
> 선행: `AGENTS.md`, `docs/spec/12_날짜설정_기록접근_특별목표_정책.md`, `design-system/graphic-growth.md`, `design-system/illustration-motion.md`, `docs/decisions/25_Living_Typography_Sculpture_조형_방향합의_v1.0.md`, `docs/decisions/27_12월_눈꽃_겨울빛_다색반짝임_월별테마확장_방향합의_v1.0.md`, `docs/spec/28_Gate2I_H3_Visual_Refinement_Performance_Study_v1.0.md`, `docs/spec/29_Gate3A_Snowflake_Daily_Growth_Structure_Study_v1.0.md`, `docs/spec/30_Gate3C_Snowflake_Completion_Moment_Study_v1.0.md`.

## 0. 범위, 이름 공간 및 제품 규칙

- **Gate 3B R3**: 중심→바깥 성장 스케줄(R2) + 초기 Echo 보강. 사용자가 성장 정지 조형의 잠정 기준으로 선택. Gate 2G R2(20초 앞·뒤 실제 구절 교대)와 별개.
- **Gate 2I I3**: 완성 눈꽃의 잠정 시각 기준. 실제 글자/앵커/echo/원근/중앙 코어 움직임, 검은 후광 없음, 2G R2의 20초 strand 교대, 2H H3 빛과 소수 파스텔.
- **Gate 3C C3 / SB-Balanced**: 과거 완성 축하 overlay의 역사적 비교 자료일 뿐. 3E 1차 구현에 glow/particles를 재사용하지 말고 2차에서 참고.
- **Gate 3D B1/B2**: '기존 글자를 8~18% 반경 압축 후 펼침' 방식. **채택하지 않음**. 모션에 직접 호출하거나 복사 금지.
- **Gate 3E T1/T2**: 날짜별 실제 성장 이력을 재생하는 새로운 완료 순간 연구. 사용자에게 3D 개발 명칭이나 퍼센트 옵션을 UI에 노출하지 않음.
- **제품 일수 계산**: `U = count(distinct entryDate)` (고유 작성일). 같은 날짜 추가 글은 밀도만 바뀜. 과거 날짜 backfill과 수정/삭제 시 정확한 귀속 날짜 기준. **정규 연구 15일**은 이번 fixture의 단계 수. **2026년 12월 실제 특별 목표일은 아직 미정**; `MonthCatalog.target_days` 등을 임의로 15로 변경하지 않음. 목표=10·20에 이 15단계 그래픽을 임의 완료 상태로 매핑하지 않는다.
- 3B 연구에서 기존 `design-system/graphic-growth.md` 아래→위 성장 정책과 충돌한 방향 전환을 이번 Gate 연구에만 적용. 제품 전체 디자인 시스템/실서비스 규칙을 이 문서로 암묵적 변경하지 말 것.

## 1. 문제 정의: '다시 자라는 결정'이지 '접혔다 펴지는 팔'이 아니다

사용자가 의도한 정확한 서사는 다음이다.

1. 완료 전 화면은 **실제로 14개 고유 일기의 Gate 3B R3 14일차 눈꽃**.
2. **15번째 고유 작성일의 실제 기록 저장이 확인**된 후, 기존 글자 중 바깥쪽이 짧게 사라지고 과거 1일차와 동등한 중앙 씨앗만 남는 **비파괴적 시각 리플레이** 진입. DB 기록 삭제, U 감소, 본체 슬롯의 영구 위치 변경 없음.
3. **실제로 경험했던 1→2→…→15일 성장 구조**를 빠르게 재생. 초기 씨앗에서 여섯 팔의 뿌리→줄기→안쪽 가지→바깥 가지/끝이 **글자 수와 모티프 가시성 증가로** 펼쳐진다. 완성된 팔을 스프링처럼 2D/3D 압축·확대하지 않음.
4. 최종 I3 눈꽃 **완성 시점 이후에만**, 여섯 팔 주변에서 실제 원문 기반 조각과 눈결 가루가 부드럽게 풀려나 반짝이며 스노우볼 속에서 느리게 유영.
5. 약 6.5초 후 모든 이벤트 전용 효과·루프를 제거하고 기존 15일 I3의 동일 시각/카메라/렌더러 출력으로 복귀.

**서사의 핵심:** 눈꽃의 여섯 팔이 '움직여서 길어지는' 것이 아니라, **구조를 이루는 글자가 최종 위치에서 새로 생겨나며 길어진다**. 이전까지 나타난 안정 Anchor는 이동하지 않는다.

## 2. 모션 서사와 기준 타임라인 [연구용]

기본 총 6.50s. `duration = 5.5|6.5|7.5`는 모든 구간의 비율 스케일이며 상대 순서 유지. 0초는 15번째 고유 entryDate의 **저장 성공**이 확인된 완료 이벤트 시점; **0초 직전 15일차 새 원문/슬롯 선노출 금지**.

| 절대 시간(6.5s 기준) | Stage | 사용자에게 보여야 할 변화 | 금지 |
|---|---|---|---|
| -0.7~0 | D14 normal | R3 14일차 정상 I3 motion | D15 신규 원문/구조 표시 |
| 0~0.45 | Visual rewind | 14일차 바깥 glyph를 '바깥→안쪽' 순서로 fade-out, 자기 좌표 유지. 마지막 D1 seed로 수렴 | 전체 눈꽃 축소, 중심 압축, 방사형 에너지 |
| 0.45~0.8 | Seed hold | 기존 R3 **실제 1일차**의 중앙 씨앗을 고요하게 보여 줌 | 가짜 SVG seed, 미래 글자 |
| 0.8~3.55 | Growth time-lapse | D1→D2→…→D15의 **실제 날짜 접두 이력**을 따라 글자·motif 증가; 주요 단계에서 core/roots/branches/tips가 차례로 형성 | 15개 스냅샷을 깜빡이며 순간 교체, 글자 좌표 이동 |
| 3.55~4.00 | Last crystal + recognition | 여섯 끝 가지가 정확히 완성되어 I3가 되는 순간, 현재 있는 일부 글자 획에 섬세한 얼음 반사(과잉 glow 없음) | 화면 점멸, 광선 발사, 6-arm 스프링 |
| 4.00~6.05 | Snowglobe reward | 완성 **이후부터** 1~2자 글자눈 + 작은 비텍스트 서리입자가 부드럽게 곡선 이동, 소수 짧은 glint | 하늘에서 내리는 자막비, 폭죽/색종이, 눈꽃 주인공 가림 |
| 6.05~6.50 | Settle | 입자/반짝임 fade & release; 서서히 원래 I3만 남음 | 이벤트 뒤 별도 canvas·RAF 지속 |

- D1은 0.45s부터 이미 표시되어 0.8s부터는 D2→D15로 전개된다.
- 예시 주요 중간 구간(세부 속도는 metrics로 교정): D1~3 / D4~6 / D7~10 / D11~13 / D14~15. **모든 D1..D15 상태는 지나가야 하며**, keyframe 시각을 디버그 페이지에서 확인 가능해야 한다.
- T1 = 날짜 단위 인지 가능한 단정한 전환(교체 감각 없는 짧은 hold). T2 = 날짜별 실제 스냅샷을 시간 연속 보간하여 한 번의 결정 성장처럼 보이게. **두 안 모두 provenance/slot/endpoint는 동일**, 빛/입자로 차이를 만드는 비교 금지.
- 기존 H3 파티클과 I3 20초 모션은 보존하되, 축소/재성장 동안 D1~D15 공개 영역 바깥에 **미래 glyph에만 연결된 기본 H3 광점이 선노출되지 않는지** 점검. 필요시 dev 연구용 visibility gate, 마지막은 원본 H3와 완전 동일.

## 3. 데이터: 과거 prefix를 되살리는 실재 스냅샷

### 3.1 정확한 스냅샷

`E`를 완료 당시 대상 월의 valid diary entries라고 할 때, `entryDate`를 고유·오름차순 정렬한 `dates=[d1,d2,...,d15]`를 만든다. 날짜 `dk`까지 포함하는 `entries.filter(e => e.entryDate<=dk)`로 R3 스냅샷 `S(k)`을 계산한다. **같은 날짜의 여러 원문은 반드시 모두 포함**. 소급 작성(backfill) 시 stage 순서는 귀속 `entryDate`의 오름차순이고, 저장 시각 정렬이 아니다.

- 입력 record는 `entryId,entryDate,body`, 기존 원문 위치·grapheme offsets, `copyIndex`, `anchorSlotId`, `strandId`, `slotId`, `motifId`, `armId`, `depthLayer` 등 프로젝트 **실제 타입/API**에서 지원되는 필드를 참조. 아래 인터페이스는 예시이며 새 프로덕션 DTO를 강요하지 않는다.
- 각 S(k)는 3B R3의 `day=k, fixture=prefix(k)` 결과와 **동일 아트 시계·seed·크기·렌더러 상태에서 스냅샷 정확도 검증**; 3B에서는 이미 R3가 날짜마다 echo를 다시 할당하므로 별도 '표시용 영구 원장'으로 실제 이력을 바꿔치기하지 말 것.
- 데이터 재생은 **완료 이후**, 역사적 prefix는 합법적으로 재계산 가능하지만 S(k)에 k+1일 이후 원문/grapheme를 쓰지 않는다.
- 동일 date에 2개 글 작성 → 그날 하나의 성장 단계지만 그날의 density는 실제 모두 포함.
- 삭제/수정/과거날짜 추가에 따른 기록 provenance는 과거로 돌아간 시간의 가상 snapshot과 최신 종료 시점의 현재 완료형을 명확히 구별한다.

### 3.2 Transition ledger (반드시 작성)

날짜 k→k+1의 인스턴스를 최소 다섯 범주로 분해:

1. **STABLE:** 동일 출처/인스턴스/slot이 유지; 기준 위치 고정, 해당 프레임 기존 I3 2.5D 움직임만 허용.
2. **REVEAL:** 새로운 valid glyph / newly opened motif; 본래 slot/pose에서 alpha만 등장, **장면 내 위치 보간 금지**.
3. **ECHO_REASSIGN:** R3 echo가 prefix 재할당으로 다른 슬롯에 재배치됨; 옛 시각 인스턴스 퇴장→신규 인스턴스 등장(짧게 디졸브). 동일 논리적 instance가 두 slot에서 동시에 과도하게 표시되지 않도록 identity ledger. Anchor 이동 0.
4. **REMOVE:** prefix diff에 의한 사본 감소/slot 교체. 구조에 시각적 구멍이 크게 생기면 미적 실패로 표기, 이를 숨기려고 미래 원문으로 메우면 안 됨.
5. **ECHO_CONTINUITY:** 같은 원문이 다른 Echo `copyIndex`로 여전히 등장하는 경우에도 실제 새/기존 인스턴스의 identity를 구분하고 provenance 확인.

**중요:** `glyphId`를 단순 화면 좌표나 문자값만으로 비교하지 않는다. 프로젝트 실제 식별체계가 없으면 파생 안정 식별체계를 명시하고 collision 테스트. `entryId + graphemeOffset + copyIndex + strandId/slotId` 관계를 재검증하여 안정 Anchor와 의도된 Echo duplicate를 구별한다.

- 화면에 보이는 실제 unique glyph count, 신규 `slot` 수, 신규 `source grapheme` 수, 새 `entryDate` 수, `ECHO_REASSIGN` 수, renderer 재공개 수를 **별도 집계**. 이전 Gate3B D14→D15 832→879(증가 47)와 Gate3D '새로 보이는 266'의 정의/원인을 확인. 보고 없이 '266 신규 원문'으로 취급하지 마라.
- stage endpoint는 정적 3B R3의 날짜 k 화면에 정확히 정렬되지만 중간의 crossfade는 0<alpha<1을 허용. **과거 Anchor를 이동시켜 시각적 연속성 보정 금지**.
- 최대 입자수 등의 장식이 이력 source ledger/실제 visible glyph count에 섞이지 않도록 명확히 분리.

### 3.3 두 재생 방식에서의 continuity

- **T1**: 각 stage의 스냅샷은 미세 pause 후 fade/공개. hard replace 금지. 고유 날짜의 순서·위치·글자 출처를 정확히 따른다.
- **T2**: 각 stage 사이 모티프의 parent/child, radius, arm, prior membership을 사용해 글자별 alpha reveal을 분산. 입자처럼 이동시키거나 흔들지 않고 **개화 방향만 시간차**. stage endpoint는 반드시 S(k). 전환 중 앞 단계 Echo 퇴장과 새 glyph 등장으로 갑자기 코어가 비어 보이면 phase를 살짝 겹치되 **사용자 미학 검수 전 데이터 이력 왜곡 금지**.
- 기존 2G 실제 깊이 z-motion 및 코어 rotation은 지속: `artTime`과 event `replayTime` 두 클록 분리. 특정 비트맵/static I3를 스케일해서 가짜 움직임으로 대체 금지.

## 4. 시각적 레이어 / 구현 리스크

**두 모드 비교를 위해 2가지 렌더 접근을 먼저 측정**:
- `R-A` visibility-aware reuse: 기존 I3의 실제 glyph draw API/strand loop에 dev-only visibility/alpha adapter를 주입해 1번만 그림 (원본 파일 수정 금지).
- `R-B` dev-only isolated renderer: 동일 타이포/빛/pose를 사용해 현재 시점 노출 glyph만 한 캔버스에 렌더. 원본 I3를 동시에 가시 상태로 두고 전체 모양을 중복 렌더하면 실패.
- 어느 방식이 실제 소스 API에 가능한지 검사하여 선택, 불가능 시 추정 이름으로 구현하지 말고 원인 기록. `src/main.tsx`, `playwright.config.ts`, `package.json` 외 기존 소스 변경 금지.
- 이벤트 중 렌더 loop >0이더라도 종료 뒤 **effect/replay-specific RAF/timer/canvas/listener 0**, 원본 I3 유지. 빠른 seek/replay/unmount/StrictMode/resize 중 유령 루프 금지.
- 재생 시작 직전 `S(1)..S(15)`, diff, cached glyph metrics, fonts를 준비. **저장 직후 133~283ms 이상의 준비 프레임 장기 정지**가 과거 Gate에 있었으므로 로딩 시점/렌더 allocation을 분리하고 p95/p99/max frametime 원인 분석.
- 새 스냅샷 미준비 시 완성 직전 D14 화면을 안정적으로 보여주거나 표준 완성형으로 폴백하되, `save confirmed` 시각/외부 데이터 저장 지연을 위조하지 않음.
- 눈꽃 base full-bleed `#0C1111`·차가운 은빛/백색/아이스 블루·아주 소량의 파스텔 H3. 서리빛/눈결로 눈꽃 바깥선이나 가짜 축 구조를 만들지 않음.

## 5. 2차 전용 스노우볼 보상 [Phase 2; Phase 1 미감 검수 후]

**Phase 1에서 보상 구현 금지, 단 레이어 계약과 stub은 가능.** 사용자에게 성장 동영상 T1/T2를 먼저 보내고 검수받아 `approvedGrowthMotion`이 확인되기 전엔 2차의 효과를 기본 스터디에 붙이지 마라. 사용자 별도 승인 없이 배경/디자인을 화려하게 만들면서 성장 품질을 가리지 않는다.

2차 승인되면 별도 하위 단계에서 구현:
- **시작 시점**: day15 구조가 **완전히 열린 후** t>=4.0. 나선형 폭발이나 성장 도중 글자비 금지.
- 6개 팔 끝 + 외측 분기점에서 소량의 실제 원문 글자 1~2자 렌더 복제본/비문자 작은 서리 가루가 은은히 풀려나 곡선 유영. **본체 원본 glyph 제거/스왑 금지**. 읽히는 문장 대신 '글자 눈결' 분위기; 실제 원문 외 AI 생성 문구 금지.
- 6.5초 연구값: text 총 12~16, frost dust 22~30, sparkle 6~9/초; 동시 수량 상한은 화면·일기 데이터·목표 성능에 맞춰 별도로 보고, 입자 수명 1.6~2.4s 후보. 이 숫자는 사용자 미확정 연구값. 기존 H3 50 (pastel 6)이라는 보고된 fixture의 ordinary particle 값을 바꾸거나 거기에 합산하지 않는다.
- glint는 얼음 결정 작은 반사, 과한 두 줄 별빛/전구·트리색·네온 금지. 중심 고휘도 에너지 응축/폭발/방사형 쏘기 금지.
- 보상 단계와 실제 유효 기록 데이터는 분리. particle metadata는 실제 가상 fixture `entryId`·range·copyIndex만; 실사용 diary body 콘솔/analytics/파일/DOM data-* 노출 금지.
- U가 targetDays를 처음 넘기는 게 아니라 `beforeU < targetDays && afterU >= targetDays` + 월별 `seenReward` state 기준 시뮬레이션. 별도 최초 1회/replay, deletion+requalification, backfill, goal 10/20 등은 상태 연구일 뿐 제품 DB/UX 결정하지 않음.

## 6. Developer-only page 설계

새 경로: `/__dev/snowflake-growth-replay-study`.

비교 컨트롤:
- `variant=T1|T2`; `view=compare|single|storyboard|debug`; `scene=full|core|arm`; `dataset=base|short|ultrashort|long|mixed`; `duration=5.5|6.5|7.5`; `reduced=on`; `autoplay=save`.
- `time` scrub 0..6.5, frame-by-frame seek, pause/resume, art clock fixed/live, stage 1..15 highlight, `mode=structureOnly|withReward` (Phase1에는 withReward 비활성 또는 stub을 '아직 구현되지 않음'으로 설명), `debug=identity|motifs|provenance|overdraw|performance`; record scenario U14→15/같은 날 +2/소급/date deletion/restore; render 160/320/375/430 px/DPR1/1.5/2.
- 멋을 내는 카드 UI가 아니라 비교를 돕는 dev diagnostics. 제품 UI/문구/도감 화면 고치지 않음. 160px tile은 기본 정적 동작, motion 재생은 dev 수동.
- `?variant=T2&mode=structureOnly&view=single&autoplay=save` 등으로 재현 가능하게 구성.

## 7. 개발 파일, 결과물, 단계별 검수 게이트

신규 파일 권장(실제 API와 기존 파일 네이밍 맞춰 조정):
```text
src/dev/snowflakeGrowthReplay/
  snapshots.ts       # 3B R3 actual prefix state S1..S15
  identityLedger.ts  # glyph source/instance/slot lineage
  diff.ts            # stable/reveal/echo reassignment/remove
  timeline.ts        # reset/seed/15stage/reward timeline
  motifReveal.ts     # arm/branch growth alpha schedule
  rendererAdapter.ts # original I3 renderer reuse, no source edit
  metrics.ts         # provenance/connectedness/new glyphs/perf
  GrowthReplayCanvas.tsx
  # snowglobe.ts only after Phase 2 approval

src/dev/SnowflakeGrowthReplayStudyPage.tsx

tests/e2e/snowflakeGrowthReplay.logic.spec.ts
tests/e2e/snowflakeGrowthReplay.spec.ts
tests/e2e/snowflakeGrowthReplay.capture.ts
tests/e2e/snowflakeGrowthReplay.perf.ts
```

### Gate 3E.1 — **성장 모션만 먼저 구현/검수**

- 임시 `artifacts/snowflake-growth-replay-review/phase1/` 아래:
  1. `01_T1_T2_structure_only_side_by_side.mp4` (14→seed→15, reward off, 동기화)
  2. `02_T2_structure_only_full_motion.mp4`
  3. `03_seed_to_six_arms_zoom.mp4` (core부터 양 끝까지, 동일 카메라 기준)
  4. `04_D01_to_D15_stage_storyboard.png` (일차별 고유 글자/슬롯/모티프 실측)
  5. `05_echo_identity_debug.png` (날짜 간 재배치와 교체 구분)
  6. `06_14_to_seed_reset_contact.png` (리셋 과정에 스프링·갑작스런 blink 없는지)
  7. `07_final_I3_pixel_parity.png`
  8. `08_performance.json`, `metrics.json`, `README.md`.
- 사용자에게 **영상 01, 02, 03**을 먼저 보여주며 "'눈꽃이 흔들리는 것이 아니라 글자 구조가 빠르게 피어나는가'" 직접 판단 요청. **사용자 검수 전 Phase2의 보상효과 구현/적용 금지**. Phase1 실패/기술 충돌 시 해당 부분만 보완하고 원인 공개.

### Gate 3E.2 — **스노우볼 보상 결합 (별도 사용자 승인 이후)**

- `artifacts/snowflake-growth-replay-review/phase2/` 아래:
  `01_growth_and_reward_full.mp4`, `02_reward_solo.mp4`, `03_particle_balance.png`, `04_reduced_motion.png`, `05_end_I3_parity.png`, `performance.json`, `README.md`.
- Phase1 결과물 변경/덮어쓰기 금지. 이전 Gate 산출물에 write 금지.

모든 MP4가 실제 같은 time axis, 실제 앱/renderer frame capture인지 확인. 오프라인 ffmpeg 합성은 사실을 명시하고 live FPS와 구분. 실패하면 출력 누락을 숨기지 말고 원인/PNG 대안을 제공.

## 8. 자동 테스트 및 사용자 미적 승인 기준

### 3E.1 구조/원문
- `t<0` = 원본 Gate3B R3 D14와 같은 픽셀. 저장 성공 이전 D15 source leak 0.
- D1 seed = 원본 Gate3B R3 D1, Dk endpoint = 원본 Gate3B R3 Dk (same prefix/seed/art clock). 실제 모든 1..15 단계 한 번 이상 지나감, skipped stage 0.
- 신규 glyph 출처는 stage k까지의 실제 diary만. 실제 텍스트가 아닌 임의 장식 글자 0. 각 glyph/anchor/echo provenance 정확.
- 기존 Anchor의 **기준 위치** 변화 0 (원래 I3의 pose-driven 3D motion과 구분), 기존 스프링 compressionScale/radialShrink/tangential spread 효과 **0**.
- 누락 parent motif/connected component, duplicate glyph render, 심한 Echo replacement blink, alpha overshoot/future visibility, art clock reset/깜빡임 탐지.
- 0.45~0.8s D1 씨앗 유지, 0.8~3.55s 재생, 최종 stage I3 동일. T1/T2 모두 endpoint/ledger 동일.
- 종료 `>duration`: 동일 `artTime`의 I3 optimized/reference 렌더와 pixel difference **0** (같은 fixture, seed, DPR, time). 0 replay-only canvas/RAF/observer/listener. reduced motion도 state parity.
- CRUD/goal: distinct date U, same-day +2 no completion, edit/delete/backfill/restore, seenReward/replay dev state, targetDays other than 15 not falsely I3 complete.
- 테스트 fixture: base/short/ultrashort/long/mixed + one-character/punctuation. 160/320/375/430 px, DPR1/2, reduced motion, seek/replay/revisit/StrictMode, same art clock several instants.
- 이번 Gate 자체 14→seed→15 visual reset는 실제 데이터 상태를 지우지 않는 일시적 **presentation mode**. reset 중 UI에 고유 작성일 progress 감소 등 제품 state가 줄어든 것처럼 보이면 실패.
- 신규 regression과 기존 Gate 회귀. 이전 `glyphLayout.ts:193` 오류와 같은 기존 빌드 문제는 새 결함과 구분, 누락된 전체 회귀는 '미실행'으로 보고.

### 3E.1 성능
- DPR2 375px 같은 실행에서 I3 기준, T1/T2 3회 paired median & event p95/p99/max frame times, 저장 preparation/frame hitch, memory 가능 시, draw calls, 2× simultaneous vs single. 실제 WebView/기기 미측정 구분.
- Headless CPU 부하 따라 FPS 요동 → 고정 30fps를 미달했을 때 실기기 결론으로 왜곡하지 않으며 p95/p99 및 준비 frame 원인 상세 조사.
- 가능 시 15개 prefix snapshot과 glyph cache는 precompute, save-confirmed vs effect-start timeline을 분리하여 저장 프레임이 200ms 정지하는 현상 제거. 원문 미저장 상태에서 미래 데이터 먼저 렌더링해 노출하는 금지. 추가 자료/renderer를 미리 준비해도 새로운 글자 source를 이벤트 전에 보이는 canvas로 그리면 금지.

### 3E.2 추가
- 입자/서리 glint는 final stage 완료 후 나타남, 본체 글자 source/slot 변화 0, H3 입자 기본형 유지, 성능 감소량 보고.
- 부드러운 실제 스노우볼 유영, 눈꽃 본체가 hero, 과한 코어 방전/색종이/트리 전구/가짜 글자 금지.
- 이벤트 종료 후 identical I3 and cleanup.

### 미감 판단은 자동화로 주장 금지
- 스프링/용수철 없음, 아티스트가 제작한 듯한 결정 개화, "쏵 자란다"는 고요한 절정, 보상감, 화면 가독성, 스노우볼 아름다움 = 사용자 영상 검수.
- T2 더 아름답다는 사전 결론 금지. T1/T2 1차 영상 승인 전 2차 구현 금지.

## 9. 저장소/소스 보존·개발자 작업 준칙

1. 로컬 `C:\\Users\\User\\diary\\praise-diary`에서 `git status --short`/tracked & untracked 해시 snapshot 기록. 2A~3D, 3C-SB local experiments/artifacts가 미커밋일 수 있음. **절대 덮어쓰지 않음**.
2. **`git pull`, `checkout`, `reset`, `restore`, `clean` 금지**. 원격 문서 최신은 `git fetch origin feat/design-system-prototype` + `git show`로 읽고 작업 트리 상태 보존.
3. 신규 dev 파일, tests, artifacts만. 기존 repo 코드/산출물 보호. `src/main.tsx`, `playwright.config.ts`, `package.json`은 **신규 dev route/테스트 등록을 위한 최소한의 기존 줄 보존 추가**만 허용.
4. 프로덕션 `GraphicArtwork`/홈/작성/도감/기존 Gate 2A~3D/DB/실제 기록/analytics/fonts/tokens/bundler 원본 수정 금지. 실서비스 번들에 신규 dev 연구 코드 포함하지 않음.
5. 사용자 업로드 레퍼런스 미디어/외부 링크 및 개인 기록은 GitHub·Space·fixture·산출물·로그에 포함하지 않음. **이번 GitHub 명세·프롬프트는 텍스트 합의/명세만 기록**.
6. **로컬 코드 commit/push/PR 금지**. GitHub에 존재하는 이번 텍스트 spec/prompt 커밋과 혼동 금지.
7. 개발자 진행, QA, 실패/미해결, 최종 보고는 한국어. 미적/제품 미확정 사항을 `[확정]`으로 바꾸지 말 것.

## 10. 완료 보고(한국어)

- 소스 분석: 실제 3B R3 스냅샷 API, 2I I3 renderer API, 3D 원인, 신규/재배치/Echo/Anchor 수치 차이.
- T1/T2 14→씨앗→D15 **structure-only 동영상**, keyframe storyboard 및 source/debug.
- 정확한 날짜 stage/prefix provenance, 화면상 glyph counts, abrupt replacement/hitch 대응과 미해결.
- t<0 D14/each k S(k)/t>duration I3 parity, reduced motion, FPS+p95+p99+max prepared frame.
- 신규/변경 파일 및 이전 Gate 보존, 테스트/회귀 여부, commit/push/PR 없음.
- **'1차만 구현했으며, 사용자 성장 모션 검수 이후 2차 Snowglobe'**라고 분명히 보고.
