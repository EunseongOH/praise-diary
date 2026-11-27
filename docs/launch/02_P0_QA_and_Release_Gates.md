# 다정록 · 앱인토스 실출시 QA 및 P0 차단 요건
상태: 2026-11-27. 완료된 웹 UI QA는 앱인토스 실환경의 인증/보안/동작 통과를 의미하지 않는다.

## P0 출시 차단 작업과 완료 증거
| ID | 실제 해야 할 일 | 현재 상태 | 통과 증거 |
|---|---|---|---|
| A01 | 고유 appName 등록, 운영자/고객센터 확정 | **앱 생성 완료 (`dajeongrok`, 사용자 제공 링크)** / 운영자·고객센터는 미확인 | 콘솔 운영 정보 확인 필요 |
| A02 | SDK 3.x 설치, granite.config.ts, .ait 번들 | 미구현 | 실제 AIT build 및 QR 실행 |
| A03 | 토스 NavigationBar, backEvent/닫기 및 CORS 실제 origin | 미연결 | iOS/Android 기기 QA |
| A04 | 일회성 Toss 익명 인증코드 → 서버 mTLS 교환 | 모의 함수만 | 두 계정의 실제 인증 성공/재사용 실패 |
| A05 | Firebase/Supabase 한 곳 결정, Auth·Security Rules/RLS | 추상 계약만 | 테스트 계정 A가 B의 모든 기록에 접근·삭제할 수 없음 |
| A06 | 서버 원본 영구 저장, 오프라인/중복/충돌/재인증 처리 | 현재 sessionStorage 데모 | 앱 삭제/기기 변경 후 원본 복원, 실패 시 초안 보존 |
| A07 | 전체 내보내기/계정 삭제/토스 연결 해제/백업 파기 | 미구현 | 하위 기록·회고·캐시 삭제와 복구 테스트 |
| A08 | 월별 그래픽 출시 플래그, 목표 일수, 첫 소개 | 연구 플래그에만 12월 실제 눈꽃, 1월 미제작 | 실제 빌드 0/1/8/목표일 사용자 플로우 |
| A09 | 비게임 라이트 모드 정책 vs 기본 다크 테마 공식 확인 | 현재 color-scheme:dark | 토스 공식 답변·승인 또는 디자인 적합화 |
| A10 | 외부 CSS/폰트 및 WebView 제한 | jsdelivr, Google Fonts 외부 요청 | 정책 확인 및 허용 가능한 번들 구성 |
| A11 | 개인정보처리방침/이용약관/개발자 고객센터 | 미작성/미게시 | 실제 URL 및 신고·문의 경로 검증 |
| A12 | UX 첫 로딩/8.5초 연출, 뒤로가기, 키보드, 접근성 | 웹 QA만 | 실기기 + Screen Reader/200% 확대/배율 검수 |
| A13 | 실 서비스에서 데모·가상 기록 및 검수용 URL 조작 제거 | build flag로 분기 중 | 프로덕션 번들/스토리지 확인 |
| A14 | 그래픽 제안·도감 스냅샷·사용자 의견 입력 | 제안은 시연용 저장 | 실제 서버 저장 또는 미출시 화면 숨김 |
| A15 | 앱 아이콘/썸네일/실제 스크린샷 및 등록 문구 | 자산 없음 | 사용자 데이터 없는 PNG 및 스크린샷 검수 |

## 기기·서버 QA 우선 시나리오
1. 최초 앱 실행 → 사용자 인증 → 첫 칭찬 작성 → 서버 저장 → 실제 눈꽃 갱신 → 앱 재실행 후 같은 글 복원.
2. 같은 기록일에 일기 2편 작성 → 기록 2편, 작품 고유 날짜 1일.
3. 일기 10편 작성 후 꺼내보기 개방 → 이후 9편/0편 삭제해도 개방 유지.
4. 일기 상세 회고 작성·수정·삭제 및 원본 삭제 연동; 외부 계정 ID로 회고를 붙이는 요청 거부.
5. 두 기기에서 같은 일기를 수정 → revision 충돌 표시, 원문 손실 없음.
6. 2026-12-31 → 2027-01-01 날짜 경계 (00:00·03:00) 및 어제 작성, 작성 도중 날짜 전환 유예.
7. 목표 도달 시 milestone 이미지 → 월 마감 시 최종 변경분만 final 스냅샷 → 편집/삭제 후 이전 글자 표시 안 됨.
8. 전체 기록 검색 결과(과거 페이지 포함), 12개월 도감 스크롤/이미지 지연 로딩, 핀치 확대.
9. 앱 종료/백그라운드/토스 계정 전환/캐시 초기화/기기 교체 → 본인 기록만 보이며 서버에서 복원.
10. 앱 연결 해제/사용자 전체 탈퇴 → 본문·회고·사용자별 기록·스냅샷·세션 삭제, 백업 보존기간 준수.
11. mTLS 인증 실패/인증 코드 만료·재사용/서버 장애/다른 사용자 ID 위조 → 권한 발급 없음, 입력 초안 보존.
12. 토스 NavigationBar의 X/뒤로와 자체 AppBar 충돌 없음; 앱 내 화면 전환·입력 도중 경고; 화면 켜짐/키보드.
13. Android 320/360/390/430px, iOS safe area, 글자 확대, VoiceOver/TalkBack, prefers-reduced-motion.
14. 실제 0/1/5/8/15일 샘플로 그래픽 성능, 저사양 FPS/메모리, 처음 진입 시 로딩 시간.
15. 정식 링크와 실제 console appName, 아이콘, 현재 월 작품, 공개 고객센터/개인정보 처리방침의 일치 확인.

