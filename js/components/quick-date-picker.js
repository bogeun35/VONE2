/**
 * QuickDatePicker — 간편날짜 공통 컴포넌트
 *
 * 기존 btn-group-period (오늘|이번달|지난달) 를 대체하여
 * 클릭 시 패널이 열리고, 다양한 프리셋을 선택할 수 있는 컴포넌트.
 *
 * 프리셋:
 *   Row 1: 오늘, 어제, 이번주, 전주, 당월, 전월, 오늘까지
 *   Row 2: 1/4분기, 2/4분기, 3/4분기, 4/4분기, 상반기, 하반기
 *   Row 3: 1월 ~ 12월
 *
 * 사용:
 *   <div class="quick-date-wrap">
 *     <button class="btn-quick-date" type="button">간편날짜</button>
 *   </div>
 *   뒤에 오는 .date-range 의 input[type="date"] 두 개에 자동 연결
 *
 *   또는 JS: QuickDatePicker.init()  (DOMContentLoaded 시 자동 호출)
 */
(function () {
  const YEAR = new Date().getFullYear();

  function fmt(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  function startOfWeek(d) {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.getFullYear(), d.getMonth(), diff);
  }

  function getPreset(key) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const y = today.getFullYear();
    const m = today.getMonth();

    switch (key) {
      case '오늘': return [today, today];
      case '어제': { const d = new Date(today); d.setDate(d.getDate() - 1); return [d, d]; }
      case '이번주': { const s = startOfWeek(today); const e = new Date(s); e.setDate(e.getDate() + 6); return [s, e]; }
      case '전주': { const s = startOfWeek(today); s.setDate(s.getDate() - 7); const e = new Date(s); e.setDate(e.getDate() + 6); return [s, e]; }
      case '당월': return [new Date(y, m, 1), new Date(y, m + 1, 0)];
      case '전월': return [new Date(y, m - 1, 1), new Date(y, m, 0)];
      case '오늘까지': return [new Date(y, 0, 1), today];
      case '1/4분기': return [new Date(y, 0, 1), new Date(y, 2, 31)];
      case '2/4분기': return [new Date(y, 3, 1), new Date(y, 5, 30)];
      case '3/4분기': return [new Date(y, 6, 1), new Date(y, 8, 30)];
      case '4/4분기': return [new Date(y, 9, 1), new Date(y, 11, 31)];
      case '상반기': return [new Date(y, 0, 1), new Date(y, 5, 30)];
      case '하반기': return [new Date(y, 6, 1), new Date(y, 11, 31)];
      default: {
        const mm = parseInt(key, 10);
        if (mm >= 1 && mm <= 12) return [new Date(y, mm - 1, 1), new Date(y, mm, 0)];
        return null;
      }
    }
  }

  function createPanel() {
    const panel = document.createElement('div');
    panel.className = 'quick-date-panel';
    panel.innerHTML =
      '<div class="qdp-row">' +
        ['오늘','어제','이번주','전주','당월','전월','오늘까지'].map(k => `<button type="button" class="qdp-btn" data-key="${k}">${k}</button>`).join('') +
      '</div>' +
      '<div class="qdp-row">' +
        ['1/4분기','2/4분기','3/4분기','4/4분기','상반기','하반기'].map(k => `<button type="button" class="qdp-btn" data-key="${k}">${k}</button>`).join('') +
      '</div>' +
      '<div class="qdp-row">' +
        Array.from({ length: 12 }, (_, i) => `<button type="button" class="qdp-btn qdp-btn-month" data-key="${i + 1}">${i + 1}월</button>`).join('') +
      '</div>';
    return panel;
  }

  function findDateInputs(trigger) {
    const wrap = trigger.closest('.filter-inline-group') || trigger.parentElement;
    if (!wrap) return null;
    const dateRange = wrap.querySelector('.date-range') || wrap.nextElementSibling;
    if (!dateRange) return null;
    const inputs = dateRange.querySelectorAll('input[type="date"]');
    if (inputs.length >= 2) return [inputs[0], inputs[1]];
    return null;
  }

  function bindTrigger(trigger) {
    if (trigger._qdpBound) return;
    trigger._qdpBound = true;

    const panel = createPanel();
    const wrap = trigger.closest('.quick-date-wrap') || trigger.parentElement;
    wrap.style.position = 'relative';
    wrap.appendChild(panel);

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      // close all other panels
      document.querySelectorAll('.quick-date-panel.show').forEach(p => { if (p !== panel) p.classList.remove('show'); });
      panel.classList.toggle('show');
    });

    panel.addEventListener('click', (e) => {
      const btn = e.target.closest('.qdp-btn');
      if (!btn) return;
      e.stopPropagation();
      const key = btn.dataset.key;
      const range = getPreset(key);
      if (!range) return;

      const inputs = findDateInputs(trigger);
      if (inputs) {
        inputs[0].value = fmt(range[0]);
        inputs[1].value = fmt(range[1]);
        inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
        inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
      }

      // highlight selected
      panel.querySelectorAll('.qdp-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      panel.classList.remove('show');
    });

    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) panel.classList.remove('show');
    });
  }

  function init() {
    document.querySelectorAll('.btn-quick-date').forEach(bindTrigger);
  }

  // 기존 btn-group-period 를 자동 변환
  function upgradeAll() {
    document.querySelectorAll('.btn-group-period').forEach(group => {
      const parent = group.parentElement;
      if (!parent) return;

      const wrap = document.createElement('div');
      wrap.className = 'quick-date-wrap';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn-quick-date';
      btn.textContent = '간편날짜';
      wrap.appendChild(btn);
      group.replaceWith(wrap);
      bindTrigger(btn);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    upgradeAll();
    init();
  });

  window.QuickDatePicker = { init, upgradeAll, getPreset };
})();
