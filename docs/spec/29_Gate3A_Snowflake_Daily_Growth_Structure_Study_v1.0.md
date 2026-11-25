# 칭찬일기 — Gate 3A: Snowflake Daily Growth Structure Study v1.0

> 작성일: 2026-11-25 · 저장소 `EunseongOH/praise-diary` · 브랜치 `feat/design-system-prototype`.
>
> **[사용자 승인]** 1~15일 매일의 조형을 설계·비교하는 **C에 가까운 B형 성장**: 초반에 작지만 눈꽃의 단서가 있는 결정 씨앗 → 아래에서 위로 팔/접합부/코어/상단 가지를 형성 → 최종적으로 기존 I3 완성형에 이어짐. 같은 날짜의 추가 기록은 높이를 늘리지 않고 밀도만 강화.
>
> **[실험 가설]** 아래 공개 높이표, 일차별 구체 구성, 슬롯 스케줄, 초기 씨앗용 echo 재배치, 성장 시각 점수/측정 기준.
>
> **[보류]** 정확한 성장 높이/노출일, 일별 모티프 구성의 미감 확정, 초기 echo 이동 방식, 2026년 12월 특별 목표일 수, 실서비스 적용 및 코어 활성일/새 성장 애니메이션 최종안.
>
> **중요한 제품 정책**: `docs/spec/12_날짜설정_기록접근_특별목표_정책.md`에 따라 **정규 완성 목표는 15일**이나 **2026년 12월 특별 목표일 수는 아직 미정**. 이 Gate의 1~15일 조형은 '정규 15단계 기준 연구'이지 2026년 12월 출시 목표일 수 확정이 아니다.
>
> **참조**: `AGENTS.md`, `design-system/graphic-growth.md`, `design-system/illustration-motion.md`, `docs/spec/23_Adaptive_Snowflake_Density_Gate2C_v1.6.md`, `docs/decisions/25_Living_Typography_Sculpture_조형_방향합의_v1.0.md`, `docs/decisions/27_12월_눈꽃_겨울빛_다색반짝임_월별테마확장_방향합의_v1.0.md`, `docs/spec/28_Gate2I_H3_Visual_Refinement_Performance_Study_v1.0.md`.
>
> **레퍼런스 비저장**: 앞선 사용자가 제공한 레퍼런스 사진/영상/프레임/썸네일/링크는 저장소·Space·fixture·산출물에 업로드하지 않는다. 현재 합의한 **디자인 의도와 생성된 가상 fixture 기반 결과물만** 기록한다.

## 0. 핵심 과제와 불변 조건

**상황(사용자가 전달한 로컬 구현 보고):** Gate 2I의 I3(글자 뒤 검은 후광 없음, 코어에 국소 3D 모션, Gate 2G R2의 20초 전면 구절 교대, H3 서리빛 및 희소 파스텔 광점)는 15일 완성형에서 가장 유력한 **잠정 미감 기준안**. 사용자가 영상에서 I2/I3를 선호했으나 실서비스 최종 채택은 미승인. I3 최적화 렌더 375px DPR2 약 45fps는 headless 보고값이며 실제 WebView는 미검증.

**문제:** 기존 날짜당 1/15 선형 클립에서 1일차가 가시 글자 1개 수준이며 1~6일 조형미 부족, 같은 날 +2 기록의 시각 변화가 없을 수 있다. 이번에는 **정지 조형** 자체의 원인을 고친다. 애니메이션의 연출과 강도는 다음 Gate 3B에서 다룬다.

