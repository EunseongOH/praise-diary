# 다정록 디자인 시스템 v0.4 — 레이아웃·입력·행동 규격 보강
2026-11-26 | v0.2·v0.3 유지 + 적용 계약 강화. 새 수치는 검토안. 기존 화면/프로덕션 소스 미통합.

## 1. 변경 이유
V8 ReflectionComposer가 v0.2의 FieldShell/Textarea를 사용하지 않고 화면 자체 textarea, padding 8px 0, margin 8px, outline offset +2px를 생성했다. 독립 저장 버튼 스타일 역시 공통 규칙에서 이탈했다. 원인은 명세 부족이 아닌 재사용 확인과 회귀 검증 누락이다.

## 2. 의미 기반 규격 (CSS px, 기본 화면 기준)
| 토큰 / 역할 | 값 | 사용 규칙 |
|---|---:|---|
| gap-text | 4 | 같은 의미의 레이블과 보조 설명 |
| gap-inline | 8 | 장식 아이콘-텍스트, 날짜와 연결 정보 |
| gap-controls / gap-action-group | 8 | 실제 독립 버튼·필드 박스 사이, 버튼 외형이 아닌 클릭 박스 기준 |
| gap-toolbar | 4 | 같은 상단 툴바의 44px 아이콘 버튼 사이 |
| gap-component / gap-field-actions | 12 | 날짜-필드, 필드-행동 그룹, 오류-행동 그룹 |
| space-4 | 16 | 중간 그룹 후보; 화면별 임의 선택 금지, 필요 시 의미 토큰 등록 |
| gutter | 20 | 화면 좌우, safe area 내부 |
| gap-section | 24 | 원문/마음 기록 사이; 구분선 위 24, 아래 24 (다른 시간의 기록) |
| field-padding-x/y | 12 / 12 | 모든 기본/compact 입력 변형 공통 |
| paper-inset | 12 | 종이 내 필드 외곽. 읽기/날짜는 추가 12로 총 24px 텍스트 기준선 |
| field-textarea-height | 260 min | 기존 일기 본문 |
| field-textarea-compact-height | 112 min | 짧은 보조 기록; 자동 확장; 새 변형 후보 |
| touch | 44 min | 독립 조작 버튼 및 인라인 저장/취소 |
| touch-comfort | 48 min | 여유형 조작 |
| cta | 52 min | 화면 단위 주요 CTA, 인라인 저장과 구분 |
| focus-width | 2 inset | shell에만 표시, 포커스 전후 외곽·텍스트 시작점·간격 불변 |

- Stack/Inline이 자식 사이 간격을 소유하고, 컨테이너 padding은 내부 여백을 소유한다. 중첩 gap과 child margin을 더해서 우연히 맞추지 않는다. 화면에 새 px 값, !important, 음수 margin으로 컴포넌트 보정을 하지 않는다. 기존 레거시 override는 점진적으로 제거한다.
- 필드에서 다음 액션까지 **외곽 경계 기준 12px**, 같은 액션 그룹 내 두 hitbox 사이는 8px. 오른쪽 정렬, 폭 부족 시 줄바꿈. 오류가 있으면 필드→오류→행동 각각 12px. 숨긴 오류는 공간을 점유하지 않는다. 텍스트 글리프와 버튼 영역의 간격을 혼동하지 않는다.
- 버튼 역할: 주요 화면 CTA 52px, 본문 안의 짧은 저장은 공통 PrimaryButton compact 44px (폭 auto), 취소는 기존 TextAction. 상태별 레이아웃 변화 금지. 아이콘-only는 44x44 및 접근성 이름.
- 입력창은 native textarea + FieldShell. plain/outline 모두 내부 포커스; ruled는 장식만 변경. density=compact는 최소 높이만 바꾸고 글꼴·패딩·focus는 동일. 높이는 112px부터 내용에 따라 증가. React에서는 입력 높이 계산을 공통 hook으로 통합할 것(이번 HTML에만 자동 높이 JS 구현).
- 읽기 텍스트 시작선과 작성 텍스트 시작선: 종이 왼쪽+12px(외부)+12px(필드 내부). 읽기 블록도 두 번째 12px을 예약하여 음수 margin 없이 정렬한다. 오른쪽 끝도 같은 구조. textarea만 뚫린 형태로 만들지 않는다.
- 원문·덧붙인 마음의 본문 Pretendard 16px/1.75/400, 줄바꿈 유지. v0.3 초기 읽기 폰트 후보는 사용자 선택 이후 기본 Pretendard로 변경된 상태. 실제 폰트 개인화는 별도.

