# 다정록 백엔드 공급자 최종 비교 — Firebase/Firestore vs Cloudflare D1 vs Supabase (2026-11-27)

> **설계 결정 보류:** 먼저 작성한 D1 초안은 폐기하지 않되, Firebase/Firestore가 더 나은 가격·접근제어 후보로 확인되어 아래 최종 비교를 추가했다. 이 문서는 실제 서비스가 완성됐거나 보호된 상태라고 주장하지 않는다. 외부 계정·DB·인증서는 전혀 생성하지 않았고, 법무·실기기·보안 검증 이전에는 실제 사용자 기록을 업로드하지 않는다.
>
> 공통 필수조건: `getAnonymousKey()` 만으로 사용자 인증 금지. `createAnonymousKeyAuthCode()` → 서버가 토스 mTLS로 교환·검증한 사용자에 대해서만 서비스 권한을 발급. 정확한 SDK 버전/정책/인증서 지원은 실제 앱인토스 프로젝트에서 점검.

## 왜 Firebase를 추가 검토하는가

2025-11 앱인토스는 **Firebase 공식 WebView 연동 가이드**(Firestore CRUD 등)를 공개했다. 다른 플랫폼을 찾을 필요 없이 앱인토스와 작동 가능성이 비교적 명확하다(실기기 최종 검증은 여전히 필요). Firebase Authentication은 사용자별 Firestore Security Rules와 결합할 수 있다.

Firestore (Native mode) 무료 할당량: **DB 1개/프로젝트, 저장 1GiB, 일간 문서 읽기 50,000, 쓰기 20,000**. 다정록은 미디어를 저장하지 않고 텍스트 기록만 하므로 첫 앱 출시 단계에 적합하다. 서울 `asia-northeast3` 리전 가능. Firebase **Blaze는 사용량 기반 과금이며 고정 월 $25 수준의 기본 플랜 요구가 없다.** 다만 네트워크·인증·Cloud Functions, 초과 사용량/비정상 트래픽 등에서는 별도 비용이 발생하며 **Google Cloud 예산 알림이 실제 하드 사용 한도라는 뜻은 아니다.**

클라이언트 Firestore SDK(특히 Firestore Lite) 사용과 Firebase Auth를 제공해, 외부 Worker는 앱인토스 인증 코드 교환/사용자 UID 매핑/Custom Token 발급 **인증 브리지에만 사용**한다. 마이그레이션이 더 쉽다고 단정하지는 않으며 실제 App-in-Toss/SDK/WebView 동작을 검증해야 한다.

## 선택 비교

| 항목 | Firebase Firestore + Auth + 검증 Worker | Cloudflare Workers + D1 | Supabase PostgreSQL + RLS |
|---|---|---|---|
| 무료 DB 저장량 | **1 GiB/프로젝트 기본 DB** | 500MB **/DB** (계정 전체 5GB, 최대 10DB로 쪼개야 활용) | 500MB/프로젝트 |
| 무료 읽기/쓰기 | 50k docs read/day, 20k writes/day; 문서 수 기준 | 5m rows read/day, 100k rows write/day; SQL 행 접근 기준 | DB/API/MAU 포함량 적용 |
| 유료 전환 | **Blaze 사용량 기반, 고정 기본료 없음**. Firestore/인증/네트워크 등의 유료 사용량 발생 가능 | Workers Paid **$5/month**부터 + 초과량 | Pro **$25/month**부터 + 초과량 |
| 사용자별 접근 제어 | Firebase Auth **Security Rules**로 doc/collection 경계 강제 | 서버의 `user_id` 소유권 WHERE 직접 구현. **RLS 없음** | RLS 기반 SQL DB 차단(정확한 인증 매핑 전제) |
| 사용자 인증 | 토스 mTLS 검증 → Worker가 **Firebase Custom Token** 서명 → `signInWithCustomToken()` | 토스 mTLS 검증 → Worker 자체 SHA256 세션 | 토스 mTLS 검증 → 별도 JWT/세션 브리지 → Supabase 인증 |
| DB 데이터 위치 | **서울 리전 선택 가능** | APAC 힌트는 **한국 저장 보장 안 됨** | **서울 리전 선택 가능** |
| 구현·운영 난이도 | Auth Token 서명·Rules 설계/에뮬레이터 테스트. Firestore 조회 요금 주의 | 자체 세션/암호화/API/IDOR/DB 모두 구현, 초기 절대 비용 예측 쉬움 | 통합 SQL/Auth/RLS와 백업, 상대적 기본료 높음 |
| 데이터 모델 | 사용자별 경로에 문서 저장, 분산형 조회 | 서버 전용 SQLite 관계형/제약 | 표준 PostgreSQL 관계형/제약 |
| 확장 | 읽기 과금/문서 1MiB 한도/구조 설계 필요 | Free 개별 DB 500MB. Paid 단일 DB 최대 10GB, 그 후 샤딩 | Pro 8GB 포함 이후 용량별 과금 |

### 조건부 우선순위

