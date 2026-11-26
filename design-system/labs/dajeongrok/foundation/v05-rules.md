# 다정록 디자인 시스템 v0.5 — Action & Menu 계약
2026-11-26 · V9 점검 후 V10 검토 시안에 적용. v0.4 규칙 유지, 아래 역할별 규격 보강. 실제 앱 통합 전 사용자 검토 필요.

## 1. V9에서 확인한 원인
- `menuReflection()`이 기존 `btn()`/`TextAction`을 수정·삭제 행에 재사용했으나, 이것은 저위계 텍스트 액션으로 좌우 4px, 상하 0px, min-height 44px, 14px 글자였다.
- `.reflection-pop`은 min-width 112px, padding 4px, grid gap 0. 메뉴 행 자체의 패딩·타이포·그룹 간격 계약 부재. 기존 44px 최소 터치 영역은 충족했지만 밀도/역할 규칙이 빠져 있었다. 단순히 글자 margin을 추가하는 방식은 해결책이 아니다.

## 2. 조작 요소 분류 및 기본 규격
수치는 기본 CSS px. 최소 높이는 고정 높이가 아니며 글자 확대·줄바꿈 시 확장. 패딩은 요소 자체, gap은 부모가 소유. 모든 독립 조작은 가로·세로 최소 44px(여러 열의 달력 등 특수 레이아웃은 별도 명세와 검증; 이 문서는 기존 달력의 적합성을 보증하지 않음).

| 역할/공통 구현 | 최소 높이 | 내부 패딩(상하/좌우) | 타이포 | 부모 간격 |
|---|---:|---|---|---|
| IconButton | 44 (comfort 48) | 0; SVG 20 기본 | 아이콘 크기 토큰 | toolbar 4 / 독립 controls 8 |
| TextAction standard | 44 | 8/12 | supporting 14/400/1.55 | controls 8 / component 12 |
| TextAction toolbar | 44 | 8/4 | toolbar-label 14/500/1.5 (헤더 역할) | toolbar 4 |
| PrimaryButton standard | 52 | 10/16 (기존) | action-label 16/500/1.5 | component 12 |
| PrimaryButton compact | 44 | 8/12 (ActionGroup 내부) | 기존 action-label | controls 8 |
| ActionMenu / MenuItem | 48 | 8/12 | action-label 16/500/1.5, 0em | menu-gap 4 |
| Disclosure/List action row | 48 | 8/12 권장, 기존 disclosure 규격 유지 | 기존 역할별 supporting/body | 인접 행은 그룹으로 별도 정의 |
| Textarea/FieldShell | 52+; compact textarea 112, standard 260 | 12/12 | 본문 16 | field-actions 12 |

* TextAction의 기존 4px 좌우 패딩은 좁은 상단 툴바용 변형으로 한정. 기본값은 12px. 기존 화면의 버튼을 무조건 48px로 바꾸지 않는다.
* 팝업 메뉴 내부 항목은 한 그룹으로 읽히므로 4px gap을 신규 정의; 서로 독립적으로 배치되는 버튼 간 8px 규칙의 예외가 아니라 다른 의미의 토큰이다. 같은 메뉴 내 수정·삭제는 구분선 불필요. 서로 다른 그룹이 필요하면 섹션 계약을 먼저 작성한다.
* 확인 대화상자: 기존 20px 내부 여백, 본문→ActionGroup 12px, 버튼 간 8px. V10에서 Stack/ActionGroup 조합으로 변경. 삭제 확인은 danger tone. 실제 앱 공통 dialog 구현/포커스 트랩/키보드 WebView 검증은 별도.

