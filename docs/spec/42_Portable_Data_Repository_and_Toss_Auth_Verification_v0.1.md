# 다정록 공통 데이터 접근 계층 및 토스 인증 검증 준비 v0.1

2026-11-27 / 검수 브랜치 feat/provider-neutral-data-auth-contract  
**상태: 실제 데이터 접근 계약과 모의 테스트 구현. 실사용 DB와 실제 Toss 인증은 미연결.**  
Vercel 배포 및 main 병합 없음.

## 목표와 선택 이유

현재 제품 목표는 개인 칭찬일기의 가치 검증이다. 미래 공동 일기장을 위한 전체 관계형 모델을 먼저 만들지 않는다. 대신 Firebase와 Supabase 어느 쪽으로 옮겨도 일기 데이터의 ID, 사용자 소유권, 날짜, 버전 및 원문·회고 연결관계를 유지할 수 있게 공급자 중립적 데이터 계층을 구축했다.

## 작업물

- src/data/access/contract.ts : DiaryRepository 단일 계약. 현재 달 기록, 커서 페이지 기록, 연도별 가벼운 메타데이터, 일기 CRUD, 회고, 사용자 설정, 월별 작품 소개 확인 이력
- src/data/access/memoryRepository.ts : 테스트용 사용자 격리 메모리 구현. 실제 권한 확인 수단이 아니며 운영 데이터에 사용 금지
- src/data/access/cachedRepository.ts : 월별 메모리 캐시, 중복 로딩 방지, 성공한 일기 갱신 후 무효화, 세션 전환 시 전체 초기화. 이전 요청의 느린 응답이 새 캐시를 덮지 못하도록 epoch 처리
- src/data/access/providerCodecs.ts : 동일한 stable ID와 기록 내용을 Firestore 문서 ↔ 앱 모델 ↔ PostgreSQL 행으로 변환. 행의 소유자 값 확인은 방어층일 뿐 Firebase Security Rules나 Supabase RLS를 대체하지 않음
- src/data/access/tossSessionClient.ts : 실제 앱인토스 SDK 인증 코드 함수를 주입받아 서버에 일회성 코드만 전송하는 WebView용 인터페이스. 서버가 Firebase Custom Token을 발급한 경우 signInWithCustomToken을 추가로 수행해야 실제 Firebase ID Token을 얻을 수 있음
- backend/auth/toss-anonymous-bridge.mjs : 서버만의 인증 교환 경계. mTLS Toss 코드 검증 함수와 세션 발급 함수가 반드시 주입되며, 없으면 실행 실패. 허용 Origin만 처리하고 원본 익명키나 사용자 ID를 요청 본문으로 받지 않음
- backend/auth/verified-user-id.mjs : Toss 서버에서 검증한 subject와 서버 비밀키 및 앱 ID를 HMAC-SHA256으로 결합해 장기적으로 안정적인 의사익명 사용자 ID 생성. Firebase UID와 미래 PostgreSQL owner_id의 연결 기준
- tests/access-contract.test.ts : 사용자 격리, 회고, 수정 충돌, 날짜/ID, 커서 조회, 메타데이터 최소화, 캐시, 공급자 직렬화 테스트
- tests/toss-session-client.test.ts 및 backend/auth/*.test.mjs : 미인증 요청 거부, 위조 사용자 식별 시도, 실패한 교환에 대한 세션 발급 거부, 인증 서버 설정 및 내부 사용자 ID 안정성 검증
- .github/workflows/verify.yml : 위 자동 검사와 기존 React 타입검사/브라우저 검사를 같은 CI에서 수행

현재 앱의 src/data/store.ts는 sessionStorage 기반 리뷰 구현을 유지하며 실제 백엔드 기능을 사용하지 않는다. 전환 작업은 실제 토스 인증과 데이터 접근 규칙이 검증된 뒤 별도의 PR로 진행한다.

## 공급자 중립적 데이터 계약

원본 일기 ID는 공급자와 관계없는 안정적 UUID를 사용하고, entryDate(기록 귀속 날짜), createdAt(저장 시각), updatedAt(수정 시각), revision(충돌 감지), title/body/referencePrompt를 보존한다. 하루에 여러 기록이 가능하고, 작품의 작성일 수는 날짜의 고유 개수로 계산한다.

회고는 반드시 같은 사용자의 원문 entryId에 연결한다. 설정의 rediscoverUnlockedAt은 일기를 나중에 삭제해도 잠금이 다시 생기지 않게 별도 보관한다. 월별 작품과 스냅샷은 버전 키를 이용하고, 사용자 기록에서 만든 이미지는 필요 시 재생성 가능한 파생 데이터로 취급한다.

운영용 어댑터의 필수 보안: 사용자 ID는 클라이언트 본문이나 쿼리 문자열을 통해 받지 않고, 서버가 검증한 세션/Firebase Auth 정보에서 결정한다. Firestore는 Auth UID 경로 + Security Rules, Supabase는 인증된 JWT + RLS로 실제 권한을 제한한다. 둘 다 아직 구현·실제 에뮬레이터 검증 이전이다.

## Toss 인증: 확인된 공식 흐름과 미확인 사항

공식 자료에서 확인한 방향은 다음과 같다.

1. 비게임 WebView에서 getAnonymousKey()가 반환한 문자열은 식별에 사용할 수 있지만 사용자 권한 증명으로 사용할 수 없음.
2. 클라이언트가 User.createAnonymousKeyAuthCode()로 생성한 일회성 코드를 서버에 전달하고, 서버가 해당 앱의 mTLS 인증서로 Toss의 anon-key/exchange API에 전달해 검증된 사용자 식별키를 받아야 함.
3. 검증된 subject는 서버에서 앱 ID와 HMAC secret을 결합해 내부 user ID로 변환. 비밀키 변경 시 매핑 이관 절차 필요.
4. Firebase 선택 시 서버에서 Firebase Custom Token 발급. 클라이언트가 signInWithCustomToken 호출 후 Firebase ID Token으로 Firestore 접근.
5. 장래 Supabase로 이전해도 Firebase Auth 제3자 인증 연동 지원. Firebase ID Token에 role: authenticated custom claim이 필요하고, Supabase RLS는 Firebase UID 텍스트를 auth.jwt()->>'sub'로 비교. 발신 issuer/audience 검증 필요.

**실제 통신 미검증:** 이 저장소에는 앱인토스 SDK 설치, 실제 앱 콘솔 계정/허용 WebView Origin, 앱별 mTLS 인증서/키, Firebase 프로젝트 서명 권한이 없다. 따라서 사용자 계정으로 Toss 익명 인증 코드를 발급하거나 실제 Toss 서버의 응답 형식과 버전 호환성을 실기기에서 확인할 수 없었다. 모의 응답 통과를 실사용 인증 성공으로 표시하면 안 된다.

### 실환경 검수 체크리스트

- 토스 앱에 등록된 다정록 비게임 미니앱의 실제 SDK에서 인증 코드 발급 가능 여부/최소 지원 버전 확인
- 인증서 발급 및 등록, 서버 mTLS handshake, Toss API 결과 봉투(resultType 등)와 errorCode 확인
- 만료·재사용 코드 실패/요청 한도, 인증서 교체, QR/출시환경 사용자 식별 차이 점검
- 서버가 같은 Toss 계정에 대해 일관된 UID를 발급하는지 두 기기에서 검증, 다른 계정의 ID를 위조할 수 없는지 확인
- Firebase 서비스 계정 키는 서버 secret에만 보관. Custom Token을 signInWithCustomToken으로 교환한 후 Security Rules 두 사용자 교차 접근 테스트
- 인증 해제/탈퇴 콜백, 계정 삭제, 데이터 내보내기 및 복원 정책 확인
- 실패한 인증 동안 사용자 원문 초안은 유지하고, 저장 완료 화면으로 진행하지 않도록 UX 연결
- 전체 기록을 반환하는 오류 로그/분석 로그/공개 API 및 원문 자동 업로드를 금지

### 실제 검증에 필요한 준비물

앱인토스 앱의 정식 등록 상태와 QR 테스트 환경, 서버에만 보관하는 mTLS 인증서, 토스 교환 엔드포인트의 정확한 요청/응답 스키마, Firebase 테스트 프로젝트와 서명 권한이 필요하다. 채팅이나 GitHub 소스에 개인키·인증서를 게시하면 안 된다. 준비가 되면 **일기 DB 생성 없이 인증만 먼저** 성공/실패 검증하고, 다음 단계에서 테스트 계정 두 개로 DB 권한을 검수한다.

## 운영 전 다음 단계

Gate 1: 실제 Apps-in-Toss 인증 코드 → 서버 mTLS 교환의 성공과 보안 검증  
Gate 2: Firebase Rules / Supabase RLS 중 선택한 공급자의 읽기·쓰기 권한 검증  
Gate 3: 실제 UI의 sessionStorage 데모를 Repository로 전환, 저장 실패·중복·충돌·재인증·캐시·오프라인 시나리오 전부 QA  
Gate 4: 개인 일기 원문을 안전하게 클라우드에 저장하도록 출시 스위치 활성화

2026-11-27 기준 어느 공급자도 실제 프로젝트를 생성하거나 앱에서 활성화하지 않았다. 배포도 하지 않았다.

## 공식 출처
- Apps-in-Toss 익명키 인증 불가: https://techchat-apps-in-toss.toss.im/t/getanonymouskey/4484
- 앱인토스 인증 코드→서버 교환: https://techchat-apps-in-toss.toss.im/t/anonkey/5263
- 게임/서버 교환 공식 답변: https://techchat-apps-in-toss.toss.im/t/topic/5168
- Firebase Custom Token: https://firebase.google.com/docs/auth/admin/create-custom-tokens
- Firebase Web custom auth: https://firebase.google.com/docs/auth/web/custom-auth
- Supabase Firebase Auth third-party: https://supabase.com/docs/guides/auth/third-party/firebase-auth
