# Shop 카테고리 설계

**Date**: 2026-04-18
**Status**: Draft

## 배경

현재 사이트는 모든 사진에 Get Poster 버튼을 노출해 포스터 문의를 받는다. 그러나 작가가 모든 사진을 판매하는 건 아니기 때문에, 판매 가능한 사진만 별도로 모아 보여줄 Shop 카테고리가 필요하다. 또한 판매 불가 사진에서는 Get Poster 버튼을 숨겨야 한다.

## 목표

- 작가가 사진별로 판매 여부와 사이즈를 어드민에서 간단히 설정
- 판매 가능한 사진만 모은 Shop 뷰 추가 (네비게이션 상단에 자동 노출)
- 판매 불가 사진에서는 Get Poster 버튼 숨김
- 기존 Personal/Commercial/About 구조와 자연스럽게 통합

## 비목표 (YAGNI)

- 장바구니/결제 시스템 (여전히 이메일 문의 기반)
- 배송/재고 관리
- 사진 캡션(title/desc) 기능 확장 (과거 원복된 이력 있음, 이번 스코프 밖)

## 데이터 구조

### 사진 객체 확장

기존: 사진이 단순 문자열 배열
```json
"photos": ["url1", "url2"]
```

변경 후: 객체 혼용 가능 (하위호환 유지)
```json
"photos": [
  { "src": "url1", "sellable": true, "sizes": ["A3", "A2"], "name": "Seoul, 2024" },
  "url2"
]
```

- 문자열은 `{ src: "url2", sellable: false, sizes: [], name: "" }`로 해석
- 새 사진은 기본 `sellable: false`로 업로드 (실수 방지)
- `sizes` 배열은 해당 사진이 판매 가능한 사이즈만 포함. 기본값: `["A3", "A2"]`
- `name`은 Shop 캡션에 표시될 선택적 작품명. 비어있으면 캡션에서 이름 생략

### Shop 설정 (순서 + 가격)

data.json 최상단에 Shop 설정 블록:
```json
"shop": {
  "order": ["photoSrc1", "photoSrc5", "photoSrc2"],
  "prices": {
    "A3": 50000,
    "A2": 80000
  }
}
```

- `order`: 드래그로 조정 가능한 판매 사진들의 Shop 노출 순서
  - 새로 판매 토글 켠 사진은 `order` 맨 뒤에 자동 추가
  - 판매 토글 끄면 `order`에서 자동 제거
- `prices`: 사이즈별 통합 가격 (사진별 차등 없음)
  - 어드민 Shop 페이지에서 편집
  - 없으면 기본값 `{ A3: 50000, A2: 80000 }` 사용

### 포스터 사이즈/가격 로딩

```js
const DEFAULT_PRICES = { A3: 50000, A2: 80000 };
function getPrices()   { return (data.shop && data.shop.prices) || DEFAULT_PRICES; }
function formatPrice(n) { return '₩' + n.toLocaleString('ko-KR'); }
```

- A4 제거 (사이즈 상수에서 완전 삭제)
- 표기 방식: `₩50,000` (K 약어 사용 안 함, toLocaleString으로 천단위 콤마)

## 헬퍼 함수 (index.html 내)

하위호환 유지를 위한 두 함수:

```js
function getSrc(p)       { return typeof p === 'string' ? p : p.src; }
function isSellable(p)   { return typeof p !== 'string' && p.sellable === true; }
function getSizes(p)     {
  if (typeof p === 'string') return [];
  return Array.isArray(p.sizes) ? p.sizes : ['A3', 'A2'];
}
function getName(p)      { return typeof p === 'string' ? '' : (p.name || ''); }
```

기존 코드에서 사진 URL 참조하는 부분은 `getSrc(p)`로 래핑. 판매 관련 로직만 새로 추가.

## Shop 뷰 (메인 사이트)

### 노출 조건

네비게이션에 Shop 링크 자동 추가 — `visible !== false`이면서 `sellable: true`인 사진이 1장 이상일 때.

기존 카테고리(Personal/Commercial/About) 옆에 위치.

### 레이아웃: 큰 포스터 가로 연속 뷰 (Wedding/Interior 상세 톤 동일)

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│    ┌──────┐     ┌────────────┐     ┌──────┐    ┌─────────┐       │
│    │      │     │            │     │      │    │         │   →   │
│    │ IMG  │     │    IMG     │     │ IMG  │    │   IMG   │       │
│    │      │     │            │     │      │    │         │       │
│    └──────┘     └────────────┘     └──────┘    └─────────┘       │
│  Seoul 2024   Berlin 2023      Copenhagen    Malmö               │
│  A3 ₩50,000   A3 ₩50,000       A2 ₩80,000    A3 ₩50,000          │
│               A2 ₩80,000                     A2 ₩80,000          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

- `overflow-x: auto`로 네이티브 가로 스크롤 (기존 프로젝트 상세와 동일 패턴)
- 마우스 휠 상하 → 가로 변환 (`deltaY > deltaX` 조건, 기존 코드 재활용)
- 사진 높이 고정 (`height: calc(100vh - 180px)` 정도), 원본 비율 유지
- 사진 아래에 작은 캡션: 이름 + 사이즈별 가격 (작가가 name 필드 입력 안 했으면 생략)
- 사진 클릭 → 기존 Get Poster 모달 재사용 (썸네일 자동 채움)
- 모바일: 기존 Wedding/Interior 모바일과 동일한 스냅 스크롤 — 한 장씩 중앙에

### 뷰 모드 추가

