# Gate 2G — Foreground Text Rotation & Depth Handoff Study v1.0

> 날짜: 2026-11-24 · 저장소 `EunseongOH/praise-diary` · 작업 브랜치 `feat/design-system-prototype`
> **상태**: [사용자 승인] 전면 흰색 텍스트의 실제 움직임·앞뒤 교대 경험 및 R0~R3 비교 **실시** / [실험 제안] 구체 알고리즘·초기 수치 / [보류] 실제 앱 채택, 최종 모션/강도/기술
> 선행: `docs/decisions/25_Living_Typography_Sculpture_조형_방향합의_v1.0.md`, `docs/spec/23_Adaptive_Snowflake_Density_Gate2C_v1.6.md`, `docs/spec/24_Gate2D_Sculptural_Snowflake_Study_v1.7.md`, `AGENTS.md`.
> **참고자료**: 사용자가 제공한 스크린샷/영상은 분석용으로만 사용. 원본·프레임·썸네일·파일 경로·파일 링크를 저장소, Space, 테스트 fixture, 캡처 폴더 등에 복사/업로드하지 않는다. 문서에는 사용자와 합의한 동작 원칙만 기록.

## 0. 문제 정의 — '흰색 글자가 고정'되는 결함을 직접 검증

[사용자 제공 Gate 2F Claude Code 보고에 기초한 현황 — 원본 로컬 코드를 여기서 직접 검증한 것은 아님]
- Gate 2F F2: 15일 기본 855개 글자 인스턴스, 보조 밴드 420개, M1~M4에서 회전·부유·이동·반짝임 확대. 대표 구절과 대표 밴드의 **화면 위치는 모든 모션에서 고정**됨.
- 사용자가 보여준 확대 동영상에서는 줄기의 가장 선명한 **흰색 원문 연속 구절 자체가 0~12초 사이 거의 움직이지 않음**. 보조 글자층만 그 주변에서 움직이므로, 전체가 두께 있는 결정으로 돌고 있다는 느낌이 제한됨.
- 사용자 요구: 그 **흰색 구절을 구성하는 낱글자들도 실제로 회전·깊이 이동**하고, 후면으로 물러나며 흐려지면 **다른 실제 원문 구절이 앞쪽으로 이동해 새로운 선명한 흰색 텍스트**가 되어야 한다. 현상은 단순 opacity crossfade가 아니라 글자의 실제 3D(또는 2.5D) 위치, 전후 가림, 원근 변화에서 발생해야 함.
- 이전 Gate 2F F2/M4 375px DPR2 CPU1× 약 29.7fps(동일 실행 상대 비교 필요), GPU 없는 headless 환경. 다른 실험의 FPS와 단순 비교 금지. 기존 2F 결과 94개 회귀 테스트 PASS는 조형적 승인을 뜻하지 않음.

**이 Gate는 새 눈꽃 실루엣을 다시 만들지 않는다.** F2 형태, 글자 출처·배치 ledger, 짧은 글 반복(echo), 성장 규칙을 유지하면서 **전면 글자가 교대하는 3D 모션**만 고립시켜 검증한다.

## 1. 승인된 사용자 경험 — 전면·후면 문장 교대

- **전면에 선명하게 보이는 원문도 움직인다.** 이전 '대표 텍스트 고정' 규칙은 **기록 변경 후 anchor/원문/슬롯 ID의 안정성**을 뜻하며, 1프레임 화면상의 좌표가 영구적으로 고정되어야 한다는 의미가 아님.
- 각 줄기/가지는 단일 정지 흰색 문장 + 뒤의 보조 회전 문장이 아니라, **둘 이상의 실제 글자층이 다른 깊이/위상으로 회전**하면서 서로 전면을 차지할 수 있다.
- 앞에 있던 문장은 뒤로 이동해 자연스럽게 어두워지거나 일부 가려질 수 있으며, 기존에 뒤에서 흐리게 보이던 다른 문장은 앞으로 와서 선명한 흰색으로 읽힌다.
- **흰색 텍스트의 '역할'이 시간에 따라 바뀌어야 한다**. 특정 고정된 최상단 문장을 계속 흰색 오버레이로 남기고 그 밑에서만 다른 글자가 움직이면 실패.
- 눈꽃 여섯 갈래 기본 실루엣은 유지, 각 줄기/가지에서 회전 위상은 달라도 눈꽃 전체는 통째로 돌리지 않음.
- 짧은 일기는 실제 원문의 일부 구절을 출처가 추적되는 echo로 반복 사용 가능. 다른 일기의 글자를 조합해 새로운 원문 문장을 합성하지 않고 사용자의 작성일 수도 늘리지 않음.
- `prefers-reduced-motion` / 정지 도감 160px에서는 일기를 그대로 볼 수 있는 정적 순간의 작품. 과도한 후면 고스트·번쩍임 금지.

