# Shop Category Implementation Plan

> **Spec:** [2026-04-18-shop-category-design.md](../specs/2026-04-18-shop-category-design.md)

**Goal:** 판매 가능 사진만 모은 Shop 카테고리 추가 + 판매 불가 사진 Get Poster 버튼 숨김

**Architecture:** 기존 문자열 photos를 `{src, sellable, sizes, name}` 객체로 확장 (하위호환). data.json에 `shop.order`, `shop.prices` 추가. index.html에 Shop 가로스크롤 뷰 + shopViewMode, admin.html에 사진 카드 판매 UI + Shop 관리 페이지.

**Tech Stack:** HTML/CSS/JS, data.json, Cloudinary (기존 그대로)

**Test 전략:** 이 프로젝트는 테스트 프레임워크 없음. 각 태스크 완료 시 브라우저에서 수동 검증 (python3 -m http.server 3000) 후 커밋.

---

## File Structure

**수정할 파일**:
- `data.json` — shop 블록 추가, 판매 사진 객체화
- `index.html` — 헬퍼 함수, Shop 뷰, 네비, Get Poster 필터링, 모달 사이즈 로드
- `admin.html` — 사진 카드 판매 UI, Shop 관리 페이지 추가

**건드리지 않음**:
- `api/poster-inquiry.js` — 받는 payload 구조는 동일 (size, price는 클라이언트가 계산해서 보냄)
- `api/save-data.js`, `api/config.js` — 변화 없음

---

## Task 1: 헬퍼 함수 추가 (index.html)

**Files:** `index.html` (script 초반부)

- [ ] **Step 1.1** — `index.html` script 초반 (catPhotosMap 생성 직전)에 헬퍼 함수 6개 추가

```js
// ── Shop 헬퍼 ──
function getSrc(p)       { return typeof p === 'string' ? p : p.src; }
function isSellable(p)   { return typeof p !== 'string' && p.sellable === true; }
function getSizes(p) {
  if (typeof p === 'string') return [];
  return Array.isArray(p.sizes) && p.sizes.length ? p.sizes : ['A3', 'A2'];
}
function getName(p)      { return typeof p === 'string' ? '' : (p.name || ''); }

const DEFAULT_PRICES = { A3: 50000, A2: 80000 };
function getPrices()    { return (window.__data && window.__data.shop && window.__data.shop.prices) || DEFAULT_PRICES; }
function formatPrice(n) { return '₩' + n.toLocaleString('ko-KR'); }
```

- [ ] **Step 1.2** — `fetch('./data.json')` 로드 성공 후 `window.__data = data` 저장 추가 (getPrices에서 접근용)

- [ ] **Step 1.3** — 브라우저에서 콘솔 열고 `getSrc("test")` → `"test"`, `getSrc({src:"a"})` → `"a"`, `isSellable({sellable:true})` → `true` 확인

- [ ] **Step 1.4** — 커밋
```
git add index.html
git commit -m "Shop: 사진 객체 헬퍼 함수 (getSrc/isSellable/getSizes/getName/getPrices) 추가"
```

---

## Task 2: catPhotosMap / allPhotos 참조를 getSrc로 래핑

**Files:** `index.html`

기존 코드에서 사진 src를 직접 사용하는 부분을 `getSrc(p)`로 통과시켜 객체 혼용 지원.

- [ ] **Step 2.1** — 다음 위치 찾아서 수정:
  - `catPhotosMap[subName] = sub.photos` → 그대로 두되, src 필요한 렌더 쪽에서 `getSrc()` 호출
  - `allPhotos.forEach(src => ...)` 패턴 → `allPhotos.forEach(p => { const src = getSrc(p); ... })`
  - `enterPhotoMode` 내 사진 매칭 로직: `catPhotos.indexOf(targetSrc)` → `catPhotos.findIndex(p => getSrc(p) === targetSrc)`
  - split/grid에서 projects의 photos/coverPhoto도 동일 패턴
  - Grep으로 `\.photos\[` `\.photos\.` `allPhotos\[` `catPhotosMap` 검색해서 누락 없이

