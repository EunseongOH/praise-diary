# 다정록 Typography v0.3 (검토안)

- 유지: v0.2 조작·간격 토큰, 44px 독립 조작 영역, 내부 포커스, 제목 추가 B안, 회고 질문 낮은 위계.
- 확정값: 브랜드 고운바탕 36px/400/.05em, 태그라인 Pretendard 16px/400/.01em, 작품 제목 B안 고운바탕 24px/400/.015em. 기타 역할은 검토안. 색상도 v0.2 후보 유지.
- 그래픽 자체의 글자는 별도 엔진으로 관리. UI 크기 확대가 작품 생성 좌표/진행도를 변경하지 않는다.
- 폰트 파일은 배포 패키지에 포함하지 않는다. 프리뷰는 공개 CDN CSS를 참조하며 실패 시 폴백. 실제 앱은 라이선스, CSP, 네트워크 및 로딩 정책 검증 후 결정.

## 역할별 스타일 (기본 16px 루트 기준)

| Role | 서체 | 크기 | 행간 배율 | 굵기 | 자간(em) |
|---|---|---:|---:|---:|---:|
| brand | display | 36 | 1.3 | 400 | 0.05 |
| tagline | ui | 16 | 1.5 | 400 | 0.01 |
| artwork-title | display | 24 | 1.4 | 400 | 0.015 |
| artwork-tile | display | 18 | 1.45 | 400 | 0.015 |
| artwork-reveal | display | 28 | 1.4 | 400 | 0.015 |
| page-title | ui | 24 | 1.4 | 600 | -0.02 |
| section-title | ui | 18 | 1.5 | 600 | -0.015 |
| entry-title | ui | 20 | 1.5 | 500 | -0.01 |
| body | ui | 16 | 1.6 | 400 | 0 |
| diary-write | ui | 16 | 1.75 | 400 | 0 |
| diary-read | read | 17 | 1.85 | 400 | 0.005 |
| action-label | ui | 16 | 1.5 | 500 | -0.01 |
| toolbar-label | ui | 14 | 1.5 | 500 | 0 |
| supporting | ui | 14 | 1.55 | 400 | 0 |
| meta | ui | 13 | 1.5 | 400 | 0 |
| nav-label | ui | 12 | 1.5 | 500 | 0 |

## 적용 규칙
- 크기는 rem, 행간은 배율, 자간은 em. 루트 크기를 고정하거나 확대를 차단하지 않는다.
- 브랜드·작품명은 400만, UI 일반 400/500/600. 가짜 굵기 합성 금지.
- 일기 감상 후보 A: 고운바탕 17px/1.85, B: Pretendard 16px/1.75, C: 제목 고운바탕 + 본문 Pretendard 17px/1.8. 선택 미확정. 작성은 Pretendard 16px/1.75.
- 사용자 원문의 줄바꿈/공백을 보존하고 내용 요약/자동 제목을 만들지 않는다. 상세 화면에서 말줄임 금지. 긴 제목과 단어는 자연 줄바꿈 및 overflow-wrap:anywhere. 목록에만 이후 별도 축약 정책 검토.
- 문단 간격은 명시적 UI 문단에서 .85em, 원문은 pre-wrap으로 원래 줄바꿈 유지. 화면마다 불필요한 문단 변환 금지.
- 제목/본문 입력 글자 시작점은 동일한 12px 내부 여백. 입력창과 제거 버튼은 8px gap. 조작 요소 정렬은 실제 44px 영역 기준. Chevron 등 행 내부 장식은 16px SVG. 버튼과 행은 최소 높이만 지정하여 확대·줄바꿈 시 증가.
- 시각적 역할(roleStyle)과 HTML 태그(as)를 독립 선택. 화면 h1, 하위 h2/h3 순서 유지.
- 날짜/메타는 13px, 탭 라벨 12px; 필수 정보는 낮은 대비 금지. 대비 기준 유지. 확대에서 헤더는 텍스트 줄바꿈과 자연 높이 확장. 320px에서 확대 시 가로 스크롤 없이 본문 세로 스크롤 허용.
- WCAG 1.4.4 200% 확대 및 1.4.12 텍스트 간격 변경(행간 1.5배, 문단 뒤 2배, 자간 .12em, 단어 간격 .16em)에서 기능·정보 손실이 없어야 함. 기본 스타일을 그 값으로 강제하라는 의미가 아님. 테스트 프리뷰의 텍스트 확대는 브라우저/OS/WebView 검증을 대체하지 않음.

## 참고 자료 (2026-11-24 확인)
- SEED: https://seed-design.io/foundations/typography — 시맨틱 스타일, 크기/행간/굵기 토큰, rem.
- Material 3: https://developer.android.com/develop/ui/compose/designsystems/material3 — 역할별 type scale, 필요한 일부 선별, 제품별 커스텀.
- Polaris: https://shopify.dev/docs/apps/build/app-home/migrate-from-polaris-react/text — 문서 구조, 의미에 맞는 요소 선택.
- WCAG: https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html 및 https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html

## 통합
기존 interaction-tokens.css → interactions.css → typography.css 순으로 import. 기존 ui.tsx 공통 요소에 스타일 역할을 매핑하고 중복 구현을 제거. typography.tsx의 Text/DiaryContent를 화면에 적용. v0.2 파일은 그대로 보존(새 CSS가 기존 크기 정의를 덮어씀). 도감·꺼내보기 화면은 타이포 검토용이며 레이아웃 확정 아님. 실제 앱 통합, 전체 TS 타입체크, WebView/OS 글자 확대는 후속 검증.
