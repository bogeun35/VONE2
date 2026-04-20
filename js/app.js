// ===== LNB Toggle =====
document.querySelectorAll('.lnb-category-header').forEach(header => {
  const menuId = header.dataset.toggle;
  const menu = document.getElementById(menuId);
  header.classList.add('open');
  if (menu) menu.classList.add('open');
  header.addEventListener('click', () => {
    header.classList.toggle('open');
    if (menu) menu.classList.toggle('open');
  });
});

// ===== LNB Active State =====
document.querySelectorAll('.lnb-menu li a').forEach(link => {
  link.addEventListener('click', () => {
    document.querySelectorAll('.lnb-menu li').forEach(li => li.classList.remove('active'));
    link.parentElement.classList.add('active');
  });
});

// ===== Filter Accordion =====
const filterToggle = document.getElementById('filterToggle');
const filterBody = document.getElementById('filterBody');
if (filterToggle && filterBody) {
  filterToggle.classList.add('open');
  filterToggle.addEventListener('click', () => {
    filterToggle.classList.toggle('open');
    filterBody.classList.toggle('open');
  });
}

// ===== Summary Accordion =====
const summaryToggle = document.getElementById('summaryToggle');
const summaryBody = document.getElementById('summaryBody');
if (summaryToggle && summaryBody) {
  summaryToggle.classList.add('open');
  summaryToggle.addEventListener('click', () => {
    summaryToggle.classList.toggle('open');
    summaryBody.classList.toggle('open');
  });
}

