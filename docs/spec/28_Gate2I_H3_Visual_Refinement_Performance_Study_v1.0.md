# 칭찬일기 Gate 2I — H3 Visual Refinement & Performance Study v1.0

> 합의/실험 승인: 2026-11-24 · 대상 저장소 `EunseongOH/praise-diary` · 브랜치 `feat/design-system-prototype`
>
> **[확정] 사용자 선호:** Gate 2H의 H3를 12월 눈꽃의 **잠정 미적 기준안**으로 선택. 빛 입자의 양과 분위기는 **지금 수준으로 충분**하므로 임의로 늘리거나 색감을 바꾸지 않는다.
>
> **[실험 승인]** Gate 2I에서 기존 H3 보존, 검은 후광 완전 제거 비교, 중앙 코어 모션 추가 비교, 렌더링 성능 개선을 연구한다.
>
> **[보류]** I0~I3 최종 채택, 반경/제거 강도/코어 참여 비율/엔진 최적화 채택, 실제 서비스 배포, 첫날 성장 정책, 12월 목표일 수.
>
> 선행: `AGENTS.md`, `docs/decisions/25_Living_Typography_Sculpture_조형_방향합의_v1.0.md`, `docs/decisions/27_12월_눈꽃_겨울빛_다색반짝임_월별테마확장_방향합의_v1.0.md`, `docs/spec/26_Gate2G_Foreground_Text_Rotation_Study_v1.0.md`, `design-system/graphic-growth.md`.
>
> **자료 비저장:** 사용자가 제공했던 레퍼런스 스크린샷/영상·추출 프레임·링크를 저장소/Space/테스트 데이터/산출물에 넣지 않는다. 문서에는 합의된 설계 원칙만 기록.

## 0. 현재 결과와 이번 Gate의 문제 정의

다음 수치는 **사용자가 전달한 Gate 2H Claude Code 보고**에 근거하며 이 문서 작성자가 로컬 소스/산출물을 직접 검증한 것은 아니다.

- 형태: Gate 2F F2, 전면 구절 교대: Gate 2G R2, H3 회전 주기 20초. H4의 R3 16초 모션과 구별한다.
- H3: 차가운 흰색·은색·아이스 블루 중심 + 작은 다색 파스텔 포인트. H3의 **파티클 총 50개 중 파스텔 6개**; 시간별 점등 수, 위치, 색/밝기 리듬을 **정확히 보존**한다. 다른 데이터셋·성장일에서의 기존 밀도 상한(예: 17 글자당 최대 1개)도 그대로 유지한다.
- Gate 2H 후광 원인: glyph마다 바탕색으로 뒤 글자를 지우는 확장 마스크(기존 폭 2.2, 강도 100%); H1~H4에서는 폭 0.8, 강도 55%. 화면에서 검은 배경 띠처럼 보일 수 있음.
- 기존 H3의 중심 코어 변화율은 사실상 0%라는 보고. 전체 눈꽃 팔의 움직임과 대비해 코어가 정적으로 보임.
- H0/H3/H4 기본 렌더 375px DPR2 GPU 없는 headless Chromium에서 약 15~18fps. 1회 그리기 + DPR1.5 H4는 32fps 보고(다른 렌더/해상도에 자동 적용 가능하다는 뜻 아님). 아직 실제 앱인토스 WebView 미검증.
- 첫날 U=1/15에서 글자가 1개 수준인 문제는 미해결이며 **이번 Gate에서 높이/슬롯 성장곡선을 바꾸지 않는다**.

**작업 정의:** 선호 받은 H3를 조형·반짝임·전면 글자 교대의 기준으로 **비교 실험 중 보존**하면서, (1) 검은 글자 후광 제거, (2) 중앙 코어의 움직임, (3) 같은 시각 품질을 보존하는 렌더 최적화의 효과를 분리하여 검증한다.

## 1. 절대 고정할 요소 [승인된 기준]

- 12월의 가장 우선 시각 인상은 **눈꽃**. 여섯 큰 팔, 가지, 중앙 결정과 음영·여백의 구분. 글자가 주요 조형 재료.
- H3 원본을 `I0`로 **화소 수준에서 재현 가능한 기준**으로 남긴다. 기존 H3 원본 소스/산출물 직접 수정 금지.
- **F2 눈꽃의 글자 수·문자 내용·anchor/echo 출처 ledger, 코어/팔/가지 슬롯, R2 20초 회전, 팔별 위상, 전면·후면 구절 교대, H3 파티클 seed·수·위치·색·수명·점등 시점 및 팔·코어·가지 분포** 유지. 단, I1/I3의 렌더 마스킹 차이와 I2/I3의 코어 pose 변화는 실험에 따른 의도적인 차이.
- 파스텔 광점은 12월 눈꽃을 보조하는 작은 요소이지, 문자 기반 눈꽃 실루엣을 대신할 수 없음.
- 월별 Shape / Typography / Motion / Lighting / Particles / Theme Config 분리. 12월의 하드코딩을 공통 모션·조명 엔진으로 확산시키지 않는다.
- 사용자의 실제 일기를 테스트/디버그/파일로 수집하지 않음. **기존 프로젝트의 공개·가상 fixture**만 사용.

