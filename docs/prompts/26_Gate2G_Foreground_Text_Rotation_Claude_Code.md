# Claude Code 실행 프롬프트 — Gate 2G Foreground Text Rotation Study

**모든 사용자용 진행 상황·질문·테스트 및 최종 보고는 반드시 한국어로 작성.**

## 우선 목표 — 흰 글자 자체가 앞뒤로 돌아야 한다

이번 Gate의 핵심은 Gate 2F에서 **흰색으로 선명하게 읽히는 대표 구절이 정지**한 채 회색 보조 밴드만 움직였던 문제를 해결하는 것이다.

사용자는 **앞에 있는 흰색 문장의 '약', '속' 같은 각 낱글자도 3D 공간에서 실제로 위치가 바뀌며 회전**하길 원한다. 그 문장이 뒤로 돌아갈 때는 흐려지거나 일부 숨고, 원래 뒤에 흐리게 있던 **다른 실제 일기 구절**이 앞으로 나와 **선명한 흰색의 전면 문장 역할**을 이어받아야 한다.

**반드시 실제 세계좌표/깊이/투영·가림이 움직여야 한다.** 두 정지 2D 문장의 색/투명도만 교대하는 구현은 실패다.

눈꽃의 기본 F2 형태·여섯 갈래·중앙 코어·가지·반복 출처·실제 작성일 기준 아래→위 성장·동일 날짜 성장 높이 불변은 유지. 새로운 '나선 조립형 눈꽃'을 만드는 작업이 아님.

## 0. 작업 시작 전 보호

루트: `C:\Users\User\diary\praise-diary`

1. `git status --short`로 **미커밋·untracked** 상태 확인·기록. 이전 연구의 실제 로컬 소스와 캡처가 GitHub에 업로드되지 않았으므로 전부 보존해.
2. **`git pull`, `git reset`, `git restore`, `git clean`, `git checkout` 금지.** 커밋/push/PR도 하지 마.
3. `git fetch origin feat/design-system-prototype` 후 아래 두 파일을 `git show`로 읽어:
   - `docs/spec/26_Gate2G_Foreground_Text_Rotation_Study_v1.0.md` (**최우선 상세 명세**)
   - `docs/prompts/26_Gate2G_Foreground_Text_Rotation_Claude_Code.md` (현재 지침의 원격 보존본)
4. `AGENTS.md`, `docs/decisions/25_Living_Typography_Sculpture_조형_방향합의_v1.0.md`, `docs/spec/23_Adaptive_Snowflake_Density_Gate2C_v1.6.md`, `docs/spec/24_Gate2D_Sculptural_Snowflake_Study_v1.7.md`도 읽어.
5. 로컬 `src/dev/layeredCrystal`, `src/dev/livingTypography`, `src/dev/sculpturalSnowflake`의 실제 구현과 `artifacts/layered-crystal-motion-review/README.md`, `metrics.json`, `performance.json`을 먼저 열어. 기존 프로젝트 폴더/테스트의 API를 **추측하지 마**.

## 1. Gate 2G 비교 시안

**R0(기준):** 기존 Gate 2F F2/M1 또는 M4. 대표 흰색 구절은 정지하고 뒤의 보조만 움직임. 기존 소스·산출물 수정 금지.

**R1:** 대표 구절까지 실제로 로컬 3D 축 주위를 움직여 앞(z+)→옆→뒤(z-)→앞에 돌아오게 한다. `entryId`, `anchorSlotId`, 원문 glyph 순서는 고정; `projectedPose(t)`만 이동. 한 문장을 구성하는 글자들은 끊기지 않는 연속 strand로 돌아야 한다.

**R2(가장 중요):** 같은 줄기/가지에 서로 다른 출처 추적 가능한 원문 구절 층 2~3개가, 다른 위상으로 회전하며 전면 역할을 교대한다. 전면에 있는 실제 글자층만 밝고 선명하고, 뒷면의 실제 글자층은 어둡거나 부분적으로 가려져 보여야 한다. 시간이 흐르면 **전면 strand ID와 읽히는 원문 구절이 A→B로 실제로 바뀐다.** 정지 대표 흰색 글자 위에 보조 레이어만 덮거나 alpha만 스왑하면 실패.

**R3:** R2의 물리적 회전·교대 성공 후 기존 부유/echo 이동/M4의 절제된 반짝임 일부를 복원. 반짝임으로 교대가 되는 것처럼 보이게 하면 안 된다.

R2의 실제 교대가 성공하지 않았다면 R3 화려함 추가를 잠시 중단하고 실패 원인·중간 결과를 보고해.

## 2. 필수 기하·가림 제약

