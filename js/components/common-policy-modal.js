/**
 * CommonPolicyModal — 헤더의 "공통 정책" 버튼 클릭 시 `docs/common/policy.md` 를 모달로 렌더
 *
 * 구현:
 *   - 같은 origin(GitHub Pages)에서 호스팅되므로 fetch 로 raw MD 로드
 *   - marked.js 로 HTML 변환
 *   - 편집은 링크 클릭으로 GitHub 웹 에디터로 이동
 */
(function () {
  const MD_PATH = 'docs/common/policy.md';
  const GH_EDIT_URL = 'https://github.com/bogeun35/VONE2/edit/main/docs/common/policy.md';
  let loaded = false;

  function $(id) { return document.getElementById(id); }

  async function loadOnce() {
    if (loaded) return;
    const target = $('commonPolicyContent');
    if (!target) return;
    try {
      // 캐시 버스터 — 최신 정책문서 즉시 반영
      const r = await fetch(MD_PATH + '?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      let md = await r.text();
      // front-matter 제거 (--- ... --- 블록)
      md = md.replace(/^---\n[\s\S]*?\n---\n/, '');
      if (window.marked) {
        target.innerHTML = window.marked.parse(md);
      } else {
        target.innerText = md;
      }
      loaded = true;
    } catch (e) {
      target.innerHTML = `<p class="doc-placeholder">문서를 불러오지 못했습니다 (${e.message}).</p>`;
    }
  }

  function open() {
    const overlay = $('commonPolicyModal');
    if (!overlay) return;
    overlay.classList.add('open');
    const edit = $('commonPolicyEditLink');
    if (edit) edit.href = GH_EDIT_URL;
    loadOnce();
  }
  function close() {
    const overlay = $('commonPolicyModal');
    if (overlay) overlay.classList.remove('open');
  }

  document.addEventListener('DOMContentLoaded', () => {
    const btn = $('btnOpenCommonPolicy');
    if (btn) btn.addEventListener('click', open);
    const x = $('commonPolicyClose');
    if (x) x.addEventListener('click', close);
    const overlay = $('commonPolicyModal');
    if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    // 새로고침 시 최신 반영을 위해 닫힐 때 loaded 플래그 유지 (세션당 1회 로드).
    // 실시간 갱신 원하면 아래 주석 해제 — document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  });

  window.CommonPolicyModal = { open, close };
})();