// ===== Radio Button Groups =====
document.querySelectorAll('.radio-btn-group').forEach(group => {
  group.querySelectorAll('.radio-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      group.querySelectorAll('.radio-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
});

// ===== Period Button Toggle =====
document.querySelectorAll('.btn-group-period').forEach(group => {
  group.querySelectorAll('.btn-period').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      group.querySelectorAll('.btn-period').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
});

// ===== Date Input Year Clamp (4자리 제한) =====
// HTML5 <input type="date">는 키보드 입력 시 연도에 5자리 이상을 허용함 → 4자리로 강제
document.querySelectorAll('input[type="date"]').forEach(input => {
  if (!input.max) input.max = '9999-12-31';
  if (!input.min) input.min = '1000-01-01';
  const clamp = () => {
    const v = input.value;
    if (!v) return;
    // value는 'YYYY-MM-DD' 형식이지만 5자리 연도 시 'YYYYY-MM-DD'가 됨
    const parts = v.split('-');
    if (parts[0] && parts[0].length > 4) {
      parts[0] = parts[0].slice(0, 4);
      input.value = parts.join('-');
    }
  };
  input.addEventListener('input', clamp);
  input.addEventListener('blur', clamp);
  input.addEventListener('change', clamp);
});

// ===== Document Sidebar =====
const btnDocClose = document.getElementById('btnDocClose');
const btnDocRefresh = document.getElementById('btnDocRefresh');
const btnDocEdit = document.getElementById('btnDocEdit');
const btnDocSettings = document.getElementById('btnDocSettings');
const docSidebar = document.getElementById('docSidebar');
const docContent = document.getElementById('docContent');
const docPageFilter = document.getElementById('docPageFilter');

const GH = { owner: 'bogeun35', repo: 'VONE2', branch: 'main' };
const GH_TOKEN_KEY = 'vone:ghToken';
const getGhToken = () => localStorage.getItem(GH_TOKEN_KEY) || '';
const setGhToken = (t) => localStorage.setItem(GH_TOKEN_KEY, t);

const JIRA = { baseUrl: 'https://vendysdev.atlassian.net/browse/' };
const JIRA_KEY_RE = /\b[A-Z][A-Z0-9]+-\d+\b/g;
const jiraHref = (key) => JIRA.baseUrl + encodeURIComponent(key);

const OVERRIDE_KEY = 'vone:plans:overrides';
const STATUS_VALUES = ['작성중', '확정', '완료', '보류'];

// 페이지 필터 → slug|tabId 매핑
const PAGE_FILTER_MAP = {
  'common|': { slug: 'common', tabId: '', label: '공통' },
  'partner|partner-list': { slug: 'partner', tabId: 'partner-list', label: '거래처 관리' },
  'bill-contract|bill-contract-list': { slug: 'bill-contract', tabId: 'bill-contract-list', label: '청구계약 관리' },
  'bill|bill-list': { slug: 'bill', tabId: 'bill-list', label: '청구서 관리' },
  'settle-contract|settle-contract-list': { slug: 'settle-contract', tabId: 'settle-contract-list', label: '정산계약 관리' },
  'settle-contract|settle-contract-create': { slug: 'settle-contract', tabId: 'settle-contract-create', label: '정산계약 생성' },
  'settle-contract|settle-contract-detail': { slug: 'settle-contract', tabId: 'settle-contract-detail', label: '정산계약 상세' },
  'settle-bill|settle-list': { slug: 'settle-bill', tabId: 'settle-list', label: '정산서 관리' },
  'settle-bill|settle-bill-create': { slug: 'settle-bill', tabId: 'settle-bill-create', label: '정산서 생성' },
  'settle-bill|settle-bill-detail': { slug: 'settle-bill', tabId: 'settle-bill-detail', label: '정산서 상세' },
  'tax-invoice|tax-invoice-list': { slug: 'tax-invoice', tabId: 'tax-invoice-list', label: '(세금)계산서 관리' },
  'cash-receipt|cash-receipt-list': { slug: 'cash-receipt', tabId: 'cash-receipt-list', label: '현금영수증 관리' },
  'etc-proof|etc-proof-list': { slug: 'etc-proof', tabId: 'etc-proof-list', label: '기타증빙 관리' },
  'transfer|transfer': { slug: 'transfer', tabId: 'transfer', label: '이체관리' },
  'bank-tx|bank-tx-list': { slug: 'bank-tx', tabId: 'bank-tx-list', label: '통장거래내역' },
  'batch|batch-status': { slug: 'batch', tabId: 'batch-status', label: '일괄작업 현황' },
  'payment-ledger|payment-ledger': { slug: 'payment-ledger', tabId: 'payment-ledger', label: '결제원장' },
  'point-refund|point-refund': { slug: 'point-refund', tabId: 'point-refund', label: '대장포인트 환불 관리' },
  'shop-settle-config|shop-settle-config': { slug: 'shop-settle-config', tabId: 'shop-settle-config', label: '고객사 제휴점 정산방식 설정' },
};

let currentDocTab = 'policy';
let currentDocPath = null;
let currentDocRaw = null;
let currentDocFrontmatter = '';
let editorMode = false;
let planDocs = [];
let planDetailIdx = -1;
let docEditorInstance = null;
let allPlansCache = null;
let showHeldPlans = false;
let planFilterStatus = '전체';
let planFilterKeyword = '';

function getVisiblePage() {
  const pages = document.querySelectorAll('.content .page');
  for (const p of pages) {
    if (p.offsetParent !== null) return p;
  }
  return pages[0] || null;
}

// 현재 페이지 기준으로 필터 기본값 세팅
function syncFilterToCurrentPage() {
  const page = getVisiblePage();
  if (!page) return;
  const doc = page.dataset.doc || '';
  const tabId = (window.TabManager && window.TabManager.getActive && window.TabManager.getActive()) || '';
  const key = `${doc}|${tabId}`;
  if (PAGE_FILTER_MAP[key]) {
    docPageFilter.value = key;
  } else {
    const fallback = Object.keys(PAGE_FILTER_MAP).find(k => k.startsWith(doc + '|'));
    if (fallback) docPageFilter.value = fallback;
  }
}

function getFilterSelection() {
  const val = docPageFilter.value;
  if (val === 'all') return { slug: null, tabId: null };
  const [slug, tabId] = val.split('|');
  return { slug: slug || null, tabId: tabId || null };
}

function syncDocToggleActive(isOpen) {
  document.querySelectorAll('.btn-doc-toggle').forEach(b => b.classList.toggle('active', isOpen));
}

function toggleDocSidebar() {
  const isOpen = docSidebar.classList.toggle('open');
  syncDocToggleActive(isOpen);
  if (isOpen) {
    syncFilterToCurrentPage();
    loadDocByFilter();
  }
}

document.addEventListener('click', (e) => {
  if (e.target.closest('.btn-doc-toggle')) toggleDocSidebar();
});
btnDocClose.addEventListener('click', () => {
  docSidebar.classList.remove('open');
  syncDocToggleActive(false);
});

// 페이지 전환 시 필터 자동 동기화
window.addEventListener('page:shown', () => {
  if (docSidebar && docSidebar.classList.contains('open')) {
    syncFilterToCurrentPage();
    loadDocByFilter();
  }
});

// 필터 변경 시 문서 다시 로드
docPageFilter.addEventListener('change', () => {
  if (editorMode && !confirm('편집 중인 내용이 사라집니다. 필터를 변경할까요?')) {
    syncFilterToCurrentPage();
    return;
  }
  exitEditorMode();
  loadDocByFilter();
});

// 탭 전환 (정책문서 / 기획문서)
document.querySelectorAll('.doc-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    if (editorMode && !confirm('편집 중인 내용이 사라집니다. 탭을 전환할까요?')) return;
    document.querySelectorAll('.doc-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentDocTab = tab.dataset.tab;
    exitEditorMode();
    loadDocByFilter();
  });
});

btnDocRefresh.addEventListener('click', () => {
  if (editorMode && !confirm('편집 중인 내용이 사라집니다. 새로고침할까요?')) return;
  exitEditorMode();
  allPlansCache = null;
  loadDocByFilter();
});

btnDocEdit.addEventListener('click', () => {
  if (!currentDocPath) return;
  editorMode = !editorMode;
  btnDocEdit.classList.toggle('active', editorMode);
  if (editorMode) renderEditor();
  else renderDocFromRaw();
});

