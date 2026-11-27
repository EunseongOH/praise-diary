# 다정록 진입 경험 v1.0 — 실제 15일 눈꽃 연결

2026-11-27 · **검수 브랜치 적용, 서비스 자동 진입 활성화 아님** · Vercel 배포 횟수 제한을 고려해 **이 브랜치에서는 Vercel 미배포**.

## 확정 스토리라인 (사용자 승인 A–E)

| 케이스 | 스토리라인 | 시간 |
|---|---|---|
| 서비스 첫 방문, 기록 0일 | 창가 스플래시 → 칭찬이 작품이 되는 소개 → 이번 달 작품명 → **실제 15일 단계 눈꽃** → 기록 0일 홈 | 8.5초 이내 |
| 서비스 첫 방문, 기존 기록 있음 | 위와 동일한 소개 → **실제 사용 기록**이 반영된 홈 | 8.5초 이내 |
| 같은 달 재방문, 기록 있음/없음 | 짧은 창가 스플래시 → 현재 기록 상태의 홈 | 0.8초 |
| 이번 달 작품 첫 방문 | 창가 스플래시 → **이번 달에도 다정함을 모아서 ‘{작품명}’을 만들어 봐요.** → 해당 작품 프리뷰 → 이번 달 홈 | 8.5초 이내 (작품 지원 시) |
| 같은 달 재방문 | 짧은 창가 스플래시 → 홈 | 0.8초 |

**정상 움직임 구간(ms):** brand 1700 → intro 1800 → reveal/title 800 → gather/appearance 1200 → hold 2300 → fade 700 = 8500. 안내 길이가 9초를 넘지 않는다. 건너뛰기는 최초 브랜드 장면 뒤부터 제공.

**모션 줄이기:** brand 정지 화면 → ‘다음’ → 작품 정지 화면 → ‘홈으로’. 일반 재방문은 brand 정지 화면 → ‘홈으로’. 강제 시간 전환 없음.

## 실물 프리뷰의 단일 원천 (12월)

- `src/data/brandPreviewFixtures.ts`: 가상의 칭찬일기 **15건 / 고유 기록일 15일**. 본문은 성취·노력·휴식·관계·용기 등 다양한 일상 사건. **실제 사용자의 일기를 복사하지 않음**.
- `src/screens/MonthlyArtworkPreview.tsx`: 프리뷰 사용 가능 판정, 스플래시 중 worker snapshot prefetch, 공통 ArtworkSlot 연결.
- `ArtworkSlot → SnowflakeArtwork(variant="preview") → SnowflakeStatic → RefineCanvas`: 홈에서 쓰는 **바로 그 눈꽃 엔진**이 15건의 fixture로 계산해 그린 Canvas. 6방향 임시 글자 모티프/SVG/새 이미지 사용하지 않음. `preview` 타입은 홈과 같은 구성, **입자 보상 없는 정지된 완성 단계**.
- 텍스트는 도형의 실제 원료. 조형을 크게 보여주고, 작은 문장별 가독성은 우선하지 않는다.
- 픽셀/형태 동일성 비교는 **동일 데이터·동일 motion 설정·동일 viewport/DPR**에서 확인. 실제 사용자의 15일 눈꽃은 사용자 기록이 다르므로 픽셀 단위로 같을 필요 없다.
- 스플래시 중 비동기 미리 준비하고, 준비 실패 시 앱 진입을 막거나 가짜 눈꽃을 보여주지 않는다.
- 프리뷰 fixture는 state/entry list/작성일 수/analytics에 저장하지 않으며 기존 기록과 철저히 격리한다.

## 지원되지 않는 달 정책 (중요)

**2027-01 「붉은 양과 해」**는 실제 렌더러가 아직 없음. 임시 양 이미지를 실제 완성형처럼 노출하지 않는다. 현재 코드는 미지원 월에는 **짧은 브랜드 → 홈**으로 안전하게 전환하며, 그 달 작품 소개 마커는 기록하지 않는다. 진짜 양 렌더러 및 완성형 프리뷰 fixture가 준비된 뒤 `hasMonthlyArtworkPreview`와 `MonthlyArtworkPreview`를 확장해야 승인된 새 달 전체 시퀀스가 활성화된다.

월별 소개가 실제로 제공되지 않은 상태에서 '이번 달 작품 소개 완료'를 저장하지 않기 때문에, 동일 월 중간에 아트워크가 출시되면 첫 소개가 가능하다.

## 검수 정책·링크

**QA 빌드:** `node scripts/snowflake-review.mjs dev` (개발 서버) 또는 해당 검수 빌드.
- `/?snowflakeDays=0&entryScenario=first`: 15일 미리보기→빈 홈
- `/?snowflakeDays=8&entryScenario=first`: 15일 미리보기→실제 가상 기록 8일 홈
- `/?snowflakeDays=8&entryPreview=1`: 최초 방문→동일 탭 새로고침으로 0.8초 재방문
- `/?snowflakeDays=0&entryScenario=new-month`: 현재 가상 월(2026-12)의 작품 소개 카피와 실물 눈꽃
- `/?snowflakeDays=0&entryScenario=new-month&entryMonth=2027-01`: QA에서 양 프리뷰 미지원 게이트 확인. **실제 앱 날짜와 홈은 바꾸지 않는 UI 검사 옵션**.
- `/?snowflakeDays=0&entryScenario=empty-return`: 0.8초 재방문→빈 홈.

**테스트:** `npm run check` + `npm run test:e2e`, 320/390폭, motion reduce, Canvas 표시, fixture 15일과 홈 데이터 격리, 매달 최초 판정, 8.5초 전환.

## 미완/출시 차단 조건

- 1월 실제 작품 렌더러 및 동일 엔진 기반 프리뷰 부재 (가짜 프리뷰 금지).
- 현재 이력은 동일 탭 sessionStorage QA 마커. 정식 앱인토스에서 영속적인 최초 방문 / 월별 확인 기록 필요.
- 12월 15일은 **그래픽 연구상 완성 단계**이며 실제 목표 달성일은 미확정(`targetDays:null`)으로 유지.
- App-in-Toss 실기기 WebView, 이미지 잘림, 타이포 확대, Canvas 성능 및 정확한 프리뷰 조형의 시각 검수.
- 테스트 통과 및 사용자 확인 전 main 병합/정식 스플래시 자동 활성화 금지.
- **GitHub 검사만 실행한다. Vercel은 사용자 요청에 따라 이 작업에서 재배포하지 않는다.**