**절대 보존:**
1. **기존 I3 완성형(동일한 15일 기본 fixture와 artVersion/seed/t/렌더러 상태)**과 15일차를 픽셀 단위로 비교. 목표는 최종 프레임/글자 출처·배치·조명·입자·전후 교대가 같도록 성장 가시성 매핑만 개선하는 것. 동일성 실패 시 실패/원인을 공개하고 별도 실험으로만 남길 것.
2. 눈꽃은 실제 작성 원문 글자 + 출처 추적되는 일부 echo로 조형. 새 문장 생성, 무의미한 도형 외곽선/가짜 눈꽃, 글자를 늘리는 척하는 파티클, 실제 일기 문구를 외부에 업로드 금지.
3. **고유 작성일 수 U=distinct(entryDate)**가 구조 단계 결정. 일기 편수와 구별. 같은 날 추가는 현재 열린 구조 내부 밀도만 변하며 높이/새 공간이 열리면 안 됨. 날짜가 삭제되어 U가 줄어들면 적절한 이전 단계로 되돌아감.
4. 아래→위 성장, 위쪽 미공개 글자·윤곽·빛 입자·그림자/고스트 0. 성장일이 지날수록 **공개 가능 영역이 단조 증가**하며 미래 영역이 선노출되지 않음.
5. `entryId`, `entryDate`, 원문 grapheme sourceRange, `copyIndex`, `anchorSlotId`, strand identity를 추적. 새 기록·수정·삭제 및 과거날짜 기록 추가로 **다른 기존 기록의 anchor 기준 위치를 불필요하게 재배치하지 않음**. 가시 anchor의 순간 2.5D pose 변화와 배치 기준 좌표 변경은 구분.
6. 먼저 **정지 조형**을 비교: Gate 3A는 기존 I3를 t=고정 또는 reduced-motion 정지 자세로 캡처하며, **새 성장 transition animation/추가 회전/반짝임은 구현하지 않는다**. 기존 정적 색·빛/파티클 특성은 일자별 기존 게이팅을 보존한다.
7. 다른 월로 재사용하는 성장 scheduler/slot policy는 눈꽃 전용 shape path에서 분리. **12월 특별 목표 숫자는 확정/하드코딩 금지**.

## 1. 선형 클립의 기술적 한계와 연구 비교

'1일 13% 높이만 공개'와 '그날의 씨앗이 충분한 실제 글자들의 작은 눈 결정'과 '15일차 I3 픽셀 완전 동일'과 '기존 anchor 좌표 영구 안정'은 **기존 I3의 하단 슬롯 분포에 따라 동시에 충족하지 못할 수 있다**. 구현자가 기존 로컬 엔진의 실제 위치별 슬롯 수를 먼저 확인해야 한다. 목표가 충돌한다면 해결되었다고 가정하지 말고 대안을 **같은 데이터셋/카메라/날짜로 비교**한다.

- **G0 — Linear Baseline**: 기존 I3 1/15 직선형 높이 공개; 첫날 한 글자 문제를 재현하는 비교 기준.
- **G1 — Persistent Foundation**: 최종 I3에도 남을 하단의 기존 원문/echo/anchor 슬롯을 우선 활용하고, 그 안에서 미리 예약 가능한 구조 모티프를 정밀하게 노출. **15일 parity를 유지하기 가장 쉽지만** 1일 조형이 충분하지 않을 수 있음.
- **G2 — Growable Echo Scaffold (연구 가설)**: 1~초기 일차에 최종 I3 원문에서만 온 echo를 하단 씨앗에 **임시로 응집해 조형**한다. 일수가 늘어나면 일부 echo는 추적 가능한 ID/seed/sourceRange를 유지하며 공개된 최종 I3의 대응 echo 슬롯으로 **정해진 시점에 재배치/합류**한다. 새 원문 없는 조형/새 가상 일기 생성 금지. 처음 만든 핵심 씨앗의 **일부 실제 anchor/구조는 최종 하단 팔에 남아야** 한다. 15일에는 **임시 레이어가 완전히 종료되고** 원래 I3의 정확한 인스턴스 집합·위치·순서로 수렴해야 한다. G2의 echo 이동/소멸로 조형이 갑자기 붕괴하면 실패. `copyIndex` 충돌/ID 손실/동일 글자 두 번 집계 금지.
- **G3 — Structural Stage Schedule (실험)**: G1 또는 G2의 공간과 provenance를 쓰되 매일 새 motif group을 단위로 공개. 기존의 전면 폭을 그냥 직선으로 자른 것과 달리 일별 모티프를 형성. 매일 **새 글자 + 새 구조**가 나타나야 함. G3가 성장 높이를 위반하거나 15일 parity를 깨면 실패/대조 기록.