btnDocSettings.addEventListener('click', openGhSettings);

function exitEditorMode() {
  if (docEditorInstance) { try { docEditorInstance.destroy(); } catch {} docEditorInstance = null; }
  editorMode = false;
  btnDocEdit.classList.remove('active');
}

// ===== 통합 로드 함수 (필터 기반) =====
async function loadDocByFilter() {
  exitEditorMode();
  currentDocRaw = null;
  btnDocEdit.disabled = true;
  docContent.innerHTML = '<p class="doc-placeholder">불러오는 중...</p>';

  const { slug, tabId } = getFilterSelection();

  if (currentDocTab === 'policy') {
    if (!slug) {
      docContent.innerHTML = '<p class="doc-placeholder">페이지를 선택하면 정책문서가 표시됩니다.</p>';
      return;
    }
    currentDocPath = `docs/${slug}/policy.md`;
    await loadPolicyDoc();
  } else {
    planDetailIdx = -1;
    currentDocPath = null;
    await loadPlanList(slug, tabId);
  }
}

// ===== Parse Frontmatter =====
function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: text };
  const meta = {};
  match[1].split('\n').forEach(line => {
    const idx = line.indexOf(':');
    if (idx > 0) {
      meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
  });
  return { meta, body: match[2] };
}

function renderVersionHeader(meta) {
  const statusMap = { '작성중': 'ver-status-wip', '검토중': 'ver-status-review', '확정': 'ver-status-done' };
  const statusCls = statusMap[meta.status] || 'ver-status-wip';
  return `
    <div class="doc-version-bar">
      <div class="doc-version-info">
        <span class="doc-version-badge">v${meta.version || '0.0.0'}</span>
        <span class="doc-version-status ${statusCls}">${meta.status || '작성중'}</span>
      </div>
      <div class="doc-version-detail">
        <span>${meta.lastUpdated || '-'}</span>
        <span class="doc-version-sep">|</span>
        <span>${meta.author || '-'}</span>
      </div>
    </div>`;
}

async function loadPolicyDoc() {
  try {
    const raw = await ghFetchRaw(currentDocPath);
    const fmMatch = raw.match(/^(---\r?\n[\s\S]*?\r?\n---\r?\n)/);
    if (fmMatch) {
      currentDocFrontmatter = fmMatch[1];
      currentDocRaw = raw.slice(fmMatch[1].length);
    } else {
      currentDocFrontmatter = '';
      currentDocRaw = raw;
    }
    btnDocEdit.disabled = false;
    renderDocFromRaw();
  } catch {
    docContent.innerHTML = `<p class="doc-placeholder">정책문서를 불러올 수 없습니다.<br><code>${currentDocPath}</code></p>`;
  }
}

