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

// ===== Document Sidebar Toggle =====
const btnDocToggle = document.getElementById('btnDocToggle');
const btnDocClose = document.getElementById('btnDocClose');
const docSidebar = document.getElementById('docSidebar');
const docContent = document.getElementById('docContent');

let currentDocTab = 'policy';

function toggleDocSidebar() {
  const isOpen = docSidebar.classList.toggle('open');
  btnDocToggle.classList.toggle('active', isOpen);
  if (isOpen) loadDocForCurrentPage();
}
btnDocToggle.addEventListener('click', toggleDocSidebar);
btnDocClose.addEventListener('click', () => {
  docSidebar.classList.remove('open');
  btnDocToggle.classList.remove('active');
});

// Doc Tabs
document.querySelectorAll('.doc-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.doc-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentDocTab = tab.dataset.tab;
    loadDocForCurrentPage();
  });
});

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
  const activePage = document.querySelector('.page');
  if (!activePage) return;
  const docBase = activePage.dataset.doc;
  if (!docBase) return;
  const docName = currentDocTab === 'policy' ? `${docBase}-policy` : docBase;
  try {
    const res = await fetch(`docs/${docName}.md`);
    if (!res.ok) throw new Error('Not found');
    const raw = await res.text();
    const { meta, body } = parseFrontmatter(raw);
    docContent.innerHTML = renderVersionHeader(meta) + marked.parse(body);
    initChangelogToggle();
  } catch {
    docContent.innerHTML = '<p class="doc-placeholder">기획문서가 아직 작성되지 않았습니다.</p>';
  }
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