## 2. 비교 실험 R0~R3 [기술·수치 미확정]

| 안 | 설명 | 검증 포인트 |
|---|---|---|
| R0 | Gate 2F의 현재 전면 대표 고정, 후면 보조 밴드만 움직임 | 현재 문제 재현 기준 |
| R1 | **전면 대표 구절까지** 자전/깊이 이동. 뒤로 가면 흐려지고 앞에 남은 다른 실제 구절이 드러남 | 원문의 화면 좌표·z 및 선명도 변화가 실제로 생기나 |
| R2 | 같은 줄기/가지의 **2~3개 독립 원문 구절층**이 위상차를 두고 전후로 순환 교대 | 앞면을 차지하는 문장 ID가 바뀌나, 앞쪽이 빈 틈 없이 자연스러운가 |
| R3 | R2 + 일부 echo의 부유/이동과 기존 반짝임 | 전체 눈꽃의 생동감과 비용을 검증 |

**우선순위: R1/R2 '전면 텍스트의 실제 교대' 성공이 R3의 화려함보다 먼저.** R1/R2가 실패했는데 R3의 sparkle로 결과를 미화하지 말 것. 기존 Gate 2F와의 동일 fixture/기본 색/서체/카메라/시작 각도 기준 비교.

## 3. 구현 원칙 — Identity/Anchor vs Time-dependent Pose

`sourceGlyph`에는 entryId, sourceStart/sourceEnd(Unicode grapheme), strandId, copyIndex, anchorSlotId, stableSeed가 있다.
`pose(glyph, t)`에는 localAxis, angle(t), radius, 3D point(x,y,z), projected bbox, facing, frontness, depth, screenAlpha, drawOrder가 있다.

- `anchorSlotId`/source offset은 기록이 바뀌지 않는 동안과 새 기록 추가 이후에도 안정적이다. **현재 화면 좌표 `P(t)`는 바뀔 수 있다.**
- 한 구절의 낱글자들은 연속된 **하나의 3D strand**에 올려 원문 순서를 유지. 글자별 위상은 경로 길이에 따른 부드러운 진행이고 프레임마다 무작위 글자별 텔레포트 불허.
- R1에서는 대표 strand도 로컬 축 주위 실제 공간 위치를 변경한다. **전면의 흰 글자가 시간에 따라 같은 화면 위치를 벗어나고, z가 앞→뒤로 바뀌어야 한다.** 단순 고정 평면 글자의 alpha만 바꾸는 구현 금지.
- R2에서 최소 2개 독립 strand의 서로 다른 원문 실제 구절/echo 구절을 둔다. **서로 다른 layer가 같은 화면의 밝은 전면 위치를 순환**하게 하고, 교대 중 전면을 차지한 layer identity가 달라짐을 테스트로 입증. 단계별 고정색 역할 금지.
- 원근, 크기·폭 압축, z-order/occlusion, depth/facing 기반 점진적 명도 변화를 결합. **이미 같은 2D 위치에 겹쳐 놓고 alpha값만 반전**하는 가짜 방식 금지.
- 뒷면에서 글자형이 좌우 반전되어 보이지 않도록 glyph quad의 읽기 방향을 제어하고, 뒤에서는 불필요하게 높은 선명도 금지. 후면 희미한 가시성은 허용하되, 전면 글자 뒤에 숨은 픽셀이 앞면을 뚫고 유령처럼 보이면 안 됨.
- 글자의 밝기는 **고정된 대표/echo 속성보다 공간적 앞면 여부와 깊이**에 반응해야 한다. 전면에 나온 실제 echo도 흰색이 될 수 있고, 대표 글자가 뒤로 가면 회색으로 바뀔 수 있다.
- 시안 값은 실험 가설로만: 한 바퀴 대략 16/20/24초 비교, 층간 초기 위상 서로 엇갈리게, 카메라 전면/측면/후면의 휘도 곡선 비교. **정확한 alpha, font-size, 글자 수, 회전속도는 미승인**이며 개발 페이지 옵션.
- 같은 팔에 몇 글자가 전면으로 보일지/고정 커버리지는 **정량 metric**으로 확인한다. 한 프레임에 모든 흰 글자가 사라지고 눈꽃 줄기 일부가 비면 실패.
- 나선만이 유일한 동작 모델일 필요 없음. 다만 이 Gate R1/R2는 모션 인과관계(왜 선명도가 바뀌나)를 확실히 검증하기 위해 한 줄기의 로컬 2.5D 회전/깊이 순환에 집중.

## 4. 화면·물리 검증 설계

### 4.1 확대 교대 먼저 (핵심)

F2의 한 개 대표 줄기와 인접 보조 밴드를 **3.2× 확대**한 독립 스터디 장면에서 R0/R1/R2/R3를 나란히 동일 시간으로 보여준다.

