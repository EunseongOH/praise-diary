# Claude Code 실행 지침 — Gate 3A: 1~15일 눈꽃 성장 정지 조형 스터디

**사용자에게 전달하는 모든 진행·QA·실패·최종 보고는 한국어로 작성하라.**

## 0. 작업 의도

기존 Gate 2I I3가 15일 완성형 눈꽃의 **잠정 미감 기준**이다. 현재 완성형의 여섯 갈래, 실제 일기 글자층의 앞뒤 회전(2G R2 20초), 코어 국소 움직임, 검은 후광이 없는 표현, H3 겨울빛/희소 파스텔을 승인 없이 손대지 마.

이번 과제는 **새 애니메이션 추가가 아닌 날짜별 정지 조형 성장 구조**다. 사용자는 'C에 가까운 B형'을 선택했다. 첫날부터 한 글자가 아니라 작은 결정의 씨앗이 보이되 완성 눈꽃 전체를 조기 공개하는 것은 아니며, 2~14일은 **매일** 실제 글자와 새로운 구조가 쌓여 15일의 I3로 자연스럽게 연결되어야 한다.

제품 정책: 고유 일기 작성일 수 U만 구조 단계를 늘리고, **같은 날 추가 일기는 높이 그대로 밀도만 증가**. 15일은 정규형 스터디 기준이며 **2026년 12월 특별 목표일 수는 미정**. 실제 서비스의 날짜 정책/출시 목표를 변경하지 마.

## 1. 시작 전 원격 문서와 로컬 자료 확인

로컬 루트: `C:\Users\User\diary\praise-diary`.

1. `git status --short`, Git tracked/untracked 및 기존 Gate 2A~2I 코드/산출물 해시 스냅샷. **untracked 파일도 변경/삭제하면 안 된다.**
2. **`git pull` / `reset` / `checkout` / `restore` / `clean` 절대 금지.** 코드 commit/push/PR 금지.
3. `git fetch origin feat/design-system-prototype`만 한 뒤 `git show origin/feat/design-system-prototype:docs/spec/29_Gate3A_Snowflake_Daily_Growth_Structure_Study_v1.0.md`로 **상세 명세 전체**를 읽어라. 이 문서가 본 프롬프트보다 우선한다.
4. `AGENTS.md`, `docs/spec/12_날짜설정_기록접근_특별목표_정책.md`, `design-system/graphic-growth.md`, `docs/decisions/25_Living_Typography_Sculpture_조형_방향합의_v1.0.md`, `docs/decisions/27_12월_눈꽃_겨울빛_다색반짝임_월별테마확장_방향합의_v1.0.md`, `docs/spec/28_Gate2I_H3_Visual_Refinement_Performance_Study_v1.0.md`도 확인하라.
5. 기존 로컬 구현과 보고서를 확인: `src/dev/h3Refinement/`, `src/dev/frostedLighting/`, `src/dev/foregroundTextRotation/`, `src/dev/layeredCrystal/`, `artifacts/h3-refinement-review/README.md`, `metrics.json` 및 기준 렌더 테스트/fixture. **원격 GitHub에는 로컬 Gate2A~2I 코드가 없을 수 있으므로 API 추측 금지.**

## 2. 핵심 기술 경계

**1~15일 모든 날을 동일한 완성형 15일 입력으로 렌더한 뒤 잘라내는 것만으로는 이번 연구 목표를 충족하지 않는다.**

- 날짜 `U`일에 보일 글자는 **그 시점까지 실제로 존재하는 `U`개 고유 작성일의 기록 내용**에서만 추출해야 한다. 15일 fixture의 미래 원문을 1일차 영상/화면에 쓰면 실패.
- 서로 다른 날에 글을 추가해도 기존 anchor `entryId, sourceRange, anchorSlotId`의 기준 좌표는 안정적으로 유지. Echo는 임시 scaffolding이 필요하다면 source provenance와 visual ID를 추적하고 최종 I3로 합류하는 경로를 기록.
- `U`에 따라 공개 가능한 공간이 아래→위로 단조 증가, 미래 영역의 글자·광점·유령 윤곽은 0.
- 같은 날짜 추가 일기는 U를 늘리지 않음. 같은 높이의 열린 슬롯에 새 원문 글자들이 실제로 보이게 추가될 것.
- 과거 날짜 추가/수정·삭제·마지막 일기 삭제 후 구조/anchor 안정성, 장문의 밀도 포화 및 초단문 한글 1~5자 input 검증.
- 15일 I3와 **원문 ledger/글자 인스턴스/화면 픽셀/빛 입자 동일**을 목표로. 초기 임시 echo가 최종에 남아 기존 I3를 바꾸면 불합격. 전제가 충돌하면 충돌 이유를 수치와 이미지로 보고하고 조용히 기준 변경 금지.