**1순위(보안 규칙 + 무료 용량 + 서울 + 사용량 과금 균형): Firebase/Firestore + 서버 토스 인증 브리지.**
- 앱인토스에서 `createAnonymousKeyAuthCode()`·Worker mTLS·`signInWithCustomToken()`·Firestore SDK이 실제 WebView에서 작동하고, Firebase Security Rules 에뮬레이터에서 제3자 접근이 차단된다면 우선 도입.
- 별도 로그인 UI 없이 인증하고, JWT는 Firebase Auth가 관리. 서비스 DB 접근은 `request.auth.uid`에 묶는다. 본문을 공개하지 않는다.
- **과금 방지:** 초기엔 현재 월만 페이지 단위 조회, 불필요한 실시간 리스너 제거, 캐시와 사용량 알림, 인증 브리지 레이트리밋. 원문은 Analytics/오류 보고에 보내지 않음.
- **중요:** 클라이언트가 읽고 쓰는 모델이므로 DB 서버 운영자·인증 서비스에 대한 원문 접근 가능성은 존재한다. Firestore 기본 TLS 및 저장 암호화는 종단간 암호화(E2EE)가 아니다. 사용자만 복호화하는 강한 비밀성이 요구된다면 키 복구 UX와 E2EE를 별도로 설계.

**2순위(월 $5 내외 서버 기반 일원화 및 본문을 서버에서 별도 암호화): Workers + D1.**
- 사용자 익명 키 서버 검증은 동일, 모든 글은 Worker를 통과, D1은 프런트에 공개하지 않는다.
- Worker 자체 인증/세션/SQL 소유권 필터 누락 시 사용자 간 노출 위험. 본문 AES-256-GCM 필드 암호화 구현은 추가 위험을 줄일 수 있으나 **암호화 키 유출**은 별도로 대비.
- **규제 쟁점:** D1 데이터 한국 저장 보장 안 됨. 국외 이전/수탁 법적 검토 전에 운영 확정 금지.
- DB SQL 스키마는 `backend/migrations/0001_dajeongrok_d1.sql`, 관계 제약 테스트는 `backend/tests/test_d1_schema.py`에 작성했고 **실 DB 적용 안 함**.

**3순위(팀 운영편의와 PostgreSQL 선호): Supabase 서울 + RLS.**
- 잘 설계된 RLS는 강점이지만 토스 서버 인증을 Supabase 유저 JWT에 어떻게 안전하게 매핑할지 별도 개발이 필요. 무료 500MB, Pro $25 이상 고정료를 수용한다면 유력.

## Firebase 제안 아키텍처

```text
다정록 앱인토스 WebView
  ├─ User.createAnonymousKeyAuthCode() : 일회성 코드
  │  └─ HTTPS POST /auth/toss/exchange (코드만)
  ▼
Cloudflare Worker (민감 키·인증서 secret, 운영자 권한)
  ├─ mTLS: 토스 anon-key/exchange → 검증된 익명 subject
  ├─ HMAC(서버 pepper, subject) → Firebase uid (비가역·다른 이용자와 충돌 방지)
  └─ 서명된 **Firebase Custom Auth Token** 전달 (짧은 유효기간)
  ▼
앱인토스 WebView: Firebase Auth signInWithCustomToken
  └─ Firebase ID token을 이용해 Firestore Lite 읽기/쓰기
       └─ Firestore Security Rules: request.auth.uid == {uid}
            └─ users/{uid}/entries, settings, introSeen, ideas (서울 region)
```

**Firebase Auth를 아무도 인증하지 않은 채로 `signInAnonymously()`만 사용하지 않는다.** 그것은 재설치 시 계정 유지 및 토스 사용자 식별과 다를 수 있고, 사용자 간 소유권 증명 정책이 꼬일 수 있다. `getAnonymousKey()`를 입력받아 그 문자열로 Firebase uid를 만드는 것도 금지.

Worker에는 Firebase service account 비공개 서명키/토스 mTLS 자료를 별도 secrets로 저장. Firebase 프로젝트 공개 설정 값(apiKey 등)은 비밀키가 아니지만 Auth Admin 서비스 계정키는 절대 클라이언트에 담지 않는다. **커스텀 인증 서명, 앱 탈퇴 콜백, 토스앱 최소 버전은 검증 전 정책 가정**이다.

## Firestore DB 설계 v0

```text
users/{uid}                                 (부모 문서는 직접 노출·수정하지 않음)
  /entries/{entryId}                        일기: entryDate, title?, body, referencePrompt?, createdAt, updatedAt, revision
      ↳ reflections: [{id, body, reflectionDate, createdAt, updatedAt}]   // 초기 소량 배열
  /preferences/current                       하루 경계, 움직임, 꺼내보기 잠금, 카피 카운터
  /artworkSeen/{safeEncodedVersionedKey}      month, artworkKey, seenAt
  /ideas/{ideaId}                            month, body, createdAt

artworkCatalog/{safeKey}                    공개되는 작품명/월/준비 상태/버전만
```