**추천 실험 절차:** G0/G1/G2를 하단 1·2·3·5일에 우선 검토한 후 G3 단계 스케줄을 1~15일 전체로 확장. 경우에 따라 G1+G3와 G2+G3 두 대안으로 비교. 사용자 시각 검수 없이 G2나 G3를 채택했다고 선언하지 말 것.

## 2. 단계별 일자 구성표 [정지 조형 연구용 초안]

표의 퍼센트는 **전체 15일 완성형 세로 범위의 제안된 상한**(최종 100%), `targetDays=15`에서 시험할 초기값일 뿐 실제 공개 높이 또는 12월 목표 확정값이 아님. 바닥→상단 순서의 모티프/글자 배정이 실제 I3 슬롯 기하에 들어가는지 검증한 뒤 변경 가능. 15일차 **I3 완성형 형태와 ID parity**가 최우선 제약.

| U | 제안 높이 | 새로 공개할 구조(모티프 키 예시) | 원문/echo 배치, 정지 상태 검증 |
|---|---:|---|---|
| 0 | 0% | NONE | 실제 글자·빛·미래 유령 0 |
| **1** | **13%** | S01: 하단 결정 씨앗; 짧은 축 + 양쪽 미세 돌기 | 첫날 원문 anchor 최소 1개와 출처 추적 echo가 합쳐져 **단일 글자가 아닌** 작은 결정. 풀 눈꽃/완성 육각을 미리 복제하지 않음 |
| **2** | **18%** | S02: 씨앗 바깥쪽 첫 분기 1쌍 | 새 날짜 원문이 씨앗의 외곽으로 합류; 기존 주 글자 anchor 보존 |
| **3** | **24%** | S03: 하단 로제트/짧은 결정 가지 | 작은 하단 결정 모듈로 읽힘. echo가 같은 어절을 균일하게 도장 찍은 인상은 줄임 |
| **4** | **30%** | S04: 위쪽(코어 방향) 연결 줄기 연장 | 연결 팔의 실제 문장/보조 층 일부가 나타남 |
| **5** | **37%** | S05: 하단 팔의 첫 판형 결정 끝/가지 쌍 | 줄기-가지-결정 끝의 구분이 생김; 아직 완성 눈꽃 아님 |
| **6** | **43%** | S06: 하단 좌/우 비스듬한 분기 | 하단 3방향의 연결 성향이 나타나고 팔 끝이 전나무처럼 뾰족해지지 않음 |
| **7** | **50%** | S07: 하단에서 중앙으로 향하는 접합부 | 코어의 하단 경계와 연결, 미공개 상반부 유령 금지 |
| **8** | **57%** | S08: 육각 코어 일부/하단 변 | 실제 해당 코어 슬롯이 공개되면 일부 core glyph 등장. 미미한 기존 I3 회전 자체는 Gate 3A에서 새로 변경하지 않음 |
| **9** | **63%** | S09: 코어 상단 연결부 + 위쪽 팔 뿌리 | 중심의 육각 연결이 분명해짐. 무리해서 완성 상단 육각을 미래 공개 전에 노출하지 않음 |
| **10** | **70%** | S10: 6방향의 큰 팔 시작 구조 | 하단은 풍부, 상단은 짧은 상태에서 여섯 방향성이 느껴짐. 고정 I3 중심 기하와 연결 |
| **11** | **77%** | S11: 좌상·우상 작은 가지 | 160px에서 6갈래 기본 실루엣 인지 목표 |
| **12** | **83%** | S12: 외곽 두 번째 가지와 결정판 | 로제트/판형 팔 끝으로 점진적 전환 |
| **13** | **89%** | S13: 상단·외곽 빈 부분의 가지 연결 | 얇은 원문/echo 스트랜드의 연결성과 여백 균형 강화 |
| **14** | **95%** | S14: 각 끝의 세부 결정 조각 | 새 구조 한 가지는 반드시 확인. 15일차를 미리 완성시키지 않음 |
| **15** | **100%** | S15: I3 최종 결정 완성 | **원래 I3의 15일 동일 fixture/t/render 출력 및 ledger parity**. 실험용 초기 scaffold 완전 수렴/종료 |

