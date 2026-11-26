# Gate 3C — Snowflake Completion Moment Study v1.0
> 2026-11-25 · EunseongOH/praise-diary · `feat/design-system-prototype`
>
> **[사용자 승인: 연구 방향]** Gate 3B의 **R3(중심→바깥 R2 구조 + 초기 Echo 보강)**을 잠정 성장 기준으로 두고, 정규 15일 기준 마지막 달성 순간에 별도의 축하/완성 연출이 필요한지 실험한다. 사용자는 단순히 14→15일 구조 차이만으로는 충분한 보상감이 없다고 피드백했고, **실제 일기 글자가 배경에서 흩날리는 효과**를 포함한 여러 대안을 요청·비교 승인했다.
>
> **[실험 제안: 미승인]** C0~C3 구체 연출, 4~5초 타임라인, 글자 수/속도/색, 문구, 효과 재생 정책과 저장 형태, 15일 이후 동작.
>
> **[보류]** C1·C2·C3 중 최종 채택, 정확한 글자 수·강도·애니메이션 지속시간, 제품 UI/DB/운영 적용, 2026년 12월 특별 목표일 수.
>
> 선행 원칙: `AGENTS.md`, `docs/spec/12_날짜설정_기록접근_특별목표_정책.md`, `docs/decisions/25_Living_Typography_Sculpture_조형_방향합의_v1.0.md`, `docs/decisions/27_12월_눈꽃_겨울빛_다색반짝임_월별테마확장_방향합의_v1.0.md`, `docs/spec/28_Gate2I_H3_Visual_Refinement_Performance_Study_v1.0.md`, `docs/spec/29_Gate3A_Snowflake_Daily_Growth_Structure_Study_v1.0.md`.

## 0. 버전 명칭을 구분할 것

- **Gate 3B R3** = *중심에서 바깥으로 자라는 조형 성장 방식 R2 + 초기 Echo 보강*. 현재 사용자가 이 방식의 형태를 선호한다. **R3 최종 확정/임시 echo identity 결함 해결 완료를 의미하지 않음**.
- **Gate 2G R2** = *원문 glyph strand의 실제 20초 2.5D 전면/후면 교대* (Gate3B R2와 다른 이름 공간).
- **Gate 2I I3** = *완성 눈꽃의 검은 후광 없음 + 중앙 일부 glyph의 실제 3D 모션*.
- **Gate 2H H3** = *차가운 서리빛 + 드문 옅은 파스텔 파티클*. 기본 15일 fixture에서 총 50개 중 pastel 6개로 보고되었으나 fixture에 따라 다른 기존 값은 그대로 유지.
- **Gate 3C C0~C3** = *14→15일 목표 달성 순간에만 나타나는 일시적 축하 연출*. 평상시 I3의 20초 회전·코어·빛·기존 파티클을 수정하지 않는다.

## 1. 사용자 문제와 성공 기준

- 이전 Gate 3B 보고에서 중심→바깥으로 자라는 1~15일 조형은 구조적 성장·연결성을 통과했고, 마지막 날 기존 I3와 픽셀 동일함. 그러나 14일과 15일이 미관상 크게 달라 보이지 않을 수 있다.
- 사용자는 마지막 목표 달성 순간 **강하지만 눈꽃을 해치지 않는 보상감**을 원한다.
- 이번 Gate에서 **새로운 일상/완성 조형을 만들지 않는다**. 14일 R3 성장 상태 → 새 실제 날짜 일기 저장 → 15일 완성 I3 → 단 한 번의 축하 순간 → 원래 완성 눈꽃으로 복귀를 재생한다.
- 축하 이벤트가 끝난 다음 각 renderer/fixture/art-clock t에서 **기존 Gate 2I I3 또는 Gate 3B R3의 day15 출력과 완전 동일**해야 한다. 일시적 조명·글자 복제 등 효과가 영구적으로 누적되어서는 안 됨.
- 눈꽃의 형태/가독성보다 미감 우선, 그러나 기존 글자 front/back 실제 회전/가림을 단순 alpha crossfade로 대체하지 않음. 별도 완성 효과의 alpha 변화는 허용하되 코어/팔 본체의 2.5D 회전을 덮어쓰지 않음.

## 2. 비교 조건 및 시안

