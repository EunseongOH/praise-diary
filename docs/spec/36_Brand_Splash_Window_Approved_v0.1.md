# 다정록 첫 진입 스플래시 — 1안 「창가의 기록」 적용 계약 (2026-11-27)

## 확정 범위

- 사용자가 선택한 3안 중 **1안 「창가의 기록」**을 브랜드 진입 이미지로 채택.
- 기존 3안 비교 원본: `design-system/labs/dajeongrok/brand/splash-3concepts.html` (창가 배경의 embedded WebP를 손실 없이 추출).
- 실제 런타임 이미지: `public/assets/branding/entry-window.webp`. 워드마크가 들어간 합성 이미지를 쓰지 않음.
- 워드마크: **다정록**, Gowun Batang Regular, 36px / letter-spacing 0.05em.
- 슬로건: **오늘도 나에게 다정한 한 줄**, Pretendard Regular, 16px / letter-spacing 0.01em.
- 간격 16px, 상단 기준 23%, 이미지 cover / object-position **54% 50%**. 기준 화면 390×844, 320px 너비 검수.
- 이미지 외 텍스트는 실제 DOM 텍스트 유지. 이미지 alt="" / aria-hidden으로 중복 안내 방지.
- 기존 앱 디자인 토큰, 홈, 글자 눈꽃, 저장 로직, 다른 진입 시나리오의 레이아웃은 그대로 유지.
- 이미지·텍스트 외 과한 줌/파티클/타이핑 효과 없음. 브랜드 단계의 대기 버튼은 숨김; 이후 긴 소개 단계에 건너뛰기 유지.

## 실제 React 연결 범위

`src/screens/EntryExperience.tsx`에서 첫 방문/짧은 재방문 검수의 `brand` 단계에만 이 이미지를 노출. 다음 `intro`/월별 소개 단계는 기존 흐름 유지.

**중요:** 이 작업은 이미 존재하는 PR #7의 **QA 검수 플래그 기반 진입 흐름**에 자산을 적용한다. 정식 앱 실행 시 자동 스플래시 노출을 활성화하지 않으며, 신규 온보딩 구현·사용자 상태/DB 기록·세션 정책 변경도 포함하지 않는다. 실제 홈 진입 앞에 스플래시를 자동 실행할지는 별도 출시 정책/기기 검수 완료 후 결정.

## 검수 (릴리스 게이트)

- [ ] QA 실행: `node scripts/snowflake-review.mjs dev` 후 `/?snowflakeDays=8&entryScenario=first`로 창가 이미지·문구 확인.
- [ ] `/?snowflakeDays=8&entryScenario=return`: 재방문에서 짧은 브랜드 노출 후 홈; 데이터 변화 없음.
- [ ] `/?snowflakeDays=0&entryScenario=new-month`: 기존 새 달 소개로 이어짐.
- [ ] 390×844, 320×640 및 긴 화면에서 창틀/일기장/커튼을 유지하는지 육안 점검.
- [ ] 이미지 로딩 성공, 폰트 실패 fallback, 실제 Android/iOS WebView 글자 대비·Safe Area 검수.
- [ ] 스크린리더가 배경 이미지 중복 낭독하지 않음, reduced-motion에서 이용자 수동 이동 가능.
- [ ] `npm run check`, Playwright E2E, CI 검사 후 사람이 실제 스플래시 화면 확인.
- [ ] 기존 QA 진입 플래그 OFF에서 스플래시 비노출 확인.

## 작업 경계

사용자 선택을 번복하지 않는다. 기존 다크 퍼플/라벤더 디자인시스템 재설계 금지. 메인 브랜치 자동 병합 금지. 월간 작품/온보딩 정책 확정 전 실서비스 자동 노출 금지.
