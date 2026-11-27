# 다정록 전 기능 기반 데이터 접근·동기화·백엔드 재평가 v0.2

**2026-11-27 · 기술/비용 의사결정 검토본. 실제 DB와 Auth는 아직 생성하지 않음. Vercel 배포 없음.**

## 결정 요약

1. **조건부 추천은 Firebase Authentication(Custom Token) + Firestore Standard(서울) + 최소한의 토스 mTLS 인증 브리지 유지.** 그 이유는 “무료 문서 읽기” 자체가 아니라 보안 규칙으로 클라이언트의 사용자별 원문 접근 차단, 서버리스 운영, 서울 DB 리전, 고정 월 기본료 없는 사용량 과금의 조합임. 클라이언트 단독 getAnonymousKey 인증은 절대 불가. 앱인토스 비게임에서 익명 인증 코드 서버 교환이 실제 지원되는지 SDK/실기기 확인은 출시 필수 조건.
2. **Firestore 50,000 read/day를 넘는 것이 핵심 비용 문제는 아님.** Standard 공식 `us-central1` 예시 초과 읽기는 $0.30/백만 건 (2026-11-27 확인). 지역별 요율 확인 필수. 50,000회 초과 40,000회/일 × 30일 = 120만 건 초과 → 미국 예시 읽기료 **약 $0.36/월**. 장기 저장량, 네트워크, 백업, 검색 UX, 운영자/사용자 접근 제어가 더 중요한 비용·신뢰 요인.
3. **원본 서버 저장, WebView 메모리 캐시, 연도별 개인 기록 인덱스(추후 구현)를 우선.** 영구 IndexedDB/SDK Storage는 클라이언트 XSS·기기 변경·WebView Origin/정리 문제로, 반드시 서버 원본이 있고 별도 암호화/수명정책이 있을 때만 도입.
4. **전문 검색과 무작위 꺼내보기는 다른 문제.** 검색은 “과거 전체 원문 중 매칭”을 요구하므로 검색 시 사용자 본문을 필요에 따라 내려받아 현재 세션 안에서 검색. 꺼내보기는 연도별 ID 인덱스에서 대상 하나를 고른 뒤 해당 글 1건만 읽으면 됨.
5. **12월 눈꽃·미래 작품 Canvas 재생을 서버에서 렌더링하지 않는다.** 월별 현재 기록 본문을 한 번 내려받아 동일 월의 홈/도감/기록 저장 후 효과에 재사용. 장기간 도감 썸네일은 화면에 나타난 달만 지연 로딩, 실제 작품 아닌 예시를 “내 작품”으로 보여주지 않음.
6. **백엔드 공급자만으로 완전 비공개가 되지는 않음.** Firebase rules Emulator 2명 교차 접근, 토스 인증코드 재사용·위조, Admin 권한, 로그 누출, Export/계정삭제·백업 복구 검수가 전부 통과되어야 출시 가능.

## 1. 실제 코드 기반 기능별 데이터 사용

