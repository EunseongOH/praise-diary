# 다정록 꺼내보기 — 병·쪽지 디자인 연구 v2

## 확정 유지
- 라인워크 중심의 유리병, 기존 넓고 낮은 저장병형 C 제외. 첨부 레퍼런스의 형태만 참고.
- 병과 쪽지의 디자인 및 코드 레이어를 독립적으로 관리.
- 잠금 A안: 하루하루 나에게 다정한 말을 모아두어요. / 문득 하나를 꺼내 읽는 날, / 잊고 있던 좋은 순간들이 / 다시 나에게 힘이 되어 줄지도 몰라요.
- 10개 개별 기록 최초 달성 시 영구 해제. 전체 데이터 초기화만 해제 이력 초기화. 0개 빈 상태, 1개 다시 뽑기 숨김. 전체 기록 접근은 홈과 분리된 경로 유지.
- 읽기 스타일 B(어두운 종이), Pretendard 16px/1.75/400/0em. 추후 서체별 크기·행간·자간 프로필.

## 비교 후보 (미확정)
- 병 A: 짧은 목, 둥근 어깨, 안정적인 바닥. B: 타원형, 조금 긴 실루엣. C: 길고 좁은 목, 메시지 보틀형.
- 쪽지 A: 작은 롤(열린 나선), B: 반말림(풀린 끝), C: 접힌 종이(접힘선).
- 기본 선택 A-B. 9개 조합 전부 비교 가능. 병 외곽선 1.55 SVG 단위, 보조선 0.85–1.65; cork taper, rim front/back, 투명한 얕은 면색. 아트워크 선 두께는 UI 아이콘 규격과 독립.
- 0~4장의 시각 요소만 표현. 1장부터 바닥에 배치하고 추가 쪽지는 좌우·상단에 포개짐. 4개 이상 동일한 구도. 실제 무작위 후보는 시각화와 무관.

## 구현 구조 제안
- `BottleGeometry` : body path, neck, rim, reflection/base, note anchors
- `NoteArtwork` : roll/curl/fold, paper palette, local coordinate shapes
- `BottleArtwork` : rear glass, clipped static notes, selected note, front glass, cork
- `DrawMotion` : cork lift → note rotates towards neck → rises through mouth → rotates to horizontal → unfolds → dark paper reading screen. Total ~1.8s before reading; reduced motion skips.
- `DiaryContent` : actual text preserved, title optional, previous reading token.
- HTML prototype contains the equivalent pure geometry data and rendering functions, not production React integration. No GitHub changes. Sample data only.

## 검증
Chromium offline/fallback font: all 9 combinations transition to reading, first unlock 9→10, one/empty/many scenarios, 320px horizontal overflow, reduced motion; no JS errors. Actual webfont and Toss WebView not verified. Artwork is vector design study, not a final hand-drawn asset.