## 3. 단계별 구현

**3A-0: 로컬 slot audit**
- I3 15일 기본 fixture의 실제 glyph positions, zones/arms/core/tips, bbox, existing reveal clip을 분해.
- 첫날 1자 문제의 정확한 원인을 세로 clip와 slot density, future allocated but absent text, U 당 allocation과 나누어 보고.
- 기존 I3 기준 `input=D15`과 각 날짜별 `input=D1..D15` 자료를 결정적으로 준비해.

**3A-1: 초기 성장 비교 G0/G1/G2**
- G0: 현재 I3의 1/15 선형 높이 공개(비교 기준).
- G1: 최종 I3에 영구적으로 남는 기존 하단 원문/echo 슬롯으로 초기 씨앗 구성. Anchor 안정성 최우선.
- G2: 초기(1~5일)에서 `D1..D5`의 존재하는 원문 echo만으로 작은 결정 씨앗·짧은 가지 형성. 일수가 늘어날수록 대응하는 최종 echo 슬롯으로 추적 가능한 이전/합류를 하고 15일에는 완전히 없어지도록.
- 구현 가능한 모델만 표시하되, 불가능한 경우 왜 G1/G2의 1일 모양·최종 동일성을 동시에 만족하지 못하는지 수치/스크린샷 제공.
- 1·2·3·5일 **정지 시안**에서 I3의 H3 색/빛/파티클 성격을 과장하지 마. 첫날 씨앗은 장식용 선/별로 조형 대신 만들면 안 됨.

**3A-2: 15일 정지 단계 스케줄 G3**
- 상세 명세의 `S01..S15`를 구현하고 매일 `motifId`, `regionId`, `minDay`, `slotIds`, `sourceCount`, `maxVisibleY`, `echoScaffoldType` 등을 ledger로 기록.
- 아래 제안 높이는 **최종 작품 범위**에 대한 연구용 초기값: 13,18,24,30,37,43,50,57,63,70,77,83,89,95,100%. 실제 모티프를 클립하면서도 깨지지 않도록 조정 가능하되 이유와 결과 보고.
- 일별 모티프는 **1 씨앗 → 2 첫 분기 → 3 하단 로제트 → 4 중심 연결 → 5 하단 첫 결정 모듈 → 6 하단 사선 가지 → 7 코어 하단 접합 → 8 육각 일부 → 9 코어·위쪽 뿌리 → 10 여섯 방향 팔 시작 → 11 상단 쌍가지 → 12 외곽 결정판 → 13 상단 밀도/연결 → 14 팔 끝 디테일 → 15 기존 I3 완성**.
- 단계별 **새로운 구조와 새로 보이는 실제 글자**가 있어야 함. 14일차가 단지 광점 1개 증가라면 실패.
- 1일차와 15일차의 완성도만 보고 중간날을 생략하지 마. **2~14 모든 날짜**를 동일한 기준으로 비교·기록할 것.

**3A-3: lifecycle tests**
- same-day +2 on 1/7/15, backfill(과거 작성일), edit, partial delete, last-day-delete, undo, 0일 비어 있는 상태; 여러 데이터셋/과거 원문 stable test.
- `entryDate` 고유일 기준으로 하루별 단계 갱신. 같은 날짜 기록 2편 중 1편 삭제해도 U 감소 금지.
- 미래 글자 출처가 한 자라도 보이는 경우 실패, 현재 기록이 다른 일기 내용으로 바뀌면 실패.
- `prefers-reduced-motion` 정적; 테스트용 실제 Diary body 노출 금지.

