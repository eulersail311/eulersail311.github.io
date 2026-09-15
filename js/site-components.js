(() => {
  'use strict';

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

    overview.append(heading, metrics, note);
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
