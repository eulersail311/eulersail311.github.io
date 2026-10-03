(() => {
  'use strict';
  function initialize() {
    const hub = document.getElementById('subject-hub');
    if (!hub || hub.dataset.libraryReady) return;
    const controls = hub.querySelector('.subject-controls');
    const search = hub.querySelector('#subject-search');
    const cards = [...hub.querySelectorAll('[data-subject-group]')];
    const buttons = [...hub.querySelectorAll('[data-subject-filter]')];
    const status = hub.querySelector('.subject-status');
    const empty = hub.querySelector('.subject-empty');
    const normalize = text => text.normalize('NFKC').trim().toLocaleLowerCase();
    const searchable = cards.map(card => normalize(card.dataset.search));
    let active = 'all';
    function render() {
      const query = normalize(search.value);
      let count = 0;
      cards.forEach((card, i) => {
        card.hidden = (active !== 'all' && card.dataset.subjectGroup !== active) || !searchable[i].includes(query);
        if (!card.hidden) count++;
      });
      buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.subjectFilter === active)));
      const group = buttons.find(button => button.dataset.subjectFilter === active)?.dataset.filterLabel || '全部';
      status.textContent = !query && active === 'all' ? '显示全部 ' + count + ' 篇文章'
        : group + (query ? ' · 搜索“' + search.value.trim() + '”' : '') + '：显示 ' + count + ' 篇文章';
      empty.hidden = count !== 0;
    }
    buttons.forEach(button => button.addEventListener('click', () => { active = button.dataset.subjectFilter; render(); }));
    search.addEventListener('input', render);
    hub.querySelector('.subject-reset').addEventListener('click', () => {
      active = 'all'; search.value = ''; render(); search.focus();
    });
    hub.querySelectorAll('[data-route-filter]').forEach(link => link.addEventListener('click', event => {
      event.preventDefault();
      active = link.dataset.routeFilter; search.value = ''; render();
      // Anchor navigation still works without JS; focus makes the change discoverable to keyboard users.
      hub.querySelector('#subject-library').scrollIntoView({ block: 'start' });
      search.focus({ preventScroll: true });
    }));
    controls.hidden = false;
    hub.dataset.libraryReady = 'true';
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize);
  else initialize();
  document.addEventListener('pjax:complete', initialize);
})();