## 설계·검수 리스크 중 신규 발견
- 현재 기본 다크 퍼플 테마는 비게임 라이트 모드 기준과 충돌 가능. 기존 디자인을 무단 변경하지 않고 토스 측 허용 조건 질의.
- 기존 App.tsx는 자체 AppBar/back 로직만 사용해 Native Toss navigation bar와 충돌 가능; SDK 연결 후 통합.
- 2026-12의 targetDays는 null이며 2027-01은 planned renderer. 앱 오픈 날짜에 맞춰 목표/공개 작품 범위 정리.
- 기존 index.html은 외부 Pretendard CDN/Google Fonts 사용. 리소스 검수·폰트 라이선스 및 미연결 네트워크 대응.
- 외부 API CORS는 SDK 3.1.1+ 실제 origin(https://<appName>.apps.tossmini.com) 추가 필요. Origin은 인증 증명이 아니며 토스 인증 검증을 대신하지 않음.
- 신규 사용자를 위한 8.5초 첫 진입 시퀀스는 검수용 기능 플래그. 첫 화면 시간 및 건너뛰기·재방문 0.8초와의 일치 확인.
- Firebase/Supabase를 선택하기 전 백엔드를 이중 구축하지 않음. 공통 DiaryRepository 계약과 UID 매핑은 기존 PR #11.

## 작업 순서
1. 콘솔에 앱을 등록하고 appName 고정, 운영자/고객센터 및 법적 URL 준비.
2. 승인된 공식 SDK 3.x + granite.config 기반 별도 feature branch에서 .ait 번들 생성 및 QR 테스트.
3. 등록 앱의 서버 mTLS 익명 인증코드 교환 PoC. 인증이 확실해질 때까지 개인 기록 클라우드 연결 금지.
4. 한 DB 선택(Firebase/Supabase)하고 본인/타인 행 접근 규칙 검증, 영구 저장/내보내기/삭제 연계.
5. 테마/다크 UX 검수, 실제 그래픽 출시, 사용성·접근성·기기 QA 후 출시 검토 요청.

## CI 동작 및 안전장치
- npm run check / npm run test:e2e: 웹 프로토타입의 자동 검사
- npm run audit:ait: 출시 차단 사항 **리포트**(CI를 불필요하게 실패시키지 않음)
- npm run audit:ait:strict: 실제 출고 승인 때만 사용하며 미완료 시 비정상 종료
- node --test tests/launch-readiness.test.mjs: 등록 문구와 차단 현황 자체를 검사
- Vercel 배포/토스 번들 업로드/실계정 연결을 자동 실행하지 않음

## 공식 근거
- 비게임 출시 가이드: https://developers-apps-in-toss.toss.im/checklist/app-nongame.html
- SDK 3.x 전환 공지: https://techchat-apps-in-toss.toss.im/c/notice/9
- 네비게이션 커스터마이징: https://techchat-apps-in-toss.toss.im/t/topic/4395
- 다크 테마 검수 질의: https://techchat-apps-in-toss.toss.im/t/topic/5278
- 라이트 모드 관련 운영 답변: https://techchat-apps-in-toss.toss.im/t/topic/73
- TDS 필수 여부 답변: https://techchat-apps-in-toss.toss.im/t/tds/1820
- 외부 서버 CORS: https://techchat-apps-in-toss.toss.im/t/webview-storage-cors/4673
- 서버 인가 식별키: https://techchat-apps-in-toss.toss.im/t/getanonymouskey/4484
