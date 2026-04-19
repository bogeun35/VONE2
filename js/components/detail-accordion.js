/**
 * DetailAccordion — 상세 페이지 섹션 아코디언 (자동 적용)
 *
 * 동작:
 *   - 문서 내 모든 `.detail-section` 에 클릭 아코디언 자동 바인딩
 *   - `.detail-section-title` 클릭 시 `.detail-section` 에 `.collapsed` 토글
 *   - 상태 저장 X — 페이지 재진입/새로고침 시 기본(열림)으로 초기화
 *   - 타이틀 내 `.help-tip` 클릭은 토글에서 제외 (툴팁 hover 간섭 방지)
 *
 * 사용:
 *   상세 페이지 컴포넌트에서 `.detail-section` 마크업만 쓰면 자동 적용됨.
 *   수동 호출이 필요하면 `DetailAccordion.bindAll(root)` 로 재스캔.
 */
(function () {
  function bindSection(section) {
    if (section.dataset.accordionBound === '1') return;
    section.dataset.accordionBound = '1';
    const title = section.querySelector('.detail-section-title');
    if (!title) return;
    title.addEventListener('click', (e) => {
      if (e.target.closest('.help-tip')) return;
      section.classList.toggle('collapsed');
    });
  }

  function bindMetaBar(bar) {
    if (bar.dataset.metaAccordionBound === '1') return;
    bar.dataset.metaAccordionBound = '1';
    const toggle = bar.querySelector('.detail-meta-toggle');
    if (!toggle) return;
    const rowCount = bar.querySelectorAll('.detail-meta-row').length;
    // 1행짜리 메타는 접을 대상이 없으므로 버튼 숨김
    if (rowCount < 2) { toggle.style.display = 'none'; return; }
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      bar.classList.toggle('collapsed');
    });
  }

  function bindAll(root) {
    const r = root || document;
    r.querySelectorAll('.detail-section').forEach(bindSection);
    r.querySelectorAll('.detail-meta-bar').forEach(bindMetaBar);
  }

  document.addEventListener('DOMContentLoaded', () => bindAll(document));
  // 탭 전환으로 다른 상세 페이지가 보여질 때도 새 섹션 있으면 바인딩
  window.addEventListener('tab:activated', () => bindAll(document));

  window.DetailAccordion = { bindAll };
})();