- 화면은 특정 실제 가상 fixture의 구절 A/B를 사용. **사용자 영상 원문을 가져오거나 공개 이미지·실제 사용자 일기를 복사하지 않는다**.
- 기준 시각 t0에서 '앞면 구절 A가 흰색/뒤쪽 B는 희미함', 중간 시각 A/B가 물리적 깊이로 교차하며 앞 글자의 화면 위치가 변함, 다른 시각 tX에서 **구절 B가 밝은 전면, A가 후면**이 되어야 한다. 이걸 **영상·PNG·이름/ID 포함 디버그 검증**으로 확인한다. 사용자에게 원문은 synthetic fixture만 노출.
- R2 장면에서 2~3개 밴드의 실제 z(t), frontScore(t), projectedBBox(t), visibleGlyphCount, frontPhraseId(t)를 시간별로 그래프/CSV/JSON 보고. 단순 `opacity`만 시간 따라 바뀌는 버전이라면 FAILED.
- 카메라에 대한 billboarding(읽기 방향 유지)과 실제 앞뒤 위치 변경은 공존 가능. 직접 보이는 글자를 읽기 쉽게 만드는 방식은 이전 2.5D/실시간 성능과 비교하고 정적 앞면 오버레이로 변질되면 안 됨.
- 시간 샘플은 최소 t0, t=T/4, t=T/2, t=3T/4, t=T, 및 교대 교차점 전후(t±0.25s)를 포함.
- 확대에서 R2가 성공한 뒤에만 전체 눈꽃 6팔로 확장. 전체 눈꽃 단계에서 일부 팔만 동작한다면 어느 팔에 해당하는지 공개하고 사용자 승인으로 포장하지 않음.

### 4.2 전체 눈꽃 검증

- 15일 기본 F2 눈꽃의 **정적 실루엣은 기준**으로 유지하고 R2/R3를 적용. 160px 도감/375px 홈 시뮬레이션/2×/3.2×.
- 6개 팔 + 중앙 코어/가지에서도 전면 identity 변화가 발생하는지; 좌측/우측/상부/하부 특정 한 군데만 화려해지지 않았는지 확인.
- 160px 시간별 IoU는 Gate 2F 대비 **참고 지표**, 내부 필터/전면 색 변화와 실루엣 안정성 별도 측정. 보고서에 `foreground occupancy`, `front strand ID turnover`, `core/arm coverage`를 추가할 것.
- 0/1/3/5/8/15일 성장·동일 날짜 +2·지난날 기록 추가·삭제/수정·현존 글자 미래 예약의 가시성 유지. 1일 1/15 빈약함은 **미해결 독립 정책**이고 이번 Gate에서 몰래 성장 높이를 변경하지 않음.

## 5. 프로덕션 및 성능 경계

- 신규 개발 전용 `/__dev/foreground-text-rotation-study`. 기존 `/__dev/layered-crystal-motion-study` 및 Gate 2A~2F 모두 재사용 참조만, 원본 코드·산출물 불변. `GraphicArtwork`, 홈/작성/도감/상세, 실제 백엔드/DB/디자인 시스템 수정 금지.
- 실제 Gate 2F의 `src/dev/layeredCrystal/`과 F2 렌더 구조·glyph cache/atlas/occlusion 방식을 **로컬에서 직접 읽은 뒤** 새 `src/dev/foregroundTextRotation/` adapter/renderer로 분리. 원격에는 해당 실험 코드가 없을 수 있음.
- 성능: DPR1·2, 375×812, GPU 없는 headless Chromium, 단독 R0/R1/R2/R3 각 10초×3회 중앙값, CPU1×, 4× 참고; visible/moving glyphs, draw calls, drawImage, FPS median, p95/p99, CPU load, 한 프레임의 화면에서 흰색으로 선명한 glyph 수, 눈꽃 IoU. **4안 나란히 렌더한 갤러리 FPS는 단일 작품 FPS 아님**. 동영상 오프라인 프레임 합성은 실시간 FPS 아님.
- Gate 2F F2 M4가 375px DPR2 CPU1× 29.7fps 보고였음. **30fps는 연구 최저 목표, 실기기 승인 아님**. R2/R3가 미달하면 숫자를 그대로 보고. 모바일 WebView 실기기 미검증 상태 고지.
- 새 회전으로 400개 이상 glyph를 매 프레임 개별 다시 그리면서 무조건 FPS가 떨어진다면 caching/changed-region/occlusion-aware reuse 연구. 정적인 색 오버레이로 대체해 성능을 속이지 말 것.
- reduced-motion, 정지 스냅샷, 도감 타일에서는 애니메이션 루프 중단. 글자의 원문 전체는 별도 기록 목록/상세에서 항상 접근 가능.
- 기존 `glyphLayout.ts:193` 타입 오류/Windows `check:syntax` 오류는 현재 baseline과 구분 보고, 임의 수정 금지.

