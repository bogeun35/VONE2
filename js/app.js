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

// ===== Document Sidebar Toggle =====
const btnDocToggle = document.getElementById('btnDocToggle');
const btnDocClose = document.getElementById('btnDocClose');
const btnDocRefresh = document.getElementById('btnDocRefresh');
const btnDocEdit = document.getElementById('btnDocEdit');
const btnDocSettings = document.getElementById('btnDocSettings');
const docSidebar = document.getElementById('docSidebar');
const docContent = document.getElementById('docContent');

// GitHub 설정 (public repo 읽기 + PAT로 쓰기)
const GH = { owner: 'bogeun35', repo: 'VONE2', branch: 'main' };
const GH_TOKEN_KEY = 'vone:ghToken';
const getGhToken = () => localStorage.getItem(GH_TOKEN_KEY) || '';
const setGhToken = (t) => localStorage.setItem(GH_TOKEN_KEY, t);

// Jira 연동 (이슈번호 자동 링크화)
const JIRA = { baseUrl: 'https://vendysdev.atlassian.net/browse/' };
const JIRA_KEY_RE = /\b[A-Z][A-Z0-9]+-\d+\b/g;
const jiraHref = (key) => JIRA.baseUrl + encodeURIComponent(key);

let currentDocTab = 'policy';
let currentDocPath = null;  // 현재 로드된 md 경로
let currentDocRaw = null;   // 원본 md 텍스트
let editorMode = false;
let planDocs = [];          // 기획문서 목록 (메타+본문 캐시)
let planDetailIdx = -1;     // 기획문서 상세 뷰에서 선택된 인덱스 (-1 = 목록 뷰)
let docEditorInstance = null; // 현재 마운트된 Toast UI 에디터 핸들

// 현재 화면에 보이는 .page 를 반환 (display:none 제외)
function getVisiblePage() {
  const pages = document.querySelectorAll('.content .page');
  for (const p of pages) {
    if (p.offsetParent !== null) return p;
  }
  return pages[0] || null;
}

function syncDocToggleActive(isOpen) {
  document.querySelectorAll('.btn-doc-toggle').forEach(b => b.classList.toggle('active', isOpen));
}

function toggleDocSidebar() {
  const isOpen = docSidebar.classList.toggle('open');
  syncDocToggleActive(isOpen);
  if (isOpen) loadDocForCurrentPage();
}
// 모든 페이지의 .btn-doc-toggle 에 대응 (이벤트 위임)
document.addEventListener('click', (e) => {
  if (e.target.closest('.btn-doc-toggle')) toggleDocSidebar();
});
btnDocClose.addEventListener('click', () => {
  docSidebar.classList.remove('open');
  syncDocToggleActive(false);
});

// 탭/페이지 전환 시 사이드바가 열려있다면 해당 페이지 문서를 다시 로드
window.addEventListener('page:shown', () => {
  if (docSidebar && docSidebar.classList.contains('open')) {
    loadDocForCurrentPage();
  }
});

// Doc Tabs
document.querySelectorAll('.doc-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    if (editorMode && !confirm('편집 중인 내용이 사라집니다. 탭을 전환할까요?')) return;
    document.querySelectorAll('.doc-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentDocTab = tab.dataset.tab;
    editorMode = false;
    btnDocEdit.classList.remove('active');
    loadDocForCurrentPage();
  });
});

// 새로고침
btnDocRefresh.addEventListener('click', () => {
  if (editorMode && !confirm('편집 중인 내용이 사라집니다. 새로고침할까요?')) return;
  editorMode = false;
  btnDocEdit.classList.remove('active');
  loadDocForCurrentPage();
});

// 편집 토글
btnDocEdit.addEventListener('click', () => {
  if (!currentDocPath) return;
  editorMode = !editorMode;
  btnDocEdit.classList.toggle('active', editorMode);
  if (editorMode) renderEditor();
  else renderDocFromRaw();
});

// 설정 (PAT 입력)
btnDocSettings.addEventListener('click', openGhSettings);

// ===== Parse Frontmatter =====
function parseFrontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
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