- [ ] **Step 2.2** — 브라우저에서 기존 카테고리(Personal 전체, Wedding, Interior) 전환하며 모든 사진 정상 로드 + 슬라이더 동작 확인

- [ ] **Step 2.3** — 커밋
```
git add index.html
git commit -m "Shop: photo src 접근을 getSrc 헬퍼로 래핑 (하위호환 객체 지원)"
```

---

## Task 3: Get Poster 버튼 가시성 — sellable 사진에만 표시

**Files:** `index.html`

- [ ] **Step 3.1** — `#get-poster-btn` (또는 해당 버튼 ID 확인) 가시성 갱신 함수 추가:

```js
function updateGetPosterVisibility() {
  const btn = document.getElementById('get-poster-btn');
  if (!btn) return;
  // 현재 보고 있는 사진 객체 찾기
  const p = catPhotoMode
    ? currentCatPhotos[catCurrent]
    : allPhotos[current];
  btn.style.display = isSellable(p) ? '' : 'none';
}
```

(현재 사진 참조 변수명은 코드 확인 후 정확히 맞춤)

- [ ] **Step 3.2** — `goTo()`, `enterPhotoMode()`, `enterGallery()` 종료부에 `updateGetPosterVisibility()` 호출 추가

- [ ] **Step 3.3** — data.json에 테스트용으로 Personal 서브 첫 사진만 객체 `{src, sellable:true, sizes:["A3","A2"]}`로 수동 변경

- [ ] **Step 3.4** — 브라우저에서 해당 사진에서만 Get Poster 버튼 보이고, 다음 사진(문자열)에서 숨는지 확인

- [ ] **Step 3.5** — 커밋
```
git add index.html data.json
git commit -m "Shop: Get Poster 버튼을 sellable 사진에만 표시"
```

---

## Task 4: Get Poster 모달 사이즈/가격 동적 로드

**Files:** `index.html`

현재 모달은 A4/A3/A2 라디오 하드코딩. 변경:

- [ ] **Step 4.1** — 모달 열기 함수(`openPosterModal` 등) 내부에서 사이즈 라디오 렌더를 동적으로:

```js
function renderPosterSizeOptions(photo) {
  const container = document.getElementById('poster-sizes');
  const sizes  = getSizes(photo);   // ["A3", "A2"] 등
  const prices = getPrices();
  container.innerHTML = sizes.map((s, i) => `
    <label class="size-opt">
      <input type="radio" name="size" value="${s}" ${i === 0 ? 'checked' : ''}>
      <span>${s} · ${formatPrice(prices[s])}</span>
    </label>
  `).join('');
}
```

- [ ] **Step 4.2** — A4 관련 HTML 라디오/label 모달에서 삭제

- [ ] **Step 4.3** — submit 시 가격 계산: `const price = getPrices()[selectedSize]` → payload에 포함

- [ ] **Step 4.4** — 브라우저에서 sellable 사진 → Get Poster 클릭 → A3/A2만 보이고 A4 없는지 확인, 선택 시 가격 ₩50,000 / ₩80,000 표시 확인

- [ ] **Step 4.5** — 커밋
```
git add index.html
git commit -m "Shop: Get Poster 모달 사이즈/가격 data.json 기반 동적 로드, A4 제거"
```

---

## Task 5: data.json에 shop 블록 추가

**Files:** `data.json`

- [ ] **Step 5.1** — data.json 최상단 (allPhotos 바로 위)에 shop 블록 추가:

```json
{
  "shop": {
    "order": [],
    "prices": { "A3": 50000, "A2": 80000 }
  },
  "allPhotos": [ ... ],
  ...
}
```

- [ ] **Step 5.2** — 브라우저에서 데이터 로드 에러 없는지 확인 (콘솔)

