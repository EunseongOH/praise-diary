# 디자인 시스템 전수 코드 검토 — v0.10
기준 11d2b2d58b7870d52fe2e98712e1378ce8cb3cea. v0.9 CI 성공. 범위: 현재 통합 앱의 16 route ID(월/graphic 공통), 공통 UI, 홈·작성·감상·도감·설정, tokens/app/components CSS, 테스트. 소스 점검과 실측은 구분한다.
## 발견/조치
- 토큰: 초기 녹색/SUIT 값이 후행 보라 토큰과 중복. 후행 값이 존재하는 초기 선언 제거(실효값 유지). 작품 팔레트 유지. CSS 전체 단일화는 별도.
- 홈: 달력 월 선택 span이 공통 14px를 16px로 덮어쓰는 문제 제거; 작품 제목 margin 중복 제거.
- 달력: 기존 44 target, 36 mark/8 gap, 좁은 화면 slot 유지.
- 작성: A안, custom selector, 질문 2개/refresh, field padding 유지. 실제 키보드/입력기 별도.
- 감상: 공통 원문/마음/메뉴, 질문 메타 12/4 유지. A/B/C 목록 결정 보류, 무제목 텍스트 유지.
- 도감: V02 2열·상태별 슬롯·공통 상세 유지. A/B 정책 검토 중. 실제 렌더러와 확대 미연결.
- 저장: 4px action gap +22px margin, 제목의 이중 margin 수정. 기존 버튼 사용.
- 설정: 17/14/2px 혼재, 25px section margin, 14px gap, 녹색 switch → row 12/8/min48, section24/header8, 기존 색 토큰, 48×28 visual/20 thumb, 전체 행 상호작용. 공통 chevron. native radio 의미 유지, 행 focus. 기록 관리 중복 제목 제거.
- 공통 shell: 20 gutter, nav12/44+, nav safe area, 빈 상태/일반 제목/소개/정보 패널·toast 토큰 정리, pressed scale 제거, secondary hover 추가. 토스트와 보조 텍스트 대비 검사 추가.
- 다이얼로그: 확인 입력 레이블·필드 gap4, 기존 20 padding/12 action 관계 유지.
## 남은 검수
- CI 결과 확인 전 실측 완료로 표기 금지. 새 E2E settings/boundary/records/dialog/saved 320/390/430 + 320 설정 200%; 기존 검사는 유지.
- app.css에는 미사용 레거시 선택자/중복 선언이 여전히 존재. 삭제는 화면별 동등성 검증 후 진행. 고정 nav의 극단적 글자 확대/짧은 화면, portal/screen reader, 실제 폰트 및 모바일 WebView/키보드, 모든 화면 screenshot 육안 검수 필요. 실제 artwork/splash/월 첫 진입/서체 설정·SDK·DB 미통합. 48×28 switch 규격은 이번 검토안.
