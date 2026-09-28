/* Plain JS, consumes existing split projects so admin uploads work unchanged. */
class WeddingGallery {
  constructor(root, optimize) {
    this.root = root;
    this.optimize = optimize;
    this.items = [];
    this.visibleItems = [];
    this.selected = -1;
    this.version = 0;
    root.classList.add('wedding-gallery');
    root.innerHTML = `
      <div class="wg-content">
        <aside class="wg-focus" aria-label="선택한 사진">
          <div class="wg-focus-bar">
            <button type="button" data-action="clear">← 전체 사진</button>
            <div class="wg-focus-actions">
              <button type="button" data-action="previous" aria-label="이전 사진">←</button>
              <button type="button" data-action="next" aria-label="다음 사진">→</button>
              <button type="button" data-action="expand" aria-label="사진 전체 화면">⤢</button>
            </div>
          </div>
          <div class="wg-focus-stage"><img alt=""></div>
          <div class="wg-focus-footer"><div><span class="wg-project"></span><p class="wg-position"></p></div><button type="button" data-action="project">이 촬영 더 보기 ↗</button></div>
        </aside>
        <div class="wg-feed"><div class="wg-grid"></div><div class="wg-empty" hidden><strong>Wedding</strong>웨딩 사진을 준비하고 있습니다.<br><a href="?preview=wedding">갤러리 레이아웃 미리보기 ↗</a></div></div>
      </div>
      <dialog class="wg-dialog" aria-label="사진 전체 화면"><button type="button" aria-label="전체 화면 닫기">×</button><img alt=""></dialog>`;
    this.grid = root.querySelector('.wg-grid');
    this.content = root.querySelector('.wg-content');
    this.focusImage = root.querySelector('.wg-focus-stage img');
    this.dialog = root.querySelector('dialog');
    root.querySelector('.wg-dialog button').addEventListener('click', () => this.dialog.close());
    root.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.dataset.index !== undefined) this.select(Number(button.dataset.index));
      const action = button.dataset.action;
      if (action === 'clear') this.clear();
      if (action === 'previous') this.select(this.selected - 1, false);
      if (action === 'next') this.select(this.selected + 1, false);
      if (action === 'expand' && this.items[this.selected]) {
        const img = this.dialog.querySelector('img'); img.src = this.focusImage.src; img.alt = this.focusImage.alt;
        this.dialog.showModal();
      }
      if (action === 'project') this.filterProject();
    });
    window.addEventListener('keydown', event => {
      if (!root.classList.contains('open') || this.selected < 0 || this.dialog.open) return;
      if (event.key === 'Escape') { event.preventDefault(); this.clear(); }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault(); this.select(this.selected + (event.key === 'ArrowRight' ? 1 : -1), false);
      }
    });
  }
  async open(data, preview) {
    const version = ++this.version;
    this.items = [];
    (data.projects || []).forEach((project, projectIndex) => {
      (project.photos || []).forEach(photo => {
        const src = typeof photo === 'string' ? photo : photo.src;
        if (src) this.items.push({ src, name: project.name, projectIndex });
      });
    });
    if (!this.items.length) this.items = (data.allPhotos || []).map(src => ({src, name:'Wedding', projectIndex:0}));
    let isPreview = false;
    if (!this.items.length && preview) {
      try {
        const res = await fetch('./wedding-preview.json');
        if (!res.ok) throw new Error('Preview unavailable');
        const samples = await res.json();
        if (version !== this.version) return;
        this.items = samples.map(p => ({...p, name:'Portfolio preview', projectIndex:-1}));
        isPreview = true;
      } catch (error) { console.warn('Wedding preview could not load', error); }
    }
    if (version !== this.version) return;
    this.isPreview = isPreview;
    this.visibleItems = this.items.map((_, index) => index);
    this.selected = -1;
    this.projectFiltered = false;
    this.content.classList.remove('has-selection');
    this.render();
    this.root.querySelector('.wg-feed').scrollTop = 0;
    this.content.scrollTop = 0;
  }
  render() {
    this.grid.replaceChildren();
    this.root.querySelector('.wg-empty').hidden = this.items.length > 0;
    const fragment = document.createDocumentFragment();
    this.visibleItems.forEach(index => {
      const item = this.items[index];
      const card = document.createElement('button');
      card.type = 'button'; card.className = 'wg-card'; card.dataset.index = index;
      card.setAttribute('aria-label', `${item.name || 'Wedding'} · 사진 ${index + 1} 크게 보기`);
      card.setAttribute('aria-pressed', String(index === this.selected));
      const img = document.createElement('img');
      img.src = this.optimize(item.src, {thumb:true}); img.alt = ''; img.loading = 'lazy'; img.decoding = 'async';
      if (item.width && item.height) { img.width = item.width; img.height = item.height; }
      img.addEventListener('error', () => { img.hidden = true; const error = document.createElement('span'); error.className = 'wg-error'; error.textContent = '사진을 불러올 수 없습니다'; card.append(error); }, {once:true});
      const caption = document.createElement('span'); caption.className = 'wg-caption'; caption.textContent = String(index+1).padStart(2,'0')+' / '+(item.name || 'Wedding');
      card.append(img, caption); fragment.append(card);
    });
    this.grid.append(fragment);
  }
  select(index, moveFocus = true) {
    if (!this.items[index] || !this.visibleItems.includes(index)) return;
    if (this.selected < 0) this.gridScroll = this.content.scrollTop;
    this.selected = index;
    const item = this.items[index];
    this.content.classList.add('has-selection');
    this.focusImage.src = this.optimize(item.src);
    this.focusImage.alt = `${item.name || 'Wedding'} · 사진 ${index+1}`;
    this.root.querySelector('.wg-project').textContent = item.name || 'Wedding';
    this.root.querySelector('.wg-position').textContent = String(this.visibleItems.indexOf(index)+1).padStart(2,'0')+' / '+String(this.visibleItems.length).padStart(2,'0');
    this.root.querySelector('[data-action=project]').hidden = this.isPreview || this.items.every(p => p.projectIndex === item.projectIndex);
    this.root.querySelector('[data-action=project]').textContent = this.projectFiltered ? '모든 촬영 보기 ↗' : '이 촬영 더 보기 ↗';
    this.root.querySelector('[data-action=previous]').disabled = index === this.visibleItems[0];
    this.root.querySelector('[data-action=next]').disabled = index === this.visibleItems[this.visibleItems.length-1];
    this.grid.querySelectorAll('.wg-card').forEach(card => card.setAttribute('aria-pressed', String(Number(card.dataset.index) === index)));
    if (matchMedia('(max-width:768px)').matches) this.content.scrollTop = 0;
    if (moveFocus) this.root.querySelector('[data-action=clear]').focus({preventScroll:true});
  }
  clear() {
    const previous = this.selected;
    this.selected = -1;
    this.projectFiltered = false;
    this.visibleItems = this.items.map((_,index)=>index);
    this.content.classList.remove('has-selection');
    this.render();
    if (matchMedia('(max-width:768px)').matches) this.content.scrollTop = this.gridScroll || 0;
    if (previous >= 0) this.grid.querySelector(`[data-index="${previous}"]`)?.focus({preventScroll:true});
  }
  filterProject() {
    const item = this.items[this.selected];
    if (!item) return;
    this.projectFiltered = !this.projectFiltered;
    this.visibleItems = this.items.map((_,index)=>index).filter(index => !this.projectFiltered || this.items[index].projectIndex === item.projectIndex);
    this.render(); this.select(this.selected, false);
  }
  close() { ++this.version; if (this.dialog.open) this.dialog.close(); }
}