- [ ] **Step 5.3** — 커밋
```
git add data.json
git commit -m "Shop: data.json에 shop.order, shop.prices 블록 추가"
```

---

## Task 6: Shop 뷰 구조 (HTML + CSS)

**Files:** `index.html`

- [ ] **Step 6.1** — `<body>` 내 기존 `#grid-view`, `#split-view` 근처에 Shop 뷰 컨테이너 추가:

```html
<div id="shop-view">
  <div id="shop-scroll">
    <!-- 동적 렌더 -->
  </div>
</div>
```

- [ ] **Step 6.2** — CSS 추가 (기존 #grid-view 스타일 근처):

```css
#shop-view {
  position: fixed; inset: 90px 0 36px 0;
  background: #fff;
  z-index: 80;
  opacity: 0; pointer-events: none;
  transition: opacity 0.3s ease;
  overflow: hidden;
}
#shop-view.visible { opacity: 1; pointer-events: auto; }
#shop-scroll {
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  padding: 40px 80px;
  scrollbar-width: none;
}
#shop-scroll::-webkit-scrollbar { display: none; }
.shop-item {
  display: inline-block;
  height: calc(100% - 60px);
  margin-right: 40px;
  vertical-align: top;
  cursor: pointer;
  position: relative;
}
.shop-item img {
  height: 100%;
  width: auto;
  display: block;
  object-fit: contain;
}
.shop-caption {
  position: absolute;
  left: 0;
  bottom: -44px;
  font-size: 0.75rem;
  color: #555;
  white-space: nowrap;
  line-height: 1.5;
}
.shop-caption .name { color: #222; display: block; }
.shop-caption .price { color: #888; }

/* 모바일 스냅 */
@media (max-width: 768px) {
  #shop-scroll {
    padding: 24px 0;
    scroll-snap-type: x mandatory;
  }
  .shop-item {
    width: 100vw;
    padding: 0 24px;
    margin-right: 0;
    scroll-snap-align: center;
  }
}
```

- [ ] **Step 6.3** — 커밋
```
git add index.html
git commit -m "Shop: Shop 뷰 컨테이너 + 가로 스크롤 CSS"
```

---

## Task 7: Shop 뷰 렌더링 + 열기/닫기

**Files:** `index.html`

- [ ] **Step 7.1** — Shop 사진 리스트 수집 함수:

```js
function collectShopPhotos() {
  // 모든 카테고리 사진 순회해서 sellable만 모음
  const pool = new Map();   // src → photo 객체
  (window.__data.categories || []).forEach(cat => {
    if (cat.visible === false) return;
    (cat.subcategories || []).forEach(sub => {
      if (sub.visible === false) return;
      // projects 구조와 photos 구조 모두 처리
      const photoArrs = [];
      if (Array.isArray(sub.photos)) photoArrs.push(sub.photos);
      if (Array.isArray(sub.projects)) sub.projects.forEach(pr => {
        if (Array.isArray(pr.photos)) photoArrs.push(pr.photos);
      });
      photoArrs.forEach(arr => arr.forEach(p => {
        if (isSellable(p)) pool.set(getSrc(p), p);
      }));
    });
  });
  // shop.order 순서대로 정렬, order 없는 건 뒤에
  const order = (window.__data.shop && window.__data.shop.order) || [];
  const ordered = [];
  const used = new Set();
  order.forEach(src => {
    if (pool.has(src)) { ordered.push(pool.get(src)); used.add(src); }
  });
  pool.forEach((p, src) => { if (!used.has(src)) ordered.push(p); });
  return ordered;
}
```

- [ ] **Step 7.2** — Shop 뷰 렌더:

```js
function renderShopView() {
  const photos = collectShopPhotos();
  const scroll = document.getElementById('shop-scroll');
  const prices = getPrices();
  scroll.innerHTML = photos.map(p => {
    const sizes = getSizes(p);
    const name = getName(p);
    const priceLines = sizes.map(s => `${s} ${formatPrice(prices[s])}`).join(' · ');
    return `
      <div class="shop-item" data-src="${getSrc(p)}">
        <img src="${optimizeImg(getSrc(p), {w:1400})}" alt="">
        <div class="shop-caption">
          ${name ? `<span class="name">${name}</span>` : ''}
          <span class="price">${priceLines}</span>
        </div>
      </div>`;
  }).join('');
  // 클릭 바인딩
  scroll.querySelectorAll('.shop-item').forEach(el => {
    el.addEventListener('click', () => {
      const src = el.dataset.src;
      const p = photos.find(x => getSrc(x) === src);
      openPosterModalForPhoto(p);   // 기존 모달 재사용
    });
  });
}
```

- [ ] **Step 7.3** — enterShopView/closeShopView 함수 + `shopViewMode` 변수 + 다른 뷰 닫는 로직:

```js
let shopViewMode = false;
function enterShopView() {
  closeAllOtherViews();
  renderShopView();
  document.getElementById('shop-view').classList.add('visible');
  shopViewMode = true;
}
function closeShopView() {
  document.getElementById('shop-view').classList.remove('visible');
  shopViewMode = false;
}
```

기존 `closeAllOtherViews` 또는 유사 함수에 Shop 닫기 추가, 타 뷰 진입 시에도 Shop 닫기 호출.

- [ ] **Step 7.4** — 가로 스크롤 마우스휠 변환 (deltaY > deltaX 이면 scrollLeft로):

```js
document.getElementById('shop-scroll').addEventListener('wheel', e => {
  if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
    e.preventDefault();
    e.currentTarget.scrollLeft += e.deltaY;
  }
}, { passive: false });
```

- [ ] **Step 7.5** — 커밋
```
git add index.html
git commit -m "Shop: Shop 뷰 렌더링 + 열기/닫기 로직 + 휠 스크롤 변환"
```

---

## Task 8: 네비에 Shop 링크 자동 추가

**Files:** `index.html`

- [ ] **Step 8.1** — `renderNav()` 또는 nav 렌더하는 위치에서, 판매 사진 수 계산 후 ≥1 이면 Shop 링크 추가:

```js
const shopCount = collectShopPhotos().length;
if (shopCount > 0) {
  // nav 리스트에 Shop 항목 append, 클릭 시 enterShopView()
  navEl.insertAdjacentHTML('beforeend', `<a class="cat" data-cat="shop" href="#">Shop</a>`);
  navEl.querySelector('[data-cat="shop"]').addEventListener('click', e => {
    e.preventDefault();
    enterShopView();
  });
}
```

- [ ] **Step 8.2** — 로고 클릭 시 Shop도 닫히도록 (기존 로고 핸들러에 closeShopView 추가)

- [ ] **Step 8.3** — data.json에서 테스트로 몇 장 sellable 설정 후 브라우저에서:
  - 네비에 Shop 보이는지
  - 클릭 시 가로 스크롤 뷰 뜨는지
  - 캡션 이름/가격 보이는지
  - 사진 클릭 → Get Poster 모달 열리는지

- [ ] **Step 8.4** — 커밋
```
git add index.html
git commit -m "Shop: 네비에 Shop 링크 자동 추가 (판매 사진 1장 이상일 때)"
```

---

## Task 9: Admin — 사진 카드에 판매 UI

**Files:** `admin.html`

- [ ] **Step 9.1** — `.photo-card` 템플릿 확장. 기존 photoCardHTML 함수에 추가 섹션:

```js
function photoCardHTML(p, idx, catId, subId, projectIdx) {
  const src = typeof p === 'string' ? p : p.src;
  const sellable = typeof p !== 'string' && p.sellable === true;
  const sizes = (typeof p !== 'string' && Array.isArray(p.sizes)) ? p.sizes : ['A3','A2'];
  const name = (typeof p !== 'string' && p.name) ? p.name : '';
  return `
    <div class="photo-card" draggable="true" ...>
      <img src="${src}" loading="lazy">
      <div class="photo-controls">
        <button class="sellable-toggle ${sellable ? 'on' : 'off'}"
                onclick="toggleSellable('${catId}','${subId}',${projectIdx ?? 'null'},${idx})">
          ${sellable ? '● 판매 on' : '○ 판매 off'}
        </button>
        ${sellable ? `
          <input class="photo-name" type="text" placeholder="작품명"
                 value="${name.replace(/"/g,'&quot;')}"
                 onchange="setPhotoName('${catId}','${subId}',${projectIdx ?? 'null'},${idx},this.value)">
          <label><input type="checkbox" ${sizes.includes('A3')?'checked':''}
                 onchange="toggleSize('${catId}','${subId}',${projectIdx ?? 'null'},${idx},'A3',this.checked)"> A3</label>
          <label><input type="checkbox" ${sizes.includes('A2')?'checked':''}
                 onchange="toggleSize('${catId}','${subId}',${projectIdx ?? 'null'},${idx},'A2',this.checked)"> A2</label>
        ` : ''}
      </div>
      <button class="photo-delete" ...>✕</button>
    </div>
  `;
}
```

- [ ] **Step 9.2** — CSS 추가:

```css
.photo-controls { display: flex; flex-direction: column; gap: 4px; padding: 6px; font-size: 0.7rem; }
.sellable-toggle { border: none; background: #444; color: #aaa; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 0.7rem; }
.sellable-toggle.on { background: var(--accent); color: #fff; }
.photo-name { background: #2a2a2a; border: 1px solid #444; color: #eee; padding: 3px 6px; border-radius: 2px; font-size: 0.7rem; }
```

- [ ] **Step 9.3** — 조작 함수:

```js
function getPhotoRef(catId, subId, projectIdx, photoIdx) {
  const cat = data.categories.find(c => c.id === catId);
  const sub = cat.subcategories.find(s => s.id === subId);
  if (projectIdx !== null && sub.projects) {
    return { arr: sub.projects[projectIdx].photos, idx: photoIdx };
  }
  return { arr: sub.photos, idx: photoIdx };
}

function ensureObject(arr, idx) {
  if (typeof arr[idx] === 'string') arr[idx] = { src: arr[idx], sellable: false, sizes: ['A3','A2'], name: '' };
  return arr[idx];
}

function toggleSellable(catId, subId, projectIdx, photoIdx) {
  const {arr, idx} = getPhotoRef(catId, subId, projectIdx, photoIdx);
  const p = ensureObject(arr, idx);
  p.sellable = !p.sellable;
  syncShopOrder();
  rerenderCurrentEditor();
}

function setPhotoName(catId, subId, projectIdx, photoIdx, name) {
  const {arr, idx} = getPhotoRef(catId, subId, projectIdx, photoIdx);
  ensureObject(arr, idx).name = name;
}

function toggleSize(catId, subId, projectIdx, photoIdx, size, on) {
  const {arr, idx} = getPhotoRef(catId, subId, projectIdx, photoIdx);
  const p = ensureObject(arr, idx);
  p.sizes = p.sizes || ['A3','A2'];
  if (on && !p.sizes.includes(size)) p.sizes.push(size);
  if (!on) p.sizes = p.sizes.filter(s => s !== size);
  if (p.sizes.length === 0) { p.sellable = false; syncShopOrder(); }
  rerenderCurrentEditor();
}
```

- [ ] **Step 9.4** — `syncShopOrder()`: 판매 on 사진은 order 끝에 추가, 판매 off 사진은 제거:

```js
function syncShopOrder() {
  if (!data.shop) data.shop = { order: [], prices: { A3: 50000, A2: 80000 } };
  const allSellable = new Set();
  data.categories.forEach(cat => cat.subcategories.forEach(sub => {
    const groups = [];
    if (sub.photos) groups.push(sub.photos);
    if (sub.projects) sub.projects.forEach(pr => groups.push(pr.photos || []));
    groups.forEach(arr => arr.forEach(p => {
      if (typeof p !== 'string' && p.sellable) allSellable.add(p.src);
    }));
  }));
  // order에 없는 src는 뒤에 추가
  allSellable.forEach(src => {
    if (!data.shop.order.includes(src)) data.shop.order.push(src);
  });
  // 이제 order에 있는데 sellable 아닌 src는 제거
  data.shop.order = data.shop.order.filter(src => allSellable.has(src));
}
```

- [ ] **Step 9.5** — 로컬 어드민 열어서 사진 카드에 토글/인풋/체크박스 보이는지, 토글 on/off 동작, 저장 버튼 클릭 시 data.json 반영 확인

- [ ] **Step 9.6** — 커밋
```
git add admin.html
git commit -m "Admin Shop: 사진 카드에 판매 토글/작품명/사이즈 체크박스"
```

---

## Task 10: Admin — Shop 관리 페이지

**Files:** `admin.html`

- [ ] **Step 10.1** — 사이드바 카테고리 리스트 위에 Shop 고정 항목:

```html
<div class="sidebar-section">
  <button class="cat-item shop-nav-item" onclick="openShopPage()">
    🛍 Shop (<span id="shop-count">0</span>장)
  </button>
</div>
```

`renderSidebar()` 끝에서 `document.getElementById('shop-count').textContent = (data.shop?.order || []).length` 업데이트.

- [ ] **Step 10.2** — `renderShopPage()` 편집 영역 구현:

```js
function openShopPage() {
  currentEditor = { type: 'shop' };
  const editor = document.getElementById('editor');
  const prices = data.shop?.prices || { A3: 50000, A2: 80000 };
  const order = data.shop?.order || [];
  // src → photo 객체 맵 수집 (Task 7의 collectShopPhotos 비슷)
  const pool = new Map();
  data.categories.forEach(cat => cat.subcategories.forEach(sub => {
    const groups = [];
    if (sub.photos) groups.push({ arr: sub.photos, where: { catId: cat.id, subId: sub.id } });
    if (sub.projects) sub.projects.forEach((pr, pi) => groups.push({
      arr: pr.photos || [], where: { catId: cat.id, subId: sub.id, projectIdx: pi, projectName: pr.name }
    }));
    groups.forEach(g => g.arr.forEach(p => {
      if (typeof p !== 'string' && p.sellable) pool.set(p.src, { photo: p, where: g.where });
    }));
  }));
  editor.innerHTML = `
    <h2>Shop 관리</h2>
    <section class="shop-prices">
      <h3>포스터 가격</h3>
      <label>A3 ₩<input type="number" id="price-A3" value="${prices.A3}"></label>
      <label>A2 ₩<input type="number" id="price-A2" value="${prices.A2}"></label>
      <button onclick="saveShopPrices()">가격 저장</button>
    </section>
    <section class="shop-order">
      <h3>판매 사진 순서 (드래그로 변경)</h3>
      <div id="shop-order-list">
        ${order.filter(src => pool.has(src)).map((src, i) => {
          const entry = pool.get(src);
          const { photo, where } = entry;
          return `<div class="shop-row" draggable="true" data-idx="${i}" data-src="${src}">
            <span class="drag-handle">⋮⋮</span>
            <img src="${photo.src}" style="width:60px;height:60px;object-fit:cover">
            <span>${photo.name || '(이름 없음)'}</span>
            <span class="from">from ${where.catId}/${where.subId}${where.projectName ? '/'+where.projectName : ''}</span>
            <button onclick="jumpToPhoto('${where.catId}','${where.subId}',${where.projectIdx ?? 'null'})">편집</button>
          </div>`;
        }).join('')}
      </div>
    </section>
  `;
  bindShopOrderDrag();
}

function saveShopPrices() {
  if (!data.shop) data.shop = { order: [], prices: {} };
  data.shop.prices = {
    A3: parseInt(document.getElementById('price-A3').value, 10) || 0,
    A2: parseInt(document.getElementById('price-A2').value, 10) || 0
  };
  saveData();
  alert('가격 저장 완료');
}
```

- [ ] **Step 10.3** — `bindShopOrderDrag()`: 기존 `.sub-row` 드래그 코드 패턴 재활용해서 `.shop-row` 드래그 → `data.shop.order` 배열 재정렬 → `openShopPage()` 재렌더

- [ ] **Step 10.4** — CSS 추가:

```css
.shop-prices { padding: 16px; background: var(--surface); border-radius: 4px; margin-bottom: 24px; }
.shop-prices label { display: inline-block; margin-right: 16px; }
.shop-prices input { width: 100px; padding: 4px; background: #2a2a2a; border: 1px solid #444; color: #eee; }
.shop-row { display:flex; align-items:center; gap: 12px; padding: 8px; background: var(--surface); border-radius: 4px; margin-bottom: 6px; }
.shop-row.dragging { opacity: 0.4; }
.shop-row.drag-over { border: 2px dashed var(--accent); }
.shop-row .from { color: #888; font-size: 0.8rem; margin-left: auto; }
```

- [ ] **Step 10.5** — 브라우저에서 어드민 Shop 페이지:
  - 가격 편집/저장 → data.json 반영
  - 판매 사진 리스트 + 드래그 순서 변경 → 저장 → 메인 사이트 Shop 뷰 순서 반영
  - 편집 버튼 → 원래 카테고리로 점프

- [ ] **Step 10.6** — 커밋
```
git add admin.html
git commit -m "Admin Shop: Shop 관리 페이지 (가격 편집 + 판매 사진 드래그 순서)"
```

---

## Task 11: 통합 테스트 (수동) + 마무리

- [ ] **Step 11.1** — 로컬 서버 재시작, 클리어 캐시로 전체 플로우 확인:
  1. Admin → 여러 카테고리의 사진 몇 장 판매 on, 작품명/사이즈 설정
  2. Admin → Shop 페이지에서 순서 조정, 가격 편집
  3. 저장 → 메인 사이트 새로고침
  4. 네비에 Shop 노출 확인
  5. Shop 뷰에서 가로 스크롤, 사진 클릭 → 모달 → 사이즈 선택
  6. 다른 카테고리 이동 시 Shop 뷰 닫힘
  7. 기존 문자열 사진에서 Get Poster 숨김, sellable 사진에서 표시
  8. 모바일 viewport(크롬 DevTools)에서 Shop 뷰 스냅 스크롤 확인

- [ ] **Step 11.2** — CLAUDE.md `Current State` / `Pending Work` 섹션 업데이트:
  - Shop 카테고리 기능 추가 (Current State 하위 섹션)
  - A4 제거 (포스터 가격 부분)

- [ ] **Step 11.3** — 최종 커밋
```
git add CLAUDE.md
git commit -m "Shop: CLAUDE.md 업데이트 — Shop 카테고리 완료"
```

- [ ] **Step 11.4** — GitHub push (자동 Vercel 배포)
```
export PATH="/opt/homebrew/bin:$PATH"
git push
```

---

## Self-Review 체크포인트

- 스펙의 각 요구사항 → 태스크 매핑:
  - 데이터 구조 `{src, sellable, sizes, name}` → Task 1, 2
  - `shop.order`, `shop.prices` → Task 5
  - Shop 가로스크롤 뷰 → Task 6, 7
  - 네비 자동 노출 → Task 8
  - Get Poster 버튼 가시성 → Task 3
  - Get Poster 모달 사이즈 필터 + A4 제거 → Task 4
  - 어드민 사진 카드 판매 UI → Task 9
  - 어드민 Shop 관리 페이지 (가격 + 순서) → Task 10
  - 하위호환 (기존 문자열 photos) → Task 2 (헬퍼 래핑)
  - 모바일 스냅 스크롤 → Task 6 (@media)
- 통합 테스트 → Task 11

커버리지 확인됨.
