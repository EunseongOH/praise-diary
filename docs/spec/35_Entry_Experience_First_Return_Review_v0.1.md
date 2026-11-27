# 다정록 — 처음 방문 / 재방문 / 새 달 진입 실제 앱 검수 v0.1

2026-11-27 · **QA용 프로토타입 코드**, 디자인 최종 승인 및 앱인토스 출시 아님. 기존 제품 기능 플래그 기본 OFF 유지. `main` 자동 병합 금지.

## 기존 시안과 React 상태

- 브랜드 진입 3안 **원본 HTML**: `design-system/labs/dajeongrok/brand/splash-3concepts.html`. 창가·비둘기·은방울꽃 3가지 이미지 배경을 비교했고 브랜드 `다정록 / 오늘도 나에게 다정한 한 줄`의 타이포그래피를 연구함. 사용자가 실제 채택할 이미지 배경 **미확정**.
- 월별 작품 소개 **원본 HTML**: `design-system/labs/dajeongrok/home/monthly-intro-v2.html`. 최초 방문(기록 없음), 새 달 첫 방문(기록 없음), 같은 달 재방문(기록 있음), 같은 달 기록 없는 재방문, 타임라인(브랜드→문장→작품명→글자 모임→잠시 감상→소멸→홈), 스킵/감속 모드가 있음.
- 위 2개는 React 서비스와 별개 실험 시안이다. 현재 `main`은 기본적으로 곧바로 `home`으로 진입하며 자동 첫 방문 감지가 없었다.
- 새 `src/screens/EntryExperience.tsx`는 **React 앱 화면 위에 나타나는 검수 전용 단순화 구현**. 실험이던 3가지 배경 이미지 및 한 달 작품의 실제 렌더러 픽셀과 동일하다고 주장하지 않는다. 예시 글자눈꽃은 **고정된 일반 문구로 만든 수동 모티프**이며 실제 사용자의 일기를 사용하거나 저장하지 않는다. 신규 가입/계정 시스템 도입 아님.
- 기존 전체 폰트 원칙: UI/Phrase Pretendard, 브랜드 로고 타이포는 기존 연구대로 Gowun Batang fallback. 눈꽃 자체는 앱과 동일 Pretendard.
- 2027-01 '새해 양' 작품의 엔진이 미통합이므로 새 달 첫 방문 시 브랜드/작품명/안내 흐름은 보되 **가짜 양 그래픽이 서비스의 실제 월간 작품인 척 표시하지 않음**.

## 케이스별 테스트 (현재 React 서비스에서 직접 확인)