- **Anchor identity와 pose를 분리**: `baseSlot` 안정, `worldPose(glyph, t)` 시간 가변.
- 구절은 단어 순서/원문 grapheme 인덱스를 보존. 글자가 각각 무작위로 흔들리거나 새로운 문장을 만들지 않음.
- 공간적으로 각 strand의 회전각, 깊이, 카메라 거리/원근, facing과 glyph 투영 bbox를 함께 바꿀 것.
- 앞 글자가 뒤 글자를 실제로 가리되, 뒤 글자가 **앞으로 올수록 흐림→선명한 흰색**으로 변하는 연속성이 존재할 것. 흐린 뒷면은 고스트처럼 앞 글자를 관통하지 않아야 하며, 글자가 거울처럼 좌우 반전되어 읽히지 않아야 한다.
- 전면색 여부는 `role=anchor`/ `role=echo`가 아니라 **실시간 깊이·앞면 상태**를 따라 결정. echo가 전면에 오면 흰색 가능, anchor가 뒤로 물러나면 회색 가능.
- 문장이 실제로 앞면에서 사라질 때 다른 문장이 전면을 채워 **줄기가 일시적으로 텅 비지 않게** phase/가시율을 실험.
- 숫자는 예비 비교: period=16/20/24s, 층 2 또는 3개, 밝기/희미함 완만한 곡선. 수치는 디자인 미승인.
- 여섯 팔은 서로 다른 phase; 전체 눈꽃/카메라를 통째로 돌리는 구현 금지.

## 3. 작업 순서

**2G-0: 기준선.** F2 확대 영상과 정지 시점, baseline 글자 수, 누가 앞면으로 밝게 나오는지 측정. 원본 결과물 보호.

**2G-1: 한 팔 확대 R1.** 같은 fixture의 한 줄기에서 대표 구절 각 글자의 `xyz(t)`, 투영 위치, 밝기, 가림을 분석·시각화. t=0·T/4·T/2·3T/4·T에서 실제 전면→후면→전면이 드러나게.

**2G-2: R2 본 실험.** 2~3개의 실제 원문 구절 strand가 전면 역할을 교대하도록 3D 위상/가림 설계. 한 문장 A가 밝던 t0에서 다른 문장 B가 밝은 tX로 진행되는 모습을 같은 위치/카메라 연속 영상과 측정 JSON으로 입증. 테스트가 "고정 흰 글자" 구현에 실패하도록 부정 테스트 포함.

**2G-3: 눈꽃 전체로 확장.** F2의 전체 눈꽃과 중심부·가지 중 일부에도 전면 identity 전환 적용. 375px·160px에서 기본 형태 유지, 교대 시 일시적 휑함/글자 뭉침 기록. 모든 팔이 동시 교대하지 않도록.

**2G-4: R3.** R2가 검증되면 일부 echo 부유·이동과 반짝임을 복원. R2와 geometry/time을 동일하게 두어 shimmer 등 모션 추가 효과를 구분.

**2G-5: 기능·성능·회귀.** 0/1/3/5/8/15일, 같은 날 +2, 본문 수정/삭제·어제 추가, 저사양·reduced-motion 검증. 첫날 씨앗 문제는 이 Gate에서 승인 없이 성장곡선을 변경하지 말 것.

## 4. 개발 페이지

새 개발 전용 페이지: `/__dev/foreground-text-rotation-study`

개발 패널: R0/R1/R2/R3, cropped arm/full snowflake, fixed t/angle, period=16/20/24, layer count=2/3, dataset=base/short/ultrashort/long/mixed, days=0/1/3/5/8/15, extra=0/2, zoom=1/2/3.2, auto play/pause, compare view, reduced motion, debug off/on, depth/strand IDs/occlusion/brightness chart.

URL로 같은 시점과 구절 데이터 재현 가능하게. 크롭은 F2 엔진의 **실제 glyph 렌더 출력**을 사용하되 원본 Gate2F artifacts를 수정·덮지 마.

## 5. 결과물 (새 폴더만)

`artifacts/foreground-text-rotation-review/`

1. `01_R0_R1_R2_arm_static.png`
2. `02_R2_front_back_exchange_timeline.png`
3. `03_R2_depth_and_front_ids.png`
4. `04_R0_R1_R2_R3_full_snowflake.png`
5. `05_160px_silhouette_and_front_coverage.png`
6. `06_growth_same_day_regression.png`
7. `07_zoomed_exchange.mp4` — R0~R3 비교, **최소 1회전 전체 시간** 포함. 정지 대표 구절이 실제로 뒤로 물러나는 장면을 충분히 보여줄 것.
8. `08_full_snowflake_R2_R3.mp4` — 동일 시간축, 최소 20초. 최소 두 구절의 앞뒤 교대를 시각적으로 확인 가능하게.
9. `09_reduced_motion.png`
10. `metrics.json`, `performance.json`, `README.md`.