async function loadDocForCurrentPage() {
  const activePage = getVisiblePage();
  if (!activePage) return;
  const docBase = activePage.dataset.doc;
  if (!docBase) {
    docContent.innerHTML = '<p class="doc-placeholder">이 페이지에는 연결된 문서가 없습니다.</p>';
    return;
  }

  editorMode = false;
  btnDocEdit.classList.remove('active');
  currentDocRaw = null;
  btnDocEdit.disabled = true;
  docContent.innerHTML = '<p class="doc-placeholder">불러오는 중...</p>';

  if (currentDocTab === 'policy') {
    currentDocPath = `docs/${docBase}/policy.md`;
    await loadPolicyDoc();
  } else {
    planDetailIdx = -1;
    currentDocPath = null;
    await loadPlanList(docBase);
  }
}

async function loadPolicyDoc() {
  try {
    const raw = await ghFetchRaw(currentDocPath);
    currentDocRaw = raw;
    btnDocEdit.disabled = false;
    renderDocFromRaw();
  } catch {
    docContent.innerHTML = `<p class="doc-placeholder">정책문서를 불러올 수 없습니다. (${currentDocPath})</p>`;
  }
}

async function ghFetchRaw(path) {
  const url = `https://raw.githubusercontent.com/${GH.owner}/${GH.repo}/${GH.branch}/${path}?t=${Date.now()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.text();
}

// 기획문서 목록 조회 (Contents API)
async function loadPlanList(docBase) {
  const dirPath = `docs/${docBase}/plans`;
  const listUrl = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${dirPath}?ref=${GH.branch}`;
  const headers = { 'Accept': 'application/vnd.github+json' };
  const tok = getGhToken();
  if (tok) headers['Authorization'] = `Bearer ${tok}`;

  try {
    const listRes = await fetch(listUrl, { headers });
    if (listRes.status === 404) {
      renderPlanList([], docBase);
      return;
    }
    if (!listRes.ok) throw new Error(`목록 조회 실패 (${listRes.status})`);
    const files = (await listRes.json()).filter(f => f.type === 'file' && f.name.endsWith('.md'));

    // 각 파일 frontmatter 병렬 fetch
    const docs = await Promise.all(files.map(async (f) => {
      try {
        const text = await ghFetchRaw(f.path);
        const { meta } = parseFrontmatter(text);
        return { file: f, meta, text };
      } catch {
        return { file: f, meta: {}, text: '' };
      }
    }));

    // 이슈일자 내림차순
    docs.sort((a, b) => (b.meta.issueDate || '').localeCompare(a.meta.issueDate || ''));
    planDocs = docs;
    renderPlanList(docs, docBase);
  } catch (e) {
    docContent.innerHTML = `<p class="doc-placeholder">기획문서 목록을 불러올 수 없습니다. (${e.message})</p>`;
  }
}

