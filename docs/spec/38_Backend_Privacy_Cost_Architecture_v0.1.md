# 다정록 백엔드 아키텍처·프라이버시·비용 검토 v0.1

작성: 2026-11-27 | **설계안**. 실제 Cloudflare D1/Supabase 프로젝트·계정·인증서·실사용 DB는 생성·변경하지 않았다. 현재 앱은 sessionStorage 데모이며 **실제 클라우드 기록/유저 격리는 구현되지 않았다**.

## 결론

**조건부 1순위: Cloudflare Workers + D1(SQLite) + 토스의 서버 검증 가능한 익명 식별 인증 코드 교환 + 자체 단기 세션.**

- 특성: 비게임 칭찬일기, 텍스트 중심, 사용자끼리 기록 공유/협업 없음, 하루 쓰기 빈도가 낮음, 이미지 원본을 DB에 저장할 필요 없음, 운영비에 민감함.
- 장점: Workers+D1 Free에서 시작, Workers Paid **$5/월부터**; D1의 사용량 기반 요금과 서버리스. D1은 **서버에서만** 접근하고 개인 기록은 서버 확인 사용자 ID로 접근 제어.
- 핵심 주의: D1에는 PostgreSQL RLS가 **없다.** 모든 엔드포인트/쿼리에서 소유권 검증을 구현하고 IDOR/BOLA 회귀 테스트를 강제해야 한다. 직접 DB 액세스 권한을 클라이언트에 주는 구조는 금지.
- 국내 데이터 위치가 절대 요건이거나 앱 개발팀이 인증/인가 운영 코드를 직접 안전하게 유지할 역량이 부족하면 **Supabase 서울 리전 + RLS**를 우선 검토한다. Supabase로 옮겨도 토스 인증 브리지 자체가 자동 해결되는 것은 아니다.

## 확인된 최신 사실과 불확실성

1. **앱인토스 비게임**에서 `getAnonymousKey()`는 사용자 식별자이지만, **서버 검증 가능한 인증 증명이 아님** (2026-07 공식 커뮤니티 답변).
2. 최신 개발자 가이드/2026-11 공식 지원 답변에는 `User.createAnonymousKeyAuthCode()` → 자체 서버의 mTLS `/api-partner/v1/apps-in-toss/users/anon-key/exchange` → 서버 검증 식별키 → 자체 세션 흐름이 제시됨. `getAnonymousKey()` 값을 클라이언트가 보내는 방식과 **다르다**. 해당 기능의 비게임 사용 가능 범위, 최신 SDK API 서명, 최소 토스 앱 버전, 호출 한도·탈퇴 콜백은 실제 앱인토스 계정에서 출시 전 재확인.
3. 토스 로그인 `appLogin()`의 인가 코드 → mTLS 백엔드 토큰 교환은 별도 서버가 필요한 더 무거운 대안. 개인 일기의 기본 기록 기능에는 실명·토스 프로필 조회가 필요하지 않다.
4. D1 Free 저장 공간은 **계정 합계 5GB, DB 한 개당 최대 500MB**이다. Paid는 계정 무료 포함 저장 공간 5GB, **DB 한 개 최대 10GB**, 초과 저장 공간 $0.75/GB-month. Free: 5M row reads/day, 100K writes/day; Workers Free 100K requests/day. Paid Workers 기본료 $5/월(요청/CPU 포함량과 초과 과금 있음).
5. Supabase Free: 500MB DB, 50K MAU, 주간 비활성 일시중지 가능. Pro $25/월부터, 기본 DB 8GB, 100K MAU, 기본 백업 7일. 인증 기능과 PG RLS 운영 측면이 강점.
6. Cloudflare D1는 저장/전송 암호화 기본 제공(AES-256/TLS). **이것만으로 다른 사용자 접근을 막는 것은 아니다.** 사용자 소유권 검증, 세션, 애플리케이션 데이터 암호화가 별개로 필요하다.
7. D1의 APAC은 최적 위치 힌트이며 **한국 저장을 보장하지 않는다**. Supabase는 서울(`ap-northeast-2`) 리전 선택 가능. 국외 이전·처리위탁 관련 개인정보보호법상 검토, 고지/처리방침, 데이터 처리 위치·수탁사 확인이 필수이다.

