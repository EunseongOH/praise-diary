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

## 디자인 방향 업데이트 v0.2

레퍼런스 이미지 기준으로 **화면 전체를 한 캔버스로 쓰는 몰입형 다크**를 우선 시안으로 채택했습니다. 기존 흰색 UI + 모서리가 둥근 어두운 그래픽 박스 구성을 폐기했습니다. 그래픽, 상단바, 하단바에 경계가 없어야 합니다. 화이트 테마는 추후 무경계 조건과 대비 요구를 만족할 때 검토합니다. [자세한 결정](docs/spec/14_몰입형_캔버스_디자인결정.md).

## 프리뷰

- `design-preview.html`을 브라우저에서 바로 열면 React 설치 없이 색상·정보 위계의 정적 시안을 확인할 수 있습니다. **실제 앱 동작, 랜덤 추첨, 저장, 토스 연동과는 연결되어 있지 않습니다.**
- [홈 화면 정적 미리보기](docs/previews/home.png) · [도감 2열 미리보기](docs/previews/collection.png) · [꺼내보기 잠금 화면](docs/previews/rediscover-locked.png)

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

## GitHub 접근 권한

GitHub 앱의 선택 저장소 접근 권한이 추가되어 `feat/design-system-prototype` 작업 브랜치와 Draft PR #1로 기획/코드 리뷰를 진행할 수 있습니다. 머지는 사용자가 확인한 다음 진행합니다.

GitHub 저장소는 현재 **공개(Public)** 상태입니다. 실제 칭찬일기 내용·인증키·사내정보는 업로드하지 마세요.


## v0.3 그래픽 성장 및 타이포 체계

- SVG는 아직 고품질 그래픽이 아닌 **규칙 검증용 스터디**. 실루엣의 실제 아래쪽부터 비어 있는 영역을 위로 채우며, 같은 날짜 추가 일기는 높이를 바꾸지 않음. 저장 직후에는 직전 높이에서 새 높이까지 성장 연출.
- 글꼴 후보 `SUIT Variable`, 폰트 스케일·굵기·행간은 `src/styles/tokens.css`에서 관리. 본문/일기 입력 최소 16px. [타이포그래피 명세](design-system/typography.md).
- [그래픽 성장 및 고도화 계획](design-system/graphic-growth.md). 새 시각 아트웍/2.5D/3D 실루엣은 **미착수**. 색 팔레트는 이전 후보 그대로 보류.