`shopViewMode` 플래그 추가. 기존 `galleryMode/gridViewMode/splitViewMode/projectDetailMode/aboutOverlay`와 동일한 토글 로직. 다른 뷰 열 때 Shop 닫기 포함.

### Get Poster 모달 사이즈 필터링

현재 모달은 A3/A2/A4 하드코딩. 변경:
- A4 옵션 완전 삭제
- 현재 보고 있는 사진의 `sizes` 배열에 있는 사이즈만 라디오 버튼 노출
- 사이즈가 하나면 자동 선택, 여러 개면 기본 첫 번째 선택
- 가격은 `POSTER_SIZES` 상수에서 조회

## Get Poster 버튼 가시성 (모든 뷰 공통)

현재 모든 사진에서 보이는 Get Poster 버튼:
- `isSellable(p) === true` 일 때만 표시
- `false`면 `#bottom-bar`의 버튼 `display: none` (카운터는 유지)
- `goTo()`/`enterPhotoMode()` 등 사진 전환 시점에 가시성 재계산

## 어드민 UI

### 사진 카드에 판매 설정 추가

기존 `.photo-card` (썸네일 + 삭제 + 드래그) 구조에 배지/토글 추가:

```
┌─────────────────────┐
│                     │
│      [photo]        │
│                     │
│  ● 판매 on          │ ← 클릭 시 판매 토글
│  [작품명______]     │ ← sellable 켜졌을 때만 작품명 입력 노출 (선택)
│  □ A3  ☑ A2         │ ← sellable 켜졌을 때만 사이즈 체크박스 노출
│                     │
│  ✕            ⋮⋮   │
└─────────────────────┘
```

- **Off 상태**: 회색 배지 "판매 off"
- **On 상태**: 강조색 배지 "판매 on" + 사진 카드 우상단 작은 원형 점 (한눈에 보이게)
- 사이즈 체크박스 기본: 둘 다 체크
- 둘 다 체크 해제하면 자동으로 sellable도 off (실질적 판매 불가)

### 사이드바에 "🛍 Shop" 항목

- 카테고리 목록 위에 Shop 항목 (고정)
- 클릭 시 Shop 관리 페이지 진입:
  - **상단: 포스터 가격 편집** — A3 / A2 숫자 인풋 2개 + 저장 버튼 (data.json `shop.prices` 업데이트)
  - **하단: 판매 사진 리스트** — `shop.order` 순서대로 썸네일 + 작품명 + 원본 카테고리 링크
- 각 항목 드래그로 순서 변경 (기존 `.sub-row` 드래그 코드 재활용)
- 각 항목에서 해당 사진의 원래 카테고리로 점프 링크
- 제목: "Shop (N장)" — N은 판매 활성 사진 수

### 데이터 마이그레이션

admin.html의 "저장" 버튼이 실행될 때:
- 기존 `photos: [string, ...]`는 그대로 유지 (하위호환, 수정 없음)
- 판매 토글을 처음 켤 때 해당 사진만 객체로 변환

자동 일괄 마이그레이션 없음 — 필요할 때만 부분 변환.

## 영향 범위

### 수정 파일

- **data.json**: `shop.order` 추가, 일부 사진 객체화
- **index.html**:
  - `getSrc/isSellable/getSizes/getName/getPrices/formatPrice` 헬퍼 추가
  - A4 관련 코드 완전 제거
  - Shop 뷰 HTML/CSS/JS
  - 네비 렌더 로직에 Shop 자동 추가
  - Get Poster 버튼 가시성 체크
  - Get Poster 모달 사이즈/가격 필터링 (data.json에서 읽기)
- **admin.html**:
  - `.photo-card`에 판매 배지 + 작품명 인풋 + 사이즈 체크박스
  - 사이드바 Shop 항목 → `renderShopPage()`: 가격 편집 + 드래그 순서 관리
- **api/poster-inquiry.js**: A4 관련 코드 제거 (있다면)

### 주요 함수 / 섹션

- `index.html`: `catPhotosMap` 생성 루틴 → `getSrc(p)` 통과, `renderNav()`에 Shop 추가
- `admin.html`: `renderSubEditor` → 판매 UI 추가, `renderShopPage()` 신설

## 에러 핸들링

- Shop에 사진이 0장이면 네비에서 Shop 자동 숨김
- `shop.order`에 있는 src가 실제 사진 어디에도 없으면 해당 엔트리 무시 (사진 삭제됐을 때)
- 사진 객체에 `sizes`가 빈 배열이면 판매 불가로 간주 (자동 sellable=false)

## 테스트 포인트

1. 기존 카테고리에서 판매 토글 on/off → Shop 목록 반영 확인
2. Shop 순서 드래그 → 저장 → 메인 사이트 반영
3. 판매 사진에서 Get Poster 버튼 노출 / 판매 불가 사진에서 숨김
4. Get Poster 모달에서 해당 사진 사이즈만 라디오 노출 + 가격도 data.json 값으로 표시
5. 판매 사진이 0장일 때 Shop 네비 숨김
6. 기존 문자열 photos와 새 객체 photos 혼용 상태에서도 갤러리/슬라이더 정상 동작
7. 모바일 Shop 뷰: 스냅 스크롤 한 장씩
8. Shop 뷰에서 사진 클릭 → 모달 → 문의 제출 이메일 수신 (Resend 설정 전제)
9. 어드민에서 가격 수정 → 저장 → 메인 사이트 Shop 캡션/모달 반영

## 향후 확장 여지

- 사진 판매 통계 (이 사진 문의 N회)
- Shop 내 검색/필터 (가격대, 사이즈별)
- 한정판 기능 (sellable + edition count)

이번 범위에서는 제외.