C0/C1/C2/C3는 다음 공통 조건을 가진다:
- 같은 `R3(3B) growth`의 **14→15일 prefix data** 및 동일 seed, background `#0C1111` 기준, 폰트, 작품 크기(375px), 좌표, art clock, 카메라, 기존 H3 조명·파티클.
- **t=0에서 목표 달성 이벤트가 발생한 것이 아니라**, dev timeline에서 `eventTime=0`에 15번째 *서로 다른 entryDate* 일기 저장이 성공했다고 가정한다. 바로 이전 프레임에서는 14개 날짜/14일 눈꽃, 이후 새 실제 기록이 있는 15일 조형으로 전환한다. 15일차 기록 원문을 저장 이전 프레임에 쓰면 오류.
- 15일 최종 상태의 실제 일기 glyph와 효과용 glyph(순수 렌더 인스턴스)를 구분해 source ledger가 증가하지 않도록 한다.
- 효과별 비교는 **일반적인 14→15 성장 transition 시간**을 동일하게 두고, 추가 축하 레이어만 다르게 한다.

| ID | 연구 시안 | 연출 포인트 | 제외 |
|---|---|---|---|
| C0 | Normal completion baseline | 기존 R3 성장 상태의 14→15일 단순 전환 (효과 없음) | 별도 이벤트 효과 |
| C1 | Praise Letterfall | 완성된 눈꽃 **주변/배경**에 실제 기록 출처 글자가 드물게 흩날림 | 색종이 폭죽, 일반 눈꽃 SVG, 전체 커튼처럼 쏟아지는 글자 |
| C2 | Final Crystal Bloom | 마지막 글자가 합류하면 중앙→여섯 팔의 **기존 glyph 밝기/차가운 빛**에 일시적인 전파 | 영구 글로우, 전체 화면 flash, 눈꽃 전체 크기 펄스 |
| C3 | Bloom + Letterfall | C2의 짧은 결정 개화 후 C1의 느린 글자 흩날림 일부 겹침 | 단순히 C1+C2의 세기를 두 배로 올림 |

C4 글자 궤도는 **이번 기본 구현 범위에서 제외**. 추후 사용자가 별도 요청하면 연구 가능. **C3를 추천 후보로 두되 사용자 직접 영상 검수 이전에 최종 선정 금지**.

## 3. 연출 타임라인 [연구용 숫자]

동일 baseline 전환 + 효과별 독립 clock:
- `-0.8~0s`: 14일 R3 완성 직전 상태(기존 day14 원문만) 보여주기.
- `0~0.9s`: 15번째 일기 저장 직후, 실제 15일차 glyph/motif가 조형에 합류. C0~C3 같은 기본 성장 전환; 새 growth animation 자체는 추후 Gate 3D에서 다시 다듬을 수 있으니 이번에는 **과한 새 성장 엔진 개발 없이** 비교를 위해 동일한 단계형/간단한 reveal 사용.
- `0.8~1.8s`: C2/C3에서 중앙→팔→끝을 따라 glyph brightness/soft ice-light의 국소 전파. 코어 전체에 검은 윤곽·판형 광선·원형 링 추가 금지.
- `1.3~3.9s`: C1/C3에서 실제 원문 기반 background letterfall; 문자 고유 드리프트/작은 회전/깊이/소멸, 천천히 아래/옆으로. 다수가 동시에 밝게 보이지 않음.
- `3.9~5.0s`: 새 이펙트만 fade out→해제. **5.0s 이후 모든 오버레이 픽셀/이벤트 RAF/리스너/서브스트립션 제거**, day15 I3의 동일 art-clock 시각 결과로 정확히 귀환.

위 초 단위는 각 시안에 동일한 timeline을 적용하기 위한 초깃값. C1, C2는 필요한 phase만 활성화. developer 컨트롤로 3.5/5/6.5초 전체 length, 0.75/1/1.25 light intensity, motionRate 등을 비교하고 사용자 승인까지 고정 정책 아님.

## 4. 원문 기반 글자 눈보라 Letterfall