## 2. 2×2 디자인 비교 I0~I3 [이번 Gate 실험]

| 안 | halo/background eraser | Living Core | 다른 변수 |
|---|---|---|---|
| I0 | Gate 2H H3 그대로 | 기존 정지 | H3 그대로. 비교 기준 |
| I1 | **None**: 확장된 배경색 지우기/검은 림 제거 | 기존 정지 | 동일 |
| I2 | Gate 2H H3 그대로 | **ON** | 동일 |
| I3 | **None** | **ON** | 동일 |

- `halo=none|minimal|h3` 디버그 옵션 허용. `minimal`은 추가 연구용 조절 값이며 독립적인 확정 시안으로 취급하지 않는다.
- **검은 후광 제거 ≠ 뒤 글자가 앞으로 비치는 허위 표현 허용.** 앞/뒤 glyph의 z 깊이 순서, 가림 관계, 전면 identity 교대는 유지한다. 가능하면 확장된 배경색 지움 없이 **글자 자체의 alpha 실루엣과 z-order로 합성**한다. Canvas2D 구현 제약이 있으면 최소 glyph shape mask 등의 대안을 연구하고 차이를 명시한다.
- 완전 제거 후 겹침이 심해진다면 결과를 숨기거나 I1의 가독성을 회복하려고 검은 테두리를 다시 몰래 그리지 않는다. `minimal`을 별도 비교하고 왜 미학적으로 더 나은지 보고한다.
- I2/I3의 코어 모션은 글자 수·원문·슬롯·색·파티클을 새로 추가하는 방식이 아니라 **기존 코어 글자의 시간에 따른 pose만 변경**한다.
- `I3`는 목표 후보이나 **최종 채택은 사용자 미감 검수 전 보류**. 효과가 결합될 때 상호작용 문제를 발견하려면 `I0 vs I1`, `I0 vs I2`, `I1 vs I3`, `I2 vs I3`를 동일 시각에서 분리해 비교해야 한다.

## 3. 후광/가림 분리 — I1/I3

**3.1 진단:** 로컬 `src/dev/frostedLighting/FrostCanvas.tsx`, `src/dev/foregroundTextRotation/RotationCanvas.tsx`, engine 및 canvas composite ops, glyph painting path를 직접 확인하라. 실제 구현에 없거나 다른 이름인 API를 추측해서 수정하지 마라. H3의 eraser, halo, blur, stroke, fill, compositing 단계 각각에 대해 실제 원인표 작성.

**3.2 제안 렌더:** 늘어난 직사각/외곽 erasure 영역이 아니라 glyph 모양을 기반으로 앞에서 뒤로 가리는 정확한 투영·depth layering. 깊이를 이용한 전후 가림은 보존, **검은 띠·검은 문자 외곽·글자 간 검은 절개면처럼 보이는 미술적 아티팩트는 최소화**. 배경이 다크 `#0C1111`이라는 가정에 최적화를 과도하게 종속시키지 말 것.

**3.3 검증:** 같은 fixture, t=0,4,8,12,16,20s, 375px/160px/3.2× 확대: (a) eraser/halo에 기인한 어두운 픽셀 비율, (b) 대표/echo 앞면 strand ID 전환, (c) R2 대상 전면 문장의 깊이·투영 좌표, (d) z-occlusion/glyph silhouette boundary 겹침, (e) 코어 주변 과밀을 동시에 비교. 명암·가림의 정상적인 깊이 효과까지 '검은 픽셀 제거'를 이유로 훼손하지 않음.

## 4. 중앙 코어 Living Motion — I2/I3

