/**
 * GridColumnContext — AG Grid 헤더 우클릭 컨텍스트 메뉴 (공통)
 *
 * 제공 액션:
 *   - Pin Left / Pin Right / No Pin
 *   - Auto Size / Auto Size All
 *   - Reset Columns
 *
 * 사용:
 *   GridColumnContext.attach({ gridDiv, gridApi });
 *
 * CSS: .col-context-menu / .col-ctx-item / .col-ctx-separator 는 style.css 에 정의됨
 */
(function () {
  let menu = null;

  function ensureMenu() {
    if (menu) return menu;
    menu = document.createElement('div');
    menu.className = 'col-context-menu';
    menu.innerHTML = `
      <div class="col-ctx-item" data-action="pinLeft">📌 Pin Left</div>
      <div class="col-ctx-item" data-action="pinRight">📌 Pin Right</div>
      <div class="col-ctx-separator"></div>
      <div class="col-ctx-item" data-action="unpin">✕ No Pin</div>
      <div class="col-ctx-separator"></div>
      <div class="col-ctx-item" data-action="autosize">↔ Auto Size</div>
      <div class="col-ctx-item" data-action="autosizeAll">↔ Auto Size All</div>
      <div class="col-ctx-separator"></div>
      <div class="col-ctx-item" data-action="resetCols">⟲ Reset Columns</div>
    `;
    menu.style.display = 'none';
    document.body.appendChild(menu);
    document.addEventListener('click', () => { menu.style.display = 'none'; });
    return menu;
  }

  function attach({ gridDiv, gridApi }) {
    if (!gridDiv || !gridApi) return;
    const m = ensureMenu();
    let targetColId = null;

    gridDiv.addEventListener('contextmenu', (e) => {
      const headerCell = e.target.closest('.ag-header-cell');
      if (!headerCell) return;
      e.preventDefault();
      targetColId = headerCell.getAttribute('col-id');
      // 현재 바인딩된 gridApi 기억 (여러 그리드 공유 대응)
      m.dataset.boundGrid = gridDiv.id || '';
      m._api = gridApi;
      m._col = targetColId;

      m.style.display = 'block';
      m.style.left = e.pageX + 'px';
      m.style.top = e.pageY + 'px';
      const rect = m.getBoundingClientRect();
      if (rect.right > window.innerWidth) m.style.left = (e.pageX - rect.width) + 'px';
      if (rect.bottom > window.innerHeight) m.style.top = (e.pageY - rect.height) + 'px';
    });

    // 바인딩은 최초 1회만 (같은 메뉴를 여러 그리드가 공유)
    if (!m._bound) {
      m.addEventListener('click', (e) => {
        const item = e.target.closest('.col-ctx-item');
        if (!item || !m._api || !m._col) return;
        const api = m._api;
        const col = m._col;
        const action = item.dataset.action;
        if (action === 'pinLeft') api.setColumnPinned(col, 'left');
        else if (action === 'pinRight') api.setColumnPinned(col, 'right');
        else if (action === 'unpin') api.setColumnPinned(col, null);
        else if (action === 'autosize') api.autoSizeColumns([col]);
        else if (action === 'autosizeAll') api.autoSizeAllColumns();
        else if (action === 'resetCols') api.resetColumnState();
        m.style.display = 'none';
      });
      m._bound = true;
    }
  }

  window.GridColumnContext = { attach };
})();
