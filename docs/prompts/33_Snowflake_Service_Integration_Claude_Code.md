# Claude Code — Gate 3E 눈꽃을 MVP ArtworkSlot에 통합

**모든 진행·테스트·결과를 한국어로 보고. 사용자가 원하는 것은 GitHub에 문서만 올리는 것이 아니라, 실제 홈/저장/도감/월 상세에서 지금까지 만든 눈꽃을 보며 검수할 수 있게 하는 것.** 단, 사용자 검수 전 main에 병합하거나 실제 사용자에게 배포하지 않는다.

## 0. 구현 전 필수 확인

- 현재 연구용 원래 Windows 경로: C:\Users\User\diary\praise-diary
- 저장소: EunseongOH/praise-diary
- 이번 작업 GitHub branch(이미 생성됨): feat/snowflake-service-integration
- 통합 대상 기준 branch: feat/mvp-integration
- 연구 보존 branch: feat/design-system-prototype
- GitHub에 develop branch는 현재 없다.

원래 로컬 작업 트리에서 다음을 순서대로 수행:

    git status --short
    git branch --show-current
    git worktree list
    git fetch origin feat/mvp-integration feat/snowflake-service-integration feat/design-system-prototype
    git show origin/feat/snowflake-service-integration:docs/handoff/33_Snowflake_Service_Integration_Plan_2026-11-26.md

**마지막 상세 명세를 끝까지 읽고 본 프롬프트보다 우선하라.** 추가로 AGENTS.md, docs/handoff/31_MVP_통합_작업기준_2026-11-26.md, docs/spec/12_날짜설정_기록접근_특별목표_정책.md 및 원격 feat/design-system-prototype의 Gate 3E 명세를 읽어라.

**절대 금지:** 원래 미커밋 연구 작업 트리에서 git checkout/switch/reset/restore/clean/pull/force push, 로컬 사용자 원문/참고 사진/영상/폰트 바이너리 GitHub 업로드, 기존 연구 파일/산출물 덮어쓰기, main 병합·배포.

## 1. 별도 Git worktree를 만들어 안전하게 이식

1) 현재 연구 경로에 있는 Gate2I / Gate3B / Gate3E.1 / Gate3E.1b+3E.2 TS/TSX/mjs 소스 및 주요 README/metrics를 **실제로 확인**하고 의존성/파일 해시 목록을 작성. 추측 API로 구현 금지.
2) 새로운 인접 경로 C:\Users\User\diary\praise-diary-service-integration 이 비어 있고 사용 가능한지, 기존 worktree/브랜치 이름 충돌이 없는지 검사.
3) 필요 시 예시 명령을 환경에 맞게 사용:
    git worktree add -b local/snowflake-service-port ..\praise-diary-service-integration origin/feat/snowflake-service-integration
   이름이 이미 있다면 새로운 안전한 로컬 브랜치 이름을 사용. 원래 연구 worktree는 그대로 두고 이후 모든 npm, 브라우저 테스트, 코드 수정은 **신규 worktree에서만** 실행.
4) 원래 src/dev의 구현을 import graph로 추적해서 실제 2I I3 + 3B R3 + 3E G1 smoothing/SB Balanced 후보에 필요한 소스만 선택적으로 복사/이식. **가상 테스트 fixture, 스크린샷/MP4, 개인 정보, 로컬 환경설정, dev UI를 통째로 복사하지 말 것.**
5) src/graphics/snowflake/ 아래 앱용 engine/adapter/renderer/lifecycle로 정리. dev-only renderer 직접 import로 생산 번들을 비대하게 만들지 말고 진짜 재사용 코드만 이식. 종전 Gate3D 스프링·팔 압축 재사용 금지.

## 2. 실제 서비스 화면에 연결

기존 원격 feat/mvp-integration 코드에서 아래 접점을 반드시 확인:
- src/graphics/ArtworkSlot.tsx (공통 플레이스홀더, Props 계약 보존)
- src/screens/HomeShell.tsx (홈)
- src/screens/App.tsx (save 성공 뒤 saved screen, page.mode 및 previousWrittenDays)
- src/components/content.tsx (MonthTile/도감: small)
- src/screens/CollectionScreen.tsx (월 상세)
- src/components/GestureArtwork.tsx (핀치 확대)
- src/data/types.ts / src/data/store.ts / src/data/themes.ts.

