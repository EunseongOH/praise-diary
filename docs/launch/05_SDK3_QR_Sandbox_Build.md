# 다정록 SDK 3.x QR 테스트 번들 인수인계 (2026-11-27)

**2026-11-27 자동 빌드 성공:** [GitHub Actions 전체 통과](https://github.com/EunseongOH/praise-diary/actions/runs/45954067483) / [테스트 번들 다운로드](https://github.com/EunseongOH/praise-diary/actions/runs/45954067483/artifacts/15178595398). `dajeongrok.ait` 파일을 확인함. QR 실기기 검수 전.

**목적:** React/Vite 기존 화면을 앱인토스 WebView SDK 3.x 패키징하여 실제 토스 테스트에서 화면·탭·뒤로가기를 확인한다. 개인 일기를 실제로 저장하는 제품 버전이 아님.

## 핵심 변경
- **SDK3는 granite.config.ts가 아니라 apps-in-toss.config.ts**를 사용한다. 등록된 appName=dajeongrok, 비게임, permissions=[] (위치·연락처·카메라 접근 없음), webBundleDir=dist.
- Node.js **24+**에서 @apps-in-toss/web-framework ^3.0.2, @apps-in-toss/devtools ^3.0.2, AIT 개발 도구의 Vite 플러그인을 사용한다.
- Native NavigationBar에 뒤로 버튼을 추가하고 backEvent를 기존 App 스택/미저장 확인/닫기 처리에 연결했다. **토스 실제 Android/iOS 동작은 검증 전.**
- QR 테스트용 빌드는 VITE_SNOWFLAKE_ARTWORK=1, VITE_AIT_REVIEW_BUILD=1, VITE_AIT_NATIVE_NAV=1을 함께 사용한다. 무작위 가상 일기 생성 플래그인 VITE_DEMO_DATE와 테스트용 완성 15일 강제 모드는 끈다.
- 모든 테스트 번들에는 화면 상단에 **실제 일기/개인정보 입력 금지**, 저장·복원 미보장 문구를 표시한다.
- 정식 제출용 `npm run bundle:ait:release`는 `audit:ait:strict`에서 반드시 차단된다. 서버 영구 저장이 완료되지 않으면 이 우회를 제거하지 말 것.

## 로컬 실행
```sh
# 저장소를 GitHub에서 clone한 뒤
npm install
npm run check
npm run bundle:ait:review
# 이후 생성된 *.ait 파일은 콘솔 앱 빌드에서 '토스앱 테스트' 용도로만 업로드
```
Node.js 24 이상. 빌드 산출물은 루트, build/ 또는 dist/ 아래 `.ait`에 생성되는지 확인하고, 업로드 전에 ZIP 내부의 개인정보 및 VITE 데모 변수를 재확인한다. `npm run bundle:ait:release`는 현재 출시 차단 게이트 때문에 실패한다.

## GitHub Actions 다운로드 (개발 환경 불필요)
GitHub Actions > `Prototype quality checks` > 최신 `feat/ait-sdk3-review-bundle` 워크플로 성공 결과 > Artifacts `dajeongrok-ait-sdk3-sandbox-ONLY` ZIP 다운로드. 압축을 풀고 `.ait` 파일만 콘솔의 '앱 번들'에 올린 뒤 **토스앱 테스트**를 수행한다. 테스트가 완료되어도 `검토 요청`은 하지 말 것.

## 제출 정보
- 한국어 앱 이름: 다정록
- 영어 앱 이름: Dajeongrok
- 부제: 나의 칭찬이 작품으로 자라는 일기
- 자세한 소개: docs/launch/app-registration.draft.json/product.detailDescription (500자 이내)
- 고유 appName: dajeongrok
- 사용자 연령: 콘솔 화면상 만 19세 이상(읽기 전용), 정책 재확인
- 출시 노트(현재 테스트용): docs/launch/app-registration.draft.json/product.releaseNotesReview
- 내부 메모(현재 테스트용): docs/launch/app-registration.draft.json/product.internalMemoReview

## 테스트 체크리스트
1. `.ait`를 토스앱 테스트에 업로드했을 때 시작 화면/리소스가 로드되는가
2. 실제 12월 눈꽃에 일기를 1개 저장했을 때 문자열 기반 작품이 표시되는가
3. 홈/달력/도감/꺼내보기/설정 간 내비게이션, native backEvent, 웹 AppBar 중복 노출 여부
4. 작성·수정 도중 뒤로가기 누르면 미저장 경고가 뜨는가
5. 앱 종료·재진입 시 sessionStorage 기록이 유실될 수 있다는 배너와 실제 동작 확인
6. WebView safe-area·키보드·스크린리더·저사양 CPU·핀치 확대
7. 보안/출시 전 개인정보 문서/DB/토스 인증/목표 일수/테마/계정 삭제 미완료는 docs/launch/02_P0_QA_and_Release_Gates.md 확인

## 공식 참조
- https://github.com/toss/create-ait-app
- https://toss.im/apps-in-toss/blog/update-26-11-18
- https://toss.im/apps-in-toss/blog/update-26-08-12

## 2026-11 기기 테스트의 월별 눈꽃이 보이지 않았던 이유와 수정

2026년 11월에는 실제 월 그래픽이 아직 등록되지 않았고, 12월 테마는 미래 월로 잠겨 있다. 따라서 첫 테스트 번들을 11월에 열면 홈에서 12월 눈꽃을 볼 수 없었다. 이것은 **월 매핑/공개 정책의 결과**이지 Canvas 엔진이 기기에서 정상인지 확인한 증거는 아니다.

이번 샌드박스 빌드에 한해 홈 바로 위에 **'12월 눈꽃 렌더링 테스트'** 버튼을 추가했다. 버튼을 누르면 실제 12월 SnowflakeArtwork 엔진으로 가상 칭찬 1일/5일/15일의 화면을 렌더링한다. 이 가상 문장은 일기 스토어에 추가되지 않으며 실제 날짜도 변경하지 않는다. Canvas 픽셀 판독으로 비어 있는 경우 QA 상태를 표시한다.

실기기 검수 순서: 1) 홈 상단 테스트 버튼 → 2) 15일 → 3) '눈꽃이 화면에 그려졌어요' 상태 및 눈에 보이는 모양을 확인 → 4) 1일/5일 단계도 확인 → 5) 실패 시 전체 화면과 토스 OS/앱 버전을 보내 다시 조사. 픽셀 상태가 성공이어도 시각적으로 정상인지 확인해야 한다.

**확인 범위:** GitHub 브라우저/빌드 검수와 실제 토스 WebView 환경 검수는 별개이며, 원인이 월 잠금인지 Canvas/워커인지 실기기 테스트를 통해 최종 분리한다.
