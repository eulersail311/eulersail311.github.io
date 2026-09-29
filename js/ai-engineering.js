(() => {
  'use strict';
  function initialize() {
    const hub = document.getElementById('ai-hub');
    if (!hub || hub.dataset.filtersReady) return;
    const controls = hub.querySelector('.ai-filter-controls');
    const cards = [...hub.querySelectorAll('[data-ai-group]')];
    const buttons = [...controls.querySelectorAll('[data-ai-filter]')];
    const status = hub.querySelector('.ai-library-status');
    hub.dataset.filtersReady = 'true';
    controls.hidden = false;
    buttons.forEach(button => button.addEventListener('click', () => {
      const key = button.dataset.aiFilter;
      let count = 0;
      cards.forEach(card => {
        card.hidden = key !== 'all' && card.dataset.aiGroup !== key;
        if (!card.hidden) count++;
      });
      buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      const label = button.textContent.split(' · ')[0];
      status.textContent = key === 'all' ? `显示全部 ${count} 篇文章` : `${label}：显示 ${count} 篇文章`;
    }));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize);
  else initialize();
  document.addEventListener('pjax:complete', initialize);
})();
