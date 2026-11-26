# 컴포넌트 인벤토리

| 컴포넌트 | 주요 props / 상태 | 사용하는 화면 | 기획 근거 |
|---|---|---|---|
| AppBar | title, back?, action? | 홈 제외 전 화면 | 불필요한 아이콘 제거, back 동작만 명시 |
| BottomNavigation | active, onChange | 홈/꺼내보기/도감 | 주요 기능 3개 우선 제안 |
| PrimaryButton | tone, loading, disabled | 모든 CTA | 화면별 주요 행동 1개 |
| TextAction | underline? | 홈 기록 목록, 도감 미래 의견 | 낮은 위계 보조 작업 |
| SegmentedChoice | options, value, onChange | D-01 오늘·어제 | 토스/SEED 선택 상태 아이디어 |
| Switch | checked, onChange, label | S-01 움직임 줄이기 | 즉시 적용하는 상태만 |
| AppDialog | title, description, actions | 삭제/취소 | 행동의 영향 충분히 설명 |
| StatusToast | message, role | 날짜 변경 및 저장 | 일시적인 확인 피드백 |
| GraphicArtwork | month, writtenDays, letterCount, reducedMotion | 홈/도감/상세/저장 | 아래부터 성장·텍스트 파티클 그래픽 |
| MonthTile | yearMonth, theme/status | 도감 2열 | 완성·미완성·미공개 구별 |
| DiaryList | entries, filter | 기록 목록/월 상세 | 꺼내보기 잠금과 별도 |
| MemorySlip | entry | 랜덤 꺼내보기 | 원문 그대로 표현 |
| WritingPrompt | question, selected | 작성 | 유형명 노출 금지, 선택 사항 |
| SettingRow | title, detail?, onClick | 설정 | 아이콘 없는 메뉴 행 |

**컴포넌트화하지 않을 것:** 그래픽 없이 의미가 없는 중첩 카드, 단 한 화면에서 한 번 쓰는 특수 장식, 내부 상태 뱃지, 빈 아이콘 슬롯.


**v0.3:** `GraphicArtwork`의 성장 계산은 `graphics/progress.ts`로 분리. CSS 타이포는 `--type-*` 및 `--font-*` 토큰을 모든 화면에서 재사용.

**v0.4 그래픽 구조:** `GraphicArtwork`(스크린/상태별 컨테이너) → `glyphLayout`(테마별 구조 좌표·글자 기준각·모션 위상) → `progress`(날짜별 세로 리빌)로 분리. 눈꽃의 각 줄기/가지가 로컬 회전축을 갖는다. 붉은 양의 곡선 전용 배치 엔진은 후속 구현.

## v0.15 — 기록 검색 (확정)
| 컴포넌트 | 주요 props / 상태 | 역할 |
|---|---|---|
| DiaryRow | entry, reflectionCount, surface, date, divider, query | 기본/검색 목록 공통 행 |
| SearchField | value, onChange, onCommit, variant, disabled | plain 직선 밑줄 / outline 범용, IME 처리, clear |
| FilterToggle | label, pressed, onChange, variant | text 상태는 강조색/밑줄, 44px, 위치 고정 |
| PeriodPicker | value, months, years, onChange | 공통 연도/월 12칸 그리드, custom dialog |
| ListSectionHeader | label, id | 기본 월별 목록 제목 |
| ArchiveScreen | scopeMonth, initial, onOpen, onWrite | 기본 기록 목록 + 검색 모드, 상태 복원 |
상세: `labs/dajeongrok/archive-f.md` · `labs/dajeongrok/foundation/v13-native-popup-rules.md`.
