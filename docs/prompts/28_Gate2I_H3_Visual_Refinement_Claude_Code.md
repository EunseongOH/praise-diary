# Claude Code 실행 프롬프트 — Gate 2I H3 Visual Refinement & Performance

**기존 Gate 2A~2H의 미커밋 로컬 작업을 보호하면서, GitHub의 Gate 2I 상세 명세를 그대로 구현하라.**
**개발·실험 과정과 최종 보고는 모두 한국어로 작성한다.**

## 0. 이번 과제의 목표

12월 눈꽃 타이포그래피에서 사용자가 **Gate 2H H3를 잠정적으로 가장 예쁘다고 선택**했다. H3의 현재 반짝임 수준도 만족하므로 **파티클은 늘리지 않는다.**

따라서 새 기능을 더 붙이는 것이 아니라, **기존 H3를 기준선으로 ① 검은 후광 제거 ② 정지된 중앙 코어의 살아 있는 움직임 ③ 시각 품질을 유지하는 렌더링 최적화**를 단계적으로 검증하는 개발 전용 비교 스터디를 만들어라.

최우선 시각 인상은 **눈꽃**. 실제 사용자가 쓴 글자들이 여섯 갈래 결정과 중심부를 만들고, 가까이 볼 때 앞뒤 회전하는 글자와 소량의 차가운 빛·파스텔 반짝임이 보여야 한다. 글자 읽기 쉬움을 위해 어두운 외곽을 입히는 것보다 완성된 작품의 미감이 중요하다.

**H3 고정 조건**
- 형태: 2F F2 여섯 갈래, 현재 코어와 가지의 배치/글자수/원문 출처.
- 회전: 2G R2의 **20초**, 전면 흰 문장과 후면 흐린 문장이 실제 공간에서 교대(단순 opacity swap 금지).
- 파티클: 15일 기본 테스트에서 **총 50, 파스텔 6**, 현재 H3와 같은 실제 seed/색상/배치/시간별 점등 스케줄. 성장 초기의 기존 파티클 제한도 보존.
- R3나 H4의 16초 모션으로 바꾸지 말 것.
- 형태·이동·조명·Particles·Theme config의 역할 분리 유지. 12월의 아이스 블루·파스텔이 다른 달의 엔진 기본값으로 굳어지지 않아야 함.

## 1. 작업 전 Git/로컬 상태 보호 (엄수)

루트: `C:\Users\User\diary\praise-diary`

1. `git status --short`, 변경/추적 안 된 파일 목록, 기존 Gate 2A~2H 소스·테스트·artifacts 해시/파일 수 기록.
2. 사용자 PC의 로컬 Gate 소스/동영상은 **대부분 원격 GitHub에 없을 수 있다**. 원격과 다르다고 원본 로컬을 덮지 말 것.
3. **`git pull`, `git reset`, `git restore`, `git checkout`, `git clean` 절대 금지**. 코드 커밋·push·PR도 금지.
4. `git fetch origin feat/design-system-prototype` 뒤 `git show`로 다음 문서를 읽어:
   - `docs/spec/28_Gate2I_H3_Visual_Refinement_Performance_Study_v1.0.md` (**이번 Gate의 가장 자세한 요구사항**)
   - `docs/prompts/28_Gate2I_H3_Visual_Refinement_Claude_Code.md` (현재 실행 프롬프트)
   - `docs/decisions/27_12월_눈꽃_겨울빛_다색반짝임_월별테마확장_방향합의_v1.0.md`
   - `docs/spec/26_Gate2G_Foreground_Text_Rotation_Study_v1.0.md`
5. `AGENTS.md` 및 로컬 `src/dev/frostedLighting/{theme.ts,engine.ts,FrostCanvas.tsx}`, `src/dev/foregroundTextRotation/`, `src/dev/layeredCrystal/`, 기존 `tests/e2e/frostedLighting.*`, `artifacts/frosted-snowflake-lighting-review/{README.md,metrics.json,performance.json}`를 직접 확인하고 API와 렌더 방식을 판단해.

## 2. 시각 비교 시안 — 2×2 요인 분리 (필수)

| 시안 | 기존 H3의 halo/eraser | 중앙 코어 모션 | H3 파티클·팔 회전 |
|---|---|---|---|
| I0 | 원본 그대로 | OFF | 모두 그대로 |
| I1 | **완전 제거** | OFF | 모두 그대로 |
| I2 | 원본 그대로 | ON | 모두 그대로 |
| I3 | **완전 제거** | ON | 모두 그대로 |