**원문 출처/프라이버시 원칙:**
- 입력은 이미 저장된 현재 월 공개 가능한 `DiaryEntry`만, `entryId` + `sourceStart/sourceEnd` + `graphemeOffset` + `copyIndex`를 유지. 공백만/구두점만 있는 경우 시각적 대체 텍스트를 생성하지 말고 해당 효과 glyph 수를 줄인다.
- 새 문장/상투적인 축하 글귀/가공된 원문 금지. 효과용 glyph는 기존 실제 diary의 **렌더 전용 시각 복제 인스턴스**, 기록 원본/일자 수/anchor-slot/echo ledger에 중복 가산 금지.
- **미래 일기의 원문(15일 달성 저장 이전 또는 targetDays+1 미래 기록)** 선노출 금지.
- 로컬 테스트/기록은 공개 가능한 가상 fixture만 사용. 사용자 실제 diary body는 캡처·JSON/CSV/로그·analytics·GitHub에 넣지 않는다. 디버그 표에는 entryId/sourceOffset 등 가상 fixture identifier만 노출.
- 전체 이벤트를 통해 생성된 glyph 목표 연구 범위 12~18 low / 24~32 medium / 40~55 high(선택), **동시 가시 개수는 별도 4~10 glyph 수준의 초기 상한**으로 조절. 15일 기본 추천 medium이더라도 실제 원문/컨텐츠 부재 시 줄일 것. 수치 미확정.
- 배경으로 흩날린다는 인상: 눈꽃의 주요 여섯 팔/중심 ROI를 지나치게 가리지 않음. **눈꽃을 둘러싼 여백/back layer를 우선** 배치하되 물리적인 front/back 느낌은 부드러운 alpha/scale/parallax로 차별화. 얇은 글자·한글 획의 저해상도 뭉침 주의.
- 일부 char가 짧은 구절로 묶일 수 있으나 글자/구절 절단이 원문에 없는 문장 조합처럼 보이지 않아야 함. 단순 랜덤 Unicode 추출 금지.
- 움직임: 시간기반 **결정적 seed**로 stagger된 spawn, 아주 작은 2.5D tilt, lateral drift, slower fall, depth/brightness attenuation, fade. **매 프레임 Math.random 금지**; seek/replay 해도 같은 프레임.
- color: 차가운 흰색/아이스 블루/실버 우선, 소량의 옅은 파스텔 (기존 H3 팔레트 참고), 장식의 밝기가 본체 white glyph보다 강하지 않게. 기존 H3의 일반 파티클 50/6 fixture 값 **변경 금지**, 새 완성 효과 글자 수는 별도 카운트로 기록.

## 5. Final Crystal Bloom

- 중심 코어→여섯 팔/가지/끝부분을 따라 **이미 존재하는 실제 glyph**에만 일시적 차가운 빛이 지나가도록 렌더 단계에서 overlay/additive 또는 tint 제어. 원본 I3의 glyph z-order, 전후 교대, 좌표, alpha를 영구 변경하거나 원문 글자 수 증가 금지.
- glow는 문자 획과 해당 구조를 따라 퍼지도록. 원형 에너지 링, 눈꽃 외곽 전체 라인, 흰색 점멸 화면, 네온색, 거대한 파스텔 장식은 불허.
- 강도 연구값 0.5/1/1.5, wave duration/path/pulse count. 눈꽃이 너무 밝아져 중심/팔 구조가 날아가면 실패. C3는 C2보다 항상 밝아서는 안 됨.
- 기존 글자 3D clock은 effect clock과 분리. 완성 순간에도 서서히 R2 20초 회전과 코어 움직임이 이어져야 함(오버레이가 밀거나 가짜 crossfade로 덮으면 실패).
- "빛 파동"은 원본 glyph를 샘플링해 만든 시각 레이어이므로 새 일기 글자/새 기록으로 집계하지 않는다.

## 6. 완료 트리거/재생 상태 (dev-only 구현)