공식 출처:
- https://techchat-apps-in-toss.toss.im/t/getanonymouskey/4484
- https://techchat-apps-in-toss.toss.im/t/topic/5168
- https://techchat-apps-in-toss.toss.im/t/anonkey/5263
- https://github.com/toss/apps-in-toss-examples/blob/main/toss-login/README.md
- https://developers.cloudflare.com/workers/runtime-apis/bindings/mtls/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/d1/platform/limits/
- https://developers.cloudflare.com/d1/reference/data-security/
- https://developers.cloudflare.com/d1/reference/time-travel/
- https://developers.cloudflare.com/d1/configuration/data-location/
- https://developers.cloudflare.com/workers/platform/pricing/
- https://supabase.com/pricing
- https://supabase.com/docs/guides/platform/regions
- https://www.privacy.go.kr/front/contents/cntntsView.do?contsNo=367

## 서비스 아키텍처

```text
토스 앱 → 다정록 WebView(React + Vite, 앱인토스 배포)
   │
   │ ① createAnonymousKeyAuthCode()로 일회성 인증 코드
   │ ② POST /v1/auth/toss-anonymous/exchange (코드만 서버에 보냄)
   ▼
Cloudflare Worker: 공개 HTTPS API
   │ -- mTLS certificate binding, 서버 내부에서만 사용
   ├── 토스 anon-key/exchange → 검증된 anonKey (다른 사용자로부터 전달받은 값 신뢰 금지)
   │
   ├── HMAC(keyed, anonKey) → 앱 내부 user_id 조회/생성
   ├── 256-bit 랜덤 세션 발급 → 해시만 D1에 보관
   ├── 모든 요청의 세션 및 user_id 식별
   │
   ├── 입력 검증, 소유권 검사, AES-GCM 암호화/복호화
   ▼
Cloudflare D1 (Worker 바인딩으로만 접근)
   ├── app_users / user_identities / app_sessions
   ├── diary_entries / diary_reflections
   ├── user_preferences / monthly_artwork_seen
   └── graphic_ideas / artwork_releases
```

**서버에서 출처가 검증된 ID만 소유자 기준으로 사용한다.** 클라이언트가 전달한 `user_id`, `anonKey`, `entry.owner_id` 값은 신뢰하지 않고 데이터 소유권 결정에 사용하지 않는다.

인증은 매 요청마다 토스 API를 다시 호출하지 않는다. 처음 진입할 때 검증 코드를 교환한 뒤 짧은 **불투명(opaque) 세션 토큰**을 발급한다. 클라이언트는 이를 메모리에서만 사용하고, 세션 만료/재실행 시 새로운 토스 인증 코드를 발급받아 재인증한다. 별도의 장기 리프레시 토큰을 요구하지 않는 구성이 초기 MVP에는 더 단순하고 유출 표면이 작다. WebView 일시중단/토큰 만료 중인 글은 입력창에 보존하고 조용히 재인증 후 저장하도록 설계한다.

## DB 스키마 (실행용 초안)

[`backend/migrations/0001_dajeongrok_d1.sql`](../../backend/migrations/0001_dajeongrok_d1.sql)

| 테이블 | 주요 내용 | 프라이버시 |
|---|---|---|
| `app_users` | 내부 임의 UUID, 상태, 생성일 | 실명·이메일·전화 수집 안 함 |
| `user_identities` | provider, **검증된** 식별키의 keyed HMAC | 원본 Toss key 미저장 |
| `app_sessions` | 세션 토큰 SHA-256 해시, 소유자, 만료, 폐기 | 유효한 세션만 접근 |
| `user_preferences` | 하루 경계 시간(0~4), 모션, 꺼내보기 영구 개방 시점, 카피 인덱스, 첫 진입 기록 | 사용자별 1행 |
| `diary_entries` | UUID, user_id, **기록 귀속 날짜**, 암호화 제목/본문/질문, revision, 저장·수정 시각 | 본문 공개 컬럼 없음 |
| `diary_reflections` | UUID, 소유자, 원문 ID, 암호화 회고 본문, 회고 날짜 | (entry_id,user_id) 복합 FK로 교차 소유 연결 거절 |
| `monthly_artwork_seen` | 사용자·월·버전별 소개 확인 | 실제 작품 프리뷰가 표시된 경우에만 기록 |
| `graphic_ideas` | 사용자 제안 텍스트 암호화 | 사용자별 접근 |
| `artwork_releases` | 버전 키, 월, 공개 작품명, 준비·활성·종료, 목표 일수 | 사용자 기록이 없는 공개 메타데이터 |