| 기능 | 정확성에 필요한 데이터 | 최초 클라우드 접근 | 캐시/주의사항 |
|---|---|---|---|
| 스플래시/월별 프리뷰 | 공개 작품 레지스트리 + **가상 기록 15건** | **0** | 앱 빌드에 포함. 실제 사용자 DB 절대 미사용 |
| 홈/현재 달 눈꽃 | 해당 월 모든 일기의 **본문** + 날짜 + 작성 순서 | 월 최초 진입 시 그 달 약 0–31건 (동일 날짜 추가 가능) | 홈↔달력↔저장 후 홈 간 재사용. 홈 Canvas는 실제 본문 글자로 생성 |
| 날짜 달력 | 월의 고유 `entryDate` | 홈에서 이미 불러온 기록으로 계산 | 서버 재조회 0. 다른 달 날짜는 연도 인덱스로 사전 표시 가능 |
| 새 일기/수정/삭제 | 일기 1건, 앱 데이터 버전 | 1건 신규 저장/수정/삭제. 충돌시 재확인 | 서버 성공 후에만 저장 완료. 수정은 이전 날짜 보존. 삭제시 회고도 함께 삭제 |
| 저장 후 성장/14→15 연출 | 변경 전후 월간 일기 집합 | 저장 1건 이외 추가 원문 읽기 **0** | 모든 프레임/스냅샷은 클라이언트 워커에서 계산 |
| 도감 월별 목록 | 어떤 달에 기록이 있는지, 각 달의 고유 날짜·작품 키 | 연도별 기록 ID/날짜 인덱스 | 모든 과거 본문을 한꺼번에 내려받지 않음 |
| 도감 작품 타일/확대 | 그 달 사용자 일기 본문 전체 | 사용자가 해당 달 작품을 실제로 볼 때 월별 로딩 | 화면에 보이는 타일부터 lazy/virtual loading. 임시 예시 작품으로 오인 유발 금지 |
| 내가 남긴 칭찬 | 정렬된 일기 제목/본문 미리보기 | 첫 20–30건, 이후 커서 페이지네이션 | 앱의 현재 `ArchiveScreen`은 **전체 entries 배열을 메모리에서 필터링**함. 서버 전환시 페이지형 repository로 구조 변경 필요 |
| 전체 문구 검색 | 제목+본문 전체 매칭, 날짜 필터 | 명시적 전체 검색 시 해당 사용자 기록을 점진적 로딩 | 캐시되지 않은 달까지 **전부 검색 완료해야** “전체 검색 결과”라는 표현이 참. 검색어를 외부 분석/검색 서비스에 보내지 않음 |
| 회고가 있는 기록 필터 | entry 별 회고 존재 여부/개수 | 연도 인덱스의 private reflectionCount 또는 기록 로딩 | 회고 원문은 필요할 때만 로딩. 필터는 본문 없이 실행 가능 |
| 꺼내보기 (10건 개방) | 누적 저장 10건 기록, 과거 전체 ID 집합 | 개인 상태 1건 + 연도별 색인 1–N건, 선택 본문 1건 | 개방 시점은 영구 유지(삭제 이후에도 잠금 되돌리지 않음). 최근 글 제외 정책은 별도 확정 |
| ‘오늘의 마음’ 덧붙이기 | 특정 원문·회고 목록 | 해당 원문 1건 | 수정·삭제 시 소유권 확인, 원문 삭제시 자식 회고도 삭제 |
| 설정/하루 경계 | 본인 설정 1건 | 첫 진입 1건 | 기존 기록의 `entryDate`는 설정 변경 시 바꾸지 않음. 작성 중 날짜 경계 통과는 시작 당시 날짜 유지 |
| 새 달 첫 방문 이력 | 사용자×월×작품 버전 | 진입시 1건 또는 private profile과 함께 | 실제 완성형 프리뷰가 준비되지 않은 달은 ‘소개 완료’ 마킹하지 않음 |
| 그래픽 제안 | 운영팀으로 보낼 텍스트 | 제출 시 1건 | **일기와 다르게 운영자에게 전달하는 정보**. 제출 시 안내하고 일기 내용은 첨부하지 않음 |
| 알림 (미출시) | 동의·희망 시각·기기/메시지 토큰 | 승인 후 결정 | Toss 메시지 권한/정책, 비용/스케줄러 별도 설계 |
| 전체 기록 내보내기/계정 삭제 | 본인 모든 기록/종속 문서 | 요청 시 전체를 안전하게 읽거나 지움 | 삭제는 Firestore 하위 컬렉션까지 재귀적으로 수행. 백업 보존·파기도 별도 관리 |

**숫자 구분:** 작품 성장=`count(distinct entryDate)`; 꺼내보기 잠금 해제=`count(entry)`; 같은 날짜 여러 일기는 서로 다른 `id`가 있음. 프리뷰 가상 기록은 일기 수/실제 기록 저장량에 불포함.