위 표의 '새로 공개할 구조'는 **디자인 목표**, 현 F2 엔진의 실제 각 위치에 대응되는 모티프가 존재한다고 검증된 것은 아니다. `motifId`, `regionId`, `requiredZone`, `minDay`, `targetSlotIds`, `prefixCount`, `allowedEarlyEcho`를 저장한 **15행 스케줄**로 구체화하라. 모티프가 존재하지 않으면 결과를 꾸미지 말고 실패/대체 배치 제안.

**높이/공간에 대한 정교한 경계 규칙:** 당일 게이트의 세로 허용 영역은 최종 작품의 아래에서부터 공개하고 **자연스러운 모티프 내 폴리곤/slot-boundary에 맞춰 노출**해 깔끔한 말단을 만들 수 있다. 단 어떤 픽셀이 그 날의 `maxVisibleY`보다 위에 있으면 미래 노출이며 실패. 성장 리빌 마스크가 문자를 잘라 유령처럼 보이게 하면 별도 검수. 단일 직사각 높이 공개를 그대로 쓰는 G0와 비교.

## 3. 일별 슬롯/기록 배분 및 안정성

### 3.1 입력과 성장 스테이트

`DiaryEntry = {entryId, entryDate, body, stableCreatedAt, revision}` (정확한 로컬 필드명은 검사). `U = count(distinct entryDate for current month)`; 0..targetDays를 쓰되 15 초과/12월 special target 연구는 별도 리포트. `entryDate`는 사용자가 저장한 귀속 날짜, `createdAt`과 혼동하지 않음. '어제' 추가, 과거 날짜 기록 추가, 동일 날짜 +2, 특정 날짜 마지막 기록 삭제, 2편 중 1편 삭제, 본문 수정은 서로 다른 시나리오.

- **Anchor:** `entryId + graphemeOffset + anchorSlotId` 기준 좌표 안정. 새 레코드가 추가됐다고 다른 entry의 기준 영역/주 축을 모두 다시 섞지 말 것. 새로 추가되는 글자/echo의 공개 가능 영역만 현재 U에 맞춰 확장.
- **Echo:** 실제 해당 시점까지 저장된 일기 원문에서만 생성. `entryId/sourceRange/copyIndex/visualInstanceId` 고정. 초기 성장 기간 한정 scaffold는 영구 배치인지, 최종 대응 슬롯으로 합류하는지 명시. 중복 인스턴스가 실제 일기 편수나 U를 늘리지 않음.
- **미래 예약:** 미래 일기에 어떤 내용이 작성될지 **사전에 알 수 없음**. 미래에 공개될 것은 '빈 슬롯/형태의 가능성'이지 실제 아직 작성되지 않은 원문 글자나 광점이 아님. 미래 예약 slots는 데이터/연산 레이어에만 존재, 화면에서는 완전히 숨김.
- **같은 날 +2:** 구조, 공개 상단 높이, stage ID 동일. 현재 열린 유효 슬롯 내부에 새 실제 원문의 대표/echo glyph를 늘려 **보이는 픽셀/텍스트 identity 변화**가 발생해야 함. 용량이 꽉 차면 덮거나 다른 일기의 anchor를 파괴하지 말고 overflow/packing 정책을 연구안으로 보고.
- **지난 날짜 추가:** 고유 날짜 수가 늘어 stage가 증가할 수 있으나 기존 대표 원문/anchor는 보존. 기존 날짜에 추가하는 경우에는 stage 불변. 날짜 정렬 변경으로 과거 기록의 `entryId`·slot ID 변경 금지.
- **삭제:** 해당 날짜의 마지막 record가 제거되면 U-1에 맞춰 성장 상단 하향. 다른 기존 entry의 provenance와 anchor 불변. 부분 삭제라 U가 유지되면 조형 높이 유지, 관련 글자만 제거/빈 곳 재채움 규칙을 명시. 원문 수정은 글자 출처와 슬롯을 안정적으로 다시 계산.
- **표시 글자수/글자 반복 빈도:** 1일 단문, 초단문(예: 1~5 grapheme), 문장부호뿐인 입력 같은 극단값도 시험. 데이터가 충분치 않을 땐 '충분한 모티프가 나왔다'고 꾸미지 말고 출처가 있는 반복의 한계와 시각적 trade-off를 보고한다.