function renderPlanList(docs, docBase) {
  planDetailIdx = -1;
  currentDocPath = null;
  currentDocRaw = null;
  btnDocEdit.disabled = true;

  const statusBadge = (s) => {
    const cls = s === '확정' ? 'ver-status-done'
             : s === '검토중' ? 'ver-status-review'
             : 'ver-status-wip';
    return `<span class="doc-version-status ${cls}">${escapeHtmlText(s || '작성중')}</span>`;
  };

  const rows = docs.length ? docs.map((d, i) => `
    <tr class="plan-row" data-idx="${i}">
      <td class="plan-id"><span class="plan-id-badge">${escapeHtmlText(d.meta.id || '-')}</span></td>
      <td class="plan-title">${escapeHtmlText(d.meta.title || d.file.name.replace(/\.md$/, ''))}</td>
      <td>${escapeHtmlText(d.meta.author || '-')}</td>
      <td>${escapeHtmlText(d.meta.issueDate || '-')}</td>
      <td>${renderJiraLink(d.meta.issueNumber)}</td>
      <td>${statusBadge(d.meta.status)}</td>
    </tr>
  `).join('') : '<tr><td colspan="6" class="plan-empty">아직 기획문서가 없습니다.</td></tr>';

  docContent.innerHTML = `
    <div class="plan-list-header">
      <span class="plan-list-count">총 ${docs.length}건</span>
      <button class="btn btn-sm btn-primary" id="planNewBtn">+ 새 기획문서</button>
    </div>
    <table class="plan-list">
      <thead><tr>
        <th>ID</th><th>제목</th><th>기획자</th><th>이슈일자</th><th>이슈번호</th><th>상태</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  docContent.querySelectorAll('.plan-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('a')) return; // Jira 링크 클릭은 별도
      openPlanDetail(+row.dataset.idx);
    });
  });
  const newBtn = document.getElementById('planNewBtn');
  if (newBtn) newBtn.addEventListener('click', () => openNewPlan(docBase));
}

function openPlanDetail(idx) {
  const d = planDocs[idx];
  if (!d) return;
  planDetailIdx = idx;
  currentDocPath = d.file.path;
  currentDocRaw = d.text;
  btnDocEdit.disabled = false;
  renderDocFromRaw();
}

function renderDocFromRaw() {
  if (!currentDocRaw) return;
  const { meta, body } = parseFrontmatter(currentDocRaw);
  const isPlan = currentDocTab === 'plan';
  const header = isPlan ? renderPlanDetailHeader(meta) : renderVersionHeader(meta);
  const backBtn = isPlan ? `<div class="plan-detail-back"><button class="btn btn-sm btn-outline-primary" id="planBackBtn">← 목록</button></div>` : '';
  docContent.innerHTML = backBtn + header + jiraLinkify(marked.parse(body));
  initChangelogToggle();
  const back = document.getElementById('planBackBtn');
  if (back) back.addEventListener('click', () => {
    editorMode = false;
    btnDocEdit.classList.remove('active');
    const activePage = document.querySelector('.page');
    loadPlanList(activePage.dataset.doc);
  });
}

function renderPlanDetailHeader(meta) {
  const statusMap = { '작성중': 'ver-status-wip', '검토중': 'ver-status-review', '확정': 'ver-status-done' };
  const statusCls = statusMap[meta.status] || 'ver-status-wip';
  const jira = meta.issueNumber ? `<a class="plan-jira-link" href="${jiraHref(meta.issueNumber)}" target="_blank" rel="noopener">${escapeHtmlText(meta.issueNumber)}</a>` : '-';
  const id = meta.id ? `<span class="plan-id-badge">${escapeHtmlText(meta.id)}</span>` : '';
  return `
    <div class="doc-version-bar">
      <div class="doc-version-info">
        ${id}
        <span class="plan-jira-key">${jira}</span>
        <span class="doc-version-status ${statusCls}">${escapeHtmlText(meta.status || '작성중')}</span>
      </div>
      <div class="doc-version-detail">
        <span>${escapeHtmlText(meta.issueDate || '-')}</span>
        <span class="doc-version-sep">|</span>
        <span>${escapeHtmlText(meta.author || '-')}</span>
      </div>
    </div>`;
}

// 다음 Plan ID 계산 (기존 목록에서 최대값 + 1). 페이지별로 prefix는 고정.
function computeNextPlanId(docBase) {
  const prefix = 'VPLAN';  // 향후 페이지별 prefix 매핑 시 ${docBase} 활용 가능
  let max = 0;
  for (const d of planDocs) {
    const id = (d.meta && d.meta.id) || '';
    const m = id.match(/^VPLAN-(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

// 렌더된 HTML 안의 Jira 키를 링크로 치환 (이미 <a>안에 있는 키는 건너뜀)
function jiraLinkify(html) {
  // <a>…</a> 구간은 자리표시자로 빼둔 뒤 치환하고 복원
  const anchors = [];
  const stashed = html.replace(/<a\b[^>]*>[\s\S]*?<\/a>/g, (m) => {
    anchors.push(m);
    return `@@ANCHOR${anchors.length - 1}@@`;
  });
  const linked = stashed.replace(JIRA_KEY_RE, (key) =>
    `<a href="${jiraHref(key)}" target="_blank" rel="noopener" class="jira-key">${key}</a>`
  );
  return linked.replace(/@@ANCHOR(\d+)@@/g, (_, i) => anchors[+i]);
}

function renderJiraLink(key) {
  if (!key || key === '-') return '-';
  return `<a href="${jiraHref(key)}" target="_blank" rel="noopener" class="jira-key">${escapeHtmlText(key)}</a>`;
}

function escapeHtmlText(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// 새 기획문서 생성 다이얼로그
function openNewPlan(docBase) {
  const existing = document.getElementById('planNewOverlay');
  if (existing) existing.remove();
  const today = new Date().toISOString().slice(0, 10);
  const nextId = computeNextPlanId(docBase);
  // 인증된 사용자 이름 자동 세팅
  const user = window.vendysUser;
  const authorDefault = user ? (user.displayName || (user.email || '').split('@')[0]) : '';
  const overlay = document.createElement('div');
  overlay.id = 'planNewOverlay';
  overlay.className = 'gh-settings-overlay';
  overlay.innerHTML = `
    <div class="gh-settings-dialog">
      <div class="gh-settings-title">새 기획문서</div>
      <div class="gh-settings-field">
        <label>고유 ID</label>
        <input type="text" id="pnId" value="${nextId}" readonly style="background:#f5f6fa;color:#2563eb;font-weight:600">
      </div>
      <div class="gh-settings-field">
        <label>제목</label>
        <input type="text" id="pnTitle" placeholder="예: 통장거래 IDX 컬럼 추가">
      </div>
      <div class="gh-settings-field">
        <label>기획자 ${user ? '(로그인 계정 기준 자동 입력)' : ''}</label>
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
        <select id="pnStatus"><option>작성중</option><option>검토중</option><option>확정</option></select>
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
    if (!title || !author || !date || !issue) {
      msgEl.className = 'doc-editor-status error';
      msgEl.textContent = '제목/기획자/이슈일자/이슈번호는 필수입니다';
      return;
    }
    if (!getGhToken()) {
      msgEl.className = 'doc-editor-status error';
      msgEl.textContent = 'GitHub 토큰이 필요합니다 — 우측 ⚙ 에서 설정';
      return;
    }
    const slug = title.toLowerCase().replace(/[^a-z0-9ㄱ-ㅎ가-힣]+/gi, '-').replace(/(^-|-$)/g, '').slice(0, 40) || 'plan';
    const fileName = `${date}-${issue}-${slug}.md`;
    const path = `docs/${docBase}/plans/${fileName}`;
    const body = `---
id: ${id}
title: ${title}
author: ${author}
issueDate: ${date}
issueNumber: ${issue}
status: ${status}
---

# ${title}

## 배경

(배경 설명)

## 요구사항

- (요구사항 1)

## 변경이력
| 버전 | 날짜 | 작성자 | 변경내용 |
|------|------|--------|----------|
| v0.1 | ${date} | ${author} | 최초 작성 |
`;
    try {
      msgEl.className = 'doc-editor-status';
      msgEl.textContent = '생성 중...';
      await ghCreateFile(path, body, `docs(${docBase}): add ${fileName}`);
      close();
      await loadPlanList(docBase);
    } catch (e) {
      msgEl.className = 'doc-editor-status error';
      msgEl.textContent = e.message || '생성 실패';
    }
  });
  setTimeout(() => overlay.querySelector('#pnTitle').focus(), 0);
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

