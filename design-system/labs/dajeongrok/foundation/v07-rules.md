# v0.7 검토안 — 선택 팝업, 펼침 콘텐츠, 기록 목록
## 사용자 확정
작성 A (날짜와 제목 한 줄), 작성 날짜와 월 선택 동일 컴포넌트, 도감 설명 및 목록 중복 제목 삭제.
## 선택 팝업
Carbon Dropdown specs/guidelines 및 accessibility: https://www.carbondesignsystem.com/building-blocks/core/components/dropdown/specifications ; https://www.carbondesignsystem.com/building-blocks/core/components/dropdown/accessibility
W3C APG select-only combobox: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/
기존 CompactSelect를 native select 대신 select-only combobox로 교체. trigger min44, padding 8×12, label/icon gap8, icon16, font14/500, 자연폭. focus/열림 inset2 (마우스·키보드 모두, 텍스트와 링 사이 좌우10), 열림/hover/선택 별도. 기존 ActionMenu와 동일 표면/테두리/48px 행/8×12 padding/4px inset·gap·anchor gap, 최소 폭144, 최대 viewport-40, 스크롤 최대320px, 위/아래 위치 판단. 행은 선택 상태 check16 및 active 상태 별도. Portal로 부모 clipping 회피. 키보드 Enter/Space/화살표/Home/End/Escape/Tab, 외부 클릭 닫기, focus 복귀. 네이티브 앱/스크린리더 실기 검증 남음. typeahead 및 APG 완전 적합성은 별도.
## Collapsible
SEED Accordion https://seed-design.io/components/accordion 및 feedback https://seed-design.io/foundations/feedback/scale : 상태 표면은 자신의 경계 내부. 헤더 min48, padding8×12, panel width100%, header→panel 8, 내부 item gap8, 각 질문 min48, padding8×12, 좌정렬 14/400, 줄바꿈. hover/focus 시 크기 불변. 부모 Stack과 별도 의미 gap.
## DiaryList
SEED List Item https://seed-design.io/components/list (투명 행, 정렬·padding·그룹화), Material 3 list pattern: https://m3.material.io/components/lists/overview . 항목의 전체 클릭 영역과 제목/보조 텍스트 위계, 그룹 간 간격. 원문을 가짜 제목으로 잘라 굵게 표시하지 않음. 공통 row min48, padding12×12, text gap4, 날짜13/400, 제목16/500, 미리보기14/400 두 줄, 무제목 본문16/400 세 줄. A 배경 없음/구분선 (임시 기본), B 카드/12 gap, C 날짜별 묶음/24 gap, 그룹 제목→행8. 날짜 헤더와 본문 시작점 일치. 상위 화면 gutter20. 레코드 순서/열람/저장 계약 동일. 리스트 선택은 review 전용. 전체 앱 디자인 최종 확정 아님.
## 검수
320/390/430 실제 좌우 padding, focus rect, 팝업 row gap·경계·선택/키보드, disclosure hover 영역 간격, 3 list variants, 동일 기록 접근 및 기존 모션 회귀. 신규 컴포넌트 내부/외부 계약 함께 추가. 기존 v0.6 신규 요소 게이트 유지.

첫 CI 45759504006: 17/20 통과, 포인터 이후 프로그램 focus에서 :focus-visible만 적용되어 3개 실패. 선택기는 :focus 및 expanded에도 동일한 inset2 적용하고 padding과 outlineWidth 실측 추가. 최신 CI 결과로 재검수.