## 2. 권장 클라이언트 데이터 접근 구조

```text
[Toss mini-app WebView]
  └─ Toss one-time auth code → [small trusted auth API] → mTLS exchange → Firebase Custom Token
     └─ Firebase Auth UID, Firestore Security Rules
         └─ repository layer (Auth validated; never trust submitted uid)
              ├─ CurrentMonthCache: full bodies needed for real snowflake
              ├─ ArchivePageCache: 20–30 records/page
              ├─ YearIndexCache: list of own IDs, date, month, reflectionExists (NO body)
              ├─ MemorySearchIndex: only loaded when user explicitly requests *all* history search
              └─ Settings/IntroSeenCache: 1–few docs
                 [Firestore Standard – Seoul]
                    users/{uid}/entries/{id}      (title?, body, entryDate, createdAt, updatedAt, revision, reflections)
                    users/{uid}/yearIndex/{yyyy} (entry IDs/date, reflection flags; no body)
                    users/{uid}/settings/current (boundary, reduce motion, unlock lifetime, saved copy cursor)
                    users/{uid}/introSeen/{versionedArtworkId}
                    users/{uid}/ideas/{id}       (if user-directed suggestions, private)
                    publicArtworkCatalog/{key}  (reviewed non-sensitive metadata ONLY)
```

### 단계적으로만 필요한 연도 인덱스

- 우선 연구: **연도당 private manifest 1개**를 유지(`id`, `entryDate`, `hasReflection`). 원문·제목·검색어를 넣지 않음.
- 일기를 저장·삭제할 때 문서+manifest를 atomic transaction/batch로 함께 변경. 다중 기기 충돌과 삭제 반영(soft-delete/tombstone 정책 포함) 테스트. manifest가 서버 권위인 카운터라는 뜻은 아니므로 서명/규칙 검증 없이 권한·과금 결정에 사용하지 않음.
- `꺼내보기`: 연도별 문서에서 전체 후보 ID 집합 작성 → 이전에 뽑은 글과 다른 ID 추출 → 해당 본문 **한 건만** 불러오기. 연도별 기록이 300건이라도 매회 300개의 본문 문서를 읽지 않음.
- `달력/도감`: 연도 색인에 있는 날짜만 보고 존재/작성일 수를 표현. 실제 월별 작품을 보려면 사용자 본문 원문을 가져와 그려야 하므로 영구한 원문 없는 ‘완성된 내 눈꽃’을 임의로 대신 보여주지 않음.
- Firestore 단일 문서 1MiB 한도 및 연도별 색인 크기/동시 갱신 경합에 유의. 실제 이용량을 측정해 연도 대신 분기별로 쪼갤 수 있도록 계약만 분리.
- **출시 초기에 무조건 인덱스를 구현할 필요는 없음.** MVP 사용자 몇백 명·기록이 적다면 먼저 단순한 월별 조회로 충분하고, 무작위 꺼내보기/도감의 전체 기간 정확성이 필요한 시점에 인덱스를 도입.

### 영구 기기 캐시

- MVP: Firestore Standard SDK **메모리 캐시 기본**, 데이터는 session memory. 브라우저 IndexedDB 영구 persistence 비활성화. 앱 삭제/기기교체 후 진짜 원본은 서버에서 복원.
- 작성 중 미저장 일기의 앱 종료 손실은 별도 **초안 보존 UX**를 설계해야 함. 서버 자동 초안 저장은 예상하지 못한 민감 문장 저장/쓰기 증가를 일으킬 수 있고, 원문 localStorage는 노출 위험. 먼저 이탈 확인과 저장 실패 시 본문 유지, 필요하면 사용자 동의가 있는 암호화 초안 저장/삭제 TTL을 연구.
- Cloud Firestore SDK가 기본적으로 캐시/재접속 쿼리를 수행한다고 해서 모든 Firestore 조회가 서버 읽기 0이 되는 것은 아님. 구체적으로 네트워크 조회 여부를 분리하고 사용량 계측.

