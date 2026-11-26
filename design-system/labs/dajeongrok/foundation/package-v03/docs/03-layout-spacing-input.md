# 다정록 DS v0.2 — Layout, Spacing & Input
2026-11-24 | 통합 후보, 사용자 확인 대기. v0.1의 아이콘 스타일 및 터치 규격 유지. 이 문서와 v0.2 CSS가 이전 문서의 간격·포커스·입력창 규칙에 우선한다.

## 문제와 설계 원리
- 기존 제목 입력행은 gap 0, 입력 좌우 padding 0, focus outline 2px + offset 2px로 인접 버튼 영역을 침범했다. textarea 역시 margin-top을 화면별로 붙였다.
- 실제 레이아웃은 아이콘 SVG(16/20/24px)가 아니라 인터랙션 박스(44×44, 여유형 48×48)를 기준으로 산정한다. 장식용 아이콘만 글자 옆 16px + 8px 간격을 사용한다. 행 전체가 버튼인 disclosure 안에 있는 chevron은 별도 44px 버튼이 아니다.
- 요소 사이 여백은 부모 Stack/Inline/Grid의 gap, 컨테이너 안쪽은 padding. 자식의 임의 margin, 음수 margin, 겹치는 pseudo hit area, 포커스에 따른 border 크기 변경 금지.
- 시각적 정렬과 조작 영역을 분리하고, 포커스 및 호버의 최대 표시 범위도 레이아웃 계약에 포함한다. 버튼 outline 2px / offset -2px, 입력 shell inset 2px로 상태 변경 시 레이아웃이 움직이지 않는다. 바깥 링이 필요한 특수 요소는 최소 4px 표시 여유를 별도로 확보. 인접 요소가 44px이라는 이유로 불필요하게 장식 아이콘까지 44px로 확대하지 않는다.

## 토큰 (CSS px)
| 의미 | 값 | 적용 |
|---|---:|---|
| gutter | 20 | 화면 좌우, safe area 내부. 좁은 화면의 16px 예외는 추후 검증 |
| gap-text | 4 | 레이블과 보조 텍스트 |
| gap-inline | 8 | 장식 아이콘과 텍스트, 관련 요소 |
| gap-controls | 8 | 독립적인 입력창·버튼, 인접 조작 요소 |
| gap-toolbar | 4 | 같은 헤더 안 44px 아이콘 버튼 사이 |
| gap-component | 12 | 관련 컴포넌트 사이 세로 기본 |
| gap-section | 24 | 다른 의미의 섹션 사이 |
| field-padding-x/y | 12 / 12 | 제목·본문 공통, 텍스트 시작점 정렬 |
| field-height | 52 min | 한 줄 입력, 고정 높이 아님 |
| field-textarea-height | 260 min | 작성 본문 후보, 키보드/스크롤 정책 별도 |
| field-slot-padding | 4 | 내부 clear button과 컨테이너 끝 |
| focus-width | 2 | inset focus |
| field-border | #82778F | outline 입력 경계, 잠정 색상 |

독립 버튼 그룹: 44+4+44=92px (툴바), 44+8+44=96px (일반). 16px 아이콘끼리의 외형 간격은 조작 박스의 gap과 같지 않다. 헤더는 44px 좌우 열과 minmax(0,1fr) 중앙 열. 화면 20px padding에 입력 내부 12px가 더해지므로 글자 기준선은 화면 왼쪽 32px. 제목 추가/본문/선택 질문 및 회고 질문 trigger의 leading element를 이 기준선과 맞춘다. 긴 텍스트에는 min-width:0 및 줄바꿈; 화면에 고정 너비를 강제하지 않는다. safe area는 앱의 실제 WebView 컨테이너에서 중복 적용하지 않도록 검증한다.