async function ghFetchRaw(path) {
  const url = `https://raw.githubusercontent.com/${GH.owner}/${GH.repo}/${GH.branch}/${path}?t=${Date.now()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.text();
}

// ===== 기획문서 목록 =====
async function fetchAllPlans() {
  if (allPlansCache) return allPlansCache;
  try {
    const r = await fetch('docs/plans-index.json?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error(`인덱스 조회 실패 (${r.status})`);
    const json = await r.json();
    let list = Array.isArray(json.plans) ? json.plans : [];
    try {
      const ov = JSON.parse(localStorage.getItem(OVERRIDE_KEY) || '{}');
      list = list.map(p => ({ ...p, ...(ov[p.planId] || {}) }));
      Object.entries(ov).forEach(([k, v]) => {
        if (v && v._new && !list.find(p => p.planId === k)) {
          list.push(v);
        }
      });
    } catch {}
    allPlansCache = list;
    return list;
  } catch (e) {
    allPlansCache = null;
    throw e;
  }
}

async function loadPlanList(filterSlug, filterTabId) {
  try {
    const list = await fetchAllPlans();
    const filtered = list.filter(p => {
      if (p.status === '보류' && !showHeldPlans) return false;
      if (!filterSlug) return true;
      if (filterTabId) {
        return p.tabId === filterTabId || (!p.tabId && p.slug === filterSlug);
      }
      return p.slug === filterSlug;
    });
    const docs = filtered.map(p => ({
      file: { name: p.file || '', path: `docs/${p.slug}/plans/${p.file}` },
      meta: { id: p.planId || '', title: p.title || '', author: p.planner || '', issueDate: p.issueDate || '', issueNumber: p.issueNo || '', status: p.status || '' },
      text: '',
      _plan: p,
    }));
    docs.sort((a, b) => (b.meta.issueDate || '').localeCompare(a.meta.issueDate || ''));
    planDocs = docs;
    renderPlanList(docs);
  } catch (e) {
    docContent.innerHTML = `<p class="doc-placeholder">기획문서 목록을 불러올 수 없습니다.<br>${escapeHtmlText(e.message)}</p>`;
  }
}

function renderPlanList(docs) {
  planDetailIdx = -1;
  currentDocPath = null;
  currentDocRaw = null;
  btnDocEdit.disabled = true;

  const statusBadge = (s) => {
    const cls = { '확정': 'ver-status-done', '완료': 'ver-status-done', '검토중': 'ver-status-review' }[s] || 'ver-status-wip';
    return `<span class="doc-version-status ${cls}">${escapeHtmlText(s || '작성중')}</span>`;
  };

  const statuses = ['전체', '작성중', '확정', '완료', '보류'];
  const statusBtns = statuses.map(s =>
    `<button class="plan-filter-btn${planFilterStatus === s ? ' active' : ''}" data-status="${s}">${s}</button>`
  ).join('');

  const q = planFilterKeyword.trim().toLowerCase();
  const filtered = docs.filter(d => {
    if (planFilterStatus !== '전체' && d.meta.status !== planFilterStatus) return false;
    if (q) {
      const haystack = [d.meta.id, d.meta.title, d.meta.author, d.meta.issueNumber].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const rows = filtered.length ? filtered.map((d) => {
    const origIdx = docs.indexOf(d);
    return `
    <tr class="plan-row${d.meta.status === '보류' ? ' held' : ''}" data-idx="${origIdx}">
      <td class="plan-id"><span class="plan-id-badge">${escapeHtmlText(d.meta.id || '-')}</span></td>
      <td class="plan-title">${escapeHtmlText(d.meta.title || d.file.name.replace(/\.md$/, ''))}</td>
      <td>${escapeHtmlText(d.meta.author || '-')}</td>
      <td>${escapeHtmlText(d.meta.issueDate || '-')}</td>
      <td>${renderJiraLink(d.meta.issueNumber)}</td>
      <td>${statusBadge(d.meta.status)}</td>
    </tr>`;
  }).join('') : '<tr><td colspan="6" class="plan-empty">기획문서가 없습니다.</td></tr>';

  docContent.innerHTML = `
    <div class="plan-filter-bar">
      <div class="plan-filter-row">
        <span class="plan-filter-label">상태</span>
        <div class="plan-filter-btns" id="planStatusFilter">${statusBtns}</div>
      </div>
      <div class="plan-filter-row">
        <span class="plan-filter-label">검색</span>
        <input type="text" class="plan-filter-input" id="planKeywordInput" placeholder="제목, ID, 이슈번호, 기획자" value="${escapeHtmlText(planFilterKeyword)}">
      </div>
    </div>
    <div class="plan-list-header">
      <span class="plan-list-count">총 ${filtered.length}건${filtered.length !== docs.length ? ' / ' + docs.length + '건' : ''}</span>
      <button class="btn btn-sm btn-primary" id="planNewBtn">+ 새 기획문서</button>
    </div>
    <table class="plan-list">
      <thead><tr><th>ID</th><th>제목</th><th>기획자</th><th>이슈일자</th><th>이슈번호</th><th>상태</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;

  docContent.querySelectorAll('.plan-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      openPlanDetail(+row.dataset.idx);
    });
  });
  const newBtn = document.getElementById('planNewBtn');
  if (newBtn) newBtn.addEventListener('click', openNewPlan);

  const statusFilter = document.getElementById('planStatusFilter');
  if (statusFilter) statusFilter.addEventListener('click', (e) => {
    const btn = e.target.closest('.plan-filter-btn');
    if (!btn) return;
    planFilterStatus = btn.dataset.status;
    if (planFilterStatus === '보류') showHeldPlans = true;
    renderPlanList(docs);
  });

  const kwInput = document.getElementById('planKeywordInput');
  if (kwInput) {
    let kwTimer;
    kwInput.addEventListener('input', () => {
      clearTimeout(kwTimer);
      kwTimer = setTimeout(() => { planFilterKeyword = kwInput.value; renderPlanList(docs); }, 200);
    });
    kwInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { kwInput.value = ''; planFilterKeyword = ''; renderPlanList(docs); }
    });
  }
}

// ===== 기획문서 상세 — 메타(옵션) / 본문(내용) 분리 =====
async function openPlanDetail(idx) {
  const d = planDocs[idx];
  if (!d) return;
  planDetailIdx = idx;
  currentDocPath = d.file.path;

  if (!d.text && d.file.path) {
    try {
      const r = await fetch(d.file.path + '?t=' + Date.now(), { cache: 'no-store' });
      if (r.ok) {
        let raw = await r.text();
        const parsed = parseFrontmatter(raw);
        d.text = parsed.body;
      }
    } catch {}
  }
  currentDocRaw = d.text || '';
  btnDocEdit.disabled = false;
  renderPlanDetailView(d);
}