### 3.2 완료 상태와 초기 상태를 양립시키는 검증

**핵심 기술 리스크:** I3의 final 15-day glyph ledger는 15일치 기록에서 파생되므로, 1일차에는 다른 14일의 글자가 존재하지 않는다. early scaffold는 1일차 실제 원문만 반복해야 하고, 최종 15일 상태에서는 기존 I3 전체 원문 배정과 일치해야 한다. **final fixture의 미래 문장을 조기 상태에 미리 가져오는 '시뮬레이션 속임수' 금지**.

- 모든 비교는 동일 base fixture의 날짜별 *prefix* 데이터(`D1 ⊂ D2 ⊂ … ⊂ D15`)를 사용.
- Day15 기준 `I3(input=D15, t=t0, theme, renderer)` vs `Gate3A(input=D15, day=15, t=t0, theme, renderer)`의 픽셀/원문 ledger parity를 확인.
- Day1엔 `input=D1`의 원문에서만 실제 source offsets를 참조하는지 검사.
- G2가 위치 변경을 수행할 경우 **기준 anchor 이동 0 / echo 이동만 명시적** (시각적으로 새로운 기록을 추가했을 때 기존씨앗이 통째로 새 위치로 점프하는 것은 실패).
- 구조 공개가 진행해도 기존 이미 공개된 zone의 `allowedSlotMask`는 되도록 유지: 갑자기 기존 작품이 사라지고 전혀 다른 작품으로 대체되는 효과 금지.

## 4. 검증 데이터/시각 평가

### 4.1 테스트 fixture와 작업 범위

- 5종 이상: 기본 15일(짧은 보통 문장), short, ultrashort(한글 1~5자 극단), long, mixed(한국어·숫자·영문·이모지/문장부호). **모두 가상 fixture**. 실제 사용자 일기·레퍼런스 문구/영상 불러오기 금지.
- 매일 새 글 1개 이상 있는 15일 dataset. 별도 same-day +2, backfill, edit, delete/undo, last-day delete, targetDays=15 vs 다른 목표수(연구용) 시험.
- 전체/160px tile/375px/430px, 1×·2×·3.2×, t=고정/정적 pose. **I3 정지 후광 없음, 기존 H3의 차가운 조명·희소 파스텔** 유지; 성장일의 입자 배치 상한은 기존 로직 유지.
- 결과 이미지에서 전체 그라데이션·앱 UI가 아니라 **그래픽만** 비교. 월간 아트 별도 카드를 추가하지 않음.

### 4.2 수량 지표 + 사람이 보는 지표 분리

기계 지표(일자·fixture별 JSON):
- U, proposedRevealFraction, actualBoundingBox/visibleYMax, visibleGlyphs(anchor/echo), uniqueSourceGlyphs, copiesPerSourcePhrase, visibleParticleCount, inkRatio at 375/160, silhouetteCenterOfMass, area coverage, motif occupancy, center/arm/tip coverage, hash/ID stability.
- `newMotifIds`, `visibleNewGlyphs`, `structuralChangePixels` or contour difference `D(U,U-1)`, blank reveals, overdraw, abandoned scaffold echoes, ghost pixels above envelope.
- same-day addition extraVisibleGlyphs, changedPixels, unchanged stage/height; past-date and delete tests.
- day15 pixel diff/ledger diff vs I3; per-day existing anchor stationary count.

사람의 미적 검수:
- **1일:** 글자 하나가 아닌 '작지만 눈꽃이 될 것 같은 실제 문자 결정'인지.
- **2~6일:** 잘라낸 완성 눈꽃이 아니라 *자라고 있는 작은 작품*인지.
- **7~9일:** 하단에서 코어로 자연스럽게 연결되는지, 육각 중앙이 지저분하지 않은지.
- **10~12일:** 여섯 방향/팔/여백이 유기적인가. '뾰족한 전나무 가지'보다 결정판·로제트가 읽히는지.
- **13~15일:** 차이가 너무 작아 무의미하거나, 14일에 이미 완성된 것처럼 느껴지지 않는지.
- **전체:** 다른 날의 작품이 전혀 별개로 바뀌지 않는지, 매일 쓰는 동기가 눈에 보이는지, 원문 반복이 과도하게 눈에 띄지 않는지.

