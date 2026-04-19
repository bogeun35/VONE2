/**
 * PlansModal — 기획문서 이슈 매니저 + 상세 뷰 (Jira 스타일)
 *
 * 스키마:
 *   planId (VPLAN-###)   — readonly
 *   title / planner / assignee / issueDate / dueDate
 *   issueNo (PROD-#####) / priority (긴급/높음/보통/낮음)
 *   status (작성중/확정/완료/보류)
 *   tags[] / slug / tabId / page / file
 *   description (body) — stored in localStorage under plan:desc
 *   comments[] / activity[] — stored in localStorage
 *
 * - 목록 모달: 필터(상태/페이지/기획자/우선순위/키워드/보류포함) + 테이블
 * - 상세 모달: 메타 사이드 + 본문/댓글/활동 탭
 * - 모든 편집은 localStorage overlay 에 저장
 */
(function () {
  const INDEX_PATH = 'docs/plans-index.json';
  const OVERRIDE_KEY = 'vone:plans:overrides';
  const DESC_KEY = 'vone:plans:desc';       // { planId: mdBody }
  const COMMENT_KEY = 'vone:plans:comments'; // { planId: [{at, author, text}] }
  const ACTIVITY_KEY = 'vone:plans:activity'; // { planId: [{at, field, from, to}] }
  const STATUS_VALUES = ['작성중', '확정', '완료', '보류'];
  const PRIORITY_VALUES = ['긴급', '높음', '보통', '낮음'];
  // 기획문서가 붙을 수 있는 페이지 풀 (LNB/탭 기준)
  const PAGE_OPTIONS = [
    { slug: 'common', tabId: '', page: '공통' },
    { slug: 'transfer', tabId: 'transfer', page: '이체관리' },
    { slug: 'settle-contract', tabId: 'settle-contract-list', page: '정산계약 관리' },
    { slug: 'settle-contract', tabId: 'settle-contract-detail', page: '정산계약 상세' },
    { slug: 'settle-bill', tabId: 'settle-list', page: '정산서 관리' },
    { slug: 'settle-bill', tabId: 'settle-bill-detail', page: '정산서 상세' },
  ];
  function pageOptKey(o) { return `${o.slug}|${o.tabId}|${o.page}`; }

  let plans = [];
  let filter = { status: 'all', page: 'all', planner: 'all', priority: 'all', keyword: '', showHeld: false };
  let currentDetail = null;
  let descMode = 'preview';

  function $(id) { return document.getElementById(id); }
  function jsonGet(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch (e) { return fallback; } }
  function jsonSet(key, v) { localStorage.setItem(key, JSON.stringify(v)); }

  function loadOverrides() { return jsonGet(OVERRIDE_KEY, {}); }
  function saveOverrides(m) { jsonSet(OVERRIDE_KEY, m); }
  function applyOverrides(list) {
    const ov = loadOverrides();
    return list.map(p => ({ priority: '보통', dueDate: '', assignee: '', ...p, ...(ov[p.planId] || {}) }));
  }

  async function loadIndex() {
    try {
      const r = await fetch(INDEX_PATH + '?t=' + Date.now(), { cache: 'no-store' });
      const json = await r.json();
      plans = applyOverrides(json.plans || []);
    } catch (e) {
      console.error('[PlansModal] load fail', e);
      plans = [];
    }
  }

  function populateFilters() {
    const pageSel = $('plansFilterPage');
    const plannerSel = $('plansFilterPlanner');
    const pages = Array.from(new Set(plans.map(p => p.page).filter(Boolean))).sort();
    const planners = Array.from(new Set(plans.map(p => p.planner).filter(Boolean))).sort();
    if (pageSel) pageSel.innerHTML = '<option value="all">전체</option>' + pages.map(p => `<option>${escapeHtml(p)}</option>`).join('');
    if (plannerSel) plannerSel.innerHTML = '<option value="all">전체</option>' + planners.map(p => `<option>${escapeHtml(p)}</option>`).join('');
  }

  function applyFilter(list) {
    const q = (filter.keyword || '').trim().toLowerCase();
    return list.filter(p => {
      if (!filter.showHeld && p.status === '보류') return false;
      if (filter.status !== 'all' && p.status !== filter.status) return false;
      if (filter.page !== 'all' && p.page !== filter.page) return false;
      if (filter.planner !== 'all' && p.planner !== filter.planner) return false;
      if (filter.priority !== 'all' && p.priority !== filter.priority) return false;
      if (q) {
        const hay = [p.title, p.issueNo, (p.tags || []).join(',')].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  function render() {
    const body = $('plansModalBody');
    if (!body) return;
    const rows = applyFilter(plans).slice().sort((a, b) => (b.issueDate || '').localeCompare(a.issueDate || ''));
    const count = $('plansTotalCount');
    if (count) count.textContent = `총 ${rows.length}건`;

    body.innerHTML = rows.length ? rows.map(p => `
      <tr data-plan="${p.planId}">
        <td class="pm-col-id"><code>${p.planId || '-'}</code></td>
        <td class="pm-col-title" contenteditable data-field="title">${escapeHtml(p.title || '')}</td>
        <td class="pm-col-page">${escapeHtml(p.page || '-')}</td>
        <td class="pm-col-planner" contenteditable data-field="planner">${escapeHtml(p.planner || '')}</td>
        <td class="pm-col-priority">
          <select class="pm-priority pm-priority-${prioClass(p.priority)}" data-field="priority">
            ${PRIORITY_VALUES.map(v => `<option${v === p.priority ? ' selected' : ''}>${v}</option>`).join('')}
          </select>
        </td>
        <td class="pm-col-date"><input type="date" lang="sv-SE" class="pm-date" data-field="issueDate" value="${p.issueDate || ''}"></td>
        <td class="pm-col-issueno" contenteditable data-field="issueNo">${escapeHtml(p.issueNo || '')}</td>
        <td class="pm-col-status">
          <select class="pm-status pm-status-${statusClass(p.status)}" data-field="status">
            ${STATUS_VALUES.map(s => `<option${s === p.status ? ' selected' : ''}>${s}</option>`).join('')}
          </select>
        </td>
        <td class="pm-col-tags" contenteditable data-field="tags">${Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || '')}</td>
        <td class="pm-col-action">
          <button class="btn btn-sm btn-outline-primary pm-open-btn">열기</button>
          <button class="btn btn-sm btn-outline-danger pm-del-btn" title="보류로 이동 (소프트 삭제)">삭제</button>
        </td>
      </tr>
    `).join('') : '<tr><td colspan="10" class="pm-empty">조건에 맞는 기획문서가 없습니다.</td></tr>';

    body.querySelectorAll('tr[data-plan]').forEach(tr => {
      const planId = tr.dataset.plan;
      tr.querySelectorAll('[data-field]').forEach(el => {
        el.addEventListener('blur', () => saveField(planId, el.dataset.field, readValue(el)));
        el.addEventListener('change', () => saveField(planId, el.dataset.field, readValue(el)));
      });
      tr.querySelector('.pm-open-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        openPlanInSidebar(planId);
      });
      tr.querySelector('.pm-del-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const p = plans.find(x => x.planId === planId);
        if (!p) return;
        if (!confirm(`"${p.title}" 을(를) 보류 상태로 이동할까요?\n("보류 포함" 체크로 언제든 복원할 수 있습니다.)`)) return;
        saveField(planId, 'status', '보류');
      });
    });
  }

  function readValue(el) {
    if (el.tagName === 'SELECT' || el.tagName === 'INPUT') return el.value;
    const t = (el.textContent || '').trim();
    if (el.dataset.field === 'tags') {
      return t ? t.split(/[,，、]/).map(s => s.trim()).filter(Boolean) : [];
    }
    return t;
  }

  function saveField(planId, field, value) {
    const p = plans.find(x => x.planId === planId);
    if (!p) return;
    const oldVal = p[field];
    if (JSON.stringify(oldVal) === JSON.stringify(value)) return;
    const ov = loadOverrides();
    if (!ov[planId]) ov[planId] = {};
    ov[planId][field] = value;
    saveOverrides(ov);
    p[field] = value;
    logActivity(planId, field, oldVal, value);
    // 상태/우선순위 색상 재반영
    if (field === 'status' || field === 'priority') render();
  }

  function logActivity(planId, field, from, to) {
    const all = jsonGet(ACTIVITY_KEY, {});
    if (!all[planId]) all[planId] = [];
    all[planId].unshift({
      at: new Date().toISOString().replace('T', ' ').slice(0, 19),
      field, from, to,
    });
    jsonSet(ACTIVITY_KEY, all);
  }

  // ===== 페이지 이동 + 사이드바에 plan md 로드 (메인 동작) =====
  function openPlanInSidebar(planId) {
    const p = plans.find(x => x.planId === planId);
    if (!p) return;
    if (p.tabId && window.TabManager) {
      window.TabManager.open({ id: p.tabId, title: p.page });
      window.TabManager.activate(p.tabId);
    }
    const sidebar = document.getElementById('docSidebar');
    if (sidebar) {
      sidebar.classList.add('open');
      const planTab = sidebar.querySelector('.doc-tab[data-tab="plan"]');
      if (planTab) planTab.click();
    }
    // 사이드바가 plan md 를 로드하도록 이벤트 전달 — doc-editor 수신부가 없으면 무시됨
    window.dispatchEvent(new CustomEvent('plans:loadFile', {
      detail: { slug: p.slug, file: p.file, title: p.title, planId: p.planId, plan: p }
    }));
    close();
  }

  // ===== (deprecated) 상세 모달 — 이제 openPlanInSidebar 로 대체. 필요 시 사용. =====
  async function openDetail(planId) {
    const p = plans.find(x => x.planId === planId);
    if (!p) return;
    currentDetail = p;
    $('pdPlanId').textContent = p.planId;
    $('pdTitle').value = p.title || '';
    const statusSel = $('pdSideStatus');
    statusSel.innerHTML = STATUS_VALUES.map(s => `<option${s === p.status ? ' selected' : ''}>${s}</option>`).join('');
    $('pdSidePriority').value = p.priority || '보통';
    $('pdSidePlanner').value = p.planner || '';
    $('pdSideAssignee').value = p.assignee || '';
    $('pdSideIssueDate').value = p.issueDate || '';
    $('pdSideDueDate').value = p.dueDate || '';
    $('pdSideIssueNo').value = p.issueNo || '';
    $('pdSideTags').value = Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || '');
    // 페이지 select — 옵션 채우고 현재값 선택
    const pageSel = $('pdSidePage');
    if (pageSel) {
      pageSel.innerHTML = PAGE_OPTIONS.map(o => {
        const key = pageOptKey(o);
        const isCurrent = o.slug === p.slug && o.tabId === (p.tabId || '') && o.page === p.page;
        return `<option value="${key}"${isCurrent ? ' selected' : ''}>${o.page}</option>`;
      }).join('');
    }
    $('pdSideFile').textContent = p.file || '-';
    $('pdEditOnGithub').href = p.file ? `https://github.com/bogeun35/VONE2/edit/main/docs/${p.slug}/plans/${p.file}` : '#';

    // 설명 로드 — localStorage 우선, 없으면 md 파일에서 fetch (본문, frontmatter 제거)
    const allDesc = jsonGet(DESC_KEY, {});
    const input = $('pdDescInput');
    if (allDesc[planId] != null) {
      input.value = allDesc[planId];
    } else {
      input.value = '';
      if (p.slug && p.file) {
        try {
          const r = await fetch(`docs/${p.slug}/plans/${p.file}?t=${Date.now()}`, { cache: 'no-store' });
          if (r.ok) {
            let md = await r.text();
            md = md.replace(/^---\n[\s\S]*?\n---\n/, '').trimStart();
            input.value = md;
          }
        } catch (e) { console.warn('[PlansModal] md load fail', e); }
      }
    }
    setDescMode('preview');

    renderComments(planId);
    renderActivity(planId);
    switchTab('desc');

    $('planDetailModal').classList.add('open');
  }

  function closeDetail() {
    $('planDetailModal').classList.remove('open');
    currentDetail = null;
  }

  function saveDetailField(field, value) {
    if (!currentDetail) return;
    saveField(currentDetail.planId, field, value);
  }

  function setDescMode(mode) {
    descMode = mode;
    const input = $('pdDescInput'), preview = $('pdDescPreview');
    document.querySelectorAll('.pd-desc-toggle').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    if (mode === 'edit') { input.style.display = 'block'; preview.style.display = 'none'; input.focus(); }
    else {
      const md = input.value || '';
      preview.innerHTML = window.marked ? window.marked.parse(md) : md.replace(/\n/g, '<br>');
      input.style.display = 'none'; preview.style.display = 'block';
    }
  }

  function saveDescription() {
    if (!currentDetail) return;
    const all = jsonGet(DESC_KEY, {});
    const oldVal = all[currentDetail.planId] || '';
    const newVal = $('pdDescInput').value || '';
    if (oldVal === newVal) return;
    all[currentDetail.planId] = newVal;
    jsonSet(DESC_KEY, all);
    logActivity(currentDetail.planId, 'description', oldVal ? '(이전 본문)' : '', '(업데이트)');
  }

  function renderComments(planId) {
    const list = $('pdCommentList');
    const all = jsonGet(COMMENT_KEY, {});
    const items = all[planId] || [];
    $('pdCommentCount').textContent = items.length;
    list.innerHTML = items.length ? items.map((c, i) => `
      <div class="pd-comment">
        <div class="pd-comment-head"><b>${escapeHtml(c.author || '나')}</b> <span class="pd-comment-time">${c.at}</span>
          <button class="pd-comment-del" data-i="${i}" title="삭제">×</button></div>
        <div class="pd-comment-body">${window.marked ? window.marked.parse(c.text || '') : escapeHtml(c.text || '').replace(/\n/g, '<br>')}</div>
      </div>
    `).join('') : '<div class="pd-empty">아직 댓글이 없습니다.</div>';
    list.querySelectorAll('.pd-comment-del').forEach(btn => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.i, 10);
      const all2 = jsonGet(COMMENT_KEY, {});
      all2[planId].splice(idx, 1);
      jsonSet(COMMENT_KEY, all2);
      renderComments(planId);
    }));
  }

  function addComment() {
    if (!currentDetail) return;
    const txt = ($('pdCommentInput').value || '').trim();
    if (!txt) return;
    const all = jsonGet(COMMENT_KEY, {});
    if (!all[currentDetail.planId]) all[currentDetail.planId] = [];
    all[currentDetail.planId].unshift({
      at: new Date().toISOString().replace('T', ' ').slice(0, 19),
      author: '나',
      text: txt,
    });
    jsonSet(COMMENT_KEY, all);
    $('pdCommentInput').value = '';
    renderComments(currentDetail.planId);
    logActivity(currentDetail.planId, 'comment', '', txt.slice(0, 40));
  }

  function renderActivity(planId) {
    const list = $('pdActivityList');
    const all = jsonGet(ACTIVITY_KEY, {});
    const items = all[planId] || [];
    list.innerHTML = items.length ? items.map(a => `
      <div class="pd-activity">
        <span class="pd-activity-time">${a.at}</span>
        <span class="pd-activity-field">${escapeHtml(a.field)}</span>
        <span class="pd-activity-change">
          <s>${escapeHtml(formatVal(a.from))}</s> → <b>${escapeHtml(formatVal(a.to))}</b>
        </span>
      </div>
    `).join('') : '<div class="pd-empty">활동 이력이 없습니다.</div>';
  }
  function formatVal(v) {
    if (v == null || v === '') return '—';
    if (Array.isArray(v)) return v.join(', ');
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v).slice(0, 60);
  }

  function switchTab(name) {
    document.querySelectorAll('.pd-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('.pd-tab-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === name));
    if (currentDetail) {
      if (name === 'activity') renderActivity(currentDetail.planId);
      else if (name === 'comments') renderComments(currentDetail.planId);
    }
  }

  // ===== 신규 =====
  function nextPlanId() {
    const nums = plans.map(p => parseInt(String(p.planId || '').replace(/[^0-9]/g, ''), 10)).filter(n => !isNaN(n));
    const max = nums.length ? Math.max(...nums) : 0;
    return `VPLAN-${String(max + 1).padStart(3, '0')}`;
  }
  function addNew() {
    const iso = new Date().toISOString().slice(0, 10);
    const planId = nextPlanId();
    const p = { planId, title: '(새 기획문서)', planner: '', assignee: '', issueDate: iso, dueDate: '', issueNo: '', status: '작성중', priority: '보통', slug: 'common', tabId: '', page: '공통', file: '', tags: [] };
    plans.unshift(p);
    const ov = loadOverrides();
    ov[planId] = { ...p, _new: true };
    saveOverrides(ov);
    populateFilters();
    render();
    openDetail(planId);
  }

  function statusClass(s) { return { '작성중': 'draft', '확정': 'confirm', '완료': 'done', '보류': 'held' }[s] || 'draft'; }
  function prioClass(p) { return { '긴급': 'urgent', '높음': 'high', '보통': 'normal', '낮음': 'low' }[p] || 'normal'; }
  function escapeHtml(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  async function open() {
    const overlay = $('plansModal');
    if (!overlay) return;
    overlay.classList.add('open');
    await loadIndex();
    populateFilters();
    render();
  }
  function close() { $('plansModal').classList.remove('open'); }

  document.addEventListener('DOMContentLoaded', () => {
    $('btnOpenPlans')?.addEventListener('click', open);
    $('plansModalClose')?.addEventListener('click', close);
    $('plansModal')?.addEventListener('click', (e) => { if (e.target.id === 'plansModal') close(); });
    $('plansShowHeld')?.addEventListener('change', (e) => { filter.showHeld = e.target.checked; render(); });
    $('plansAddNew')?.addEventListener('click', addNew);
    $('plansFilterReset')?.addEventListener('click', () => {
      filter = { status: 'all', page: 'all', planner: 'all', priority: 'all', keyword: '', showHeld: false };
      document.querySelectorAll('#plansFilterStatus .radio-btn').forEach(b => b.classList.toggle('active', b.dataset.value === 'all'));
      $('plansFilterPage').value = 'all'; $('plansFilterPlanner').value = 'all'; $('plansFilterPriority').value = 'all';
      $('plansFilterKeyword').value = ''; $('plansShowHeld').checked = false;
      render();
    });
    $('plansFilterStatus')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.radio-btn'); if (!btn) return;
      document.querySelectorAll('#plansFilterStatus .radio-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active'); filter.status = btn.dataset.value; render();
    });
    $('plansFilterPage')?.addEventListener('change', (e) => { filter.page = e.target.value; render(); });
    $('plansFilterPlanner')?.addEventListener('change', (e) => { filter.planner = e.target.value; render(); });
    $('plansFilterPriority')?.addEventListener('change', (e) => { filter.priority = e.target.value; render(); });
    $('plansFilterKeyword')?.addEventListener('input', (e) => { filter.keyword = e.target.value; render(); });

    // 상세 모달
    $('planDetailClose')?.addEventListener('click', closeDetail);
    $('planDetailModal')?.addEventListener('click', (e) => { if (e.target.id === 'planDetailModal') closeDetail(); });
    document.querySelectorAll('.pd-tab').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));
    document.querySelectorAll('.pd-desc-toggle').forEach(b => b.addEventListener('click', () => { if (b.dataset.mode === 'edit') { setDescMode('edit'); } else { saveDescription(); setDescMode('preview'); } }));
    $('pdDescInput')?.addEventListener('blur', saveDescription);
    $('pdTitle')?.addEventListener('change', (e) => saveDetailField('title', e.target.value));
    $('pdSideStatus')?.addEventListener('change', (e) => saveDetailField('status', e.target.value));
    $('pdSidePriority')?.addEventListener('change', (e) => saveDetailField('priority', e.target.value));
    $('pdSidePlanner')?.addEventListener('change', (e) => saveDetailField('planner', e.target.value));
    $('pdSideAssignee')?.addEventListener('change', (e) => saveDetailField('assignee', e.target.value));
    $('pdSideIssueDate')?.addEventListener('change', (e) => saveDetailField('issueDate', e.target.value));
    $('pdSideDueDate')?.addEventListener('change', (e) => saveDetailField('dueDate', e.target.value));
    $('pdSideIssueNo')?.addEventListener('change', (e) => saveDetailField('issueNo', e.target.value));
    $('pdSideTags')?.addEventListener('change', (e) => saveDetailField('tags', e.target.value.split(/[,，、]/).map(s => s.trim()).filter(Boolean)));
    // 페이지 select — slug/tabId/page 3개를 한 번에 업데이트
    $('pdSidePage')?.addEventListener('change', (e) => {
      const opt = PAGE_OPTIONS.find(o => pageOptKey(o) === e.target.value);
      if (!opt || !currentDetail) return;
      saveField(currentDetail.planId, 'slug', opt.slug);
      saveField(currentDetail.planId, 'tabId', opt.tabId);
      saveField(currentDetail.planId, 'page', opt.page);
    });
    $('pdSidePageGo')?.addEventListener('click', () => {
      const p = currentDetail; if (!p || !p.tabId || !window.TabManager) return;
      window.TabManager.open({ id: p.tabId, title: p.page });
      window.TabManager.activate(p.tabId);
      closeDetail(); close();
    });
    $('pdCommentAdd')?.addEventListener('click', addComment);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if ($('planDetailModal').classList.contains('open')) closeDetail();
        else if ($('plansModal').classList.contains('open')) close();
      }
    });
  });

  window.PlansModal = { open, close, reload: loadIndex };
})();
