# peart_web - jinho.kim Portfolio

## Project Overview
사진작가 jinho.kim의 포트폴리오 웹사이트. 순수 HTML/CSS/JS + data.json 기반 정적 사이트.

## Tech Stack
- HTML/CSS/JS only (no framework)
- data.json: 모든 카테고리/사진 데이터 관리
- Cloudinary: 이미지/영상 업로드 (admin.html에서 사용, cloud: dw0q5sxc6)
- Python HTTP server: 로컬 개발 (`python3 -m http.server 3000`)
- Vercel 배포: https://pro-five-lovat.vercel.app/
- GitHub: https://github.com/swg2210/peart_web (gh CLI 인증 완료)

## File Structure
```
index.html       # 메인 사이트 (모든 뷰 포함)
index-white.html # 화이트 버전
admin.html       # 관리자 패널 (data.json CRUD)
data.json        # 카테고리/사진 데이터
api/config.js    # Cloudinary 설정
api/save-data.js # 데이터 저장 API
images/          # 로컬 이미지 파일들 (테스트용, 8~16MB 원본)
film/            # 영상 파일 (로컬 테스트용, .gitignore 권장)
CLAUDE.md        # 이 파일
```

## Architecture & Key Concepts

### 카테고리 타입 시스템 (data.json의 subcategory.type)
- **없음 (default)**: 풀스크린 슬라이더 갤러리 (Personal 카테고리 등)
- **"split"**: 좌측 대표사진 + 우측 CSS columns masonry 썸네일 그리드 (Wedding)
- **"grid"**: yosigo.es 스타일 3열 프로젝트 그리드 (Interior) → 프로젝트 클릭 시 가로 스크롤 상세 뷰 (jonathanbertin.com 참고)

### JS 데이터 맵 (index.html 내)
- `subDataMap`: catId → [subName, ...]
- `subInfoMap`: subName → { title, subtitle, type }
- `catPhotosMap`: subName → [photoSrc, ...]
- `gridDataMap`: catId → sub (type=grid인 서브카테고리)
- `splitDataMap`: subName → [photoSrc, ...] (type=split)

### 이미지 최적화 시스템
- `optimizeImg(src, opts)`: Cloudinary URL에 변환 파라미터 자동 삽입
  - 풀사이즈: `f_auto,q_auto,w_2000` (원본 8MB → ~380KB)
  - 썸네일: `f_auto,q_auto,w_600`
  - 로컬 이미지(`./images/`)는 변환 안 함
- **주의**: `img.dataset.originalSrc`에 원본 URL, `img.dataset.lazySrc`에 최적화 URL 저장
  - enterPhotoMode에서 사진 매칭 시 반드시 `originalSrc`로 매칭해야 함
  - lazySrc로 매칭하면 최적화 파라미터 때문에 매칭 실패함 (이전 버그)

### Lazy Loading
- **메인 슬라이더 (allPhotos 226장)**:
  - 초기 로드: 첫 사진 즉시 + 앞뒤 8장 프리로드 (PRELOAD_RANGE = 8)
  - 스크롤 시: goTo()에서 다음 사진 src 즉시 세팅 + preloadAround() 호출
  - enterPhotoMode(): 해당 카테고리 사진 전체 즉시 src 세팅