**기록 수 정책:** `count(distinct entry_date)` = 작품 성장 단계 / 같은 날 여러 기록은 글자 밀도에 기여. `count(entries)` = 꺼내보기 개방(현재 10건) 기준이며 둘은 혼용 금지. 작품은 사용자가 작성한 본문을 기기에서 렌더링하고 완성 Canvas 스냅샷을 매번 DB에 저장하지 않는다. 프리뷰용 15건 가상 일기는 앱 빌드의 정적 fixture이며 DB에 넣지 않는다.

**날짜:** 서버에는 `entry_date`(서비스 하루 기준 local date)와 `created_at`(UTC 실제 저장 시점)을 별도로 보존한다. 사용자가 화면에서 하루 경계 시간을 변경해도 이미 저장된 날짜는 바꾸지 않는다. 시작 당시 선택한 날짜의 저장 유예는 기존 클라이언트 로직과 일치시킨다.

## 권한·보안 정책

1. **기본값은 100% 비공개.** 아무 사용자도 남의 기록을 볼 수 없고, 공개 일기 목록·검색 API·공용 storage bucket을 만들지 않는다. 작품 공유가 추후 추가되어도 사용자의 명시적인 버튼 클릭에서만, 본문이 포함되지 않은 **공유 전용 결과물**을 별도로 생성한다.
2. **소유권 강제:** `SELECT ... WHERE user_id = :server_authenticated_user_id AND id = :entry_id`, UPDATE/DELETE도 동일. 조회 시점뿐 아니라 변경 시점에도 소유권 재검증. 예상치 못한 0행 결과는 일괄 404로 처리해 타인 기록의 존재 여부를 추측하지 못하게 한다.
3. **두 겹의 격리:** Worker는 인증/인가를 수행하고, DB는 reflection→entry 복합 외래키로 타인의 원문에 회고가 연결되는 것을 차단한다. D1에는 PostgreSQL RLS가 없으므로 API/IDOR 테스트가 출시 차단 조건.
4. **본문 보호:** TLS 전송, D1 제공 저장 암호화에 더해 Worker에서 애플리케이션 필드 암호화(AES-256-GCM) 권장. 매 필드 새 난수 IV, 사용자/행/필드 식별자를 인증 부가데이터(AAD)에 바인딩, versioned 비밀 키로 복호화. 키는 Wrangler secret/KMS에만 보관, Git/프런트엔드에 포함하지 않음. 이 방식은 **종단간 암호화가 아님**(Worker 운영환경이 복호화 가능). 완전한 서버 비가독성이 필수라면 별도 E2EE 설계를 해야 하며 복구/기기 이전 UX가 더 복잡해진다.
5. **세션:** 토큰은 CSPRNG 256-bit 난수, D1에는 토큰 해시만 저장; API 응답은 `Cache-Control: no-store`. XSS 방지(CSP, 사용자 입력은 React 텍스트로만), CORS 허용 origin 제한, TLS, 민감 API rate limit, 웹뷰 중 토큰 로그/분석 전송 금지.
6. **입력/조회 제한:** 본문 길이 최대치(출시 전 확정), 페이지네이션, SQL prepared statement `bind` 사용. 클라이언트가 응답 필드/표 이름/SQL 정렬 구문을 지정하지 못하게 함. 대량 삭제/내보내기는 재인증·확인 UX, 백업/복구 전략 마련.
7. **오류/로그:** 일기 본문, 제목, 암호화 키, Toss 인증 코드, 발급 토큰, 원본 anonKey, SQL 바인딩 값을 로그에 절대 남기지 않는다. 모니터링에는 익명화한 에러 종류/타이밍/사용량만 사용.
8. **운영권한:** 관리자 웹 UI에서 원문 일기를 조회하는 기능을 만들지 않는다. 최소 권한/2FA/서비스 비밀 키 교체/CI branch protection 및 보안 점검.
9. **삭제:** 계정 삭제 시 관련 테이블의 모든 행을 FK CASCADE로 지우고 세션도 폐기. 타임트래블/외부 백업에 남는 기간(Free 최대 7일, Paid 최대 30일)과 개인정보 파기 정책의 일치 여부를 검토한다.
10. **법적/사업 검수:** 개인정보 처리방침, 수탁사/국외 이전, 파기, 문의·열람·정정·삭제, 미성년자 사용 가능성, 앱인토스 심사 체크리스트 확인. 서비스 보안 위험을 0으로 만든다고 보증할 수는 없으며 위협 모델링/침투 테스트/정기 갱신으로 위험을 낮춘다.

