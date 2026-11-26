# E안 — 내가 남긴 칭찬 (v0.12)

기준: feat/mvp-integration의 B안 도감, DiaryRow, 다크 퍼플 v0.11. A/B/C 목록 검수 모드는 보존한다. E는 전체/월별 기록의 기본이며, 날짜별 목록은 기존 A안 흐름을 유지한다. 기존 데이터를 변경하지 않는다.

| 공통 요소 | 규칙 |
|---|---|
| SearchField | 52px, 기존 FieldShell outline, 12px 내부 여백, 20px 돋보기, 8px 아이콘 간격, 44px 지우기 대상. 빈 상태에서도 trailing 공간 유지. 입력/초점/지우기/disabled, Escape 초기화, 모바일 search 입력 |
| FilterToggle | 44px 최소, 16px 아이콘, 8px 간격, 기본/선택/초점/disabled. 선택 시 check와 aria-pressed로 색상 외 구분 |
| ListSectionHeader | 14px supporting, 500, muted, DiaryRow와 동일 12px 인셋, 8px 다음 행 간격 |
| DiaryRow | 기존 제목/본문/날짜/마음 메타 위계 유지. 검색 일치 구간 mark + 밑줄, 후반 본문 일치 시 주변 문맥 미리보기; 원문 변경 금지 |
| ArchiveScreen | 20px 페이지 gutter, 컨트롤 12px, 섹션 24px, 30개씩 더 보기. 날짜 최신순 → 저장시각 최신순 → ID |

검색은 원문 제목·본문의 대소문자 및 연속 공백을 정규화한 부분 일치. 마음 필터는 덧붙인 마음 1개 이상. 기록이 있는 연도/월만 노출하며 조건은 AND. 도감에서 월별 진입 시 해당 월만 검색. 새 목록 진입 시 초기화, 상세 뒤로가기 시 검색·연도·월·마음·로드 수·행 초점 및 스크롤 위치 복원. 삭제/조건 불일치 시 기존 위치와 검색창 초점으로 대체. 즐겨찾기 제외. 기존 로컬 저장 모델 및 데이터 스키마 변경 없음.

검수: `npm run test:archive`, `npm run check`, `npm run test:e2e`. 실제 브라우저에서 320/360/390/430px, 폰트 확대, IME, 검색 일치 표시, 더 보기, 삭제 후 복원, 키보드·스크린리더를 검증해야 한다. 5000개 필터 로직과 초기 렌더 수 검사는 브라우저 성능 검증과 별개다.
