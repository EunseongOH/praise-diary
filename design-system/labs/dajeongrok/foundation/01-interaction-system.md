# 다정록 디자인 시스템 v0.1 — 공통 조작 요소
작성: 2026-11-24 / 상태: 검토용 규격 초안 (화면 UX 결정은 확정, 새 수치·색상은 승인 전)

## 확정된 사용자 경험
- 작성 화면: 제목 추가(B), 기본 본문만 입력 가능. 제목은 선택이며 비어 있어도 저장 가능.
- 회고 질문: 하단의 조용한 단일 접기 영역, 기본 접힘. 문구: “어떤 칭찬을 남길지 고민되나요?”
- 서로 다른 유형 2개 추천, 질문 변경 가능. 선택 시 접고 본문 위 참고 문구 표시. X로 제거. 본문과 제목을 수정하지 않고 질문 자체는 저장 제외.
- 홈 상단: 추가 / 달력↔작품 / 설정. 브랜드 서체 고운바탕, UI Pretendard. 기존 월간 작품 연출과 그래픽 정책은 변경하지 않는다.

## Foundation — 제안값 (CSS px, native dp/pt와 동일 단위라는 의미는 아님)
| 토큰 | 값 | 사용 |
|---|---|---|
| icon-inline | 16 | 텍스트 보조, chevron, 참고 질문 제거 |
| icon-control | 20 | 상단 X/뒤로/추가/설정/달력/더보기 |
| icon-navigation | 24 | 하단 탭 및 대표 아이콘 |
| icon-stroke | 1.8 (24 viewBox) | 동일 둥근 cap/join, 단순 선형 glyph |
| touch | 44 | 단독 버튼 최소 가로세로 |
| touch-comfort | 48 | 여유 있는 단독 버튼 및 접기 행 최소 높이 |
| cta | 52 | 주요 CTA 기본 높이(내용에 따라 늘어남) |
| space | 4,8,12,16,20,24,32 | 4 기반; 아이콘-텍스트 8, 화면 좌우 20 기본 |
| radius | 8,14 | 조작 피드백, CTA |
| motion | 120ms / 180ms | 버튼 상태 / chevron 회전, 모션 감소 지원 |

아이콘 자체와 버튼 크기를 분리. 상단 44px 버튼끼리는 겹치지 않게 배치(추가 gap 0–4px); 화면 320px에서도 날짜 및 텍스트는 줄바꿈/축약 정책으로 처리하며 터치 영역은 줄이지 않는다. 작은 선형 아이콘은 복잡한 그림을 피하고 시각 점검. 새 아이콘이 필요하면 24x24 viewBox, 공통 스트로크로 등록. 하단 탭 선택 상태는 명도와 굵기 및 aria-current를 함께 사용, 실제 nav 구조는 추후 확정. 같은 의미의 X여도 닫기/참고 질문 제거/제목 제거의 접근성 이름은 구분한다. 뒤로 가기와 닫기 구분. 이동은 chevron-right, 이전/다음 월은 left/right, 아래로 펼침은 down→up. 위로 열리는 오버레이는 별도 패턴으로 정의. 질문 영역은 아래로 확장한다. 화살표 문자나 이모지로 대체 금지.

## 색상 (잠정 다크 퍼플 후보, 최종 브랜드 팔레트 아님)
토큰 원본: src/interaction-tokens.css. strong #E9E4F2, default #B8AEC8, quiet #A79DB6, bg #1E1C27, focus #D3C2EF. 비활성 #756E81 및 native disabled. CTA #282631 / #585164 / #E9E4F2. CTA 테두리는 배경 대비 3:1 미만이므로 라벨로 행동을 식별하는 시각 후보; 경계 인지가 필수인 컨트롤에 이 테두리 단독 사용 금지. 접근성 검증 및 플랫폼 라이트 모드 정책 별도. 보조 문구도 읽을 수 있는 대비 유지. 그래픽 색상 토큰과 UI 조작 색상 토큰 분리.

## 컴포넌트 계약
- Icon(name,size): 장식 SVG aria-hidden, 포커스 불가. 독립 기능은 IconButton 사용.
- IconButton(icon,label,tone,comfort,size,disabled): label 필수, native button, 기본 44, 여유형 48. 토글 상태는 aria-pressed 등 의미에 맞는 속성 전달.
- TextAction(icon?,tone,disabled): 보조 조작, 44 최소 높이. 텍스트 라벨 유지.
- PrimaryButton: 기존 soft outline 계열 CTA. 52 최소 높이.
- Collapsible(label,prefix?,open,onOpenChange,variant,disabled): 제어형, 전체 행 조작, aria-expanded/controls, 닫힌 콘텐츠 hidden, 키보드 Enter/Space 기본 지원. 기본 열림 상태는 호출부가 관리. 아래 방향 chevron 회전.
- Accordion(items,multiple): 2개 이상 관련 섹션, 기본 단일 열림. FAQ 등 필요 시 multiple. 항목 heading 레벨은 문맥에 맞게 조정. 단일은 Collapsible. 패널 안 스크롤 대신 페이지 스크롤. 별도 화살표 키 탐색은 이번 범위 아님.
- AppHeader(start,title,end): 균형 있는 슬롯. 실제 날짜 선택 및 네이티브 토스 헤더와 중복 방지 별도 검토.
- WritingExample: 조합 샘플, 실제 저장/날짜/질문 무작위 선정 로직과 연결하지 않음.

## 근거 및 출처 (2026-11-24 확인)
- SEED Iconography: https://seed-design.io/foundations/iconography/usage — 기본 24px, 단독 타깃 최소 40px, 24px glyph는 44px 이상 권장, 텍스트와 정렬. 다정록은 16/20/24 및 44/48 채택 제안. 작은 선형 아이콘은 단순형만 사용(원문은 15px 이하 Fill 권장).
- SEED Accordion: https://seed-design.io/components/accordion — 2개 이상 Accordion, 단일 Collapsible, 전체 Trigger 조작, 접힘 아래/펼침 위 방향, 패널 내부 스크롤 지양.
- Material Design 3 IconButton: https://developer.android.com/reference/kotlin/androidx/compose/material3/IconButton.composable — 48dp minimum touch target, 시각/터치 영역 분리. Android 안내 https://support.google.com/accessibility/android/answer/7101858
- Shopify Polaris Button: https://shopify.dev/docs/api/app-home/latest/web-components/actions/button — 아이콘-only 버튼 접근성 이름; https://shopify.dev/docs/api/polaris/using-polaris-web-components — 공통 컴포넌트와 의미 기반 속성. Shopify 전용 웹컴포넌트 도입 아님.
- Apple HIG Buttons: https://developer.apple.com/design/human-interface-guidelines/buttons — 일반적 44pt hit region.
- WAI Disclosure/Accordion: https://www.w3.org/WAI/ARIA/apg/patterns/accordion/ — 버튼/aria-expanded/controls/키보드 의미. https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
- WCAG 2.2: https://www.w3.org/TR/WCAG22/ — 일반 텍스트 AA 4.5:1, 필요한 비텍스트 3:1, 2.5.8 최소 24 CSS px(예외 포함). 본 제품 목표 44–48은 더 엄격한 자체 규격.

## 변경 관리
규격 변경은 토큰→컴포넌트→사용 화면 순서. 화면 CSS에 새로운 아이콘 크기/색/화살표를 하드코딩하지 않는다. 예외는 이유·사용처·날짜·승인 기록. 최종 아트워크 및 월별 모션은 별도 그래픽 시스템. 화면 확정 시 접근성 및 320/390 폭 검증. 아래 검증 체크리스트를 회귀 테스트에 추가.