## 3. 비용 모형 — 반드시 실제 계측으로 대체

**가정:** MAU 중 DAU=20%; 활성 MAU는 매월 동일한 사람들이 12개월 동안 10건씩 쓴다고 가정(장기 보관량에 보수적); 일기+회고+필드/인덱스 overhead 평균 **4KiB/건**; 앱 1회 방문마다 평균 15–25건을 서버에서 읽는 비최적화 시나리오; 30일/월; Firestore `us-central1` *참고* 초과읽기 $0.30/백만 건, egress 약 $0.12/GiB(10GiB 무료), 보관 약 $0.15/GiB-month(1GiB 무료). **서울 지역 실제 가격, 인증/API, 유료 백업/복구, 서비스 egress, 읽기 인덱스 과금은 별도 확인.**

| 가정 사례 | MAU/DAU | 1일 문서 읽기(앱열기 횟수×월 기록) | 초과 읽기료/월(참고) | 1년말 보관량(4KiB/건) | 1GiB 도달 시기(동일 MAU 유지 가정) |
|---|---:|---:|---:|---:|---:|
| 초기 | 300 / 60 | 1,800 (2×15) | $0 | 0.14GiB | 약 87개월 |
| 성장 | 3,000 / 600 | 24,000 (2×20) | $0 | 1.37GiB | 약 8.7개월 |
| 확장 | 15,000 / 3,000 | 225,000 (3×25) | **$1.58** | 6.87GiB | 약 1.75개월 |
| 대형 | 50,000 / 10,000 | 750,000 (3×25) | **$6.30** | 22.89GiB | 약 0.52개월 |

**산식:**
- `read/day=DAU × opensPerDay × documentsPerOpen`
- `US-baseline billable reads/month=max(0, read/day−50,000) × 30 × ($0.30/1,000,000)`
- `year-end storage=MAU × 10 records/month × 12 months × 4KiB`
- `approx egress GiB/month=read/day × 30 × 4KiB`.
- 확장 사례의 참고 egress 약 **25.75GiB/월**, 10GiB 무료 초과 약 **$1.89/월**(위 $0.12/GiB 가정). 1년말 6.87GiB 저장이면 무료 1GiB 초과 보관분 약 **$0.88/월**(해당 시점 단순 계산). 합계 약 **$4.35/월**은 Firestore의 *일부 항목만* 포함한 예시로서 **실제 서비스 총 청구액이 아님**.
- MAU가 계속 증가·이탈한다면 저장/조회/요금 패턴이 크게 달라짐. 평균 4KiB는 실제 한글 UTF-8 본문과 자동 색인·필드 overhead, 회고 길이를 계측해 보정.

**중요한 결론:** Firestore의 5만 read/day 무료 초과 자체는 매우 낮은 요율임. 앱 기능을 깨뜨리는 과도한 문서 합치기·기기 영구 캐시·동기화 복잡성을 $1 안팎 절감만을 위해 도입하면 엔지니어링/유출/데이터 유실 위험이 더 큼. 데이터 읽기 최적화는 **속도·트래픽·배터리·개인정보 최소 전송**을 위해 우선 실시.

### DB별 무료/유료 경계