## 입력 컴포넌트
- TextInput: plain(일기), outline(검색/설정), 단일 네이티브 input, aria-label 또는 연결 label 필수. 기본 글자 16px, 제목 20px, line-height 1.4~1.5. 기본 plain은 테두리 없음, focus 시 shell에 inset ring. Outline은 기본 경계 유지.
- Textarea: plain/outline, 본문 16px·line-height 1.65, padding 12px. 작성 화면은 textarea resize handle 제거. 모바일 키보드/본문 자동 확장/스크롤 정책은 다음 작성 설계에서 결정.
- RemovableField: 제목 자체를 제거하는 별도 X. grid minmax(0,1fr) 44px, gap 8px, align-items:center. 제목 제거 후 본문 유지. 삭제 확인 여부는 기존 서비스 정책과 통합 시 검토.
- 내부 Clear Button: 입력값만 초기화하고 포커스를 input으로 복귀. trailing 44px 영역을 항상 예약(값 없을 때 disabled)하고 텍스트 오른쪽 padding 8px, 바깥 끝 4px. TextInput onClear는 controlled value를 사용할 때 적용. 보이는 X와 텍스트 사이의 실제 거리에는 슬롯 내 아이콘 여백도 포함됨.
- Collapsible: 48px min-height, 전체 행 터치, 8px 장식 아이콘 gap, 좌우 padding 12px. 내부 chevron은 16px이며 독립 버튼이 아님. 패널과 trigger 사이 8px(작성 프리뷰), 내부 추천 버튼 간 8px.
- IconButton: 단독 44px/comfort 48px, SVG 16/20/24px. hover/active background와 focus가 서로의 영역을 침범하지 않는다. 키보드와 포인터 상태는 구별.

## 구현 계약
- `Stack(gap)` / `Inline(gap,wrap)`은 의미 기반 토큰으로 간격 관리. 복잡한 행은 CSS grid 사용.
- `TextInput`, `Textarea`, `RemovableField`, `IconButton` 조합 사용. 기존 `.dj-field` 단독 사용은 shell이 없으면 focus ring 계약을 충족하지 못하므로 전수 교체한다.
- `AppHeader`는 좌우 동일 크기 열; `WritingExample`은 실제 서비스 날짜, 저장, 임시 저장, 그래픽과는 분리된 통합 예시.
- 기존 app.css/tokens.css와 통합 시 공통 토큰을 alias로 연결. 화면별 padding/margin override를 재검토하고 기존 화면 회귀 테스트. 별도 앱 설치나 GitHub 변경 없음.

## 출처 (공식, 2026-11-24 확인)
- SEED [Spacing](https://seed-design.io/foundations/spacing): 4px 기반 단위와 용도별 gutter/component spacing. 다정록 20/12/24는 자체 선택.
- SEED [Text Input & Textarea](https://seed-design.io/components/text-input): container, clear, prefix/suffix 구분; outline/underline; 충분한 인접 간격.
- SEED [Iconography](https://seed-design.io/foundations/iconography/usage): 16/20/24 및 텍스트와 중앙 정렬.
- Material 3 [TextFieldDefaults](https://developer.android.com/reference/kotlin/androidx/compose/material3/TextFieldDefaults): content padding과 leading/trailing 영역의 분리.
- Shopify Polaris [Stack](https://shopify.dev/docs/api/app-home/latest/web-components/layout-and-structure/stack): 부모가 gap 및 alignment를 담당, 관련성에 따라 간격을 결정.
- W3C [Target Size Enhanced](https://www.w3.org/WAI/WCAG21/Understanding/target-size) 44 CSS px(AAA), [Focus Not Obscured Minimum](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum) AA, [Focus Appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance) AAA. 2px inset은 다정록의 구현 방식으로, 전체 WCAG 준수 인증을 의미하지 않는다.

## 검증
`tests/check-layout.py` (Python Playwright, Chromium) / `tests/browser-results.txt` 참조. 320·390·768·1280px 독립 HTML에서 실제 박스 측정, focus와 hover 동시, Tab, 긴 입력, 제목/질문 제거, 내부 clear, overflow 확인. TSX transpile 구문 검사 및 기존 색 대비 검사 통과. 전체 React 타입 검사와 실제 앱인토스 WebView, 스크린리더, OS 키보드, 확대 및 safe area 검증은 아직 미수행.