**3A-4: 조형 캡처와 parity**
- 동일한 카메라/scale/time/fixture의 1~15 contact sheet, 매일 증분 highlight, 160px 타일, 375px 기본, 1x/3.2x 확대.
- **D15 exact parity**: `render(I3,D15,t)` vs `render(Gate3A,D15,t)`의 글자/레이어/픽셀 diff 기록.
- 화면이 가득 차는 부분, 기존 anchor가 움직인 부분, 글자 도장 같은 반복 및 1일차 시각적 모양 부족을 정확하게 기록.
- 사용자에게 미감 확정 요청 전 **시각 결과물을 파일로 실제 생성**할 것.

## 4. 새 개발 페이지

`http://127.0.0.1:4173/__dev/snowflake-daily-growth-study`

- G0/G1/G2/G3 (가능한 모델만), 날짜 0~15 컨트롤, 1~15 전체 시트.
- baseline / previous / scaffold comparison, 동일 day input vs day15 final input 누락 금지(미래 원문 시뮬레이션 사용 시 '잘못된 비교'로 표시).
- fixture base/short/ultrashort/long/mixed, same-day extra 0/+2, 과거 작성일 추가/수정/삭제, 160px·375px·430px, 1/2/3.2x 확대, 고정 clock, debug region/slot/source/early echoes/reveal mask, reduced-motion.
- 사용자가 U=1과 U=2 차이를 직관적으로 볼 수 있게 하되, 연구용 시스템·구조 레이블은 제품 UI에 노출하지 마.

## 5. 반드시 생성할 산출물

새 폴더 `artifacts/snowflake-daily-growth-review/`:

1. `01_day01_to_day15_contact_sheet.png`
2. `02_daily_delta_01_02_to_14_15.png`
3. `03_day01_03_05_08_10_12_15_160px.png`
4. `04_G0_G1_G2_G3_early_compare.png`
5. `05_base_short_ultrashort_long_mixed.png`
6. `06_same_day_plus2_and_edit.png`
7. `07_anchor_echo_slot_provenance_debug.png`
8. `08_day15_I3_pixel_parity.png`
9. `metrics.json`, `growth_schedule.json`, `README.md`
10. `09_growth_stage_animation_preview.mp4`는 있으면 좋지만 **정지 프레임 연결을 실제 성장 애니메이션 완성으로 착각하게 하지 마**.

**이 Gate는 모션 스터디가 아니라 정적 조형 구조 연구**다. 기존 I3의 모션은 사용자가 최종 상태를 볼 때의 고정 시간 t로만 참조하고, 새 성장 애니메이션을 기본 구현하지 마.

## 6. QA/완료 보고

- 모든 U=0..15에서 보이는 글자 수, 모티프 수/ID, height, source provenance, 해당 날짜의 새 구조·글자, 초단문/기본/장문 비교 결과.
- G0~G3의 첫날 문제 개선 정도, G1/G2 trade-off, 이 중 무엇이 최종 I3와 자연스러운 연속성을 지키는지 검증.
- 매일 previous→current의 스크린샷 차이 및 빈 날짜/빈 가지/클리핑 오류.
- 기록 수정/삭제/과거날짜 기록/같은날 +2와 다른 기록의 anchor 안정.
- I3 Day15 pixel / glyph ledger parity: PASS 또는 실패 수치/원인. 다른 기준으로 슬그머니 PASS 처리 금지.
- 기존 회귀와 신규 Playwright, 성능 비교, 실제 모바일 WebView 미검증, 기존 unrelated typescript/syntax 오류 구분.
- 어떤 파일을 만들고 수정했는지; **Gate 2A~2I 소스/캡처/영상·실서비스 파일 불변** 확인.
- **commit/push/PR하지 않았음 확인.**
- 사용자에게 어느 단계가 더 아름다운지는 임의 판정하지 않고 전 날짜 시각 결과를 보고 선택받을 것.

**진행해.** 기존 I3 완성형의 아름다움과 데이터 안정성을 보존하면서 1~15일 모든 날에 실제 성장 보상을 주는 것을 검증할 수 있게 만들고, 불가능한 조건 조합은 숨기지 말아라.