- 일반적인 제품 의미: `monthId` + `targetDays` + `countDistinct(entryDate)` + `priorCompletionSeen/earned`. **`targetDays=15`는 정규 스터디 fixture에만 사용**, 2026-12 특별 목표는 미정이고 DB/client에 하드코딩 금지.
- 이번 연구 페이지는 `before U=targetDays-1`, `after U=targetDays` save-confirmed 이벤트를 명시적으로 시뮬레이션. 다른 날짜가 아니라 *같은 날 추가*로 총 기록 편수가 15가 되는 경우에는 트리거되지 않음.
- dev-only test cases: 첫 달성, 재방문, 본문 수정, 같은 날 추가, 날짜 삭제로 미달→재달성, 과거 날짜 backfill 달성, 되돌리기, replay 수동 요청, 설정 targetDays=10/15/20 프리뷰. **월간 목표일 값과 성장 visual의 대응/특별 목표 적응 자체는 별도 연구 범위**; 10/20으로 자동 "I3가 완성"이라고 거짓 표현하지 않도록 관련 제약을 표기.
- 연구 기본 동작 제안: **최초 달성 자동 1회, 이후 재방문은 재생 안 함**. 감소/재달성 시 자동 재생 여부 및 수동 replay는 별도 UX 검수 대기. 이번 Gate는 개발 페이지에서 시뮬레이션 상태를 초기화·수동 replay 가능하게만 만들고 실제 DB, localStorage 영속, 제품 이벤트/분석 도입 금지.
- 별도 앱 전체 UI 카피/배지/메달/폭죽 버튼을 만들지 않음. 완료 문구는 연구용 자막으로만 `예: 15일의 칭찬이 하나의 눈꽃이 되었어요.`를 선택 표시할 수 있으나 제품 문구 확정은 보류.

## 7. 반응형, reduced motion, 수명 및 성능

- full-bleed page canvas, 별도 카드 배경 만들지 말 것. 375×812, 320·430px, tile 160px에서도 기하적 범위를 침범하지 않음. 160px 타일은 기본적으로 **정적 완성 작품**, 복잡한 letterfall은 도감 썸네일에 상시 자동 실행하지 않음. 3.2× 상세에서 글자 중첩/저화질 확인.
- `prefers-reduced-motion: reduce`/dev flag: bloom/letterfall의 반복 이동 제거, **정적 day15 완성 눈꽃**과 필요하면 별도 접근 가능한 완료 텍스트. 영상/캔버스 자체가 완료 여부의 유일한 전달 수단이면 실패.
- 페이지 나가기, 네비게이션, unmount, animation end, replay interruption 이후 effect-only canvas/RAF/observer/listeners/timeouts 정리. 끝나고 메모리/오버레이가 계속 살아 있으면 실패.
- 실제 완료 순간 5초 동안 `Gate3B R3 growth+Gate2I I3 optimized`의 fps와 C0/C1/C2/C3의 단일 작품 fps를 동일 환경(375 DPR1/1.5/2 CPU1× 10s×3회 및 5s 이벤트 구간 p95 frame, drawCalls, effect glyph count, allocations)에서 비교. 기존 사용자 보고 수치 60fps/45fps는 상이 조건이므로 **동일 실행 기준으로만** 비교.
- GPU 없는 headless Chrome vs 실제 기기/앱인토스 WebView 구분. 실제 WebView는 미검증.

## 8. 새 개발 전용 route / 모듈 / 산출물

`/__dev/snowflake-completion-study`

전용 모듈 예시:
- `src/dev/snowflakeCompletion/{types.ts,timeline.ts,letterfall.ts,bloom.ts,CompletionCanvas.tsx,metrics.ts}`
- `src/dev/SnowflakeCompletionStudyPage.tsx`
- `tests/e2e/snowflakeCompletion.{logic,spec,capture,perf}.ts` 또는 기존 테스트 규칙에 맞는 파일명.
- 기존 Gate 3B에서 만든 `src/dev/snowflakeRadialGrowth/`와 Gate2I의 `src/dev/h3Refinement/`를 직접 확인해 **import/reuse**, 실사용 인터페이스 추측 금지.

개발 컨트롤: C0/C1/C2/C3, side-by-side/solo, 14→15 trigger 버튼, timeline seek/speed/pause/play, 0.0→5.0s frame scrubbing, letter density low/medium/high, bloom strength, mobile 320/375/430, tile 160, datasets base/short/ultrashort/long/mixed, scenes full/arm/core, reducedMotion, background dark/other, debug effect glyph source/z/active count/overdraw, art clock t 고정/흐름, mock completionSeen, replay manually, goal 10/15/20 (연구용), FPS/frametime monitor. 동일 데이터/시간축 비교: 4개 작품 동시 렌더 FPS와 단일 작품 FPS를 혼동하지 않음.

