/**
 * GridColumnPicker — AG Grid 컬럼 표시/숨김 팝오버 (무료 버전용 Tool Panel 대체)
 * - 앵커 버튼 아래에 팝오버로 붙음
 * - 검색, 전체 선택/해제, 컬럼별 토글, 초기화
 * - 변경은 즉시 gridApi.setColumnsVisible([id], bool) 로 반영
 * - 핀 상태 / 액션 컬럼(_action, _select) 도 표시하되 타입 배지로 구분
 * 사용: window.GridColumnPicker.open({ gridApi, anchorEl, tableName })
 */
(function () {
  let popoverEl = null;
  let currentCtx = null; // { gridApi, anchorEl, tableName }
  let outsideHandler = null;

  function close() {
    if (popoverEl) {
      popoverEl.remove();
      popoverEl = null;
    }
    if (outsideHandler) {
      document.removeEventListener('mousedown', outsideHandler, true);
      outsideHandler = null;
    }
    currentCtx = null;
  }

  function open(ctx) {
    if (popoverEl) { close(); return; } // 같은 버튼 재클릭 = 토글 닫기
    currentCtx = ctx;
    render();
    position();
    // 외부 클릭 닫기
    outsideHandler = (e) => {
      if (!popoverEl) return;
      if (popoverEl.contains(e.target)) return;
      if (ctx.anchorEl && ctx.anchorEl.contains(e.target)) return;
      close();
    };
    setTimeout(() => document.addEventListener('mousedown', outsideHandler, true), 0);
  }

  function getColumnList() {
    const api = currentCtx.gridApi;
    if (!api) return [];
    const cols = api.getColumns() || [];
    return cols.map(c => {
      const def = c.getColDef();
      const id = c.getColId();
      return {
        id,
        headerName: def.headerName || id,
        visible: c.isVisible(),
        pinned: c.getPinned() || null,
        system: id === '_select' || id === '_action',
      };
    });
  }

  function render() {
    const cols = getColumnList();
    const visibleCount = cols.filter(c => c.visible).length;
    const tableName = currentCtx.tableName || '';

    popoverEl = document.createElement('div');
    popoverEl.className = 'col-picker-popover';
    popoverEl.innerHTML = `
      <div class="col-picker-header">
        <div class="col-picker-title-group">
          ${tableName ? `<span class="col-picker-table-name">${escapeHtml(tableName)}</span>` : ''}
          <span class="col-picker-title">컬럼 선택</span>
          <span class="col-picker-count"><strong class="cp-visible">${visibleCount}</strong> / ${cols.length}</span>
        </div>
        <button class="col-picker-close" type="button" aria-label="닫기">×</button>
      </div>

      <div class="col-picker-toolbar">
        <input type="text" class="col-picker-search" placeholder="컬럼명 검색" />
        <label class="col-picker-all">
          <input type="checkbox" class="cp-all-checkbox" />
          <span>전체</span>
        </label>
      </div>

      <div class="col-picker-list">
        ${cols.map(col => `
          <label class="col-picker-item${col.visible ? ' checked' : ''}" data-col-id="${escapeAttr(col.id)}">
            <input type="checkbox" class="cp-col-checkbox" data-col-id="${escapeAttr(col.id)}" ${col.visible ? 'checked' : ''} />
            <span class="col-picker-label">${escapeHtml(col.headerName || '(이름없음)')}</span>
            ${col.pinned ? `<span class="col-picker-pin">${col.pinned === 'left' ? '◧' : '◨'}</span>` : ''}
            ${col.system ? '<span class="col-picker-sys">시스템</span>' : ''}
          </label>
        `).join('')}
      </div>

      <div class="col-picker-footer">
        <button class="btn btn-sm btn-outline-primary cp-show-all" type="button">모두 보이기</button>
        <button class="btn btn-sm btn-outline-primary cp-hide-all" type="button">모두 숨기기</button>
        <button class="btn btn-sm btn-primary cp-reset" type="button">초기화</button>
      </div>
    `;
    document.body.appendChild(popoverEl);

    bind();
    syncAllCheckbox();
  }

  function bind() {
    if (!popoverEl) return;
    // 닫기
    popoverEl.querySelector('.col-picker-close')?.addEventListener('click', close);

    // 검색
    const search = popoverEl.querySelector('.col-picker-search');
    search?.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      popoverEl.querySelectorAll('.col-picker-item').forEach(item => {
        const name = item.querySelector('.col-picker-label')?.textContent.toLowerCase() || '';
        item.style.display = !q || name.includes(q) ? '' : 'none';
      });
    });

    // 전체 체크박스: 보이는(검색 필터링 된) 항목만 토글
    const allBox = popoverEl.querySelector('.cp-all-checkbox');
    allBox?.addEventListener('change', () => {
      const items = [...popoverEl.querySelectorAll('.col-picker-item')]
        .filter(i => i.style.display !== 'none');
      const ids = items.map(i => i.dataset.colId);
      setVisible(ids, allBox.checked);
      items.forEach(i => {
        const cb = i.querySelector('.cp-col-checkbox');
        cb.checked = allBox.checked;
        i.classList.toggle('checked', allBox.checked);
      });
      updateCount();
    });

    // 개별 컬럼 체크
    popoverEl.querySelectorAll('.cp-col-checkbox').forEach(cb => {
      cb.addEventListener('change', () => {
        setVisible([cb.dataset.colId], cb.checked);
        cb.closest('.col-picker-item').classList.toggle('checked', cb.checked);
        syncAllCheckbox();
        updateCount();
      });
    });

    // 행 전체 클릭 = 체크박스 토글 (input 클릭은 중복 방지)
    popoverEl.querySelectorAll('.col-picker-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.tagName === 'INPUT') return;
        const cb = item.querySelector('.cp-col-checkbox');
        cb.checked = !cb.checked;
        cb.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });

    // 모두 보이기 / 모두 숨기기
    popoverEl.querySelector('.cp-show-all')?.addEventListener('click', () => {
      const cols = getColumnList();
      setVisible(cols.map(c => c.id), true);
      rerenderCheckboxes(true);
    });
    popoverEl.querySelector('.cp-hide-all')?.addEventListener('click', () => {
      // 시스템 컬럼(_select, _action) 과 고정 컬럼은 유지 — 전체 숨기면 그리드가 빈 상태가 됨
      const cols = getColumnList();
      const toHide = cols.filter(c => !c.system && !c.pinned).map(c => c.id);
      setVisible(toHide, false);
      rerenderCheckboxes(null);
    });

    // 초기화: resetColumnState 로 컬럼 정의의 기본 상태 복구
    popoverEl.querySelector('.cp-reset')?.addEventListener('click', () => {
      if (currentCtx.gridApi) currentCtx.gridApi.resetColumnState();
      rerenderCheckboxes(null);
    });
  }

  function setVisible(ids, visible) {
    if (!currentCtx.gridApi || !ids.length) return;
    currentCtx.gridApi.setColumnsVisible(ids, visible);
  }

  // 체크박스를 그리드 실제 상태에 맞춰 재동기화
  function rerenderCheckboxes() {
    if (!popoverEl) return;
    const cols = getColumnList();
    const visMap = Object.fromEntries(cols.map(c => [c.id, c.visible]));
    popoverEl.querySelectorAll('.col-picker-item').forEach(item => {
      const id = item.dataset.colId;
      const on = !!visMap[id];
      const cb = item.querySelector('.cp-col-checkbox');
      if (cb) cb.checked = on;
      item.classList.toggle('checked', on);
    });
    syncAllCheckbox();
    updateCount();
  }

  function syncAllCheckbox() {
    const allBox = popoverEl?.querySelector('.cp-all-checkbox');
    if (!allBox) return;
    const items = [...popoverEl.querySelectorAll('.col-picker-item')]
      .filter(i => i.style.display !== 'none');
    const checked = items.filter(i => i.querySelector('.cp-col-checkbox')?.checked).length;
    allBox.checked = checked > 0 && checked === items.length;
    allBox.indeterminate = checked > 0 && checked < items.length;
  }

  function updateCount() {
    const el = popoverEl?.querySelector('.cp-visible');
    if (!el) return;
    const cols = getColumnList();
    el.textContent = cols.filter(c => c.visible).length;
  }

  function position() {
    if (!popoverEl || !currentCtx.anchorEl) return;
    const rect = currentCtx.anchorEl.getBoundingClientRect();
    const popW = popoverEl.offsetWidth;
    const popH = popoverEl.offsetHeight;
    let left = rect.right - popW;
    let top = rect.bottom + 4;
    // 화면 넘으면 좌/상으로 보정
    if (left < 8) left = 8;
    if (top + popH > window.innerHeight - 8) top = rect.top - popH - 4;
    if (top < 8) top = 8;
    popoverEl.style.left = left + 'px';
    popoverEl.style.top = top + 'px';
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }
  function escapeAttr(s) { return escapeHtml(s); }

  window.GridColumnPicker = { open, close };
})();