**자동 테스트를 임의의 1px 이상 difference 또는 IoU 0.XX로 통과시켜 미감/일별 성장을 단정하지 않는다.** 일별 변화 감지/실루엣 안정성은 후보 수치로 기록하고, 15개 날짜 전체 캡처를 사용자가 실제 판단.

## 5. 개발 페이지 / 산출물 (정지 조형 우선)

새 개발 전용 route: `/__dev/snowflake-daily-growth-study`.

필수 개발 패널:
- `model=G0|G1|G2|G3` 또는 G1/G2 + G3 조합 구조를 **실제 구현한 비교 모델**로 선택 (미구현은 disabled + 이유 표기).
- `day=0..15` 슬라이더/개별 선택과 **1~15 모든 날 contact sheet**, `compare=previous|baseline|scaffold`.
- fixture=base/short/ultrashort/long/mixed, `sameDayExtra=0|2`, `event=none|backfill|edit|partialDelete|lastDayDelete`, `targetDays` 연구값, t 고정, 160/375/430, 1×/2×/3.2×, debug motif IDs/slot reveal map/anchor/echo/provenance/future mask/height envelope.
- 기본은 **정지**. 기존 눈꽃 R2 모션을 실수로 매 프레임 자동 재생하는 비교가 아니라 정해진 t에서 동일하게. 부가 motion preview가 필요하다면 별도 토글 및 Gate3B 후속 구분.

산출물은 `artifacts/snowflake-daily-growth-review/`에만 새로 만들며 이전 Gate 폴더/소스는 절대 덮지 않는다.

1. `01_day01_to_day15_contact_sheet.png` — 기본 fixture, 동일 스케일 15일 전부.
2. `02_daily_delta_01_02_to_14_15.png` — 연속 날짜별 신규 구조/글자 시각화 14쌍. 크롭/배율 일치.
3. `03_day01_03_05_08_10_12_15_160px.png` — 작은 타일 7단계.
4. `04_G0_G1_G2_G3_early_compare.png` — 1/2/3/5일 초반 대안 비교. 구현 미완이면 표시.
5. `05_base_short_ultrashort_long_mixed.png` — 1·3·8·15일 길이별 비교.
6. `06_same_day_plus2_and_edit.png` — 1·7·15일 각각 same-day +2, edit, last-day delete.
7. `07_anchor_echo_slot_provenance_debug.png` — source/slot/available mask/temporary scaffold 전환.
8. `08_day15_I3_pixel_parity.png` — 같은 fixture/t에서 원래 I3/새 15일 픽셀 diff + ledger diff.
9. `09_growth_stage_animation_preview.mp4` 는 **선택 연구 영상**으로, 단지 15개 정지 frame을 연결할 경우 모션 연출 완성으로 주장하지 않는다. Gate3B의 새 성장 animation은 구현 범위 밖.
10. `metrics.json`, `growth_schedule.json`, `README.md`, 테스트 결과/성능 비교값(`performance.json` 가능).

각 캡처는 **공개·가상 fixture**로 생성. 새 실험 생성 캡처 자체는 로컬 작업 산출물로만 보존, 사용자 제공 레퍼런스 미복제.

## 6. 테스트, 성능, 보호

