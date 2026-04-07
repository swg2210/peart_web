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

### Admin Panel
- 기본 타입 (Personal 등): 사진 업로드/삭제/순서변경 + 타이틀/서브타이틀 편집
- grid 타입 (Interior): `renderGridSubEditor` — 프로젝트 추가/삭제, 프로젝트별 사진 관리
- split 타입 (Wedding): `renderSplitSubEditor` — 사진 업로드/삭제, 첫 사진이 대표사진

## Current State (2026-04-08)

### Commercial 카테고리
- **Wedding** (type: split): 대표사진 + CSS columns masonry, 썸네일 클릭 시 대표사진 교체
- **Interior** (type: grid): 3열 프로젝트 그리드, 6개 테스트 프로젝트 등록됨

### Personal 카테고리
- Seoul KR, ISLAND, Copenhagen DK, Malmö SE, Berlin DE, Berlin Bauhaus
- 어드민에서 실제 사진 등록 완료 (Cloudinary URL)

## Pending Work
- [ ] 렌더링 속도 추가 개선 (아직 느린 편)
- [ ] 영상(mp4) 지원 검토 (Cloudinary 무료 플랜: 파일당 100MB, 총 25GB)
- [ ] 모바일 최적화 확인

## Design Reference
- yosigo.es/commercial/ : Interior 그리드 레이아웃 참고
- 핀터레스트 스타일 masonry : Wedding split 뷰 참고

## Dev Notes
- 로컬에서 file:// 프로토콜로 열면 fetch가 CORS로 막힘 → 반드시 HTTP 서버 사용
- `python3 -m http.server 3000` 후 http://localhost:3000 접속
- 작업 전 항상 사용자 컨펌 받고 진행할 것
- Vercel은 GitHub main push 시 자동 배포
- images/ 폴더 원본은 8~16MB씩 (테스트용), 실서비스는 Cloudinary URL 사용
- git push 시 `export PATH="/opt/homebrew/bin:$PATH"` 필요할 수 있음

## Known Pitfalls
1. **optimizeImg + URL 매칭**: Cloudinary URL에 최적화 파라미터 삽입 시 원본 URL과 달라짐 → 매칭은 반드시 originalSrc 사용
2. **CSS Grid vs CSS Columns**: 불규칙 높이 사진은 CSS Grid로 하면 행 간 여백 불균일 → CSS columns 사용
3. **nav isGridCat 분기**: 상위 카테고리 클릭 시 type별로 바로 뷰를 여는 게 아니라, 항상 서브리스트 표시 후 첫 번째 서브의 type에 따라 분기
4. **bindSubLinks 호출 타이밍**: 서브리스트 렌더 후 반드시 bindSubLinks 호출해야 클릭 이벤트 바인딩됨
5. **lazy loading과 enterPhotoMode**: 카테고리 진입 시 해당 사진 전체 src 즉시 세팅 (async/await 방식은 setTimeout 콜백에서 동작 안 함)
6. **가로 스크롤은 네이티브로**: JS로 deltaY→scrollLeft 강제 변환하면 부자연스러움 → overflow-x: auto + wheel 이벤트 안 건드리기 (jonathanbertin.com 방식)
7. **sub-list 가로/세로**: Commercial(grid/split 타입 포함)은 .horizontal 클래스로 가로 배치, Personal은 세로 유지