- **웨딩 split 썸네일**: IntersectionObserver (root: #split-thumbs, rootMargin: 200px)

### 뷰 모드
- `galleryMode`: 기본 슬라이더 갤러리 (타이틀 트랜지션 → 포토모드)
- `gridViewMode`: Interior 3열 그리드
- `projectDetailMode`: Interior 프로젝트 가로 스크롤 상세 뷰 (history.pushState로 뒤로가기 지원)
- `splitViewMode`: Wedding split 뷰

### 네비게이션 플로우
1. 상위 카테고리 클릭 → 하위 카테고리 리스트 표시 + 첫 번째 서브 자동 오픈
2. 서브카테고리 type에 따라 적절한 뷰 자동 진입
3. `bindSubLinks()`: 하위 카테고리 링크 클릭 시 type별 분기 처리
4. grid/split 뷰 열려있을 때 빈 공간 클릭해도 메인으로 안 돌아감
5. sub-list z-index: 101 (grid/split 뷰 위에 표시)
6. jinho.kim 로고 클릭 → 모든 뷰 닫고 메인으로 복귀
7. Commercial sub-list는 가로 배치 (.horizontal), Personal은 세로 유지

### Admin Panel
- 기본 타입 (Personal 등): 사진 업로드/삭제/순서변경 + 타이틀/서브타이틀 편집
- grid 타입 (Interior): `renderGridSubEditor` — Nav 이름 편집 + 프로젝트 추가/삭제, 프로젝트별 사진 관리
- split 타입 (Wedding): `renderSplitSubEditor` — Nav 이름 편집 + 사진 업로드/삭제, 첫 사진이 대표사진

## Current State (2026-04-09)

### Commercial 카테고리
- **Wedding** (type: split):
  - PC: 대표사진 + CSS columns masonry (기존 유지)
  - 모바일: 가로 스크롤 포스터 → 클릭 시 가로 스크롤 상세 (줌인 트랜지션)
  - data.json: `projects` 배열 구조 (`{ name, coverPhoto, photos }`)
  - PC split 뷰는 projects의 allPhotos를 합쳐서 표시
- **Interior** (type: grid):
  - PC: 3열 프로젝트 그리드 → 프로젝트 클릭 시 가로 스크롤 상세 뷰
  - 모바일: 웨딩과 동일한 가로 스크롤 포스터 → 클릭 시 가로 스크롤 상세

### Personal 카테고리
- Seoul KR, ISLAND, Copenhagen DK, Malmö SE, Berlin DE, Berlin Bauhaus
- 어드민에서 실제 사진 등록 완료 (Cloudinary URL)

### 모바일 최적화 (2026-04-09 적용 완료)
- stage `top: 90px, bottom: 36px`로 헤더/카테고리/카운터 영역 확보
- `.photo` max-height: `calc(100vh - 90px - 56px)`
- `overscroll-behavior: none` + viewport `maximum-scale=1` (iOS 바운스 방지)
- `#mobile-sub-bar` z-index 300, top 동적 위치
- 모든 스크롤 영역 스크롤바 숨김 (`scrollbar-width: none` + `::-webkit-scrollbar`)
- 카운터 모바일 위치 조정 (`bottom: 12px, right: 20px`)
- 카테고리 전환 시 모든 뷰(split/grid/projectDetail) 닫기
- 상세 뷰에서 같은 카테고리 클릭해도 다시 열리도록 토글 로직 수정

### Admin Panel
- 기본 타입 (Personal 등): 사진 업로드/삭제/순서변경 + 타이틀/서브타이틀 편집
- grid 타입 (Interior): `renderGridSubEditor` — Nav 이름 편집 + 프로젝트 추가/삭제, 프로젝트별 사진 관리
- split 타입 (Wedding): `renderSplitSubEditor` — Nav 이름 편집 + 사진 업로드/삭제 (아직 projects 구조 미반영, 기존 photos 배열 UI)
- **메인 사진 관리**: 사이드바 최상단 "메인 사진" 항목 — allPhotos 업로드/삭제/순서변경

## Pending Work
- [ ] **admin.html 웨딩 프로젝트 관리 UI** — data.json이 projects 구조로 바뀌었으나 어드민은 아직 기존 photos 배열 UI. renderSplitSubEditor를 renderGridSubEditor처럼 프로젝트 단위 관리로 변경 필요
- [ ] **사진 캡션 기능** — allPhotos를 객체 배열({src, title, desc})로 변환, 하단 제목/설명 표시 (작업 시작했으나 원복됨)
- [ ] **Film 뷰** — type "film" 영화관 스타일 영상 뷰. Cloudinary 유료 전환 필요 (255MB 영상, 무료 100MB 제한)
- [ ] Film 어드민 관리 UI 구현
- [ ] **Safe Area** — 아이폰 노치/홈 인디케이터 대응 (`env(safe-area-inset-*)`)
- [ ] **터치 타겟** — 네비/버튼 등 44px 미달
- [ ] Gallery 타이틀 — 600px 이하 추가 축소
- [ ] Landscape 대응
- [ ] hover → active 전환
- [ ] 렌더링 속도 추가 개선

## Design Reference
- yosigo.es/commercial/ : Interior 그리드 레이아웃 참고
- jonathanbertin.com/commissioned/discipline : 프로젝트 상세 가로 스크롤 참고 (네이티브 overflow-x: auto, JS 스크롤 변환 X)
- 핀터레스트 스타일 masonry : Wedding split 뷰 참고

## Dev Notes
- 로컬에서 file:// 프로토콜로 열면 fetch가 CORS로 막힘 → 반드시 HTTP 서버 사용
- `python3 -m http.server 3000` 후 http://localhost:3000 접속
- 작업 전 항상 사용자 컨펌 받고 진행할 것
- Vercel은 GitHub main push 시 자동 배포
- images/ 폴더 원본은 8~16MB씩 (테스트용), 실서비스는 Cloudinary URL 사용
- git push 시 `export PATH="/opt/homebrew/bin:$PATH"` 필요할 수 있음
- Xcode 시뮬레이터: `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer` 필요, iOS 런타임 별도 다운로드
- 시뮬레이터에서 터치 스와이프 안 먹힐 수 있음 — 인터랙션은 실기기에서 테스트

## Known Pitfalls
1. **optimizeImg + URL 매칭**: Cloudinary URL에 최적화 파라미터 삽입 시 원본 URL과 달라짐 → 매칭은 반드시 originalSrc 사용
2. **CSS Grid vs CSS Columns**: 불규칙 높이 사진은 CSS Grid로 하면 행 간 여백 불균일 → CSS columns 사용
3. **nav isGridCat 분기**: 상위 카테고리 클릭 시 type별로 바로 뷰를 여는 게 아니라, 항상 서브리스트 표시 후 첫 번째 서브의 type에 따라 분기
4. **bindSubLinks 호출 타이밍**: 서브리스트 렌더 후 반드시 bindSubLinks 호출해야 클릭 이벤트 바인딩됨
5. **lazy loading과 enterPhotoMode**: 카테고리 진입 시 해당 사진 전체 src 즉시 세팅 (async/await 방식은 setTimeout 콜백에서 동작 안 함)
6. **가로 스크롤은 네이티브로**: JS로 deltaY→scrollLeft 강제 변환하면 부자연스러움 → overflow-x: auto 사용. 단, 마우스 휠(상하→가로)은 deltaY > deltaX 조건으로 JS 변환 필요
7. **sub-list 가로/세로**: Commercial(grid/split 타입 포함)은 .horizontal 클래스로 가로 배치, Personal은 세로 유지
8. **CSS display:none → transition 불가**: fade 효과 필요 시 opacity + pointer-events로 처리
9. **뷰 전환 시 다른 뷰 닫기**: 새 뷰 열 때 반드시 다른 모든 뷰 닫아야 함
10. **position: absolute 자식은 부모 padding 무시**: stage에 padding 줘도 .photo에 안 먹힘 → stage의 inset(top/bottom)을 직접 조정해야 함
11. **iOS 좌우 바운스**: `overscroll-behavior: none` + viewport `maximum-scale=1, user-scalable=no`로 방지
12. **const 중복 선언**: JS에서 같은 스코프에 `const` 변수를 두 번 선언하면 전체 스크립트가 죽음 (isMobile 중복 사례)
13. **모바일 카테고리 전환**: 상세 뷰에서 카테고리 클릭 시 `wasInDetail` 플래그로 토글 닫힘 방지해야 함. 안 그러면 같은 카테고리 클릭 시 닫히기만 함
14. **모바일 split/grid 뷰 구조**: PC와 모바일이 완전히 다른 UI. `isMobile()` 분기로 PC는 기존 뷰, 모바일은 가로 스크롤 포스터 사용. HTML에 `#split-mobile-gallery`, `#grid-mobile-gallery` 별도 컨테이너
15. **스크롤바 숨김**: iOS Safari에서 가로 스크롤 시 스크롤바 보임 → `scrollbar-width: none` + `::-webkit-scrollbar { display: none }` 둘 다 필요