- 현존 F2 코어 슬롯 중 **일부만** 참여. 코어의 6각 대칭, 중앙 연결과 주변 팔의 접합부, 작은 여백을 유지한다.
- 최소 두 개의 서로 다른 깊이/위상 기반 그룹 또는 구절층이 천천히 전면 역할을 교환할 수 있다. 코어가 작은 구조여서 '문장 단위' 가독성이 성립하지 않는다면 **실제 원문에서 온 글자/짧은 구절의 전면 identity 교대**로 검증한다. 원문을 재합성하거나 새 fake 텍스트 생성 금지.
- I2/I3에서는 **실제 코어 glyph의 screen projected position, z, frontness가 t에 따라 변화**해야 한다. 기존 코어/전체 눈꽃에 투명도 애니메이션만 추가하거나 코어 전체를 통째로 회전시키는 것은 실패.
- 코어와 큰 팔 접합부가 끊어지지 않도록 **구조를 유지하는 정적/완만한 기준 글자군 + 국소적으로 이동하는 전면 교대 글자군**을 분리할 수 있다. 하지만 정적 부분만 계속 선명하고 움직이는 부분은 영원히 뒤에 남는 방식은 실패.
- 코어의 글자 수·배치는 I0와 동일해야 한다. 중심 글자만 추가하지 않는다. 이동에 참여하는 비율/회전주기/미세 흔들림은 **dev 제어값**으로 연구하고 확정하지 않는다(예: 10/20/30% 후보). 20초 팔 회전은 유지하며 코어 motion period는 별도 값으로 비교 가능.
- 어떤 시점에도 중심이 검은 덩어리가 되거나 육각 코어가 완전히 비는 현상, 여섯 팔이 떨어지는 현상, 미래 성장 영역의 노출이 있으면 보고.
- I0/H3 대비 **코어 ROI의 시간별 변화량**, 움직이는 glyph 비율, 광도/전면 ID/중앙 잉크 분포, 코어/팔 경계의 변동을 정량화한다. 단 **픽셀 변화량이 클수록 예쁜 건 아니다**.

## 5. 성능 — 디자인 효과와 독립된 최적화 축

- 시각 실험 I0~I3과 **렌더링 백엔드의 선택**을 혼동하지 않는다. 같은 I3를 아래 최적화 on/off로 별도 비교.
- 정확히 **동일한 시각 프레임**에서 baseline과 optimized의 차이를 매 시각/여러 배경색/다양한 데이터셋에 대해 측정. 이미 알려진 단색 배경 1회 그리기 가정은 **다른 월/다른 배경에서 깨질 수 있으므로** 주의. 색 배경/alpha 변형 테스트 포함.
- 측정 순서: ① 기존 glyph double painting을 실제로 확인 ② 합성용 single-pass draw 연구 ③ glyph bitmap/cache/atlas, depth bins, 정적인 층 분리 또는 dirty region 등 필요시 추가 실험 ④ DPR 2 유지 상태 성능 확인 ⑤ DPR 1.5 실험은 **최후 fallback**으로만 분리.
- **글자 수, 전면/후면 회전, 색, brightness, 파티클 수·위상 등을 몰래 줄여 FPS를 높이는 행위 금지.** pixel-perfect를 보장하지 못하는 최적화는 가능한 시각 차이/제약을 정확히 기록.
- 375×812, DPR 1·1.5·2, CPU 1× (필수), CPU4× (참고), 각 단일 작품 10초×3회 중앙값, 같은 실행의 H3/I0 baseline과 최적화 버전; FPS median, p95/p99 frametime, 메인 스레드 draw costs, canvas calls, visible/dynamic glyph 수, particles rendered, JS frame compute time, CPU load, React rerender/Layout 수, memory 가능 시, screenshot pixel differences.
- **1회 그리기 + DPR1.5의 과거 32fps를 DPR2 실시간 성능으로 보고하지 말 것**. 30fps는 연구 목표이며 미달/외부 환경 노이즈를 그대로 보고. GPU 없는 headless Chrome과 실제 앱인토스 WebView는 구분한다.
- Reduced motion / 정지 썸네일은 RAF 0 등 기존 보호; 성능 개선용 다른 모션 약화/fallback은 별도 옵션일 뿐 자동 채택 아님.

## 6. 개발 페이지 · 출력 · QA

새 개발 전용 route: `/__dev/h3-refinement-study`; 기존 Gate 2A~2H 경로 유지.

개발 컨트롤: I0/I1/I2/I3, 2×2 나란히 보기/독립 단일 작품 모드, halo=none|minimal|h3, coreMotion=off|on, coreStrength 및 period 연구값, t 고정/재생/일시정지, full/arm/core crop, days=0/1/3/5/8/15, extra same-day=0/2, dataset=base/short/ultrashort/long/mixed, zoom=1/2/3.2, tile=160px, reduced-motion, debug IDs/depth/halo-mask/core-motion, renderer=baseline|optimized 및 DPR 비교. dev page에 debug 설정값 노출은 허용하나 제품 UI로 옮기지 말 것.

새 산출물: `artifacts/h3-refinement-review/`