| 공급자 | 무료에서 실제 먼저 부딪힐 수 있는 것 | 유료 시작 | 비공개 기록·운영 특징 |
|---|---|---|---|
| **Firebase Firestore Standard(서울)** | 1GiB 저장, 10GiB 월 outbound, 50k 문서읽기/일, 20k 쓰기/일 | **Blaze 고정 월 구독료 없음**, 사용량 기반. 인증 브리지·백업·초과 network 별도. 예산 알림은 hard-cap 아님 | 강제 Rules + Firebase Auth, 프라이빗 문서 접근 모델. 표준 full-text contains 미제공 → 기기 검색/Enterprise(별도 모델) 필요 |
| **Cloudflare Workers + D1** | **DB 1개 500MB**, 계정 5GB(여러 DB), Worker 하루 10만 요청, DB 하루 500만 행 read, 10만 행 write | Workers Paid **월 $5부터**, DB 1개 최대 10GB. 추가 스토리지/CPU/요청 별도 | SQL은 월별 조회·검색에 자연스러우나 **RLS 없음**, 자체 세션·SQL 소유권 방어 책임. APAC은 한국 저장 보장 아님 |
| **Supabase 서울(Postgres)** | DB 500MB, egress 5GB/월, 인증/요청 관련 무료 포함량 | Pro **월 $25부터** + 초과 과금 | RLS+SQL+연도별/본문 검색 확장 강함. Postgres pg_trgm/PGroonga 가능. 자동 백업/운영편의와 기본료 트레이드오프 |

**공식 소스** (2026-11-27 확인):
- Firestore 무료/요금: https://firebase.google.com/docs/firestore/pricing / https://cloud.google.com/firestore/pricing
- Firestore 무료 1GiB/50k reads/20k writes: https://firebase.google.com/docs/firestore/quotas
- Firestore Enterprise 별도 text search: https://firebase.google.com/docs/firestore/enterprise/text-search
- Firestore 캐시: https://firebase.google.com/docs/firestore/manage-data/enable-offline
- Firestore 삭제시 하위 컬렉션 삭제 안 됨: https://firebase.google.com/docs/firestore/manage-data/delete-data
- Cloudflare D1 가격/제한: https://developers.cloudflare.com/d1/platform/pricing/ / https://developers.cloudflare.com/d1/platform/limits/
- Cloudflare Workers 비용: https://developers.cloudflare.com/workers/platform/pricing/
- Supabase 요금/용량: https://supabase.com/pricing / https://supabase.com/docs/guides/platform/billing-on-supabase
- 앱인토스 비게임 계정/검증: https://techchat-apps-in-toss.toss.im/t/getanonymouskey/4484 , https://techchat-apps-in-toss.toss.im/t/anonkey/5263
- Cloudflare Workers mTLS outbound: https://developers.cloudflare.com/workers/runtime-apis/bindings/mtls/
- Firebase custom token: https://firebase.google.com/docs/auth/admin/create-custom-tokens

## 4. 프라이버시와 출시 차단 조건

