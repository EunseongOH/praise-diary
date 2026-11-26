# 다정록 디자인 시스템 v0.6 검토안 — CompactSelect / CalendarDay / Writer
2026-11-26. v0.5 유지. 신규 수치는 사용자 검토 전 확정으로 취급하지 않는다.

## 원칙과 실제 문제
- 기존 HomeShell 월 선택 flex:1 및 오른쪽 끝 chevron으로 텍스트와 아이콘이 분리됨. 날짜 셀 44px 전체 배경으로 연속 기록일이 붙음. 320px에서는 음수 margin으로 셀을 확보했음. 작성은 중복 안내·전체폭 날짜 세그먼트·반복 날짜가 입력창을 밀었음.
- 기존 v0.5의 44px 터치, 16px 인라인 아이콘, 8px 아이콘/텍스트, 12px 컴포넌트, 20px gutter, 2px inset focus를 유지. 시각 표시와 실제 입력 면적을 구분한다.
- Carbon Date Picker Guidelines/Specifications: 작은 선택 조작 변형, 내용과 정렬에 맞는 폭, 아이콘 16px 및 8px 간격. https://www.carbondesignsystem.com/building-blocks/core/components/date-picker/guidelines ; https://www.carbondesignsystem.com/building-blocks/core/components/date-picker/specifications . Carbon Dropdown: inline modifier와 폭 조절 https://www.carbondesignsystem.com/building-blocks/core/components/dropdown/guidelines . SEED Accordion은 상태와 간격 조정을 토큰에 맞춤 https://v3.seed-design.io/components/accordion . 외부 값 복사 대신 우리 44px 목표 유지.

## 공통 계약
| 요소 | 내부 | 외부 관계 |
|---|---|---|
| CompactSelect toolbar | min44, padding 8×4, 14px/500/1.5, icon16, label gap8, 자연 너비, 2px inset focus | toolbar group gap4; independent control gap8; section gap12 |
| CompactSelect standard | min44, padding 8×12, 동일 글꼴/상태 | 일반 Inline gap8 |
| CalendarDay | 44×44 이상 조작 영역; 36px 이하 배경 폭, 36px 이상 높이, 좌우 최소4px visual inset, 색상 surface-green alias | 실제 hit grid gap0(중첩 없음), 시각 표시 사이 최소8px; 요일과 날짜는 같은 7열 |
| Calendar container | 20px 기본 화면 gutter, 320–348px에만 7×44 확보용 6px inset. 작은 화면은 그리드 자체 스크롤, 음수 margin 금지 | 월 이동→달력 12px; 달력→다음 영역 12px |
| Writer metadata row | 기존 CompactSelect, TextAction toolbar; 최소44 | 행 내 gap8; 본문과 12px, 질문·저장 12px |
| Collection grid | 기존 2열, 셀 copy gap4, 불필요한 고정 높이 제거 | 열12 행24, subtitle→grid12 |
- CompactSelect는 실제 native select가 의미/조작을 담당, 보이는 라벨과 아이콘은 aria-hidden; focus-within 내부 2px. 네이티브 OS 팝업 자체 디자인은 OS가 담당. 긴 값/텍스트 확대에 줄바꿈. 화면이 강제 너비나 별도 focus override를 지정하지 않는다.
- 달력 기록 배경은 각각 독립 표시. 연속일도 범위 선택처럼 이어 칠하지 않는다. today outline은 표시 표면, 키보드 focus는 hit target 내부. 오늘/기록 상태는 접근성 이름으로 구분. 기록 없는 날짜의 비활성 정책 유지.
- 검수용 작성 A 상단 한 줄(임시 기본), B 본문 아래, C AppBar 우측. 공통 본문/제목/질문/저장 동작과 상태 공유. 실제 사용자 화면에는 비교 제어를 노출하지 않는다. 확정 후 불필요한 variant 정리. 오늘·어제만 선택, 작성 시작 날짜 경계 유예 유지. 반복 안내 대신 현재 날짜가 보임. 편집은 날짜 읽기 전용.
- 상단과 본문에 같은 페이지 제목을 반복하지 않음. 도감 설명 문구만 남김.

## 새 컴포넌트 게이트 (모든 화면)
1. 역할/기존 인벤토리/토큰 확인. 재사용→조합→variant→신규. 새 역할이면 외부 공식 DS 1개 이상 참고하여 차이와 선택 이유 기록.
2. 계약에 내부 padding, visual size, hit target, label/icon gap, min/max/overflow, parent gap, section relation, focus/hover/pressed/disabled, 글꼴, 접근성/키보드, 작은 화면 및 확대 예외를 모두 명시한다.
3. 공통 CSS/토큰/React/문서/테스트를 함께 수정한다. 기존 화면 CSS의 중복 스타일은 제거 또는 제한하고 !important, 임의 음수 margin 금지. 부모만 gap 관리. 장식용 배경에 조작 크기를 강제하지 않는다.
4. 실제 computed layout을 320/390/430에서 실측, 포커스 전후 rect 동일, 연속 셀/긴 문자열/200% 글자 확대/상태 전환을 테스트. 실제 WebView와 키보드/외부 폰트는 별도. 기존 화면까지 회귀 검증. 검증이 없는 규격을 완료로 표기하지 않음.
5. 레거시 부채는 추적: 설정 목록·도감 상세·기록 관리·스플래시/월간 첫 방문 및 전체 CSS 중복/간격 검수 미완료. 전체 앱이 규격 준수한다고 단정 금지.