필수:
1. `01_I0_I1_I2_I3_static.png` — 375px 동일 t/fixture 2×2 비교
2. `02_halo_comparison.png` — 확대 전후, mask 및 검은 픽셀 heatmap/원인
3. `03_living_core_timeline.png` — 20초 전체 시간의 코어 전면 identity·z·투영 좌표 변화
4. `04_mobile_160_375.png` — 기본/초단문/1·3·15일 160px·375px
5. `05_full_motion.mp4` — 동일 시각 I0~I3 전체 눈꽃 비교, 최소 20초
6. `06_core_closeup.mp4` — 3.2× 코어를 최소 한 코어 회전 주기 동안 확대 비교
7. `07_performance_comparison.json` — 옵션별 FPS/frametime/픽셀 동등성/렌더 호출 지표
8. `08_occlusion_and_text_handoff.png` — 팔 R2 교대/코어 교대, no-halo 가림 검증
9. `09_reduced_motion.png` — 정적 자세/RAF0
10. `metrics.json`, `README.md`.

MP4가 **오프라인 고정 시간 프레임 합성**이면 README와 보고서에 실시간 FPS가 아님을 명시. 원본 참조 파일 사용 금지. 사용자에게 가장 먼저 보일 `01`, `02`, `05`, `06` 우선.

### 필수 테스트

- **I0 vs 실제 H3 기준** 픽셀 동일, 같은 seed/t/fixture/파티클 상태, source IDs 동일.
- I0/I1/I2/I3: 동일 보정 후 particle count=기존 H3, pastel count 및 particle schedule=기존 H3, R2 팔 앞면 교대 48줄(실제 대상 유효 시), F2 글자 ledger·rendered glyph count 불변. `source/slot ID` 안정.
- I1/I3: 확대된 어두운 마스크 제거 확인 + 실제 occlusion 유지 + foreground phrase/t/z/order 불변. 가짜 alpha swap/뒤 글자 관통/투영 반전 금지.
- I2/I3: 코어 ROI 내 실제 glyph xyz/투영 bbox/전면 ID가 시간에 따라 달라지고 단순 alpha blink가 아님. 반대로 I0/I1에서는 코어가 baseline과 동일.
- 동일 날짜 기록 +2: 성장 높이 불변, 미래 glyph 0, 삭제/수정 후 다른 일기의 anchor 및 provenance 안정; 0·1·3·5·8·15일, short/ultrashort/long/mixed.
- 160px 6갈래 정적 실루엣, 코어/팔 접합부 유지; debug용 평가 지표는 수치와 캡처를 함께 보여주고 자의적인 threshold 완화만으로 통과시키지 말 것.
- prefers-reduced-motion ON은 반복 RAF 0, 안정적인 정적 프레임. 화면 320·375·430px, DPR1/2.
- baseline vs optimized의 pixel diff (전체·코어·팔/동적 전면 구절/배경 차), 다른 배경/transparent alpha에서 불일치 시 이유/적용 범위를 명시. 동일하지 않으면 `pixel-identical`이라는 주장을 하지 않는다.
- 이전 Gate 회귀 테스트. 기존 `glyphLayout.ts:193` 타입 오류와 Windows `check:syntax` 경로 문제는 관련 없는 수정 없이 기록.

## 7. 작업 보호

- `C:\Users\User\diary\praise-diary` 로컬 작업은 **GitHub에 미커밋인 Gate 2A~2H 자료가 포함**될 수 있음. 먼저 `git status --short`, 기존 파일/아티팩트 해시 스냅샷.
- `git fetch origin feat/design-system-prototype` + `git show origin/feat/design-system-prototype:docs/spec/28_Gate2I_H3_Visual_Refinement_Performance_Study_v1.0.md`로 문서를 읽고 로컬 소스는 직접 확인. **`git pull` / `reset` / `clean` / `restore` / `checkout` 금지**.
- 새 소스 `src/dev/h3Refinement/` + `src/dev/H3RefinementStudyPage.tsx` 등과 새 tests/outputs에만 작성. 기존 경로·tests·artifacts 원본 변경/덮어쓰기 금지. dev route 등록이 필요한 `src/main.tsx`, `playwright.config.ts`, `package.json`에 한해 기존 줄 보존하고 추가 변경 가능.
- `GraphicArtwork`, 홈/작성/도감/상세/디자인시스템/DB/실제 데이터/제품 번들 변경 금지.
- **커밋, push, PR 전부 금지**. 디자인 잠정 선정과 제품 채택을 혼동하지 않는다.
- 보고는 한국어로만. 실제 추가/변경 파일과 보호 상태, 비교 결과, 성능과 미검증 항목 명시.

## 8. 완료 정의/후속

**완료:** 사용자가 I0~I3 동등 조건의 사진과 영상을 보고, (1) 검은 테두리 제거의 조형적 장점/단점, (2) 코어의 살아 있는 움직임, (3) 실제 20초 구절 전면 교대/눈꽃 인지성, (4) 성능/화질 타협을 **독립적으로** 판단할 수 있다.

I3 채택·코어 모션 참여율·후광 미세 조절값·최종 렌더·DPR 한도·실기기/앱인토스 적용과 첫날 성장 보완은 사용자 별도 검수 후 결정한다.
