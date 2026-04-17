// ===== LNB Toggle =====
document.querySelectorAll('.lnb-category-header').forEach(header => {
  const menuId = header.dataset.toggle;
  const menu = document.getElementById(menuId);

  // Default open
  header.classList.add('open');
  if (menu) menu.classList.add('open');

  header.addEventListener('click', () => {
    header.classList.toggle('open');
    if (menu) menu.classList.toggle('open');
  });
});

// ===== LNB Active State =====
document.querySelectorAll('.lnb-menu li a').forEach(link => {
  link.addEventListener('click', (e) => {
    document.querySelectorAll('.lnb-menu li').forEach(li => li.classList.remove('active'));
    link.parentElement.classList.add('active');
  });
});

// ===== Document Sidebar Toggle =====
const btnDocToggle = document.getElementById('btnDocToggle');
const btnDocClose = document.getElementById('btnDocClose');
const docSidebar = document.getElementById('docSidebar');
const docContent = document.getElementById('docContent');

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

// ===== Load MD Document =====
async function loadDocForCurrentPage() {
  const activePage = document.querySelector('.page');
  if (!activePage) return;

  const docName = activePage.dataset.doc;
  if (!docName) return;

  try {
    const res = await fetch(`docs/${docName}.md`);
    if (!res.ok) throw new Error('Not found');
    const md = await res.text();
    docContent.innerHTML = marked.parse(md);
  } catch {
    docContent.innerHTML = '<p class="doc-placeholder">기획문서가 아직 작성되지 않았습니다.</p>';
  }
}

// ===== Period Button Toggle =====
document.querySelectorAll('.btn-group-period').forEach(group => {
  group.querySelectorAll('.btn-period').forEach(btn => {
    btn.addEventListener('click', () => {
      group.querySelectorAll('.btn-period').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
});