신규 폴더 `artifacts/snowflake-completion-review/`, 기존 산출물 덮어쓰기 금지:
1. `01_C0_C1_C2_C3_storyboard.png` — 공통 14→15 transition 및 0/0.9/1.7/3/5sec 구간 4종.
2. `02_C0_C1_C2_C3_side_by_side.mp4` — 같은 시간축 6~8sec 이상, **오프라인 합성이라면 실시간 FPS 측정과 분리**.
3. `03_letterfall_density_low_mid_high.png`.
4. `04_bloom_intensity_and_wave.png`.
5. `05_combined_C3_full_motion.mp4`.
6. `06_160_375px_mobile_comparison.png`.
7. `07_effect_source_and_z_debug.png`.
8. `08_end_state_I3_pixel_parity.png` — event end, 5.1s 이후 same I3 t/fixture/renderer pixel difference 0 목표; re-enter/replay test.
9. `09_reduced_motion_and_completion_state.png`.
10. `10_performance.json`, `metrics.json`, `README.md`.
11. `11_completion_lifecycle_test_matrix.png`는 여력이 있으면.

PNG/MP4가 생성 못 되었다면 생략을 숨기지 말고 정확한 실패 원인/대안 기록. 사용자 실제 일기 문장은 절대 산출물로 복사하지 않음.

## 9. 자동 테스트

- C0~C3 같은 14일 fixture/source IDs → 15일 fixture/source IDs를 동일한 save event에서 시작. before t<0에서 15일 source leakage 0.
- C0는 기존 R3 14→15 기본 전환과 동일; C1은 letterfall만; C2는 bloom만; C3는 시간차 결합, 각각 효과 on/off 독립.
- 3B R3 / 2I I3 글자수, strand source, 3D front/back, core motion, H3 ordinary particles and seed unchanged. 위조한 새 diary text/anchor 슬롯/새 날짜 금지.
- 같은 입력, 시각·seed에서 animation frame pixel-deterministic; seek/replay/가로 resize·date change에서 정확한 리셋.
- **last event after fade**: effect glyph count=0, overlay alpha=0, effect animation loop/DOM nodes/observers cleanup, return screenshot pixel-identical to same I3 at same art clock; reduced-motion route also I3 parity after settle.
- source glyphs are rendering-only clones with source metadata; empty/punctuation-only entries -> false text or decorative filler 0; character capacity low/medium/high reference; R3 initial echoes unrelated to completion graphic never re-assigned by effect.
- completion trigger U unique days only. Same day +2, edit, reload, partial delete, targetDays-1→targetDays, backfill, targetDays-1 after delete/reachieved again, replay test. No double autoplay due StrictMode or rerender.
- 320/375/430px, tile160, DPR1/2, reduced motion, color/alternate background/transparent if supported.
- no performance cheating by turning off ordinary I3 motion/H3 light while effect plays.
- previous Gate 2A~2I, 3A/3B regression; existing `glyphLayout.ts:193` TS errors, Windows `check:syntax` path failure track separately.

## 10. Worktree protection / acceptance

- 로컬 `C:\Users\User\diary\praise-diary`에는 Gate 2A~3B 미커밋 source, capture, fixtures가 있을 수 있다. **먼저 `git status --short`/해시 스냅샷**, tracked/untracked 전부 보호.
- **`git pull` / `checkout` / `reset` / `restore` / `clean` 금지**; 원격 문서는 `git fetch origin feat/design-system-prototype` + `git show`로 읽는다.
- 기존 experiment source/output/tests, `GraphicArtwork`, 홈/도감/작성/스타일/백엔드/analytics 수정 금지. 새 `src/dev/snowflakeCompletion/`, 새 tests/artifacts만. 새 dev route 등록 목적의 `src/main.tsx`, `playwright.config.ts`, `package.json`은 **기존 내용 보존하면서 최소 추가 가능**.
- GitHub의 이번 spec/prompt 문서 커밋과 별개로 **로컬 코드 커밋/push/PR 금지**. 실서비스 번들에서 연구 코드 제외 확인. 기존 사용자 레퍼런스 사진/영상/링크/프레임은 어떤 형태로도 저장/업로드하지 말 것.
- **완료 기준은 C0~C3 영상·정지 비교가 실재하고, 종료 후 I3 완전 귀환, source/trigger 성질, 실제 성능 비용이 객관적으로 비교 가능한 것.** 사용자 직접 미감 검수 전 C3 최종 확정 금지.