자동 테스트:
1. U=0/1/2/3/4/5/6/7/8/9/10/11/12/13/14/15별 stage 정의와 actual visible glyph count, maxY/allowed mask; `U-1 → U` 단계가 구조적 변화/새 글자 둘 다 있는지(없으면 FAIL + 원인).
2. `D1`은 `D1`에 존재하는 원문 출처만, 각 `Dk`는 `Dk`에 저장된 원문만 사용; 가상 미래 문장 선노출 0.
3. 비어 있는 U0 상태 및 미래 상단 glyph/particle/ghost 0, bottom-up/monotone allowed regions, 당일 공개 경계 밖 픽셀 0.
4. anchorSlotId/entryId/sourceRange stable after +1 day, +2 same-day, backfill, edit/delete(기존 **다른** entry 불변); no duplicate daily count, same-day height same.
5. `day15` 동일 fixture pixel-identical to Gate 2I I3 **가능하면 달성**, 테스트가 실패하면 명시된 blocker/차이 분석 결과를 남기고 자동 승인/기준 완화로 PASS 처리 금지.
6. 여러 모티프가 공개돼도 연결부가 끊기지 않고 early-only temporary echo가 중복 인스턴스/유령 미래 글자 만들지 않음.
7. 160px 1/3/5/8/10/12/15일 시각 캡처, 375px 전체, reduced-motion, 문장부호-only/한글 한 글자 등 극단 데이터.

성능: 원본 I3 optimized backend을 그대로 import해 정적 렌더 baseline 비교(375px DPR1/2, CPU1× 10초×3회 실험 필요시). 이 Gate의 가장 중요한 것은 **정적 조형**이며 실제 폴백/애니메이션 최적화는 후속. 완성 15일 I3 기준 GLYPH/PARTICLE 출력 전혀 바꾸지 않고 보존. DPR2 45fps는 보고값일 뿐 GPU 없는 headless/실기기 WebView 미검증.

**보호 및 작업 순서:**
- 로컬 `C:\Users\User\diary\praise-diary`의 2A~2I 코드는 GitHub에 대부분 미커밋. `git status --short` + 해시 스냅샷; **`git pull`, `checkout`, `reset`, `restore`, `clean` 금지**. `git fetch origin feat/design-system-prototype` + `git show`로 이번 원격 문서를 확인.
- 기존 Gate 2A~2I 파일·캡처·동영상/테스트/실서비스 `GraphicArtwork`와 홈·작성·도감 UI/디자인 시스템/백엔드 변경 금지. 새 `src/dev/snowflakeDailyGrowth/` 및 `src/dev/SnowflakeDailyGrowthStudyPage.tsx`, 신규 e2e/outputs만. dev route에 필요한 `src/main.tsx`, `playwright.config.ts`, `package.json` 최소한의 추가만.
- 사용자 동의 없이 **commit/push/PR 없음**, 기존 artCode 변경 없음. 사용자에게 **한국어로만** 진행/문제/테스트/파일 경로/최종 보고.
- 단계별 구현: (A) baseline/slot 분포 분석 → (B) G1/G2 early feasibility → (C) 15일 G3 schedule → (D) entry lifecycle/reveal tests → (E) 15일 I3 parity 및 미감 자료.
- 새 개발 페이지가 로컬 기존 페이지를 깨뜨리지 않음을 검증.
- 기존 `glyphLayout.ts:193` 타입 오류와 `check:syntax` Windows 경로 버그는 현 상태와 분리해 기록, 관련 없는 변경 금지.

## 7. 보고와 승인

한국어 보고 필수 항목: (1) 1일차가 왜 1글자였는지 실제 원인, (2) G1/G2/G3의 가능한 방식과 기술/미적 trade-off, (3) 1~15일 **전 날짜별** 새 구조·보이는 글자 수·가시 모티프/변화, (4) 1·3·5·8·10·12·15일 160px, (5) 같은 날 +2/역순 날짜/삭제·수정/초단문 원문 출처, (6) 15일 I3 pixel/ledger parity 여부, (7) 보호 파일/테스트/성능/미검증, (8) 사용자가 미감 결정해야 할 항목.

**성공의 정의:** 첫날부터 '실제 일기 글자의 작은 결정 씨앗'이 생기고, 2~15일 **각 날짜의 변화가 구조적으로 의미 있으며**, 기존 글자의 정체성과 미래 영역 숨김이 유지되고, 15일에 I3 작품으로 연결됨을 실제 비교 이미지로 검증할 수 있는 상태. 이런 목표의 모든 조합이 불가능하다면 정직한 대안 비교를 완료한 상태까지만 성공으로 보고.