검수 환경: `node scripts/snowflake-review.mjs dev` (일반적으로 http://localhost:5173) 또는 `node scripts/snowflake-review.mjs build` → `node scripts/snowflake-review.mjs preview` (기본 4175). 스크립트가 `VITE_SNOWFLAKE_COMPLETION_REPLAY=1`과 가상 날짜 2026-12-20을 적용. URL 파라미터는 이 QA 모드에서만 동작한다.

| 테스트 목적 | 브라우저 검수 경로(현재 실행 중인 서버의 origin 뒤) | 기대 |
|---|---|---|
| 처음 방문 · 비어 있는 기록 | `/?snowflakeDays=0&entryScenario=first` | 브랜드(다정록/슬로건) → 자기 칭찬 안내 문장 → 월별 작품명·가상 예시 글자눈꽃 모임/소멸 → 실제 빈 홈. 건너뛰기 가능 |
| 처음 방문 · 이미 가상 기록이 있는 상태에서 연출 테스트 | `/?snowflakeDays=8&entryScenario=first` | 첫 방문 연출 후 실제 8일 눈꽃 홈 (가상 기록이 intro 샘플로 노출되지 않음) |
| 재방문 · 기록 있음 | `/?snowflakeDays=8&entryScenario=return` | 짧은 브랜드 진입 뒤 기존 8일 홈, 월별 작품 소개 반복 없음 |
| 재방문 · 기록 없음 | `/?snowflakeDays=0&entryScenario=empty-return` | 짧은 브랜드 진입 뒤 빈 홈, 월별 작품 소개 반복 없음 |
| 새 달 첫 방문 · 아직 기록 없음 | `/?snowflakeDays=0&entryScenario=new-month` | 브랜드→그 달의 작품명('새해 양') 소개→실제 앱 홈. 그래픽은 미구현 상태를 존중 |
| 실제 한 세션 내 최초 방문→재방문 | `/?snowflakeDays=8&entryPreview=1` | 최초는 first, **건너뛰기 후 같은 탭 새로고침**은 return. 이 경우에만 sessionStorage에 `dajeongrok:entry:v1` 마커 저장 |
| 움직임 줄이기 | OS 또는 앱의 reduced motion ON으로 위 케이스 접속 | 자동 움직임/타이머 없이 작품 소개와 '홈으로' 버튼, 화면을 보고 직접 넘어감 |
| 저장/완성 연출 + 문구 | `/?snowflakeDays=14&goalPreview=15` | 14→15 저장에서 실제 목표 확정 가정한 QA 카피 **'차곡차곡 모은 다정함이 하나의 눈꽃이 되었어요.'** + Gate3E 보상, 일반 12월 정책 변경 없음 |
| 목표 이후 가변 카피 | `/?snowflakeDays=15&goalPreview=15` | 새 칭찬을 1~2회 저장할 때 P01/P08 등 서로 다른 문구. 본래 15일 목표는 미확정인 상태를 유지 |
| 목표 미확정 정책 검수 | `/?snowflakeDays=14` | 14→15 눈꽃 리플레이는 연구모드에서 가능해도 '완성' 문구는 절대 표시되지 않음 |

### 진입 정책의 범위

- **실제 서비스에서는 QA 쿼리나 QA 기능 플래그 없이 스플래시·온보딩이 자동 실행되지 않는다.** 아직 브랜드 이미지 배경·시점·앱인토스 진입 정책이 최종 확정되지 않았기 때문.
- `entryPreview=1`은 sessionStorage 기반의 **동일 브라우저 탭 세션 내 재방문 모의 테스트**다. 탭을 완전히 닫거나 다른 기기에서 접근해도 사용자를 식별하는 정식 방문 이력은 아니다. 실제 로그인/DB/SDK에 연결한 온보딩 판정은 별도 작업.
- `entryScenario=...`는 강제 사례 비교용. 기존 diary 저장 데이터와 온보딩 seen marker를 임의로 초기화하지 않는다.
- **같은 달에 재방문**했으면 실제 고유 작성일 수 R3 작품이 보인다. 해당 월에 첫 작품 안내를 봤으면 설명을 반복하지 않는다. 새로운 달이 되어 기록이 없으면 새 작품명을 소개하는 케이스 검수.
- 화면 위 오버레이는 keyboard Escape/건너뛰기로 종료, 실제 앱 기록은 보존. `role=dialog` 및 포커스 처리, 눈꽃 가상 예시와 사용자가 쓴 일기 데이터 분리.
- iOS/Android Apps-in-Toss WebView, 200% font, 320px viewport, 스플래시 3배경 이미지 A/B/C의 최종 미적 선택은 **현재 검수 목표 중 미완료**.

## 다음 디자인 결정 (사람 검수)

1. 브랜드 진입 3배경(A 창가/B 비둘기/C 은방울꽃)의 시각적 선택과 실제 앱 리소스 최적화
2. 최초 사용자 기준 월별 소개 8~10초가 너무 긴지 / 건너뛰기 위치·잔존 여부
3. 안내 문구 읽는 속도와 실제 예시 눈꽃이 최종 Gate3E 작품과 얼마나 일관되는지
4. 재방문은 0.8초 브랜드 진입을 보여줄지, 아예 홈 즉시 진입할지
5. 새 달 안내의 기능 활성/기록 정책, 실제 2027-01 양 작품 렌더러 구현 이후 본격 검수
6. 본 기능을 정식 진입 flow로 확정할 때 sessionStorage 장난감 조건을 Toss 앱 환경/사용자 식별/최초 진입 연혁 정책으로 치환

**자동화 기준:** `tests/e2e/snowflake-service.spec.ts`의 진입 첫/재방문/새 달/zero/reduced 검수와 `tests/logic.mjs`의 글자 수/목표일/문구 순환 테스트. CI 성공 후에도 실제 mobile/WebView 경험과 최종 미감 승인은 별개.