**MP4가 오프라인 고정 시각 프레임 합성이면 실시간 브라우저 FPS가 아님을 명시**. 영상의 매끄러움과 실제 성능은 별도 평가.

## 6. 정확한 검증과 성능

- 로직·브라우저 테스트에 `frontStrandId`의 시간별 변경, 실제 `z(t)` 전환, 실제 투영 글자 bbox 변화, 깊이 가림, 연속 구절 원문 순서, 다른 일기 anchorSlot 이동 0, 중복 텍스트 기록 집계 0, 출처 추적, 성장 경계·같은 날 높이 불변 검증 포함.
- 부정 테스트: **정적인 흰색 대표 글자를 계속 그리거나 두 동일 위치 레이어를 opacity만 교대하면 테스트가 실패**하도록 설계.
- t=0,T/4,T/2,3T/4,T 및 교차점 주변에 프레임 점검. "앞면이 바뀌었다"의 인과근거를 디버그 depth/strand provenance로 보고.
- 375×812, DPR1·2, CPU1×, CPU4× 참고, 단일 R0~R3 작품 각각 10초×3회: FPS median, p95/p99, 화면에 실제 그려진/전면 흰 글자 수, draw calls, memory 가능 시, silhouette IoU, source coverage. **4안 갤러리 FPS를 제품 단일 FPS라고 보고하지 말 것.**
- Gate2F F2/M4 약 29.7fps(DPR2 CPU1×) 보고가 있으니 30fps 경계가 낮다는 사실을 고려. 실험 미달은 미달로 보고하고, GPU 없는 headless 결과를 실제 앱인토스 WebView 성능처럼 표현하지 마.
- RAF가 필요 없는 R0 정지/도감/reduced-motion은 루프 중단.
- 기존 `glyphLayout.ts:193` 타입 오류와 `check:syntax` Windows 경로 오류가 현재도 재현되는지 확인하되, 관련 없는 소스 파일 임의 수정 금지.

## 7. 보호·금지사항

- **실서비스 `GraphicArtwork`, 홈/작성/도감/상세 및 디자인 시스템 수정 금지.**
- **기존 Gate2A~2F 소스/테스트/동영상/캡처 원본 변경·덮어쓰기·삭제 금지.**
- 새 소스는 `src/dev/foregroundTextRotation/` 및 새 연구 페이지에만. 기존 `src/main.tsx`, `playwright.config.ts`, `package.json` 변경은 개발 경로·스크립트 추가 범위 내.
- **사용자가 제공한 레퍼런스 이미지/영상은 GitHub·프로젝트 폴더·산출물에 넣지 마.** 원본 영상의 실제 글자를 테스트용 fixture로 복사하지 마. 기존 프로젝트의 공개 **가상** diary fixture만 사용.
- 원문에 없는 글자/가짜 후면 그림자/무의미한 별 파티클/과한 glow/문장 바꿔치기 금지.
- R2/R3 최종 채택, 회전 속도·층 수·불투명도·색·폰트·2026-12 목표 일수 확정 금지.
- **커밋·push·PR 금지.** 로컬 미커밋 파일 보호.
- 브라우저 Playwright MCP가 없으면 Playwright Test로 검수하고 이유 보고.

## 8. 최종 한국어 보고 형식

1. 핵심 성공/실패 한 줄 요약
2. 보호 확인과 실제 생성/수정 파일
3. 개발 페이지 URL 및 재현 쿼리
4. R0/R1/R2/R3 각각 **선명한 앞면 문장 자체의 화면 위치 변화** 여부
5. 두 실제 원문 구절 사이의 t별 전면 역할 교대 로그/깊이·가림 증거
6. 한 줄기 확대와 전체 6갈래 미감/160px 결과
7. 수정·삭제·초단문·같은 날짜·미래 영역·reduced-motion 테스트
8. 영상·이미지 **Windows 절대 경로**, 오프라인/실시간 FPS 구분
9. FPS/p95·실기기 미검증 및 병목
10. 아직 사용자에게 승인받아야 할 시안/교대 속도/밝기/글자 수 및 미해결 문제

**이번 Gate의 완료 기준은 '대표 흰색 구절도 실제로 회전하고, 다른 후면 구절이 물리적으로 앞으로 나와 흰색이 되는 것을 사용자가 확대 영상에서 분명히 확인할 수 있다'는 것.** 그 전까지 '전면 교대 성공'이라는 표현 금지.