- 모든 `users/{uid}` 접근에는 **Firebase Auth UID와 URL 경로 UID가 반드시 같아야 한다**는 규칙을 적용. Firebase Admin SDK는 Security Rules를 우회할 수 있으므로 운영 키 권한을 최소화하고 어드민에서 개인 글을 열어보는 도구를 만들지 않는다.
- 모바일에서 읽기 비용을 줄이기 위해 최초 실행 시 최근 월의 20~30건부터 읽고, 과거 내역은 추가 페이징. 불필요한 실시간 청취 및 전체 내역 반복 로딩 금지.
- "작품 단계" = `entryDate`의 **고유 날짜 수**, 꺼내보기 개방 기준 = 기록 문서 전체 개수. 둘은 데이터에서 계산하되, 향후 규모가 늘면 사용자별 카운터에 서버 트랜잭션 적용.
- 일기 본문·회고문은 검색 인덱스/로그/공용 모니터링·공개 컬렉션에 중복 저장하지 않음. 사용자 전용 전체 검색은 기기 메모리의 본문을 대상으로. 쿼리와 인덱스는 날짜/작성시간/ID에 국한.
- 같은 날 여러 기록 허용. 하나의 entry 문서 아래 회고 배열을 두면 삭제 시 함께 제거되고 추가 문서 읽기를 줄일 수 있음. 회고 배열 길이 상한/Firestore 문서 1MiB 제한을 준수해야 함. 확장 시 회고 하위 컬렉션으로 분리+서버 재귀 삭제.
- 오프라인: 사용자 글은 UI 메모리에서만 임시 유지, 실패/토큰 재발급 시 작성 내용 유지. Private diary를 IndexedDB/Analytics에 무심코 영구 저장하지 않도록 SDK 캐시 정책 지정.
- 사용자의 작품 Canvas 전체/15일 프리뷰 가상 일기를 DB에 저장하지 않는다. 모든 월간 렌더러는 앱과 관리형 레지스트리에 포함하고, DB에는 공개 메타데이터 + 사용자별 소개 확인 이력만 저장.

### 예시 Firestore Security Rules

`backend/firebase/firestore.rules`를 제공하되 아직 **Firebase Rules Emulator로 검증하지 않았다.** 구현 시 타입/필드 allowlist, createdAt 변경 금지, revision 보호, owner 경로, 공개 catalog read-only 등을 추가 검수할 것.

**출시 차단 테스트**
1. 유저 A의 토큰으로 유저 B 경로 읽기·열거·쓰기·수정·삭제 전부 거부.
2. 인증 없음/위조 Custom Token/만료 JWT/토스 인증 코드 재사용 거부.
3. A의 일기 객체에 `ownerId=B` 필드를 넣거나, 쿼리 경로만 바꿔도 거부.
4. UID가 같은 사용자가 앱을 재설치해도 자신의 기록만 복원. 실제 Toss 계정 탈퇴/연결해제 시 접근 권한 철회 및 삭제 처리.
5. 프리뷰 샘플은 영구 사용자 문서에 전혀 저장되지 않음.
6. DB 삭제 / Export 기능 / Firebase Auth 계정 삭제 / 백업에서의 잔존 기한 일치 검증.
7. 50,000 reads/day와 저장 1GiB의 50~70%를 초과하기 전에 경보 및 플랜 가이드.
8. Firebase App Check/reCAPTCHA 사용 여부는 앱인토스 **외부 스크립트 검수 정책**과 실기기 동작 확인 후 결정. App Check는 사용자 인증을 대체하지 못함.

### 공식 근거

- 앱인토스 Firebase 공식 연동 가이드 공지: https://techchat-apps-in-toss.toss.im/t/unity-webgl-firebase/1494
- 앱인토스 익명키 검증 문제: https://techchat-apps-in-toss.toss.im/t/getanonymouskey/4484
- 앱인토스 anon auth code 교환: https://techchat-apps-in-toss.toss.im/t/anonkey/5263
- Firestore 무료 용량: https://firebase.google.com/docs/firestore/quotas
- Firebase Blaze 요금: https://firebase.google.com/pricing
- Firestore 서울 region: https://firebase.google.com/docs/firestore/locations
- Firebase custom auth tokens: https://firebase.google.com/docs/auth/admin/create-custom-tokens
- Firestore Rules 소유권: https://firebase.google.com/docs/firestore/security/rules-conditions
- Cloudflare D1 Free 500MB/DB: https://developers.cloudflare.com/d1/platform/limits/
- Supabase: https://supabase.com/pricing

## 아직 결정하지 않은 것

- Firebase vs D1 실제 기반 선택 (정식 승인 전 동시 운영으로 비용 증가시키지 않음).
- 실제 앱인토스 인증서/SDK 지원 범위와 Custom Token 발급 연결, 인증 오류·탈퇴 정책.
- Firestore Security Rules 에뮬레이터에서 실제 두 사용자 교차 접근 테스트.
- 개인정보의 외국 서비스 업체에 의한 처리·위탁/국외 이전과 한국 DB 데이터 위치 관련 법적 검토.
- 최종 저장 암호화 수준(기본 플랫폼 암호화 vs 서버 AES-GCM vs 사용자 E2EE)과 키 복구/분실 정책.
- Cloudflare Workers auth bridge + Firestore direct 접근 비용 예상치를 실제 DAU/문서 조회량으로 시뮬레이션해 최종 확정.