- **기본 비공개**: Firebase Auth UID 소유 사용자 경로만 read/write. 익명 식별값 문자열을 클라이언트가 보낸 그대로 신뢰하는 인증은 불허. 신뢰된 토스 인증 코드 서버 교환 후 UID 세션만 승인.
- **기록 본문 색인 최소화**: 사용하지 않는 title/body/reflections의 자동 쿼리 인덱스는 끄기. 원문·검색어는 Analytics, 크래시 로그, A/B 이벤트·관리자 대시보드에 전송 금지. 개인정보를 별도 써드파티 검색 SaaS에 복제하지 않음.
- **Firebase Security Rules 2사용자 에뮬레이터 테스트**: A 토큰으로 B의 읽기/수정/삭제/검색/썸네일/회고/설정 불가, 미인증 전체 거부. SDK 캐시의 이전 사용자 기록도 계정 변경 후 절대 노출되지 않음.
- **토스 인증 지원 미확정 항목**: 비게임용 `createAnonymousKeyAuthCode`의 최소 버전, exchange TTL/호출 제한, 검증 인증서 바인딩, 탈퇴 콜백, 동일 계정/기기 변경 및 탈퇴 재가입의 UID 안정성, mTLS 장애 시 사용자 기록 보호. 모두 실제 토스 콘솔/실기기에서 검증. 공개 자료 중 2026년 11월 비게임 질문은 답변 여부 변동 가능.
- **Firebase 관리자 권한**: Security Rules는 일반 클라이언트를 보호하지만 Admin SDK는 우회 가능. 최소 IAM 권한, 자격증명 보관/교체, 운영자 원문열람 UI 미제공; 고객지원은 민감 정보 없이 처리.
- **계정 삭제**: Firestore 부모 문서 삭제는 하위 컬렉션을 자동 삭제하지 않음. 서버/백엔드 작업으로 모든 subcollection/인증 UID/작품 메타·세션/저장소 캐시/백업 정책까지 처리. 성공/실패 재시도·감사 상태 및 탈퇴 콜백 필요.
- **분실 복원과 백업**: Firebase 기본 데이터 중복보관은 사용자 오류/계정 오류 복구의 대체물이 아님. Firestore Managed Backups/PITR는 별도 유료 요금이며, 데이터 소실 대응을 위한 암호화 백업/복원 연습 비용을 MVP 의사결정에 포함.
- **고급 암호화**: 기본 TLS/at-rest 암호화 + Firestore Security Rules는 사용자 간 보호 수단이나 E2EE가 아님. 앱 클라이언트에 공용 AES 비밀키를 넣는 ‘보안’은 무효. 추가 E2EE가 필요하다면 키 분실/기기간 복구·검색/렌더링 UX를 별도 설계.
- **국외 처리**: Firebase/Supabase 서울 DB를 선택해도 계정 운영, 로그·백업, 수탁사의 데이터 처리 위치를 포함한 법무/처리위탁/국외 이전 정책 검토 필요.
- **비용 통제**: Google Cloud budget alert는 hard cap 아님. Firebase 쿼리 규모·egress 및 이상 요청, Auth 교환 QPS, 쓰기·삭제 실패, per-user document 수, DB 크기를 계측·알림. 불필요한 실시간 listeners 금지, OFFSET 대신 cursor.

## 5. 단계별 의사결정

**Gate A: 서비스 계약**
- 프런트의 현재 `ArchiveScreen`은 전체 `entries` 배열을 기반으로 실시간 필터링, 달력/도감도 전체 배열을 가정. 이를 “월간 repository + 페이지 + 연도 인덱스 + 검색 전용 페치”라는 새 데이터 접근 인터페이스로 분리해야 실제 백엔드 전환이 가능.
- 최초 사용자 흐름에서 “눈꽃 로딩 실패/인증 만료/저장 중 앱 종료”에 대한 UX 정의. 사용자 기록이 가장 소중한 서비스이므로 성공 전 화면에서 나가지 않기.

**Gate B: 인증 검증**
- SDK/토스 측 비게임 지원 및 mTLS exchange + Firebase Custom Token 인증 실기기 PoC. 안 되면 백엔드 선택 전체 재평가.

**Gate C: 정확성·사용성**
- 2명의 독립 사용자 실 계정 / 2기기에서 일기·회고·도감·검색·무작위 꺼내보기·수정·삭제·재진입·기기교체 테스트. IndexedDB 영구 프라이빗 캐시 보류.
- 검색시 모든 이력의 완전성을 표시. 꺼내보기는 마지막 뽑은 기록 중복 회피.

**Gate D: 총비용·운영**
- 실제 WebView instrumentation: `reads_per_session`, `reads_per_search`, `bytes_per_entry`, `documents_per_user`, `archive_open_rate`, `auth_exchange_per_launch`, `egress_MiB/day`, `storage_growth_GiB/month`, `failed_save_rate`, `query_p95` (본문·검색어·개인정보 절대 로그 금지).
- 7일간 부하 시뮬레이션 결과로 provider 선택 재확정. 분기 기준: 본문 서버 검색/복잡한 SQL이 핵심이 된다면 Supabase; 관리인력이 충분하고 해외 데이터/자체 인증 허용 시 D1; 현재 요구라면 Firebase 유지.

**현재 확정:** 설계 평가를 위한 우선순위는 **Firebase first, D1 second, Supabase third**. 이는 보안 검증 전 실제 운영 선택 확정이 아니다. Graphical registry 구현 코드는 PR #10에 독립되어 있고 백엔드 선택과 결합하지 않는다.
