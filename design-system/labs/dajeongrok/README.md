# 다정록 UI/UX 실험 아카이브 (2026-11-25)

사용자 합의 기반 디자인 실험 보존용. 기존 앱 소스와 월별 그래픽 연구를 덮어쓰지 않는다. HTML은 독립 실행 파일로 내려받아 브라우저에서 연다. 원래 시안의 개발용 조절 패널은 제품 UI가 아니다. 예제 일기는 가상 데이터만 사용한다. 웹폰트는 외부 CDN을 사용하며 폰트 파일을 커밋하지 않는다.

## 읽는 순서 / 최신 기준
- foundation/v03.html: v0.1 아이콘·조작 → v0.2 간격·입력 → v0.3 타이포 누적. foundation의 명세 참고.
- brand/logo-title-lab.html, splash-3concepts.html: 브랜드/진입화면 후보. 세 콘셉트 중 기본값은 보류.
- home/monthly-intro-v2.html: 월간 작품 첫 감상과 재방문 모션.
- rediscover/scroll-v5.html: 현재 승인된 조합의 기준 실험. 초기 봉투/병 후보는 역사적 비교 자료.
- DECISIONS.md: 최신 합의 우선. 기존 문서의 SUIT 후보, 봉투 방식 등과 충돌하면 이 UI 실험의 최신 결정에 따라 통합 계획을 세우되 실제 구현 승인과 앱인토스 정책 검증은 별도.

## 상태
[확정] 브랜드 다정록, 제목/질문 UX, 공통 규격, 꺼내보기 A병+A1쪽지+B배치, 안쪽 면이 드러나는 풀림, 4:3 원지, 어두운 편지지.
[제안] 다크 퍼플 색상은 후보, V5 미술 품질은 리파인 대상.
[보류] 진입 배경 기본값, 개인화 서체 후보, 전체 도감/설정 화면, 알림, 최종 달력/전체 목록 진입점.
[검증 필요] 실제 React 통합 빌드, WebView, 모바일 성능, 폰트 실제 렌더링, 앱인토스 정책.

원본 참조 이미지(워터마크 있는 스톡 포함)는 공개 저장소에 추가하지 않는다.

## 2026-11-25 후속 보존
- `foundation/package-v03/`: v0.3 원본 React/TSX/CSS/JSON 및 검증 스크립트와 보고. 실제 앱 통합 전 검토 필요; 기존 문서의 제안 상태를 최신 DECISIONS.md와 함께 읽는다.
- `rediscover/scroll-v6.html`: V6 유리·코르크 리파인. 기본 A/A1/B, 기존 풀림 유지, V5 재질과 비교 가능. 미승인 아트워크.
- `rediscover/scroll-v6-brief.md`: 수정 브리프, 레이어 구성, 타이밍, QA 및 미검증 범위.

## 2026-11-26 통합 준비
- `home/home-calendar-typography-lab.html`: 홈/달력 헤더 및 월 전환 참고 원본.
- `foundation/v04-rules.md`, `v05-rules.md`: 입력/간격/메뉴 규격 최신 기준.
- `rediscover/scroll-v7.html`, `rediscover-v8.html`, `rediscover-v9.html`, `rediscover-v10.html`, `rediscover-v8-spec.md`: V10까지의 시안.
- 실제 앱 통합 기준: `docs/handoff/31_MVP_통합_작업기준_2026-11-26.md`. 월간 그래픽은 나중에 연결.