구현 요구사항:
- theme.kind가 snowflake이고 feature flag가 켜진 경우 ArtworkSlot에 **실제 눈꽃** 출력. 아니면 기존 fallback을 보존; sheep을 눈꽃 엔진으로 대체하지 말 것.
- 원본 DiaryEntry entries와 distinct entryDate를 소스로 사용. 같은 날 여러 편은 밀도만 변화; Reflection/꺼내보기 덧붙인 마음은 성장/글자 source와 무관.
- 홈 normal idle, 저장 완료 new date growth, same-day addition, target 달성 complete reward, 도감 160px static, 월 상세 pinch 3.2x와 key navigation, 0일 empty/미래 잠김을 각각 실제 앱에서 검증.
- 저장 성공 후에만 page.mode와 previousWrittenDays에 따라 자동 모션. React rerender/StrictMode/재방문으로 complete reward 중복 재생 금지. reducedMotion/OS prefers-reduced-motion이면 정적 완성/상태 텍스트 제공.
- 2026년 12월 특별 목표일 수는 여전히 **미정: targetDays=null**. 절대로 15로 바꾸지 않는다. 연구 15단계 원형은 preview-only visualStageDays=15처럼 **실제 완료 트리거와 분리**. 현재 targetDays null이면 사용자용 자동 complete reward 발동 금지. 연구용 시나리오로만 mock 15일 완료 테스트 가능. 앱에 미확정 숫자 노출 금지.
- 원본 I3 20초 실제 앞/뒤 구절 교대·중앙 코어 2.5D·H3 겨울빛/희소 파스텔 보존. Gate3E G1+Balanced를 **시연 후보로만** 기본 설정; 최종 미적 승인 아님.
- 작품은 기존 full-bleed #0C1111 배경에 결합, 외곽 카드/테두리/부가 툴바 만들지 말 것.
- source offset/entryId/copyIndex ledger, 사용자 일기 본문 네트워크·analytics·console·HTML data-* 미노출.
- viewport resize/DPR/visibilitychange/일기 CRUD/unmount/replay/worker/RAF/resource cleanup, 15개 prefix worker가 번들되는지 검사.
- 리뷰용 기능 플래그 VITE_SNOWFLAKE_ARTWORK 및 VITE_SNOWFLAKE_COMPLETION_REPLAY. production 기본 OFF, local review ON으로 확인. .env.local 커밋 금지, .env.example에는 이름·설명만 추가 가능.

## 3. 검증

실제 새 worktree에서 npm install 및 npm run check, npm run test:e2e와 해당 테스트 명령을 확인해 실행. 신규 서비스 E2E와 screenshot 생성:
- 홈·저장 완료·도감 2열·월 상세·핀치 상세, 320/375/390/430px, 160px tile 및 DPR1/2.
- 빈 상태, 1/3/8/14/15/16+ 날짜, 같은날 +2, 변경/삭제/복원/소급, 1월 sheep unchanged.
- 편집 화면·꺼내보기·Reflection CRUD 회귀, 기존 사용자 원문 감상과 글자 소스 독립.
- complete trigger only when known targetDays, beforeDays < targetDays <= afterDays and save success.
- disabled/enabled flags, reducedMotion, memory/RAF/worker cleanup, no raw diary body in DOM data-* / debug/URL.
- 동일 fixture/seed/art clock에서 Gate2I I3, 3B R3와 서비스 버전 동일성 비교. 렌더 크기나 viewport가 다른 경우 정규화하고 실제 차이 보고.
- 저장 직후 hidden-canvas 준비 frame p95/p99/max, GPU없는 PC FPS, 실제 Apps-in-Toss WebView 미검증 명시.
- 현재 GitHub CI의 PR base는 main만 대상으로 되어 있음. feat/mvp-integration 대상 Draft PR에도 CI가 동작하도록 신규 branch에서 verify.yml을 최소 수정하거나 별도 체크를 구성하고 결과 검수.

실제 화면 캡처와 재현 절차를 artifacts/snowflake-service-review/ 아래 **가상 데이터만**으로 기록하되, 실제 사용자 일기·폰트·영상 reference는 어떤 형태로도 원격 저장 금지.

## 4. 이번에 한정한 GitHub 커밋과 PR 허용

이전 눈꽃 연구 프롬프트에서 commit/push 금지했던 것은 **기존 로컬 연구 소스 보호**를 위한 규칙이다. **이번 사용자 요청에서는 신규 별도 통합 worktree에서 안전하게 검증된 이식 코드에 한하여** 작은 commit 및 push를 허용한다.

- 선택 포팅 엔진 commit → ArtworkSlot/화면 연결 commit → 테스트/CI/docs commit.
- staged 파일/비밀정보/원본 글자 검토 후 git push origin HEAD:feat/snowflake-service-integration (force 금지).
- 코드가 실제 원격에 올라간 뒤 Draft PR base=feat/mvp-integration, head=feat/snowflake-service-integration 으로 생성/업데이트. PR은 사용자 검수 전 merge하지 말 것.
- main 직접 변경·병합·실제 앱인토스/사용자 공개 배포 금지. 로컬 연구 원본 업로드 금지.
- 기술적으로 포팅을 못 했으면 '서비스 연결 완료'라고 허위 보고하지 말고 정확한 블로커 설명.

## 5. 보고 요구

한국어로 (1) 원래 로컬 디렉터리 보호, (2) 신규 worktree/branch, (3) 포팅된 모듈과 source dependencies, (4) 홈·저장·도감·월상세 실화면/캡처, (5) UI/데이터/feature flags/targetDays 미정 처리, (6) npm 빌드/테스트/CI, (7) frame time/WebView 미검증, (8) git commit SHA 및 Draft PR 주소 **실재 링크만**, (9) 남은 미적/기술적 개선 사항을 제시.

지금 새 worktree에서 구현을 진행해. 목표는 **시연용 서비스 실제 화면에 눈꽃을 연결하고 GitHub feature 브랜치에서 검수 가능하도록 만드는 것**이지, main으로 배포하거나 출시 승인하는 것이 아니다.