- 원본 H3 소스나 artifact를 고치지 않고 **새 engine/adapter/renderer에서** 분기할 것. I0는 H3와 동일 fixture/t/seed/DPR에서 **픽셀 완전 동일**해야 함.
- I0/H3와 비교해 I1/I3에서 **후광만**, I2/I3에서 **코어 pose만** 변경되도록 검증. 코어 변화와 후광 제거 효과를 혼합해 판정하지 말 것.
- 최소 후광(`minimal`) 옵션은 비교용 컨트롤로 허용하나 I1/I3에 몰래 적용하지 말 것. 사용자 미감 확인 없이 최종안으로 선택하지 말 것.

## 3. 2I-1 검은 후광 제거

- 먼저 기존 H3에서 검은 윤곽 같은 인상을 만드는 정확한 canvas composite chain, glyph backdrop erasure, stroke/blur/halo drawing을 조사하여 README에 원인표 작성.
- H3는 2H 보고에서 글자 뒤 배경색을 지우는 확장 영역(반경 0.8, 강도 55%)을 쓰는 것으로 알려져 있다. **로컬 소스 확인 전 수치 확정 금지**.
- I1/I3에서는 확장된 어두운 후광/테두리의 실제 렌더를 완전히 끄되, **z-depth가 높은 글자가 낮은 글자를 자연스럽게 가리는 물리적인 앞뒤 관계는 그대로** 남겨야 한다.
- alpha/실제 glyph silhouette 기반 depth sorting/compositing 등을 실험할 수 있다. 글자 뒤를 배경색으로 두껍게 덧칠하는 가림과 실제 glyph footprint에 맞는 가림을 구별해.
- 겹침 때문에 읽기 어려워져도 인위적인 검은 테두리를 되살리지 말 것. 필요 시 얇은 최소 후광은 다른 dev 옵션으로 제공하고 결과와 한계 정직하게 보고.
- 확대 컷과 전체 캡처에서 H3 원본 대비 검은 마스크 픽셀 비율, 코어/줄기 과밀, 전면 글자 교대의 보존을 같은 시각으로 비교해.

## 4. 2I-2 중앙 코어에 실제 움직임 추가

- 현재 H3의 큰 팔은 20초 교대하지만 중앙 코어의 시간별 픽셀 변화량은 거의 0이라는 보고. 코어 전체/눈꽃 전체를 하나의 도형으로 통째로 회전하지 말 것.
- **기존 코어에 실제로 배치된 글자 인스턴스 중 일부**를 골라, 국소 2.5D 회전/깊이 변화/앞·뒤 전면 교대를 주어 코어 자체가 살아 보이게 하라.
- I2/I3에서 코어의 glyph **world xyz(t), projected bbox(t), depth order, frontGlyph/source ID**가 달라져야 한다. 단순 alpha pulse만 추가하면 실패.
- 코어 본래 육각 실루엣, 여섯 팔 연결, 비워 둔 음의 공간은 정적 구조 일부가 지지하도록. I2/I3가 글자 뭉침/구멍/연결부 단절을 만들지 않는지 확인.
- 코어 원문·글자 수·슬롯 변경 금지. 전체 코어의 몇 %를 움직일지는 dev 옵션 예: 10/20/30%로 실험하고, 사용자 승인 없이 한 값을 제품 정책이라고 부르지 말 것.
- 코어가 너무 작아 '문장'으로 읽히지 않아도 되지만, 실제 diary provenance가 있는 그룹/낱글자의 **전면 identity 변화**는 테스트로 보일 것.
- 중앙이 글자만 반짝이는데 위치는 그대로라면 이번 목표에 도달하지 못한 것임.

## 5. 2I-3 성능 개선 — 조형과 분리

- 원본 H3의 기본 렌더와 optimized renderer를 **같은 시안·같은 t·seed·fixture**로 비교해.
- 기존 2G/2H 보고에서 glyph마다 두 번 그리며 소프트웨어 raster 비용이 큼. `single-pass`, pre-composite glyph/cache/atlas, 동적층 분리, depth sorting 비용 축소 등 가능한 방법을 **시각 출력 변동 없이** 우선 연구.
- 1회 그리기가 배경색 미리 합성에 의존한다면 다크 배경 외 다른 테마 색/alpha에서도 같아지는지 확인. 다른 월별 테마에서는 반드시 다른 배경이 쓰일 수 있음. **다크 배경 전용이면 별도로 범위를 표시**하고 범용 엔진 최적화로 포장 금지.
- 우선 **DPR2에서 30fps 이상**을 목표로 시도. 과거 H4 single-pass + DPR1.5 32fps 보고를 DPR2 성공으로 재인용하지 말 것.
- 픽셀 동등성 실패/성능 미달 시 어떤 이미지 차이가 생기고 어떤 연산이 남는지 진단. 성능 향상을 위해 파티클/글자/회전/밝기/화질을 몰래 줄이는 것은 금지. DPR1.5는 시각·성능 대조용 별도 fallback으로만 취급.

