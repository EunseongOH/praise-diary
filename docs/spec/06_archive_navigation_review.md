# 기록 아카이브 탐색 정책 검토안 (미확정)
2026-11-26. v0.11 DiaryRow와 기존 A/B/C 목록의 시각적 구조는 유지. 별도 HTML 예시 제작 금지; 후속 시안은 실제 통합 React에서 비교한다.
현재 구현은 모든 범위의 entries를 날짜/작성시간 내림차순으로 정렬해 전체 렌더링. 월/일 범위는 기존 홈·달력·도감에서 진입한다. 페이지/검색/장기 스크롤 복원은 아직 없음.
## 참고
- Carbon Pagination https://www.carbondesignsystem.com/building-blocks/core/components/pagination/guidelines — 큰 데이터 집합의 페이지 분할.
- Carbon Loading https://www.carbondesignsystem.com/building-blocks/core/patterns/loading — 초기 배치와 더 보기, 로딩 상태.
- Apple HIG Lists and tables https://developer.apple.com/design/human-interface-guidelines/lists-and-tables — 행 그룹과 섹션 탐색.
- SEED List https://seed-design.io/components/list — 공통 행, ListHeader, 토큰.
- NN/g https://www.nngroup.com/articles/infinite-scrolling-tips/ — 피드형 탐색과 목표 지향 탐색의 차이.
## 제안
최신 20편 + '이전 기록 더 보기'(20편씩), 전체 목록 상단 월 이동(전체/기록 있는 연월, 기존 CompactSelect 재사용). 연월 섹션 헤더 후보는 13~14px, 섹션24/헤더→행8, 기존 DiaryRow 유지. 하루 그룹을 나누는 경우 이어붙임 시 중복 헤더 금지. 숫자 페이지 방식이나 무한 스크롤도 비교 가능. 월 필터는 전체 목록에만, 기존 월/일 진입은 이미 범위 지정되어 중복 필터 금지.
MVP 우선: 목록 제한과 더 보기, 월 범위, 복귀 시 선택 행·스크롤·로드 범위 보존, 기록 끝/빈 상태/오류·재시도. 검색(제목/본문/마음), 덧붙인 마음 있음 필터, 연도별 접기/월 바로가기, 검색 결과 하이라이트 등은 검토 후보. 감상 화면/성장/꺼내보기 정책은 변경하지 않는다.
데이터: 사용자 권한 범위 내 원본 기록 entryDate DESC, createdAt DESC, id DESC 안정 정렬. 백엔드 연결 시 keyset cursor와 20+1 조회(hasMore), 마음 수 batch 조회, ID 중복 제거, 필터 변경 시 cursor 초기화. 현재 sessionStorage 시연용이며 서버 페이지네이션 미구현. 로딩/끝/실패를 명확히 구분, 더 보기 중 중복 클릭 방지, 실패해도 기존 기록 유지. 검색 범위와 공개 정책 별도 승인. 사용자 승인 전 구현/확정 금지.
## 확정된 소규모 수정
그래픽 제안 입력의 시각적 '그래픽 아이디어' 레이블만 제거, aria-label 유지. 기존 Textarea, field-actions 12px, 나머지 도감 B 화면/스타일 유지. CI에서 접근 가능한 이름 및 간격 검증.