### API 개요 (모두 인증 필요, 인증 교환만 예외)

- `POST /v1/auth/toss-anonymous/exchange`: 일회성 코드만 받음 → 서버 검증 → 앱 세션 반환.
- `GET /v1/me`, `PATCH /v1/me/preferences`: 내 사용자·설정.
- `GET /v1/entries?month=YYYY-MM&cursor=...`, `POST /v1/entries`
- `GET /v1/entries/:id`, `PATCH /v1/entries/:id`, `DELETE /v1/entries/:id`
- `GET /v1/entries/:id/reflections`, `POST ...`, `PATCH .../:reflectionId`, `DELETE .../:reflectionId`.
- `POST /v1/artwork/:key/intro-seen`: 실제 월간 프리뷰 제공 후 사용자별 기록.
- `GET /v1/export`, `DELETE /v1/me`: 본인 데이터 내보내기·완전 삭제.
- `GET /v1/artworks`: 검토된 공개 작품 메타데이터만, **임의 실행 코드 없음**.

작성 API에 사용자 소유자 ID를 받지 않는다. 모든 행의 사용자 ID는 검증된 세션에서 서버가 지정한다. 동일 요청 중복 저장 방지를 위해 클라이언트 UUID와 idempotency-key를 도입하고, `version` 기반 낙관적 잠금으로 다른 기기에서의 편집 충돌을 검출한다. 유효하지 않은 인증은 저장 전 원문 초안을 유지한 채 재인증하도록 한다.

## 비용 및 증설 판단

| 항목 | Workers + D1 | Supabase |
|---|---|---|
| 시작 | $0 | $0 |
| 무료 개별 DB | 500 MB/DB, 계정 전체 5 GB, DB 최대 10개 | 500 MB/프로젝트, 활성 2개 |
| 무료 중단 | 무료 일별 API/read/write 상한 초과 시 해당 작업 실패 | 일주일 미활동 시 프로젝트 일시중지 가능 |
| 유료 기본 | Workers $5/월부터; 초과 요청/CPU 및 D1 저장량 과금 | Pro $25/월부터; 포함량 초과 과금 |
| 기본 인증 | Toss 코드를 Worker에서 검증하고 직접 세션 관리 | Supabase Auth는 좋지만 **Toss 토큰 브리지**를 별도로 설계해야 함 |
| 사용자 격리 | 서버의 소유권 필터(실수 위험, 자체 테스트 중요) | PostgreSQL RLS(정확한 auth.uid 연동 전제) |
| 한국 데이터 위치 | APAC 힌트는 국가 보장 아님 | 서울 DB 리전 선택 가능 |
| 운영 난이도 | 인증·인가 코드 직접 운영, 비용 효율 좋음 | Postgres/Auth/RLS/백업 통합 운영, 상대적으로 간편 |
| 장기 이식성 | SQLite 덤프 + API 데이터 계약을 통한 추후 PG 이전 가능 | 표준 Postgres 기반 |

**비용 임계값의 실제 병목은 MAU보다 작성량 및 API 요청 수, 암호화된 본문·색인·백업 크기**이다. 평균 작성량·본문 크기·DAU를 계측하여 500MB의 50~70% 사용 시점부터 증설·샤딩 또는 PostgreSQL 이관을 계획한다. D1 Free 5GB는 단일 DB에서 모두 쓸 수 없다. 대규모 샤딩은 초기부터 하지 않는다.

추가 고려: Cloudflare Workers 유료 자체에 외부 Toss 인증서 서비스·도메인, 외부 백업, 운영 모니터링, 보안 검토 인건비가 포함되는 것은 아니다. 실제 청구는 사용량과 정책 변화에 따라 달라진다.

## 백업·모니터링 최소선