## 3. ActionMenu 세부 계약 (신규 공통 패턴)
- 메뉴 전체 최소 너비 144px, 부모 앵커 범위 내 최대 너비, 긴 문구 줄바꿈; 고정 높이/말줄임 금지. 부모는 전체 가용 폭의 `dj-menu-anchor`를 제공한다. 우측 끝 정렬. 메뉴가 하단 공간에 맞지 않고 위에 공간이 있으면 위쪽에 표시; 스크롤/포털 충돌은 실제 앱 통합 시 추가 점검.
- 컨테이너 padding 4px, border 1px, radius 8px; menu background #393342 / border #685A77 (V9 기존 색의 의미 토큰화), 항목 사이 4px, 앵커와 팝업 사이 4px. 행 radius 4px. 전체 항목 폭을 클릭 영역으로 제공.
- MenuItem: min-height 48px, padding 8px 12px, 행 16px/500/1.5, 좌측 정렬, 아이콘이 필요하면 기존 16px 및 gap 8px. 수정 기본 잉크, 삭제 기존 danger #F0A9B0. 라벨 외 임의 텍스트 margin 없음. 항목 내 focus-visible 2px inset, hover/pressed도 항목 경계 내부. disabled는 공통 tone.
- More는 기존 IconButton + more SVG, 44x44px, 접근성 이름·expanded·controls. 메뉴는 native buttons의 disclosure group이며 ARIA menu로 선언하지 않는다. Tab 이동, Escape 닫고 트리거로 복귀, 바깥 포인터/포커스 이동 시 닫기. 선택 후 기존 액션 호출, 삭제 취소 시 트리거 복귀. 삭제는 기존 확인 단계 유지.
- React `ActionMenu`는 leading(날짜 등), label, items(id/label/tone/disabled/onSelect) 계약. HTML 독립 시안은 동일 CSS·native button 계약을 사용하되 React 앱을 실행하는 것은 아니다.

## 4. 신규 토큰과 재사용 게이트
`--dj-action-padding-x/y`, `--dj-action-toolbar-padding-x`, `--dj-menu-min-width`, `--dj-menu-inset`, `--dj-menu-gap`, `--dj-menu-anchor-gap`, `--dj-menu-row-padding-x/y`, `--dj-menu-row-height`, `--dj-menu-bg/border/row-radius`. 값은 기존 space 4/8/12, touch-comfort 48, 기존 색 재사용. 메뉴 최소 폭 144는 신규 후보.

1. 화면 작업 전 기존 소스/인벤토리/명세 확인. 역할과 동작을 정리하고 기존 컴포넌트 재사용→조합→variant→신규 순서로 판단.
2. 새 요소에는 최소/확장 높이, 폭, 패딩, 부모 gap, 폰트 역할, 색과 상태, 접근성 및 overflow를 모두 명시. `TextAction`을 목록/팝업 행처럼 역할이 다른 요소에 억지로 재사용하지 않는다.
3. 기존 구성으로 부족하면 공통 토큰/CSS/컴포넌트/문서/검증을 함께 갱신. 화면 CSS에는 고유 배치와 아트워크만. 임의 margin·음수 margin·!important 보정 금지. 레거시 예외는 영향 범위와 제거 계획을 기록한다.
4. 변경 전후의 실제 bounding box를 비교: 320/390/430px, 긴 문구·200% 텍스트, keyboard focus/hover/disabled, 정상·위험 액션, 화면 경계·스크롤. 보조 버튼도 검사 대상. 포커스 전후 패딩·외곽은 불변. 겹치는 선택 영역이 없게 확인.
5. 신규 화면 완료 보고에는 재사용 컴포넌트/신규 variant/토큰 예외/실측/실패 또는 미검증을 포함한다. 새로운 제안 수치는 승인 전 제품 전체에 일괄 적용하지 않는다.

## 5. 실제 적용 및 검증
V10 HTML: 기존 메뉴 전용 하드코딩 제거, 공통 menu 토큰·MenuItem·more SVG·TextAction standard/toolbar 분리, 확인 대화상자 Stack/ActionGroup 사용. 기존 병/종이 모션 및 입력창 규격 유지. Chromium headless, set_content, 외부 웹폰트 차단 환경에서 다음 확인:
- 320/390/430px: 메뉴 폭 144px, 높이 110px, 컨테이너 padding 4px, 행 높이 48px, 행 gap 4px, 내부 8px 12px, 글자 16px, 앵커 gap 4px. 화면 가로 넘침 없음.
- 수정·저장·삭제·삭제 취소·바깥 클릭·Escape·트리거 복귀 통과. 키보드 포커스 2px inset, Tab 이동 확인.
- 320px에서 root 글자 200% + 긴 테스트 라벨: 글자 32px, 첫 행 160px, 메뉴 너비 228px, 가로 넘침 없음. 실제 OS 텍스트 확대와 화면 전체의 200% 적합성 검증은 아님.
- V9 회귀: 3폭×3입력 스타일, 포커스/패딩/정렬/버튼 간격 유지, 9개 쪽지 추출 위치 seek 테스트 통과. JavaScript 예외 없음.
- 실제 React 소스 빌드/타입 검사·WebView/폰트 및 전체 앱 UI의 레거시 목록·달력·설정 규격은 별도 검증 필요. 신규 규격 보강이며 전체 제품의 접근성 적합성을 선언하지 않는다. GitHub 및 기존 앱은 이번 작업에서 변경하지 않음.