## 6. 출력 파일과 자동 테스트

새 `artifacts/foreground-text-rotation-review/`만 생성. 이전 artifacts 폴더·동영상 덮어쓰기 절대 금지.

필수 출력:
1. `01_R0_R1_R2_arm_static.png` — 한 줄기 확대, 같은 시각 3안.
2. `02_R2_front_back_exchange_timeline.png` — t0,T/4,T/2,3T/4,T의 같은 구절 A/B 전면 역할 교대.
3. `03_R2_depth_and_front_ids.png` — 디버그: 최소 2개 strand의 z/frontScore/frontPhraseID/occlusion.
4. `04_R0_R1_R2_R3_full_snowflake.png` — 375px 정지/동작 프레임 전체 형상.
5. `05_160px_silhouette_and_front_coverage.png`.
6. `06_growth_same_day_regression.png` — 0/1/3/5/8/15일 + same-day.
7. `07_zoomed_exchange.mp4` — **최소 한 회전 전 기간**(예: 20~24초) 확대 줄기 확대 R0~R3 비교 영상.
8. `08_full_snowflake_R2_R3.mp4` — 두 시안 같은 시계의 20초 이상 영상. 오프라인 합성임을 표시.
9. `09_reduced_motion.png`, `metrics.json`, `performance.json`, `README.md`.
10. 영상 캡처를 위해 새로운 fixture를 만들 경우 **이미 프로젝트에 있는 공개 가상 일기 데이터**를 사용하고, 사용자 레퍼런스 영상/실제 일기 원문 사용 금지.

테스트(로직 + Playwright 브라우저):
- R0 기준 프레임 재현, R1 대표 glyph projected xyz 변화, R2 앞면 `frontPhraseId`가 시간에 따라 **다른 실제 strand ID로 바뀌는지** 검증.
- R2에서 각 strand의 z(t)/visible score가 실제 바뀌고 단순 opacity role swap이 아님. 앞쪽 glyph의 실제 z-occlusion이 뒷글자를 가리며 reversed glyph/half glyph/미래 경계 노출 0.
- Anchor slot ID·source glyph 출처·일기 원문 연속성·같은 날짜 진행 높이·삭제/수정 시 다른 일기 위치 안정성·결정성/seed/reduced-motion 유지.
- 일부러 전면 고정 텍스트를 남겼을 때 **검증이 실패하도록 negative test** 포함. 렌더 영상만 보고 '교대함' 판정하지 않음.
- F2 기본 정지 상태와 R2 정지 상태의 375px·160px 6갈래 구조 인지 가능, 전면 비는 구간/교차시에 갑작스러운 깜빡임·고스트/동일 글자 복제/글자 손실 보고.
- R2가 기술적으로 교대하더라도 **시각적 정교함·밝은 앞면 독해·실루엣 유지 여부는 사용자 승인 전 미확정**.

## 7. 실행 순서 및 협업

**2G-0:** 로컬 `git status --short`, Gate 2F 소스/테스트/README/영상/metrics 현재 상태, baseline, 기존 산출물 보호. `git fetch origin feat/design-system-prototype` 및 `git show origin/feat/design-system-prototype:docs/spec/26_Gate2G_Foreground_Text_Rotation_Study_v1.0.md`로 문서 읽기. git pull/checkout/reset/restore/clean 금지.

**2G-1:** R0 비교 기준·R1 전면 대표 실제 pose 이동(영상과 z변화 실측). 핵심 단계.
**2G-2:** R2 2~3층 전면 역할 교대, 앞쪽 흰 문장 ID 교체, 정확한 가림. R1/R2 실패 시 R3 반짝임부터 추가하지 말 것.
**2G-3:** 전체 F2 눈꽃에 R2를 조화롭게 확장, 여섯 갈래 coverage와 도감 160px 검증.
**2G-4:** R3 부유/echo 이동/반짝임 복원, 동일 기하+시계 비교, full cycle video, performance profiling.
**2G-5:** 기존 모든 회귀 테스트와 새 negative test, 사용자용 한국어 보고, 시각 승인 대기.

최종 승인·실서비스 통합·색·폰트·12월 목표일·R2/R3 채택 **모두 미결정**. Claude Code는 커밋/push/PR 하지 않음. 모든 사용자 대상 설명/진행 보고 한국어.

**완료 기준:** 사용자가 확대 영상에서 **한때 밝은 앞면에 있던 실제 원문 A가 뒤로 움직이며 어두워지고, 실제 다른 원문 B가 앞에 나타나 흰색으로 선명해지는 전면 구절 교대**를 분명히 확인할 수 있는 상태. 테스트 PASS/FPS만으로 미감 승인 주장 금지.