function renderPlanDetailView(d) {
  const plan = d._plan;
  const statusOpts = STATUS_VALUES.map(s =>
    `<option${s === (plan.status || '작성중') ? ' selected' : ''}>${s}</option>`
  ).join('');

  const metaHtml = `
    <div class="plan-detail-back">
      <button class="btn btn-sm btn-outline-primary" id="planBackBtn">← 목록</button>
      <button class="btn btn-sm btn-outline-danger" id="planDeleteBtn" title="보류 처리">삭제</button>
    </div>
    <div class="plan-meta-panel">
      <div class="plan-meta-row">
        <label>ID</label>
        <span class="plan-meta-value plan-id-badge">${escapeHtmlText(plan.planId || '(draft)')}</span>
      </div>
      <div class="plan-meta-row">
        <label>제목</label>
        <input type="text" class="plan-meta-input" data-field="title" value="${escapeHtmlText(plan.title || '')}">
      </div>
      <div class="plan-meta-row">
        <label>기획자</label>
        <input type="text" class="plan-meta-input" data-field="planner" value="${escapeHtmlText(plan.planner || '')}">
      </div>
      <div class="plan-meta-row">
        <label>이슈일자</label>
        <input type="date" class="plan-meta-input" data-field="issueDate" value="${plan.issueDate || ''}">
      </div>
      <div class="plan-meta-row">
        <label>이슈번호</label>
        <input type="text" class="plan-meta-input" data-field="issueNo" value="${escapeHtmlText(plan.issueNo || '')}" placeholder="PROD-#####">
      </div>
      <div class="plan-meta-row">
        <label>상태</label>
        <select class="plan-meta-input" data-field="status">${statusOpts}</select>
      </div>
      <div class="plan-meta-actions">
        <span class="plan-meta-status" id="planMetaStatus"></span>
        <button class="btn btn-sm btn-primary" id="planMetaSaveBtn">옵션 저장</button>
      </div>
    </div>
    <div class="plan-content-divider">
      <span>본문</span>
    </div>`;

  docContent.innerHTML = metaHtml + '<div class="plan-body-preview" id="planBodyViewer"></div>';

  const viewerEl = document.getElementById('planBodyViewer');
  if (currentDocRaw && window.toastui && window.toastui.Editor) {
    new window.toastui.Editor.factory({
      el: viewerEl,
      viewer: true,
      initialValue: currentDocRaw,
    });
  } else if (currentDocRaw) {
    viewerEl.innerHTML = jiraLinkify(marked.parse(currentDocRaw));
  } else {
    viewerEl.innerHTML = '<p class="doc-placeholder">본문 없음 — 상단 편집(✎) 버튼으로 작성</p>';
  }
  initChangelogToggle();

  // 목록 복귀
  document.getElementById('planBackBtn').addEventListener('click', () => {
    exitEditorMode();
    const { slug, tabId } = getFilterSelection();
    loadPlanList(slug, tabId);
  });

  // 삭제 (보류 처리)
  document.getElementById('planDeleteBtn').addEventListener('click', () => {
    if (!confirm(`"${plan.title}" 을(를) 보류(삭제) 처리할까요?`)) return;
    savePlanMeta(plan.planId, 'status', '보류');
    exitEditorMode();
    allPlansCache = null;
    const { slug, tabId } = getFilterSelection();
    loadPlanList(slug, tabId);
  });

  // 메타 저장 — 명시적 버튼 클릭으로만 저장
  document.getElementById('planMetaSaveBtn').addEventListener('click', () => {
    const statusEl = document.getElementById('planMetaStatus');
    const fields = docContent.querySelectorAll('.plan-meta-input');
    let changed = 0;
    fields.forEach(el => {
      const field = el.dataset.field;
      const newVal = el.value.trim();
      if (plan[field] !== newVal) {
        savePlanMeta(plan.planId, field, newVal);
        plan[field] = newVal;
        if (field === 'title') d.meta.title = newVal;
        if (field === 'planner') d.meta.author = newVal;
        if (field === 'issueDate') d.meta.issueDate = newVal;
        if (field === 'issueNo') d.meta.issueNumber = newVal;
        if (field === 'status') d.meta.status = newVal;
        changed++;
      }
    });
    if (changed > 0) {
      statusEl.className = 'plan-meta-status success';
      statusEl.textContent = `${changed}개 항목 저장됨`;
      allPlansCache = null;
    } else {
      statusEl.className = 'plan-meta-status';
      statusEl.textContent = '변경사항 없음';
    }
    setTimeout(() => { if (statusEl) statusEl.textContent = ''; }, 2000);
  });
}

function savePlanMeta(planId, field, value) {
  if (!planId) return;
  const ov = JSON.parse(localStorage.getItem(OVERRIDE_KEY) || '{}');
  if (!ov[planId]) ov[planId] = {};
  ov[planId][field] = value;
  localStorage.setItem(OVERRIDE_KEY, JSON.stringify(ov));
}

function renderDocFromRaw() {
  if (currentDocRaw == null) return;
  if (currentDocTab === 'plan' && planDetailIdx >= 0) {
    renderPlanDetailView(planDocs[planDetailIdx]);
    return;
  }
  const { meta } = parseFrontmatter(currentDocFrontmatter + currentDocRaw);
  docContent.innerHTML = renderVersionHeader(meta) + '<div id="policyBodyViewer"></div>';
  const viewerEl = document.getElementById('policyBodyViewer');
  if (currentDocRaw && window.toastui && window.toastui.Editor) {
    new window.toastui.Editor.factory({ el: viewerEl, viewer: true, initialValue: currentDocRaw });
  } else {
    viewerEl.innerHTML = jiraLinkify(marked.parse(currentDocRaw || ''));
  }
  initChangelogToggle();
}