// ===== 에디터 모드 (Toast UI Editor) =====
function renderEditor() {
  if (!currentDocRaw) return;
  const hasToken = !!getGhToken();
  docContent.innerHTML = `
    <div class="doc-editor">
      <div class="doc-editor-mount" id="docEditorMount"></div>
      <div class="doc-editor-commit">
        <label for="docEditorMsg">커밋 메시지</label>
        <input type="text" id="docEditorMsg" placeholder="docs: update ${currentDocPath}">
      </div>
      <div class="doc-editor-actions">
        <span class="doc-editor-status" id="docEditorStatus">${hasToken ? '' : 'GitHub 토큰이 없습니다 — 우측 상단 ⚙ 에서 설정'}</span>
        <button class="btn btn-sm btn-outline-primary" id="docEditorCancel">취소</button>
        <button class="btn btn-sm btn-primary" id="docEditorSave" ${hasToken ? '' : 'disabled'}>저장</button>
      </div>
    </div>`;

  // 기존 인스턴스가 살아 있다면 정리
  if (docEditorInstance) {
    try { docEditorInstance.destroy(); } catch {}
    docEditorInstance = null;
  }

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
      gh: { owner: GH.owner, repo: GH.repo, branch: GH.branch },
      height: 'calc(100vh - 260px)',
      onImageUploadStart: () => {
        statusEl.className = 'doc-editor-status';
        statusEl.textContent = '이미지 업로드 중...';
      },
      onImageUploadEnd: () => {
        statusEl.className = 'doc-editor-status success';
        statusEl.textContent = '이미지 업로드 완료';
        setTimeout(() => {
          if (statusEl.textContent === '이미지 업로드 완료') {
            statusEl.className = 'doc-editor-status';
            statusEl.textContent = hasToken ? '' : 'GitHub 토큰이 없습니다 — 우측 상단 ⚙ 에서 설정';
          }
        }, 2000);
      },
      onImageUploadError: (e) => {
        statusEl.className = 'doc-editor-status error';
        statusEl.textContent = `이미지 업로드 실패: ${e.message}`;
      },
    });
    docEditorInstance.focus();
  } catch (e) {
    mount.innerHTML = `<div style="padding:16px;color:#c62828">에디터 초기화 실패: ${e.message}</div>`;
  }

  document.getElementById('docEditorCancel').addEventListener('click', () => {
    editorMode = false;
    btnDocEdit.classList.remove('active');
    if (docEditorInstance) { try { docEditorInstance.destroy(); } catch {} docEditorInstance = null; }
    renderDocFromRaw();
  });
  document.getElementById('docEditorSave').addEventListener('click', saveDocToGithub);
}

