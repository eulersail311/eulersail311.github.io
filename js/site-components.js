(() => {
  'use strict';

  const fontLevels = [
    { key: 'small', label: '94%' },
    { key: 'normal', label: '100%' },
    { key: 'large', label: '108%' },
    { key: 'x-large', label: '116%' }
  ];
  const fontStorageKey = 'sail-article-font-size';

  function countCodeExamples(article) {
    const highlighted = Array.from(article.querySelectorAll('figure.highlight')).filter(figure =>
      !figure.classList.contains('text') && !figure.classList.contains('plaintext')
    ).length;
    const standalone = Array.from(article.querySelectorAll('pre')).filter(pre =>
      !pre.closest('figure.highlight') && !pre.closest('.mermaid-wrap')
    ).length;
    return highlighted + standalone;
  }

  function createMetric(icon, value, label) {
    const item = document.createElement('div');
    item.className = 'reading-overview-metric';

    const iconElement = document.createElement('i');
    iconElement.className = icon;
    iconElement.setAttribute('aria-hidden', 'true');

    const text = document.createElement('span');
    const number = document.createElement('strong');
    number.textContent = String(value);
    const caption = document.createElement('small');
    caption.textContent = label;
    text.append(number, caption);
    item.append(iconElement, text);
    return item;
  }

  function readFontLevel() {
    try {
      const saved = window.localStorage.getItem(fontStorageKey);
      return fontLevels.some(level => level.key === saved) ? saved : 'normal';
    } catch (_) {
      return 'normal';
    }
  }

  function saveFontLevel(level) {
    try {
      if (level === 'normal') window.localStorage.removeItem(fontStorageKey);
      else window.localStorage.setItem(fontStorageKey, level);
    } catch (_) {
      // Reading controls still work when storage is unavailable.
    }
  }

  function createReadingTools(article) {
    const tools = document.createElement('div');
    tools.className = 'reading-tools';

    const label = document.createElement('span');
    label.className = 'reading-tools-label';
    label.innerHTML = '<i class="fas fa-text-height" aria-hidden="true"></i><strong>正文字号</strong>';

    const controls = document.createElement('div');
    controls.className = 'reading-font-controls';

    const decrease = document.createElement('button');
    decrease.type = 'button';
    decrease.className = 'reading-font-step';
    decrease.setAttribute('aria-label', '减小正文字号');
    decrease.textContent = 'A−';

    const status = document.createElement('output');
    status.className = 'reading-font-status';
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('aria-label', '当前正文字号');

    const increase = document.createElement('button');
    increase.type = 'button';
    increase.className = 'reading-font-step';
    increase.setAttribute('aria-label', '增大正文字号');
    increase.textContent = 'A+';

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'reading-font-reset';
    reset.textContent = '重置';

    let currentLevel = readFontLevel();
    const applyLevel = (level, persist = true) => {
      currentLevel = level;
      const index = fontLevels.findIndex(item => item.key === level);
      article.dataset.readingSize = level;
      status.value = fontLevels[index].label;
      status.textContent = fontLevels[index].label;
      decrease.disabled = index === 0;
      increase.disabled = index === fontLevels.length - 1;
      reset.disabled = level === 'normal';
      if (persist) saveFontLevel(level);
    };

    decrease.addEventListener('click', () => {
      const index = fontLevels.findIndex(level => level.key === currentLevel);
      applyLevel(fontLevels[Math.max(0, index - 1)].key);
    });
    increase.addEventListener('click', () => {
      const index = fontLevels.findIndex(level => level.key === currentLevel);
      applyLevel(fontLevels[Math.min(fontLevels.length - 1, index + 1)].key);
    });
    reset.addEventListener('click', () => applyLevel('normal'));

    controls.append(decrease, status, increase, reset);
    tools.append(label, controls);
    applyLevel(currentLevel, false);
    return tools;
  }

  function createChapterNavigator(article) {
    const headings = Array.from(article.querySelectorAll('h2')).filter(heading => heading.id);
    if (headings.length < 2) return null;

    const nav = document.createElement('nav');
    nav.className = 'reading-chapters';
    nav.setAttribute('aria-label', '本文章节速览');

    const header = document.createElement('div');
    header.className = 'reading-chapters-header';
    header.innerHTML = `<span><i class="fas fa-map-signs" aria-hidden="true"></i><strong>章节速览</strong></span><small>${headings.length} 节</small>`;

    const list = document.createElement('ol');
    list.className = 'reading-chapter-list';
    list.id = 'reading-chapter-list';
    const links = headings.map((heading, index) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = `#${heading.id}`;
      const number = document.createElement('span');
      number.textContent = String(index + 1).padStart(2, '0');
      const title = document.createElement('strong');
      title.textContent = heading.textContent.trim();
      link.title = heading.textContent.trim();
      link.append(number, title);
      link.addEventListener('click', () => setActive(link));
      item.append(link);
      if (index >= 6) item.hidden = true;
      list.append(item);
      return link;
    });

    const setActive = activeLink => {
      links.forEach(link => {
        if (link === activeLink) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    };
    const hashLink = links.find(link => link.hash === window.location.hash);
    setActive(hashLink || links[0]);

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length === 0) return;
        const active = links[headings.indexOf(visible[0].target)];
        if (active) setActive(active);
      }, { rootMargin: '-14% 0px -72% 0px', threshold: 0 });
      headings.forEach(heading => observer.observe(heading));
    }

    nav.append(header, list);
    if (headings.length > 6) {
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'reading-chapters-toggle';
      toggle.setAttribute('aria-controls', list.id);
      toggle.setAttribute('aria-expanded', 'false');
      toggle.textContent = `展开全部 ${headings.length} 节`;
      toggle.addEventListener('click', () => {
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        list.querySelectorAll('li').forEach((item, index) => {
          if (index >= 6) item.hidden = expanded;
        });
        toggle.setAttribute('aria-expanded', String(!expanded));
        toggle.textContent = expanded ? `展开全部 ${headings.length} 节` : '收起章节';
      });
      nav.append(toggle);
    }
    return nav;
  }

  function initializeReadingOverview(article) {
    if (article.querySelector(':scope > .reading-overview')) return;

    const sections = article.querySelectorAll('h2').length;
    const codeExamples = countCodeExamples(article);
    const proseTables = Array.from(article.querySelectorAll('table')).filter(table =>
      !table.closest('figure.highlight')
    ).length;
    const visuals = article.querySelectorAll('.mermaid-wrap').length + proseTables;

    const overview = document.createElement('section');
    overview.className = 'reading-overview';
    overview.setAttribute('aria-labelledby', 'reading-overview-title');

    const heading = document.createElement('div');
    heading.className = 'reading-overview-heading';
    heading.innerHTML = '<span>READING MAP</span><strong id="reading-overview-title">阅读地图</strong>';

    const metrics = document.createElement('div');
    metrics.className = 'reading-overview-metrics';
    metrics.append(
      createMetric('fas fa-list-ul', sections, '个主要章节'),
      createMetric('fas fa-code', codeExamples, '段代码示例'),
      createMetric('fas fa-chart-bar', visuals, '组图表推导')
    );

    const note = document.createElement('p');
    note.textContent = codeExamples > 0
      ? '建议先确认状态或数据结构定义，再顺着证明、边界清单和完整实现阅读。'
      : '可以先浏览章节结构和图表，再带着主题线索完整阅读。';

    const tools = createReadingTools(article);
    const chapters = createChapterNavigator(article);
    overview.append(heading, metrics, note, tools);
    if (chapters) overview.append(chapters);
    article.insertBefore(overview, article.firstChild);
  }

  function initializeReadingProgress(article) {
    if (document.querySelector('.sail-reading-progress')) return;

    const progress = document.createElement('div');
    progress.className = 'sail-reading-progress';
    progress.setAttribute('role', 'progressbar');
    progress.setAttribute('aria-label', '文章阅读进度');
    progress.setAttribute('aria-valuemin', '0');
    progress.setAttribute('aria-valuemax', '100');
    progress.setAttribute('aria-valuenow', '0');
    progress.innerHTML = '<span></span>';
    document.body.append(progress);

    let queued = false;
    const update = () => {
      queued = false;
      const articleTop = window.scrollY + article.getBoundingClientRect().top;
      const available = Math.max(1, article.offsetHeight - window.innerHeight + 120);
      const travelled = window.scrollY - articleTop + 120;
      const ratio = Math.max(0, Math.min(1, travelled / available));
      progress.style.setProperty('--reading-progress', String(ratio));
      progress.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
    };
    const scheduleUpdate = () => {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(update);
    };

    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    update();
  }

  function initializeSiteComponents() {
    const article = document.querySelector('#post > #article-container');
    if (!article) return;
    initializeReadingOverview(article);
    initializeReadingProgress(article);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSiteComponents);
  } else {
    initializeSiteComponents();
  }
})();
