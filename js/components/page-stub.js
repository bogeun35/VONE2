/**
 * PageStub — LNB 메뉴 기반 빈 페이지 자동 생성 + 탭 전환 연결
 *
 * 동작:
 *   1) boot() 시 LNB 의 모든 menu link(data-tab-id) 를 메타로 수집
 *   2) window 의 'tab:activated' 이벤트를 받아 해당 페이지로 전환
 *   3) 아직 만들어지지 않은 페이지(#page-<tabId>) 라면 공통 스키마로 즉석 생성
 *        - page-header (번호 + breadcrumb + title)
 *        - filter-box (조건 검색 / 필터 초기화 + 데이터 조회 버튼)
 *        - grid-section (grid-toolbar + 빈 grid placeholder)
 *        - grid-action-footer (액션 영역 placeholder)
 *   4) 기존 실제 페이지(#page-transfer 등)는 그대로 사용, 숨김/표시만 제어
 *
 * 규약:
 *   - 각 LNB 메뉴는 data-tab-id, data-tab-title, data-page-no 를 가진다
 *   - 실제 페이지는 id="page-<tabId>" 로 존재 (없으면 stub 생성)
 */
(function () {
  const CONTENT_SELECTOR = '#content, .content';
  // tabId → 실제 페이지 id 매핑 (기존 하드코딩된 페이지용)
  const REAL_PAGE_ID = {
    'transfer-list': 'page-transfer',
  };

  const meta = new Map(); // tabId → { title, category, pageNo }

  function collectMeta() {
    meta.clear();
    document.querySelectorAll('.lnb-menu a[data-tab-id]').forEach((a) => {
      const tabId = a.dataset.tabId;
      if (!tabId) return;
      // 카테고리 이름 (가장 가까운 .lnb-category 의 header 텍스트)
      const cat = a.closest('.lnb-category');
      const catHeader = cat && cat.querySelector('.lnb-category-header');
      const category = catHeader ? catHeader.textContent.trim() : '';
      meta.set(tabId, {
        title: a.dataset.tabTitle || a.textContent.trim() || tabId,
        category,
        pageNo: a.dataset.pageNo || '',
      });
    });
  }

  function getContent() {
    return document.querySelector(CONTENT_SELECTOR);
  }

  function resolvePageId(tabId) {
    return REAL_PAGE_ID[tabId] || `page-${tabId}`;
  }

  function findPage(tabId) {
    return document.getElementById(resolvePageId(tabId));
  }

  /** TabManager 에서 탭 메타(제목/부모) 조회 */
  function lookupTabMeta(tabId) {
    const tabs = (window.TabManager && window.TabManager.getTabs && window.TabManager.getTabs()) || [];
    return tabs.find(t => t.id === tabId) || null;
  }

  /** 공통 스키마 빈 페이지 생성 */
  function createStubPage(tabId) {
    // 1) LNB 메타 우선 → 2) TabManager 탭 메타 → 3) tabId fallback
    const lnb = meta.get(tabId);
    const tab = lookupTabMeta(tabId);
    const title = (lnb && lnb.title) || (tab && tab.title) || tabId;
    const category = (lnb && lnb.category) || '';
    const pageNo = (lnb && lnb.pageNo) || '';
    const detailOf = (tab && tab.detailOf) || null;

    // detail/new 탭 (LNB 가 아닌 자식 탭) → 간소한 "빈 페이지"
    const isDetailTab = !lnb && !!tab;

    const pageId = resolvePageId(tabId);
    const wrap = document.createElement('div');
    wrap.className = 'page page-stub' + (isDetailTab ? ' page-stub-blank' : '');
    wrap.id = pageId;
    wrap.dataset.tabId = tabId;
    if (pageNo) wrap.dataset.pageNo = pageNo;

    if (isDetailTab) {
      // 부모 탭명으로 breadcrumb 구성
      const parentMeta = detailOf ? (meta.get(detailOf) || lookupTabMeta(detailOf)) : null;
      const crumb = parentMeta ? `${escapeHtml(parentMeta.category || '')} &gt; ${escapeHtml(parentMeta.title || '')} &gt; ${escapeHtml(title)}` : escapeHtml(title);
      wrap.innerHTML = `
        <div class="page-header">
          <div>
            <div class="breadcrumb">${crumb}</div>
            <h1 class="page-title">${escapeHtml(title)}</h1>
          </div>
        </div>
        <div class="page-empty-body">빈 페이지 — 추후 구현됩니다</div>
      `;
    } else {
      wrap.innerHTML = `
        <div class="page-header">
          <div>
            <div class="breadcrumb">${escapeHtml(category)} &gt; ${escapeHtml(title)}</div>
            <h1 class="page-title">${escapeHtml(title)}</h1>
          </div>
        </div>

        <!-- Filter Section -->
        <div class="filter-box">
          <div class="filter-header">
            <span class="filter-header-title">
              <svg class="filter-arrow" width="10" height="10" viewBox="0 0 10 10"><path d="M3 2l4 3-4 3" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>
              조건 검색
            </span>
            <div class="filter-header-actions">
              <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation()">필터 초기화</button>
              <button class="btn btn-sm btn-primary" onclick="event.stopPropagation()">데이터 조회 <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><circle cx="6" cy="6" r="4.5" stroke="white" stroke-width="1.2"/><path d="M9.5 9.5L13 13" stroke="white" stroke-width="1.2"/></svg></button>
            </div>
          </div>
          <div class="filter-body open">
            <div class="filter-row">
              <div class="filter-label">조건 검색</div>
              <div class="filter-fields filter-fields-wrap">
                <div class="page-empty-body" style="margin:0;min-height:40px;flex:1;">조건 필드는 추후 정의됩니다</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Grid Section -->
        <div class="grid-section">
          <div class="grid-toolbar">
            <div class="grid-toolbar-left">
              <span class="grid-table-name">${escapeHtml(title)} 테이블</span>
              <span class="grid-total">검색결과 : 0건</span>
              <span class="selected-count">선택 <strong>0</strong>건</span>
            </div>
            <div class="grid-toolbar-right">
              <button class="btn btn-sm btn-outline-primary" disabled>전체 복사</button>
              <button class="btn btn-sm btn-outline-primary" disabled>컬럼 선택</button>
              <button class="btn btn-sm btn-outline-primary" disabled>컬럼 초기화</button>
            </div>
          </div>
          <div class="grid-container-stub">테이블 영역 (준비 중)</div>
        </div>

        <!-- Footer -->
        <div class="grid-action-footer">
          <div class="grid-action-footer-left">
            <button class="btn btn-sm btn-primary" disabled>액션 버튼</button>
          </div>
        </div>
      `;
    }
    const content = getContent();
    if (content) content.appendChild(wrap);
    return wrap;
  }

  function hideAllPages() {
    document.querySelectorAll('.content .page').forEach((p) => {
      p.style.display = 'none';
    });
  }

  function syncLnbActive(tabId) {
    document.querySelectorAll('.lnb-menu li').forEach((li) => li.classList.remove('active'));
    const a = document.querySelector(`.lnb-menu a[data-tab-id="${cssEsc(tabId)}"]`);
    if (a && a.parentElement) a.parentElement.classList.add('active');
  }

  function showPage(tabId) {
    if (!tabId) return;
    let page = findPage(tabId);
    if (!page) page = createStubPage(tabId);
    hideAllPages();
    page.style.display = '';
    syncLnbActive(tabId);
    // 페이지 활성화 이벤트 (다른 컴포넌트가 훅 걸 수 있도록)
    window.dispatchEvent(new CustomEvent('page:shown', {
      detail: { tabId, pageId: page.id, meta: meta.get(tabId) || null },
    }));
  }

  function cssEsc(s) {
    return (window.CSS && CSS.escape) ? CSS.escape(s) : String(s).replace(/"/g, '\\"');
  }

  // ========= 이벤트 바인딩 =========
  function bind() {
    window.addEventListener('tab:activated', (e) => {
      const id = e && e.detail && e.detail.id;
      if (!id) return;
      showPage(id);
    });
    // 탭 새로고침은 현재 페이지 재표시만
    window.addEventListener('tab:refresh', (e) => {
      const id = e && e.detail && e.detail.id;
      if (id) showPage(id);
    });
  }

  function boot() {
    collectMeta();
    bind();
    // TabManager.boot() 이 이미 돌았다면 활성 탭에 해당하는 페이지 즉시 표시
    const active = window.TabManager && window.TabManager.getActive && window.TabManager.getActive();
    if (active) showPage(active);
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  window.PageStub = {
    boot,
    showPage,
    getMeta: (tabId) => meta.get(tabId) || null,
    getAllMeta: () => Array.from(meta.entries()).map(([id, m]) => ({ id, ...m })),
  };
})();
