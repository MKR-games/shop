# 사이트 이미지 적용 기록

기존 자료에서 10개를 선별했습니다. 원본 전체는 별도의 비주얼 아카이브에 있습니다.

| 웹 파일 | 원본 | 적용 위치 | 아카이브 번호 |
|---|---|---|---|
| black-corridor.webp | 검은복도_박스목업_투명.png | 검은 복도 아이콘·작품·구매 창 | A011 |
| knock-knock-knock.webp | 깔끔한 흑녹색 보드게임 박스 목업.png | 똑똑똑 아이콘·작품·구매 창 | A018 |
| workshop.webp | 미스터리 게임을 준비하는 유령 탐정들.png | 자동 전환 배경 3의 원본 사본 | A028 |
| shipping.webp | 우체국의 귀여운 유령 마스코트.png | 제작 포트폴리오 | A034 |
| mascot-desk.webp | 추리 삼부작을 고민하는 무꾸리.png | 제작 포트폴리오 | A036 |
| eyes.svg | Group 1017.svg | 처음이라면 아이콘 · 원본 벡터의 눈 부분만 사용 | A082 |
| mascot.webp | ChatGPT Image 2026년 9월 5일 오전 10_40_19.png | 무꾸리 소개 창 | A096 |
| exhibition.webp | SE-0da6da36-6500-4f01-8569-22de80dad9c1.jpg | 자동 전환 배경 4의 원본 사본·제작 포트폴리오 | A112 |
| brand-logo.webp | image-gen-1(8).png | 바탕화면 브랜드 스티커 | A124 |
| corridor.webp | 밤비 속 산악 훈련소 복도.png | 기존 자료 보관 | A138 |

원본 이미지는 웹용으로 비율을 유지해 크기와 포맷을 최적화했습니다. eyes.svg는 기존 Group 1017.svg의 눈 벡터만 분리해 사용했습니다.

## 이번 디자인의 전용 아이콘

`interface-icons.svg`는 무꾸리의 열쇠구멍 모티프와 이번 사건 보관소 디자인을 바탕으로 새로 그린 벡터 심벌입니다. 상징 아이콘 8종과 제어 아이콘 6종을 포함합니다. `index.html`에 동일한 심벌을 인라인으로 넣어 로컬 파일로 열어도 표시되도록 했습니다. 기존 레퍼런스 사이트의 아이콘 파일이나 코드를 가져오지 않았습니다.

## 다크 Windows 에디션

바탕화면 사진은 CSS로 흑백 처리하며 원본 이미지는 변경하지 않았습니다. 사용자에게 실제 상품 색상이 다르게 보이지 않도록 작품 사진은 원래 색을 유지합니다. 화면용 아이콘의 초록 계열은 중립 회색으로 바꾸었습니다.

## 직접 선택한 흑백 배경 — 12장

사용자가 제공한 파일 12개를 순서대로 사용합니다. 원본은 보존하고 웹용 사본을 저장했으며, 화면은 CSS로 흑백 처리합니다.

- 무꾸리 작업실: `mascot-desk.webp` → `assets/backgrounds/bg_01_mascot_desk.webp` (1000 × 750)
- 무꾸리 배송 현장: `shipping.webp` → `assets/backgrounds/bg_02_shipping.webp` (800 × 1067)
- 무꾸리 미스터리 회의: `workshop.webp` → `assets/backgrounds/bg_03_workshop.webp` (1440 × 1080)
- 졸업전시 전경: `exhibition.webp` → `assets/backgrounds/bg_04_exhibition.webp` (1200 × 1600)
- 졸업전시 상세: `A113.png` → `assets/backgrounds/bg_05_A113.webp` (1081 × 1920)
- 검은 복도: `A129.png` → `assets/backgrounds/bg_06_A129.webp` (1254 × 1254)
- 똑똑똑: `A123.png` → `assets/backgrounds/bg_07_A123.webp` (1920 × 1920)
- DID 펜션: `A075.png` → `assets/backgrounds/bg_08_A075.webp` (1254 × 1254)
- 손짓하는 무꾸리: `A019.png` → `assets/backgrounds/bg_09_A019.webp` (1254 × 1254)
- 마스크를 쓴 무꾸리: `A023.png` → `assets/backgrounds/bg_10_A023.webp` (1086 × 1448)
- 문 앞의 무꾸리: `A027.png` → `assets/backgrounds/bg_11_A027.webp` (1536 × 1024)
- 기다리는 무꾸리: `A039.png` → `assets/backgrounds/bg_12_A039.webp` (1254 × 1254)

사용자가 선택한 12장의 사진을 오른쪽의 보이는 배경 영역에 가득 채우고 검은 바탕으로 부드럽게 연결합니다. 화면 비율에 맞춰 가장자리가 일부 잘릴 수 있으며, 웹용 원본 사진 사본은 그대로 보존합니다.