- D1 Time Travel: Free 최대 7일 / Paid 최대 30일. 삭제/손상 복구 테스트 필수.
- 런칭 이후에는 별도 **암호화된 장기 백업**을 R2 등 제한된 저장소로 정기 반출. 복원 연습·백업 키 관리·삭제 요청 반영 정책 없이는 백업만 믿지 않는다.
- 모니터링 KPI: 사용자 수/작성 건수/요청 수/평균 본문 바이트/DB 총량/저장 성공률/저장 지연 p95/인증 교환 실패율/권한 거부 수(개별 본문 무수집).
- 사용자별 비용 및 저장량을 추정하되 사용자 일기의 내용을 분석·수집하는 서버 분석은 MVP에서 하지 않는다.

## 개발 단계 (release gate)

**P0 구조 합의**
- 월간 아트워크 등록부 분리(별도 PR), 인증 방식/SDK 호환성 공식 확인, 정책상 PIPA 국외이전/한국 리전 허용 여부 결정.
- D1 스키마 설계와 SQLite FK/제약 테스트; 실사용 DB 및 인증서는 아직 생성하지 않음.

**P1 서버 전용 검증**
- Worker 로컬 D1 마이그레이션, Torn authCode/mock mTLS 어댑터 인터페이스, 비밀키 관리, 세션 TTL, 데이터 암복호화, 권한·수정 충돌·삭제 테스트.
- `getAnonymousKey()` 만으로 일기를 읽는 엔드포인트는 **금지**.
- 다중 사용자 IDOR/BOLA 검수: ID 교환, 본문/회고 삭제, 월별 조회, 설정/도감, 미인증/만료/변조 토큰.

**P2 클라이언트 적응**
- `DiaryRepository` 인터페이스 도입(local demo | authenticated API). 데모 sessionStorage를 실제 사용자의 영구 저장으로 취급하지 않음. 저장 성공 전 화면 이동 금지, 오프라인/실패 시 초안 보존.
- 실제 WebView QR/토스앱에서 인증 코드/mTLS 통신·기기 변경·로그아웃·세션 재인증 테스트.
- 사용자 데이터 삭제/내보내기/지원 프로세스 구현.

**P3 릴리스 게이트**
- 실제 본문 2사용자 교차 접근 자동·수동 테스트, 개인정보 처리방침과 수탁/국외이전 검토, 보안 헤더·CSP, 비용 알림, 백업 복원, 장애·유출 대응, 모바일 성능 검수 완료.
- 이후에만 정식 프라이빗 기록 API 활성화. **기존 Vercel 미리보기/메인 서비스 자동 배포 금지.**

## 그래픽 확장과 DB의 분리

- 클라이언트: `src/graphics/artworkRegistry.ts`에서 `artworkKey`별 **컴파일된** 렌더러, 상태(`ready/planned`), 같은 엔진 프리뷰 fixture, prefetch를 관리.
- 월별 설정: `MonthTheme.artworkKey`는 불변 버전 키. `2026-12/snowflake-v1`, `2027-01/sheep-v1` 등.
- **새 작품 연결 절차:** 실제 렌더러 코드 제작 → 실제 일기 15건과 같은 형식의 완성형 프리뷰 → registry `planned→ready` 및 loader 연결 → 시각/성능/기록 격리 QA → 버전된 앱 빌드에 반영. 홈·도감·저장·새 달 소개는 모두 같은 registry를 소비.
- DB에는 사용자 일기/소개 확인 및 공개 출시 메타데이터만 저장. `artwork_releases`가 ready라도 프런트엔드 빌드에 해당 renderer가 없으면 자동으로 준비 중 상태. 미승인 외부 JavaScript, 외부 CDN 스크립트를 DB 값으로 실행하지 않는다.
- 중간에 작품을 교체할 때 기존 앱의 과거 사용자 작품을 손상시키지 않도록 새 버전 키와 데이터 마이그레이션 명세를 분리한다. 이 기능에는 새 유료 서비스가 필요하지 않다.

## 아직 하지 않은 일

- **Cloudflare나 Supabase 실사용 프로젝트 생성/스키마 적용/키 등록/토스 앱 인증 연결 없음.**
- 실제 이메일·실명 수집, 사용자 원문 기록 동기화, 실사용 사용자 RLS/API 권한 검수 없음.
- 이번 SQL은 **DB 구조를 검증하기 위한 초안**으로, 자동 마이그레이션 실행/실서비스 접근을 금지한다.