## 3. 컴포넌트 적용 순서 (모든 새 화면의 필수 작업 게이트)
1. 기존 inventory, tokens, 컴포넌트 소스, 최신 결정 문서 확인. 기능을 표현할 수 있는 조합을 기록한다.
2. 재사용 → 조합(Stack/Inline, Textarea, TextAction, PrimaryButton, IconButton) → 기존 variant 확장 → 새 컴포넌트 순으로 검토한다. 새 규칙은 공통 소스/문서/샘플/테스트부터 변경한 뒤 호출부에 반영한다.
3. 화면 CSS는 화면 구성 및 고유 아트워크에만 사용한다. 예외는 이유·값·영향 범위·승인 상태·회귀 테스트를 명시한다. 화면마다 저장 버튼/입력 shell/포커스/폰트를 별도 구현 금지.
4. 320/390/430px, 빈 입력/긴 입력, 포커스/비포커스, 오류, disabled, 키보드 탐색, 텍스트 확대 및 모션 감소. 실제 상자 크기, gap, padding, 링이 배치에 미치는 영향, overflow 측정. 실제 모바일 키보드·WebView는 통합 단계 별도 검증.
5. 결과 보고에 재사용 컴포넌트, 신규 variant, 토큰 예외, 테스트 및 실패를 반드시 포함. 합의된 색·서체·규격을 임의 변경하지 않는다.

## 4. 외부 기준 (공식 문서 확인)
- [당근 SEED Spacing](https://seed-design.io/foundations/spacing): 용도별 의미 기반 토큰. 다정록의 숫자는 자체 규격.
- [IBM Carbon Spacing](https://www.carbondesignsystem.com/building-blocks/foundations/spacing/overview): 일관된 간격 스케일, 그룹화/스택.
- [IBM Carbon Forms](https://www.carbondesignsystem.com/building-blocks/core/patterns/forms): 필드/그룹 간격과 액션 정렬. 다정록의 12px·8px을 직접 규정하는 자료는 아님.
- [Shopify Polaris Stack](https://shopify.dev/docs/apps/build/customer-accounts/migrate-to-web-components/block-stack): block/inline 축과 부모 gap 관리.
- [W3C Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum), [Focus Appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance): 초점 가시성, 가려짐 방지 및 표시 크기/대비. 내부 2px 링은 제품 구현 선택이며 WCAG 인증 아님.

## 5. 쪽지 추출 모션 V9
- B 구도 기준 3장·5장의 각 쪽지 ID, 위치, 지지 관계를 독립 관리. 추출 위치와 실제 무작위 기록 데이터는 분리. 선택 쪽지가 이동하면서 지지를 잃은 위쪽 쪽지의 중심이 빈 자리 쪽으로 이동·기울어지고 내려앉는다. 약한 한 번의 정착 반동. 모든 쪽지가 동시에 흔들리는 효과 금지. 상단 추출 또는 1장일 때 남은 쪽지 변화 없음.
- 0~240ms 대기/선택 → 240~640ms 선택 쪽지 정렬 및 지지 이탈 → 330~850ms 지지 관계에 따른 순차 하강 → 850~1020ms 정착(최대) → 기존 1.13초 병목 통과 및 2.7초 감상 전환 유지. 시간은 실험값. selected는 초기 깊이 순서 유지, 640ms부터 병목 추출 레이어로 이동. 병 전면 유리 렌더링 유지.
- 결정적 위치별 궤적(5장 5경우, 3장 3경우, 1장 1경우), seek/replay 역방향 재현 가능. 실제 중력·충돌 물리 엔진은 아니며 종이 간 접촉/겹침은 시각 QA 필요. 다른 A/C 비교 배치는 기초 보정만; 제품 기준 B에 집중. 닫으면 기록 수에 해당하는 원래 구도로 복귀, 기록 소비 없음. 모션 감소에서는 즉시 읽기.
- 테스트용 위치 선택·타임라인은 제품 UI에 포함하지 않는다.

## 6. 검증 범위
V9 Chromium/Playwright: 3화면 폭×3입력 UI = 9조합의 입력 패딩/12px action gap/8px 버튼 gap/44px 버튼/2px inset/텍스트 정렬 차이 0/가로 넘침 없음; 저장 후 닫기. B 9개 추출 위치에서 0→950→0ms 역방향 자세 동일, 하단·중간 추출 변화 및 상단/1장 무변화. JS 오류 없음. 외부 웹폰트 차단, set_content 방식. 실제 모바일 키보드, 충돌 물리, React 통합 타입/빌드 및 전체 앱 회귀는 미검증.