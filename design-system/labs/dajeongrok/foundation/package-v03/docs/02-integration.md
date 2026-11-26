# 기존 리포지터리 통합 안내
확인한 브랜치: EunseongOH/praise-diary / feat/design-system-prototype (2026-11-24). 현재 src/components/ui.tsx에는 Button, TextAction, AppBar, BottomNavigation, SegmentedChoice, Toggle, SettingRow, Dialog, Toast, EmptyState가 존재한다. src/styles/tokens.css에는 기존 SUIT 후보 및 그린 계열 토큰이 있다. package.json은 React 18, Vite, TypeScript이며 아이콘 의존성이 없다.

1. 현재 브랜치 다시 확인 후 src/components/icons.tsx, src/components/interactions.tsx를 추가하거나 ui.tsx에 재수출. TextAction/PrimaryButton/AppHeader는 기존 TextAction/Button/AppBar API를 검토해 한 구현으로 통합(중복 유지 금지). 기존 호출 호환성 확인. IconButton/Collapsible/Accordion은 신규 공통 요소.
2. interaction-tokens.css 및 interactions.css를 styles에 배치하고 main.tsx import. .dj-system 범위로 먼저 화면 단위 적용. 기존 --space/--type/--radius와 겹치는 토큰은 이후 alias로 통합; 구형 화면 색상을 전역에서 일괄 변경하지 않는다. 전체 dark palette는 승인 후 통합.
3. AppBar의 문자 ←, SettingRow의 문자 ›를 SVG IconButton 또는 행 내부 Icon으로 변경. 홈의 +/calendar/image/settings, 쓰기 X, 선택한 질문 제거 X, 도감 상세/설정/모달에 공통 컴포넌트 적용. BottomNavigation은 구조 보존 후 Icon 적용. 기존 Dialog/Toggle 등 이번 범위 밖은 유지.
4. 작성 예시는 선택적 제목과 질문의 조합 참고용. 기존 데이터·날짜 정책·질문 풀·저장 로직 재사용, 임의 데모 데이터 저장 금지. 날짜는 오늘/어제만, 사용자가 선택한 날짜 보존. 닫기 시 기존 작성 이탈 정책 준수. 그래픽 알고리즘은 변경 금지.
5. 기존 디자인 시스템 문서 `design-system/component-inventory.md`에 Icon/IconButton/Collapsible/Accordion 추가, `design-system/interaction-system.md`로 규격 및 출처 기록. 변경 시 버전과 승인 여부 기록.
6. npm run typecheck, npm run check, 기존 E2E + 신규 UI 테스트 실행. 과거 오류가 있다면 신규 변경 여부 구분. 

## 회귀 테스트 체크리스트
- 320/390 CSS px에서 가로 오버플로우 없음. 아이콘 버튼 44×44 이상, accordion 48 높이 이상, 작은 글자 확대 시 행 높이 증가.
- native Tab/Enter/Space로 조작, focus-visible, disabled 상태 차단, 이름이 읽히며 SVG가 중복으로 읽히지 않음.
- 접기 전체 영역 클릭, expanded/controls 일치, 닫힌 패널 포커스 불가. Accordion single/multi 구분.
- 제목 미입력 + 본문 입력 저장 가능, 제목만 입력 시 저장 비활성. 질문 변경·선택·삭제에도 본문 보존, 저장 payload 질문 제외.
- 키보드 열린 상태에서 입력/저장 접근 가능, 포커스 이동 점검; 브라우저 및 실제 앱인토스 WebView에서 검증 필요.
- 모션 감소 시 회전 즉시 적용. 테마별 UI 대비 확인. 실제 스크린리더, 네이티브 환경, 전체 앱 통합 검증은 별도.

## v0.2 추가
- `TextInput`, `Textarea`, `RemovableField`, `Stack`, `Inline`을 공통 export에 추가. raw `.dj-field` 사용을 shell 구조로 이행. `03-layout-spacing-input.md`의 우선 규격 준수.
- `tests/check-layout.py`로 독립 HTML 회귀 테스트. 실제 앱에서도 동일한 box measurement 검사 추가.