// ===== 새 기획문서 생성 =====
function openNewPlan() {
  const existing = document.getElementById('planNewOverlay');
  if (existing) existing.remove();

  const { slug, tabId } = getFilterSelection();
  const targetSlug = slug || 'common';
  const targetTabId = tabId || '';
  const filterInfo = PAGE_FILTER_MAP[`${targetSlug}|${targetTabId}`];
  const pageName = filterInfo ? filterInfo.label : '공통';

  const today = new Date().toISOString().slice(0, 10);
  const nextId = computeNextPlanId();
  const user = window.vendysUser;
  const authorDefault = user ? (user.displayName || (user.email || '').split('@')[0]) : '';

  const overlay = document.createElement('div');
  overlay.id = 'planNewOverlay';
  overlay.className = 'gh-settings-overlay';
  overlay.innerHTML = `
    <div class="gh-settings-dialog">
      <div class="gh-settings-title">새 기획문서 <span style="color:#999;font-size:11px;font-weight:400">— ${escapeHtmlText(pageName)}</span></div>
      <div class="gh-settings-field">
        <label>고유 ID</label>
        <input type="text" id="pnId" value="${nextId}" readonly style="background:#f5f6fa;color:#2563eb;font-weight:600">
      </div>
      <div class="gh-settings-field">
        <label>제목</label>
        <input type="text" id="pnTitle" placeholder="예: 통장거래 IDX 컬럼 추가">
      </div>
      <div class="gh-settings-field">
        <label>기획자</label>
        <input type="text" id="pnAuthor" value="${escapeHtmlText(authorDefault)}" ${user ? 'readonly style="background:#f5f6fa"' : ''}>
      </div>
      <div class="gh-settings-field">
        <label>이슈일자</label>
        <input type="date" id="pnDate" value="${today}">
      </div>
      <div class="gh-settings-field">
        <label>이슈번호 (Jira 키)</label>
        <input type="text" id="pnIssue" placeholder="예: PROD-22010">
      </div>
      <div class="gh-settings-field">
        <label>상태</label>
        <select id="pnStatus"><option>작성중</option><option>확정</option></select>
      </div>
      <div class="gh-settings-actions">
        <span class="doc-editor-status" id="pnStatusMsg" style="flex:1"></span>
        <button class="btn btn-sm btn-outline-primary" id="pnCancel">취소</button>
        <button class="btn btn-sm btn-primary" id="pnCreate">생성</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('#pnCancel').addEventListener('click', close);

  overlay.querySelector('#pnCreate').addEventListener('click', async () => {
    const id = overlay.querySelector('#pnId').value.trim();
    const title = overlay.querySelector('#pnTitle').value.trim();
    const author = overlay.querySelector('#pnAuthor').value.trim();
    const date = overlay.querySelector('#pnDate').value;
    const issue = overlay.querySelector('#pnIssue').value.trim();
    const status = overlay.querySelector('#pnStatus').value;
    const msgEl = overlay.querySelector('#pnStatusMsg');
    if (!title) {
      msgEl.className = 'doc-editor-status error';
      msgEl.textContent = '제목은 필수입니다';
      return;
    }
    // localStorage에 메타 저장 (GitHub 없이도 동작)
    const ov = JSON.parse(localStorage.getItem(OVERRIDE_KEY) || '{}');
    ov[id] = {
      planId: id, title, planner: author, issueDate: date, issueNo: issue, status,
      slug: targetSlug, tabId: targetTabId, page: pageName,
      file: '', tags: [], _new: true,
    };
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify(ov));
    allPlansCache = null;
    close();
    // GitHub에 md 파일 생성 시도 (토큰 있으면)
    if (getGhToken() && issue) {
      const fileSlug = title.toLowerCase().replace(/[^a-z0-9ㄱ-ㅎ가-힣]+/gi, '-').replace(/(^-|-$)/g, '').slice(0, 40) || 'plan';
      const fileName = `${date}-${issue}-${fileSlug}.md`;
      const path = `docs/${targetSlug}/plans/${fileName}`;
      const body = `# ${title}\n\n## 배경\n\n(배경 설명)\n\n## 요구사항\n\n- (요구사항 1)\n`;
      try {
        await ghCreateFile(path, body, `docs(${targetSlug}): add ${fileName}`);
        ov[id].file = fileName;
        localStorage.setItem(OVERRIDE_KEY, JSON.stringify(ov));
      } catch (e) {
        console.warn('[새 기획문서] GitHub 파일 생성 실패 (메타는 로컬 저장됨):', e.message);
      }
    }
    loadPlanList(targetSlug, targetTabId);
  });
  setTimeout(() => overlay.querySelector('#pnTitle').focus(), 0);
}