## 6. 새 페이지 및 산출물

새 dev route: `/__dev/h3-refinement-study`. 새 파일 예시: `src/dev/h3Refinement/` 및 `src/dev/H3RefinementStudyPage.tsx`.

패널에서 I0/I1/I2/I3, 동시 비교/단일 작품, core-only zoom, full snowflake, `halo=h3|none|minimal`, `coreMotion` 토글/강도/period, renderer baseline/optimized, `t` 고정/재생, DPR1/1.5/2, 160px 타일, data set, 고유 작성일 수=0/1/3/5/8/15, 같은 날 +2, reduced-motion, provenance/depth/mask debug를 지원.

새 산출물 폴더 `artifacts/h3-refinement-review/` (이전 Gate 폴더에 저장 금지).

필수 파일:
1. `01_I0_I1_I2_I3_static.png`
2. `02_halo_comparison.png`
3. `03_living_core_timeline.png`
4. `04_mobile_160_375.png`
5. `05_full_motion.mp4` — I0~I3의 같은 시간축, 최소 20초
6. `06_core_closeup.mp4` — 전체 코어 회전 한 주기 이상
7. `07_performance_comparison.json`
8. `08_occlusion_and_text_handoff.png`
9. `09_reduced_motion.png`
10. `metrics.json`, `README.md`

원본과 비교 프레임은 프로젝트의 **가상 fixture로부터 새로 생성한 연구 결과물**만 사용할 것. 사용자 제공 레퍼런스 영상/프레임·민감한 실제 일기 원문 금지. 오프라인 합성 mp4를 실시간 fps라고 쓰지 말 것.

## 7. 필수 자동 테스트 및 측정

- I0 vs 2H H3 동일 t/seed/fixture 픽셀 동일, 20초 팔 회전/전면 구절 교대·출처·slot ID 유지.
- I0~I3 particle count/seed/pastel count/시간별 active schedule 유지. 15일 기본은 총 50/파스텔 6, 초기 성장 데이터에는 기존 밀도 제한 유지.
- I1/I3는 확장 검은 eraser 0이며 **앞뒤 glyph occlusion 보존**. 전면 white strand가 뒤 글자 때문에 가려지는 등 오류 테스트.
- I2/I3 코어 glyph 실제 xyz와 projected bbox/time/front source identity 변경, 반대로 I0/I1 코어 모션 미추가.
- 동일 날짜 +2 높이 불변, 미래 성장 영역 문자 0, record edit/delete/last-day delete/old-day addition, 160px 여섯 갈래, 1일/3일/15일, ultrashort/short/long/mixed, reduced-motion RAF0.
- I0~I3 단일 작품 각각 375×812 DPR1/1.5/2, CPU1×, 10초×3회 중앙값, CPU4× 보조. FPS median, p95/p99, 글자 수·그리기 호출 수·파티클 수·CPU/JS/레이아웃/React rerender, screenshot diff와 실기기 미검증 기재.
- optimization on/off는 시안별로 측정하고, **4개 동시에 그리는 비교 페이지 FPS는 단일 작품 FPS가 아님**. 기존 타입 오류/Windows syntax 오류는 기존 baseline과 구분.

## 8. 최종 보고 (한국어)

1. 한 문장 결론 — 'I3가 실제로 더 아름답다'고 임의 판정하지 말 것
2. Git 보호 / 새로 만든 파일 및 손대지 않은 파일 / 원격 변경은 문서만
3. 개발 페이지 재현 URL
4. I0/I1/I2/I3 정지·움직임 비교: 제거된 검은 후광, 코어 입체감, 눈꽃 형태 보존
5. 중앙 글자 실제 xyz/z/front ID의 시간별 증거
6. 원래 H3와 동등한 빛·파티클·전면 팔 회전·원문 provenance 입증
7. 160px/375px, 성장 0/1/3/5/8/15, reduced-motion 결과
8. DPR2 FPS와 optimized 렌더의 정확한 픽셀/테마 범용성; 실기기 미검증 설명
9. 주요 png/mp4 절대 경로 + 영상의 실시간/오프라인 구분
10. 사용자에게 최종 미감/후광/코어 강도/성능 방식을 검수받아야 한다는 점
11. **commit·push·PR 미실행 확인**

**작업을 시작해라.** 실패한 비교/검증을 숨기거나 수치 하한을 몰래 낮춰 PASS 처리하지 말고, 사용자에게 확인받을 수 있는 결과물을 만들어라.
