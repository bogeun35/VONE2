/**
 * GridTemplate - AG Grid 컬럼 상태 템플릿 공통 모듈
 * - 컬럼 너비, 위치, 숨김, 핀(left/right) 상태를 localStorage에 저장/불러오기/삭제
 * - 사용: GridTemplate.openModal(gridId, gridApi)
 */
(function () {
  const STORAGE_PREFIX = 'vone:gridTemplate:';

  function readAll(gridId) {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + gridId);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function writeAll(gridId, all) {
    localStorage.setItem(STORAGE_PREFIX + gridId, JSON.stringify(all));
  }

  const GridTemplate = {
    list(gridId) {
      return readAll(gridId);
    },

    save(gridId, name, gridApi) {
      if (!name || !gridApi) return false;
      const all = readAll(gridId);
      all[name] = {
        columnState: gridApi.getColumnState(),
        savedAt: new Date().toISOString(),
      };
      writeAll(gridId, all);
      return true;
    },

    load(gridId, name, gridApi) {
      const all = readAll(gridId);
      const tpl = all[name];
      if (!tpl || !gridApi) return false;
      gridApi.applyColumnState({ state: tpl.columnState, applyOrder: true });
      return true;
    },

    remove(gridId, name) {
      const all = readAll(gridId);
      if (!(name in all)) return false;
      delete all[name];
      writeAll(gridId, all);
      return true;
    },

    openModal(gridId, gridApi) {
      // 기존 모달 제거
      const existing = document.getElementById('gridTemplateModal');
      if (existing) existing.remove();

      const overlay = document.createElement('div');
      overlay.id = 'gridTemplateModal';
      overlay.className = 'grid-tpl-overlay';
      overlay.innerHTML = `
        <div class="grid-tpl-modal">
          <div class="grid-tpl-header">
            <span class="grid-tpl-title">템플릿 설정</span>
            <button class="grid-tpl-close" aria-label="닫기">&times;</button>
          </div>
          <div class="grid-tpl-body">
            <div class="grid-tpl-section">
              <label class="grid-tpl-label">새 템플릿 저장</label>
              <div class="grid-tpl-save-row">
                <input type="text" class="grid-tpl-input" id="gridTplNewName" placeholder="템플릿 이름 입력 (예: 검증업무용)">
                <button class="btn btn-sm btn-primary" id="gridTplSaveBtn">현재 상태 저장</button>
              </div>
              <p class="grid-tpl-hint">현재 컬럼의 너비, 위치, 숨김, 고정(핀) 상태를 이 브라우저에 저장합니다.</p>
            </div>
            <div class="grid-tpl-section">
              <label class="grid-tpl-label">저장된 템플릿</label>
              <ul class="grid-tpl-list" id="gridTplList"></ul>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      const close = () => overlay.remove();
      overlay.querySelector('.grid-tpl-close').addEventListener('click', close);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
      });

      const listEl = overlay.querySelector('#gridTplList');
      const renderList = () => {
        const all = readAll(gridId);
        const names = Object.keys(all);
        if (names.length === 0) {
          listEl.innerHTML = '<li class="grid-tpl-empty">저장된 템플릿이 없습니다.</li>';
          return;
        }
        listEl.innerHTML = names
          .map((name) => {
            const savedAt = all[name].savedAt
              ? new Date(all[name].savedAt).toLocaleString('ko-KR', { hour12: false })
              : '';
            return `
              <li class="grid-tpl-item" data-name="${escapeHtml(name)}">
                <div class="grid-tpl-item-info">
                  <span class="grid-tpl-item-name">${escapeHtml(name)}</span>
                  <span class="grid-tpl-item-date">${savedAt}</span>
                </div>
                <div class="grid-tpl-item-actions">
                  <button class="btn btn-xs btn-primary" data-act="load">불러오기</button>
                  <button class="btn btn-xs btn-outline" data-act="overwrite">덮어쓰기</button>
                  <button class="btn btn-xs btn-danger" data-act="delete">삭제</button>
                </div>
              </li>
            `;
          })
          .join('');
      };

      listEl.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-act]');
        if (!btn) return;
        const li = btn.closest('.grid-tpl-item');
        const name = li.dataset.name;
        const act = btn.dataset.act;

        if (act === 'load') {
          GridTemplate.load(gridId, name, gridApi);
          close();
        } else if (act === 'overwrite') {
          if (confirm(`"${name}" 템플릿을 현재 상태로 덮어쓸까요?`)) {
            GridTemplate.save(gridId, name, gridApi);
            renderList();
          }
        } else if (act === 'delete') {
          if (confirm(`"${name}" 템플릿을 삭제할까요?`)) {
            GridTemplate.remove(gridId, name);
            renderList();
          }
        }
      });

      const input = overlay.querySelector('#gridTplNewName');
      const saveBtn = overlay.querySelector('#gridTplSaveBtn');
      const doSave = () => {
        const name = input.value.trim();
        if (!name) {
          input.focus();
          return;
        }
        const all = readAll(gridId);
        if (name in all && !confirm(`"${name}" 템플릿이 이미 있습니다. 덮어쓸까요?`)) return;
        GridTemplate.save(gridId, name, gridApi);
        input.value = '';
        renderList();
      };
      saveBtn.addEventListener('click', doSave);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') doSave();
      });

      renderList();
      setTimeout(() => input.focus(), 0);
    },
  };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  window.GridTemplate = GridTemplate;
})();