function computeNextPlanId() {
  let max = 0;
  for (const d of planDocs) {
    const m = String(d.meta.id || '').match(/^VPLAN-(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  // localStorage overrides에서도 확인
  try {
    const ov = JSON.parse(localStorage.getItem(OVERRIDE_KEY) || '{}');
    Object.keys(ov).forEach(k => {
      const m = k.match(/^VPLAN-(\d+)$/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
  } catch {}
  return `VPLAN-${String(max + 1).padStart(3, '0')}`;
}

async function ghCreateFile(path, content, message) {
  const token = getGhToken();
  if (!token) throw new Error('GitHub 토큰이 없습니다');
  const url = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${path}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, content: b64EncodeUtf8(content), branch: GH.branch }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `생성 실패 (${res.status})`);
  }
  return res.json();
}

// ===== 에디터 모드 (Toast UI Editor) — 본문만 편집 =====
function renderEditor() {
  if (currentDocRaw == null) currentDocRaw = '';
  const hasToken = !!getGhToken();
  docContent.innerHTML = `
    <div class="doc-editor">
      <div class="doc-editor-mount" id="docEditorMount"></div>
      <div class="doc-editor-commit">
        <label for="docEditorMsg">커밋 메시지</label>
        <input type="text" id="docEditorMsg" placeholder="docs: update ${currentDocPath || '(새 파일)'}">
      </div>
      <div class="doc-editor-actions">
        <span class="doc-editor-status" id="docEditorStatus">${hasToken ? '' : 'GitHub 토큰 필요 — ⚙ 에서 설정'}</span>
        <button class="btn btn-sm btn-outline-primary" id="docEditorCancel">취소</button>
        <button class="btn btn-sm btn-primary" id="docEditorSave" ${hasToken ? '' : 'disabled'}>본문 저장</button>
      </div>
    </div>`;

  if (docEditorInstance) { try { docEditorInstance.destroy(); } catch {} docEditorInstance = null; }

  const mount = document.getElementById('docEditorMount');
  const statusEl = document.getElementById('docEditorStatus');

  if (!window.DocEditor) {
    mount.innerHTML = '<div style="padding:16px;color:#c62828">DocEditor 로드 실패 (Toast UI 스크립트 확인)</div>';
    return;
  }

  try {
    docEditorInstance = window.DocEditor.create({
      containerEl: mount,
      initialValue: currentDocRaw,
      getToken: getGhToken,
      gh: GH,
      height: 'calc(100vh - 260px)',
      onImageUploadStart: () => { statusEl.className = 'doc-editor-status'; statusEl.textContent = '이미지 업로드 중...'; },
      onImageUploadEnd: () => { statusEl.className = 'doc-editor-status success'; statusEl.textContent = '이미지 업로드 완료'; setTimeout(() => { statusEl.textContent = ''; }, 2000); },
      onImageUploadError: (e) => { statusEl.className = 'doc-editor-status error'; statusEl.textContent = `이미지 업로드 실패: ${e.message}`; },
    });
    docEditorInstance.focus();
  } catch (e) {
    mount.innerHTML = `<div style="padding:16px;color:#c62828">에디터 초기화 실패: ${e.message}</div>`;
  }

  document.getElementById('docEditorCancel').addEventListener('click', () => {
    exitEditorMode();
    renderDocFromRaw();
  });
  document.getElementById('docEditorSave').addEventListener('click', saveDocToGithub);
}

async function saveDocToGithub() {
  const msgInput = document.getElementById('docEditorMsg');
  const statusEl = document.getElementById('docEditorStatus');
  const saveBtn = document.getElementById('docEditorSave');
  const token = getGhToken();
  if (!token) { statusEl.textContent = 'GitHub 토큰이 필요합니다'; statusEl.className = 'doc-editor-status error'; return; }
  if (!docEditorInstance) { statusEl.textContent = '에디터가 초기화되지 않았습니다'; statusEl.className = 'doc-editor-status error'; return; }
  if (!currentDocPath) { statusEl.textContent = '저장할 파일 경로가 없습니다'; statusEl.className = 'doc-editor-status error'; return; }

  const editorText = docEditorInstance.getMarkdown();
  const newText = currentDocFrontmatter ? currentDocFrontmatter + editorText : editorText;
  const message = (msgInput.value || '').trim() || `docs: update ${currentDocPath}`;

  saveBtn.disabled = true;
  statusEl.className = 'doc-editor-status';
  statusEl.textContent = '저장 중...';

  try {
    async function fetchSha() {
      const metaUrl = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${currentDocPath}?ref=${GH.branch}&t=${Date.now()}`;
      const metaRes = await fetch(metaUrl, {
        headers: { 'Accept': 'application/vnd.github+json', 'Authorization': `Bearer ${token}` },
        cache: 'no-store',
      });
      if (metaRes.ok) return (await metaRes.json()).sha;
      return null;
    }

    async function tryPut(sha) {
      const putBody = { message, content: b64EncodeUtf8(newText), branch: GH.branch };
      if (sha) putBody.sha = sha;
      const putUrl = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${currentDocPath}`;
      return fetch(putUrl, {
        method: 'PUT',
        headers: { 'Accept': 'application/vnd.github+json', 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(putBody),
      });
    }

    let sha = await fetchSha();
    let putRes = await tryPut(sha);
    if (putRes.status === 409 || putRes.status === 422) {
      sha = await fetchSha();
      putRes = await tryPut(sha);
    }
    if (!putRes.ok) {
      const err = await putRes.json().catch(() => ({}));
      throw new Error(err.message || `저장 실패 (${putRes.status})`);
    }

    statusEl.className = 'doc-editor-status success';
    statusEl.textContent = '저장 완료';
    currentDocRaw = editorText;
    if (planDetailIdx >= 0 && planDocs[planDetailIdx]) {
      planDocs[planDetailIdx].text = newText;
    }
    setTimeout(() => { exitEditorMode(); renderDocFromRaw(); }, 800);
  } catch (e) {
    statusEl.className = 'doc-editor-status error';
    statusEl.textContent = e.message || '저장 실패';
    saveBtn.disabled = false;
  }
}

function b64EncodeUtf8(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

// ===== Jira 링크 =====
function jiraLinkify(html) {
  const anchors = [];
  const stashed = html.replace(/<a\b[^>]*>[\s\S]*?<\/a>/g, (m) => { anchors.push(m); return `@@A${anchors.length - 1}@@`; });
  const linked = stashed.replace(JIRA_KEY_RE, (key) => `<a href="${jiraHref(key)}" target="_blank" rel="noopener" class="jira-key">${key}</a>`);
  return linked.replace(/@@A(\d+)@@/g, (_, i) => anchors[+i]);
}
function renderJiraLink(key) {
  if (!key || key === '-') return '-';
  return `<a href="${jiraHref(key)}" target="_blank" rel="noopener" class="jira-key">${escapeHtmlText(key)}</a>`;
}
function escapeHtmlText(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ===== GitHub 토큰 설정 =====
function openGhSettings() {
  const existing = document.getElementById('ghSettingsOverlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'ghSettingsOverlay';
  overlay.className = 'gh-settings-overlay';
  overlay.innerHTML = `
    <div class="gh-settings-dialog">
      <div class="gh-settings-title">GitHub 연동 설정</div>
      <div class="gh-settings-desc">
        문서 저장을 위해 <strong>Personal Access Token (PAT)</strong>이 필요합니다.<br>
        <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">Fine-grained PAT 생성</a> —
        Repository: <code>${GH.owner}/${GH.repo}</code>, Permissions: <code>Contents: Read and write</code>
      </div>
      <div class="gh-settings-field">
        <label for="ghTokenInput">Access Token</label>
        <input type="password" id="ghTokenInput" placeholder="github_pat_... 또는 ghp_..." autocomplete="off">
      </div>
      <div class="gh-settings-actions">
        <button class="btn btn-sm btn-outline-danger" id="ghTokenClear">삭제</button>
        <span style="flex:1"></span>
        <button class="btn btn-sm btn-outline-primary" id="ghTokenCancel">닫기</button>
        <button class="btn btn-sm btn-primary" id="ghTokenSave">저장</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const input = overlay.querySelector('#ghTokenInput');
  input.value = getGhToken();
  setTimeout(() => input.focus(), 0);
  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('#ghTokenCancel').addEventListener('click', close);
  overlay.querySelector('#ghTokenClear').addEventListener('click', () => {
    if (!confirm('저장된 토큰을 삭제할까요?')) return;
    localStorage.removeItem(GH_TOKEN_KEY);
    input.value = '';
  });
  overlay.querySelector('#ghTokenSave').addEventListener('click', () => {
    const v = input.value.trim();
    if (!v) return;
    setGhToken(v);
    close();
  });
}

function initChangelogToggle() {
  const headings = docContent.querySelectorAll('h2');
  headings.forEach(h2 => {
    if (h2.textContent.trim() === '변경이력') {
      h2.classList.add('changelog-heading');
      h2.innerHTML = `<span class="changelog-arrow">&#9654;</span> 변경이력`;
      const siblings = [];
      let el = h2.nextElementSibling;
      while (el && el.tagName !== 'H2' && el.tagName !== 'H1') { siblings.push(el); el = el.nextElementSibling; }
      const wrapper = document.createElement('div');
      wrapper.className = 'changelog-body collapsed';
      h2.parentNode.insertBefore(wrapper, h2.nextSibling);
      siblings.forEach(s => wrapper.appendChild(s));
      h2.addEventListener('click', () => {
        const isCollapsed = wrapper.classList.toggle('collapsed');
        h2.querySelector('.changelog-arrow').innerHTML = isCollapsed ? '&#9654;' : '&#9660;';
      });
    }
  });
}
