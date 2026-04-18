/**
 * GridTemplate - AG Grid 컬럼 상태 템플릿 공통 모듈
 * - 컬럼 너비, 위치, 숨김, 핀(left/right) 상태를 저장/불러오기/삭제
 * - 저장소: GitHub (공유) + localStorage(캐시/오프라인 폴백)
 * - 각 템플릿은 tableName(고유 테이블명) / author(로그인 사용자명) 로 태깅
 * - 사용: GridTemplate.openModal({ gridId, gridApi, tableName })
 */
(function () {
  const LS_PREFIX = 'vone:gridTemplate:';
  const GH = { owner: 'bogeun35', repo: 'VONE2', branch: 'main' };
  const GH_TOKEN_KEY = 'vone:ghToken';
  const getGhToken = () => localStorage.getItem(GH_TOKEN_KEY) || '';

  // ========= 저장소 헬퍼 =========
  function lsRead(tableKey) {
    try {
      const raw = localStorage.getItem(LS_PREFIX + tableKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
  function lsWrite(tableKey, arr) {
    localStorage.setItem(LS_PREFIX + tableKey, JSON.stringify(arr));
  }

  // tableName 을 파일명용으로 슬러그화
  function slugify(s) {
    return String(s).trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9가-힣_\-]/g, '');
  }

  function ghTemplatePath(tableName) {
    return `docs/templates/${slugify(tableName)}.json`;
  }

  // UTF-8 안전 base64
  function b64encode(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }
  function b64decode(b64) {
    return decodeURIComponent(escape(atob(b64.replace(/\s/g, ''))));
  }

  async function ghFetchList(tableName) {
    const rawUrl = `https://raw.githubusercontent.com/${GH.owner}/${GH.repo}/${GH.branch}/${ghTemplatePath(tableName)}?t=${Date.now()}`;
    try {
      const res = await fetch(rawUrl, { cache: 'no-store' });
      if (res.status === 404) return { templates: [], sha: null };
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const data = JSON.parse(text);
      return { templates: Array.isArray(data.templates) ? data.templates : [], sha: null };
    } catch (e) {
      return { templates: [], sha: null, error: e };
    }
  }

  async function ghGetSha(tableName) {
    const token = getGhToken();
    if (!token) return null;
    const apiUrl = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${ghTemplatePath(tableName)}?ref=${GH.branch}`;
    try {
      const res = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.sha || null;
    } catch {
      return null;
    }
  }

  async function ghSaveList(tableName, templates, commitMsg) {
    const token = getGhToken();
    if (!token) throw new Error('GitHub PAT 가 설정되어 있지 않습니다. 사이드바 우측 상단 톱니 버튼에서 토큰을 먼저 등록해 주세요.');
    const sha = await ghGetSha(tableName);
    const apiUrl = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${ghTemplatePath(tableName)}`;
    const body = {
      message: commitMsg || `chore(template): update ${tableName}`,
      branch: GH.branch,
      content: b64encode(JSON.stringify({ tableName, templates }, null, 2) + '\n'),
    };
    if (sha) body.sha = sha;
    const res = await fetch(apiUrl, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`GitHub 저장 실패 (${res.status}): ${err.message || ''}`);
    }
    return true;
  }

  // ========= 공개 API =========
  const GridTemplate = {
    /** @deprecated — localStorage 전용 초기 API. openModal 사용 권장 */
    list(gridId) {
      return lsRead(gridId);
    },

    async loadAll(tableName) {
      // GitHub 를 우선 사용 — 실패 시 localStorage 캐시
      const { templates, error } = await ghFetchList(tableName);
      if (!error) {
        lsWrite(tableName, templates);
        return { templates, source: 'github' };
      }
      return { templates: lsRead(tableName), source: 'local', error };
    },

    applyToGrid(gridApi, template) {
      if (!gridApi || !template || !template.columnState) return false;
      gridApi.applyColumnState({ state: template.columnState, applyOrder: true });
      return true;
    },

    readCurrentState(gridApi) {
      return gridApi ? gridApi.getColumnState() : null;
    },

    openModal(opts) {
      // 하위호환: (gridId, gridApi) 시그니처 지원
      let gridId, gridApi, tableName;
      if (typeof opts === 'string') {
        gridId = opts; gridApi = arguments[1]; tableName = gridId;
      } else {
        gridId = opts.gridId; gridApi = opts.gridApi; tableName = opts.tableName || opts.gridId;
      }

      const existing = document.getElementById('gridTemplateModal');
      if (existing) existing.remove();

      const user = window.vendysUser || null;
      const myName = (user && (user.displayName || user.email)) || '익명';
      const myEmail = (user && user.email) || '';

      const overlay = document.createElement('div');
      overlay.id = 'gridTemplateModal';
      overlay.className = 'grid-tpl-overlay';
      overlay.innerHTML = `
        <div class="grid-tpl-modal">
          <div class="grid-tpl-header">
            <div class="grid-tpl-title-group">
              <span class="grid-tpl-title">템플릿 설정</span>
              <span class="grid-tpl-table-name">${escapeHtml(tableName)}</span>
            </div>
            <button class="grid-tpl-close" aria-label="닫기">&times;</button>
          </div>
          <div class="grid-tpl-body">
            <div class="grid-tpl-section">
              <label class="grid-tpl-label">새 템플릿 저장</label>
              <div class="grid-tpl-save-row">
                <input type="text" class="grid-tpl-input" id="gridTplNewName" placeholder="템플릿 이름 입력 (예: 검증업무용)">
                <button class="btn btn-sm btn-primary" id="gridTplSaveBtn">현재 상태 저장</button>
              </div>
              <p class="grid-tpl-hint">작성자: <strong>${escapeHtml(myName)}</strong> · 저장 시 GitHub 에 업로드되어 다른 사용자도 조회할 수 있습니다.</p>
            </div>
            <div class="grid-tpl-section">
              <div class="grid-tpl-list-header">
                <label class="grid-tpl-label">저장된 템플릿</label>
                <label class="grid-tpl-checkbox">
                  <input type="checkbox" id="gridTplMineOnly" checked>
                  <span>내 템플릿만</span>
                </label>
              </div>
              <ul class="grid-tpl-list" id="gridTplList"></ul>
              <p class="grid-tpl-hint" id="gridTplSource"></p>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      const close = () => overlay.remove();
      overlay.querySelector('.grid-tpl-close').addEventListener('click', close);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

      const listEl = overlay.querySelector('#gridTplList');
      const sourceEl = overlay.querySelector('#gridTplSource');
      const mineOnlyEl = overlay.querySelector('#gridTplMineOnly');

      let templates = [];
      const render = () => {
        const mineOnly = mineOnlyEl.checked;
        const filtered = mineOnly
          ? templates.filter(t => t.authorEmail === myEmail || t.author === myName)
          : templates.slice();
        if (filtered.length === 0) {
          listEl.innerHTML = `<li class="grid-tpl-empty">${mineOnly ? '내가 저장한 템플릿이 없습니다.' : '저장된 템플릿이 없습니다.'}</li>`;
          return;
        }
        listEl.innerHTML = filtered.map((t) => {
          const savedAt = t.savedAt ? new Date(t.savedAt).toLocaleString('ko-KR', { hour12: false }) : '';
          const isMine = t.authorEmail === myEmail || t.author === myName;
          return `
            <li class="grid-tpl-item" data-id="${escapeHtml(t.id)}">
              <div class="grid-tpl-item-info">
                <span class="grid-tpl-item-name">${escapeHtml(t.name)}</span>
                <span class="grid-tpl-item-meta">${escapeHtml(t.author || '-')}${savedAt ? ' · ' + savedAt : ''}</span>
              </div>
              <div class="grid-tpl-item-actions">
                <button class="btn btn-xs btn-primary" data-act="load">불러오기</button>
                ${isMine ? '<button class="btn btn-xs btn-outline-primary" data-act="overwrite">덮어쓰기</button>' : ''}
                ${isMine ? '<button class="btn btn-xs btn-outline-danger" data-act="delete">삭제</button>' : ''}
              </div>
            </li>
          `;
        }).join('');
      };

      mineOnlyEl.addEventListener('change', render);

      // 서버에서 목록 로드
      (async () => {
        sourceEl.textContent = '불러오는 중…';
        const { templates: loaded, source, error } = await GridTemplate.loadAll(tableName);
        templates = loaded;
        if (source === 'github') sourceEl.textContent = '저장소: GitHub';
        else if (source === 'local') sourceEl.textContent = 'GitHub 연결 실패 — 로컬 캐시 표시 중';
        render();
      })();

      listEl.addEventListener('click', async (e) => {
        const btn = e.target.closest('button[data-act]');
        if (!btn) return;
        const li = btn.closest('.grid-tpl-item');
        const id = li.dataset.id;
        const tpl = templates.find(t => t.id === id);
        if (!tpl) return;
        const act = btn.dataset.act;

        if (act === 'load') {
          GridTemplate.applyToGrid(gridApi, tpl);
          close();
        } else if (act === 'overwrite') {
          if (!confirm(`"${tpl.name}" 템플릿을 현재 상태로 덮어쓸까요?`)) return;
          tpl.columnState = GridTemplate.readCurrentState(gridApi);
          tpl.savedAt = new Date().toISOString();
          try {
            await ghSaveList(tableName, templates, `chore(template): overwrite ${tpl.name}`);
            lsWrite(tableName, templates);
            render();
          } catch (err) { alert(err.message); }
        } else if (act === 'delete') {
          if (!confirm(`"${tpl.name}" 템플릿을 삭제할까요?`)) return;
          templates = templates.filter(x => x.id !== id);
          try {
            await ghSaveList(tableName, templates, `chore(template): delete ${tpl.name}`);
            lsWrite(tableName, templates);
            render();
          } catch (err) { alert(err.message); }
        }
      });

      const input = overlay.querySelector('#gridTplNewName');
      const saveBtn = overlay.querySelector('#gridTplSaveBtn');
      const doSave = async () => {
        const name = input.value.trim();
        if (!name) { input.focus(); return; }
        if (templates.find(t => t.name === name && (t.authorEmail === myEmail || t.author === myName))) {
          if (!confirm(`"${name}" 템플릿이 이미 있습니다. 덮어쓸까요?`)) return;
          templates = templates.filter(t => !(t.name === name && (t.authorEmail === myEmail || t.author === myName)));
        }
        const tpl = {
          id: `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name,
          author: myName,
          authorEmail: myEmail,
          tableName,
          columnState: GridTemplate.readCurrentState(gridApi),
          savedAt: new Date().toISOString(),
        };
        templates.push(tpl);
        try {
          await ghSaveList(tableName, templates, `chore(template): add ${name}`);
          lsWrite(tableName, templates);
          input.value = '';
          render();
        } catch (err) {
          templates = templates.filter(x => x.id !== tpl.id);
          alert(err.message);
        }
      };
      saveBtn.addEventListener('click', doSave);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSave(); });

      setTimeout(() => input.focus(), 0);
    },
  };

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  window.GridTemplate = GridTemplate;
})();
