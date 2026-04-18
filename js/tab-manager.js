/**
 * TabManager — 브라우저형 페이지 탭
 * - LNB / 상세페이지 진입 시 탭을 열거나 기존 탭으로 전환
 * - 각 탭은 HTML(페이지) 단위로 관리: id/title/pinned/detailOf
 * - 고정(pin) / 닫기 / 새로고침 / 전체보기 지원
 * - localStorage 에 세션 복원용 상태 저장
 */
(function () {
  const KEY_TABS = 'vone:tabs:list';
  const KEY_ACTIVE = 'vone:tabs:activeId';

  let tabs = [];
  let activeId = null;

  function load() {
    try {
      tabs = JSON.parse(localStorage.getItem(KEY_TABS) || '[]');
      activeId = localStorage.getItem(KEY_ACTIVE) || null;
    } catch {
      tabs = []; activeId = null;
    }
    if (!Array.isArray(tabs)) tabs = [];
  }
  function save() {
    localStorage.setItem(KEY_TABS, JSON.stringify(tabs));
    if (activeId) localStorage.setItem(KEY_ACTIVE, activeId);
    else localStorage.removeItem(KEY_ACTIVE);
  }

  function findIndex(id) {
    return tabs.findIndex(t => t.id === id);
  }

  /** 탭 열기 — 이미 있으면 activate, 없으면 push */
  function openTab({ id, title, detailOf }) {
    if (!id) return;
    let idx = findIndex(id);
    if (idx === -1) {
      tabs.push({ id, title: title || id, pinned: false, detailOf: detailOf || null });
    } else {
      // 타이틀 갱신 (최신 우선)
      if (title) tabs[idx].title = title;
    }
    activeId = id;
    save();
    render();
    dispatch('tab:activated', { id });
  }

  function closeTab(id) {
    const idx = findIndex(id);
    if (idx === -1) return;
    if (tabs[idx].pinned) return;
    const wasActive = activeId === id;
    tabs.splice(idx, 1);
    if (wasActive) {
      // 인접 탭으로 전환 (오른쪽 우선, 없으면 왼쪽)
      const next = tabs[idx] || tabs[idx - 1] || null;
      activeId = next ? next.id : null;
    }
    save();
    render();
    if (wasActive && activeId) dispatch('tab:activated', { id: activeId });
  }

  function activate(id) {
    if (activeId === id) return;
    if (findIndex(id) === -1) return;
    activeId = id;
    save();
    render();
    dispatch('tab:activated', { id });
  }

  function togglePin(id) {
    const idx = findIndex(id);
    if (idx === -1) return;
    const t = tabs[idx];
    t.pinned = !t.pinned;
    // 고정 탭은 앞쪽으로 이동, 해제 시 고정 그룹 뒤로
    tabs.splice(idx, 1);
    if (t.pinned) {
      // 마지막 pinned 뒤에 삽입
      const lastPinned = tabs.map(x => x.pinned).lastIndexOf(true);
      tabs.splice(lastPinned + 1, 0, t);
    } else {
      // unpinned — 가장 앞 unpinned 자리에
      const firstUnpinned = tabs.findIndex(x => !x.pinned);
      tabs.splice(firstUnpinned === -1 ? tabs.length : firstUnpinned, 0, t);
    }
    save();
    render();
  }

  function refreshActive() {
    if (!activeId) return;
    dispatch('tab:refresh', { id: activeId });
  }

  function closeOthers(id) {
    tabs = tabs.filter(t => t.id === id || t.pinned);
    activeId = id;
    save(); render();
    dispatch('tab:activated', { id });
  }

  function closeRight(id) {
    const idx = findIndex(id);
    if (idx === -1) return;
    tabs = tabs.filter((t, i) => i <= idx || t.pinned);
    if (findIndex(activeId) === -1) { activeId = id; dispatch('tab:activated', { id }); }
    save(); render();
  }

  function dispatch(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  // ========= 렌더링 =========
  function render() {
    const listEl = document.getElementById('tabList');
    if (!listEl) return;
    listEl.innerHTML = tabs.map(t => {
      const active = t.id === activeId ? ' active' : '';
      const pinned = t.pinned ? ' pinned' : '';
      const closeBtn = t.pinned ? '' : '<button class="tab-item-close" data-act="close" aria-label="닫기">×</button>';
      const pinIcon = t.pinned
        ? '<span class="tab-item-pin" data-act="unpin" title="고정 해제"><svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M10 1.5a.5.5 0 01.5.5v4.5l3 2V10H9v5l-1 1-1-1v-5H2.5V8.5l3-2V2a.5.5 0 01.5-.5h4z"/></svg></span>'
        : '';
      return `
        <div class="tab-item${active}${pinned}" data-id="${escapeAttr(t.id)}" draggable="false">
          ${pinIcon}
          <span class="tab-item-title" title="${escapeAttr(t.title)}">${escapeHtml(t.title)}</span>
          ${closeBtn}
        </div>
      `;
    }).join('');
    // 활성 탭으로 자동 스크롤
    const activeEl = listEl.querySelector('.tab-item.active');
    if (activeEl && activeEl.scrollIntoView) activeEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  function renderAllMenu() {
    const menu = document.getElementById('tabAllMenu');
    if (!menu) return;
    if (tabs.length === 0) {
      menu.innerHTML = '<div class="tab-all-empty">열린 탭이 없습니다</div>';
      return;
    }
    menu.innerHTML = tabs.map(t => {
      const active = t.id === activeId ? ' active' : '';
      const pin = t.pinned ? '📌 ' : '';
      return `<div class="tab-all-item${active}" data-id="${escapeAttr(t.id)}">${pin}${escapeHtml(t.title)}</div>`;
    }).join('');
  }

  // ========= 컨텍스트 메뉴 =========
  function showContextMenu(x, y, id) {
    closeContextMenu();
    const t = tabs[findIndex(id)];
    if (!t) return;
    const menu = document.createElement('div');
    menu.className = 'tab-context-menu';
    menu.id = 'tabContextMenu';
    menu.innerHTML = `
      <div class="tab-ctx-item" data-act="refresh">새로고침</div>
      <div class="tab-ctx-item" data-act="${t.pinned ? 'unpin' : 'pin'}">${t.pinned ? '고정 해제' : '탭 고정'}</div>
      <div class="tab-ctx-sep"></div>
      <div class="tab-ctx-item${t.pinned ? ' disabled' : ''}" data-act="close">닫기</div>
      <div class="tab-ctx-item" data-act="close-others">다른 탭 모두 닫기</div>
      <div class="tab-ctx-item" data-act="close-right">오른쪽 탭 모두 닫기</div>
    `;
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    document.body.appendChild(menu);
    menu.addEventListener('click', (e) => {
      const item = e.target.closest('.tab-ctx-item');
      if (!item || item.classList.contains('disabled')) return;
      const act = item.dataset.act;
      if (act === 'refresh') { activate(id); refreshActive(); }
      else if (act === 'pin' || act === 'unpin') togglePin(id);
      else if (act === 'close') closeTab(id);
      else if (act === 'close-others') closeOthers(id);
      else if (act === 'close-right') closeRight(id);
      closeContextMenu();
    });
    setTimeout(() => document.addEventListener('click', closeContextMenu, { once: true }), 0);
  }
  function closeContextMenu() {
    const m = document.getElementById('tabContextMenu');
    if (m) m.remove();
  }

  // ========= 이벤트 바인딩 =========
  function bind() {
    const listEl = document.getElementById('tabList');
    const refreshBtn = document.getElementById('tabActionRefresh');
    const allBtn = document.getElementById('tabActionAll');
    const allMenu = document.getElementById('tabAllMenu');

    // 탭 클릭
    listEl && listEl.addEventListener('click', (e) => {
      const item = e.target.closest('.tab-item');
      if (!item) return;
      const id = item.dataset.id;
      const closeBtn = e.target.closest('[data-act="close"]');
      const unpinBtn = e.target.closest('[data-act="unpin"]');
      if (closeBtn) { e.stopPropagation(); closeTab(id); return; }
      if (unpinBtn) { e.stopPropagation(); togglePin(id); return; }
      activate(id);
    });

    // 탭 더블클릭 = 고정 토글
    listEl && listEl.addEventListener('dblclick', (e) => {
      const item = e.target.closest('.tab-item');
      if (!item) return;
      togglePin(item.dataset.id);
    });

    // 우클릭 컨텍스트 메뉴
    listEl && listEl.addEventListener('contextmenu', (e) => {
      const item = e.target.closest('.tab-item');
      if (!item) return;
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, item.dataset.id);
    });

    // 가운데클릭 = 닫기
    listEl && listEl.addEventListener('auxclick', (e) => {
      if (e.button !== 1) return;
      const item = e.target.closest('.tab-item');
      if (!item) return;
      e.preventDefault();
      closeTab(item.dataset.id);
    });

    // 새로고침 버튼
    refreshBtn && refreshBtn.addEventListener('click', refreshActive);

    // 전체보기 드롭다운
    allBtn && allBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!allMenu) return;
      const open = allMenu.style.display === 'block';
      if (open) { allMenu.style.display = 'none'; return; }
      renderAllMenu();
      allMenu.style.display = 'block';
      const closeOnOutside = (ev) => {
        if (allMenu.contains(ev.target) || allBtn.contains(ev.target)) return;
        allMenu.style.display = 'none';
        document.removeEventListener('click', closeOnOutside);
      };
      setTimeout(() => document.addEventListener('click', closeOnOutside), 0);
    });
    allMenu && allMenu.addEventListener('click', (e) => {
      const item = e.target.closest('.tab-all-item');
      if (!item) return;
      activate(item.dataset.id);
      allMenu.style.display = 'none';
    });

    // LNB 메뉴 링크 → 탭 오픈
    document.querySelectorAll('.lnb-menu a[data-tab-id]').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        openTab({ id: a.dataset.tabId, title: a.dataset.tabTitle });
      });
    });
  }

  // ========= 초기 부트 =========
  function boot() {
    load();
    bind();
    // 저장된 탭이 없으면 기본으로 이체관리 오픈
    if (tabs.length === 0) {
      openTab({ id: 'transfer-list', title: '이체관리' });
      return;
    }
    // 활성 탭 검증
    if (!activeId || findIndex(activeId) === -1) {
      activeId = tabs[0].id;
      save();
    }
    render();
    dispatch('tab:activated', { id: activeId });
  }

  // 유틸
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }
  function escapeAttr(s) { return escapeHtml(s); }

  // 공개 API
  window.TabManager = {
    open: openTab,
    close: closeTab,
    activate,
    togglePin,
    refresh: refreshActive,
    getActive: () => activeId,
    getTabs: () => tabs.slice(),
    boot,
  };
})();