async function saveDocToGithub() {
  const msgInput = document.getElementById('docEditorMsg');
  const statusEl = document.getElementById('docEditorStatus');
  const saveBtn = document.getElementById('docEditorSave');
  const token = getGhToken();
  if (!token) {
    statusEl.textContent = 'GitHub 토큰이 필요합니다';
    statusEl.className = 'doc-editor-status error';
    return;
  }
  if (!docEditorInstance) {
    statusEl.textContent = '에디터가 초기화되지 않았습니다';
    statusEl.className = 'doc-editor-status error';
    return;
  }
  const newText = docEditorInstance.getMarkdown();
  const message = (msgInput.value || '').trim() || `docs: update ${currentDocPath}`;

  saveBtn.disabled = true;
  statusEl.className = 'doc-editor-status';
  statusEl.textContent = '저장 중...';

  try {
    // 1) 최신 sha 확보 (충돌 방지)
    const metaUrl = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${currentDocPath}?ref=${GH.branch}`;
    const metaRes = await fetch(metaUrl, {
      headers: { 'Accept': 'application/vnd.github+json', 'Authorization': `Bearer ${token}` },
    });
    if (!metaRes.ok) throw new Error(`메타 조회 실패 (${metaRes.status})`);
    const metaJson = await metaRes.json();
    const sha = metaJson.sha;

    // 2) PUT contents
    const putUrl = `https://api.github.com/repos/${GH.owner}/${GH.repo}/contents/${currentDocPath}`;
    const body = {
      message,
      content: b64EncodeUtf8(newText),
      sha,
      branch: GH.branch,
    };
    const putRes = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!putRes.ok) {
      const err = await putRes.json().catch(() => ({}));
      throw new Error(err.message || `저장 실패 (${putRes.status})`);
    }
    statusEl.className = 'doc-editor-status success';
    statusEl.textContent = '저장 완료 — 새로고침 중...';
    currentDocRaw = newText;
    // raw CDN 반영까지 살짝 딜레이
    setTimeout(() => {
      editorMode = false;
      btnDocEdit.classList.remove('active');
      loadDocForCurrentPage();
    }, 800);
  } catch (e) {
    statusEl.className = 'doc-editor-status error';
    statusEl.textContent = e.message || '저장 실패';
    saveBtn.disabled = false;
  }
}

// UTF-8 안전 base64 (한글 지원)
function b64EncodeUtf8(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

// ===== GitHub 토큰 설정 다이얼로그 =====
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
        Repository access: <code>${GH.owner}/${GH.repo}</code>, Permissions: <code>Contents: Read and write</code>
      </div>
      <div class="gh-settings-field">
        <label for="ghTokenInput">Access Token</label>
        <input type="password" id="ghTokenInput" placeholder="github_pat_... 또는 ghp_..." autocomplete="off">
      </div>
      <div class="gh-settings-field">
        <label>Repository</label>
        <input type="text" value="${GH.owner}/${GH.repo} (${GH.branch})" readonly>
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
    if (editorMode) renderEditor();
  });
  overlay.querySelector('#ghTokenSave').addEventListener('click', () => {
    const v = input.value.trim();
    if (!v) return;
    setGhToken(v);
    close();
    if (editorMode) renderEditor();
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
      while (el && el.tagName !== 'H2' && el.tagName !== 'H1') {
        siblings.push(el);
        el = el.nextElementSibling;
      }
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
