/**
 * DateInputPlaceholder — `<input type="date">` 의 브라우저 기본 "연도-월-일" 표시를
 * "yyyy-mm-dd" 로 오버라이드 (빈 값 일 때만).
 *
 * 방식:
 *   - 각 date 입력을 <span class="date-input"> 로 래핑
 *   - 값 없을 때 wrapper 에 `.is-empty` 클래스 부착
 *   - CSS 에서 ::-webkit-datetime-edit 을 투명하게 + ::before 로 "yyyy-mm-dd" 오버레이
 *
 * 자동으로 DOMContentLoaded 에 한 번 실행되고, 추가로 동적 date 입력을 감지하는
 * MutationObserver 도 붙여 둡니다.
 */
(function () {
  function wrap(inp) {
    if (!inp || inp.parentElement?.classList.contains('date-input')) return;
    const wrapEl = document.createElement('span');
    wrapEl.className = 'date-input';
    inp.parentNode.insertBefore(wrapEl, inp);
    wrapEl.appendChild(inp);
    const update = () => wrapEl.classList.toggle('is-empty', !inp.value);
    update();
    inp.addEventListener('change', update);
    inp.addEventListener('input', update);
    inp.addEventListener('blur', update);
  }

  function wrapAll(root = document) {
    root.querySelectorAll('input[type="date"]').forEach(wrap);
  }

  function observe() {
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          if (node.matches && node.matches('input[type="date"]')) wrap(node);
          else if (node.querySelectorAll) wrapAll(node);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { wrapAll(); observe(); });
  } else {
    wrapAll();
    observe();
  }

  // 외부에서 수동 적용도 가능하도록 노출
  window.DateInputPlaceholder = { wrap, wrapAll };
})();
