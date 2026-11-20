# 칭찬일기 · Praise Diary

내가 남긴 칭찬이 달마다 텍스트 그래픽으로 자라는 작은 일기. 앱인토스 출시를 목표로 설계하는 **디자인·UX 프로토타입**입니다.

## 로컬 실행

```bash
npm install
cp .env.example .env.local  # 선택: 2026년 12월 가상 날짜로 시연
npm run dev
```

- TypeScript + React 18 + Vite; 외부 디자인시스템의 룩앤필을 단순 복사하지 않고 공통 토큰과 인터랙션으로 재구성합니다.
- 현재 시연 버전의 기록과 설정은 브라우저 **sessionStorage**에만 보관합니다. 실제 서버, 인증, 알림 발송, 앱인토스 SDK 연동은 아직 구현되지 않았습니다.
- `.env.local`에 `VITE_DEMO_DATE`를 설정하면 지난달·현재 월·미공개 월을 확인할 수 있습니다. 시연 기록은 **가상 데이터**입니다.
- **2026년 12월 특별 목표 일수는 미확정**이므로 15일 기준으로 임의 표시하지 않습니다.

## 프리뷰

- `design-preview.html`을 브라우저에서 바로 열면 React 설치 없이 색상·정보 위계의 정적 시안을 확인할 수 있습니다. **실제 앱 동작, 랜덤 추첨, 저장, 토스 연동과는 연결되어 있지 않습니다.**
- 색상과 레이아웃 시안은 `design-preview.html`에서 볼 수 있어요. PNG 스크린샷은 별도 다운로드 ZIP에 포함했어요.

## 문서

- [누적 기획 자료 v1.6](docs/spec/01_서비스_누적_PRD.md)
- [IA 및 서비스 플로우](docs/spec/09_통합_IA_서비스플로우_감사.md)
- [디자인 레퍼런스 비교](design-system/references.md)
- [사용자 제안 색상과 접근성 검증](design-system/color-system.md)
- [사용자 경험 원칙](design-system/principles.md)
- [컴포넌트 인벤토리](design-system/component-inventory.md)
- [UX Writing 기준](design-system/writing.md)
- [실행 범위 및 다음 단계](docs/IMPLEMENTATION_STATUS.md)

## 정적·로직 QA

```bash
npm run check:syntax
npm run check:contrast
npm run test:logic
npm run build  # React 의존성 설치 후 실제 빌드 확인
```

이 산출물을 작성한 환경에서는 npm 레지스트리 DNS 접속이 차단되어 `npm install`을 마치지 못했어. **TypeScript의 실제 타입 검사 및 Vite 빌드는 아직 확인되지 않았음**에 유의해. 색 대비·날짜 계산·TS 구문·정적 화면 UI는 별도로 검사했어.

## 출시 이전 필수 과제

Toss WebView/로그인·동의 검증, 영구 데이터 저장/인증/보안, 일기 작성 유예 유효기간, 저장 실패 재시도, 실제 그래픽 텍스트 파티클 2.5D, 알림 정책 승인, 12월 특별 목표 확정, 실제 기기·키보드·접근성 QA.

## GitHub 쓰기 권한 (최초 1회)

현재 연결된 GitHub App은 이 새 저장소를 읽을 수 있지만, 설치된 앱의 **선택 저장소에 아직 추가되지 않아** API가 403으로 파일 쓰기를 거부합니다. https://github.com/settings/installations → ChatGPT 관련 앱 → Configure → Repository access → Only select repositories → Select repositories에서 `EunseongOH/praise-diary` 추가 후 Save.

GitHub 저장소는 현재 **공개(Public)** 상태입니다. 실제 칭찬일기 내용·인증키·사내정보는 업로드하지 마세요.