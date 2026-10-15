(() => {
  const canonicalElement = document.querySelector('link[rel="canonical"]')
  const canonicalUrl = canonicalElement
    ? new URL(canonicalElement.href, window.location.origin)
    : new URL(window.location.href)

  canonicalUrl.search = ''
  canonicalUrl.hash = ''

  // Use the original Busuanzi service consistently; different providers have
  // independent histories and must not be mixed as interchangeable fallbacks.
  const pages = window.eulerPageStatistics || (window.eulerPageStatistics = new Map())
  const key = canonicalUrl.href
  const fields = ['site_uv', 'site_pv', 'page_pv']
  const render = statistics => {
    const current = new URL(document.querySelector('link[rel="canonical"]')?.href || window.location.href)
    current.search = ''
    current.hash = ''
    if (current.href !== key) return
    fields.forEach(field => {
      const element = document.getElementById('busuanzi_' + field)
      if (!element) return
      element.textContent = statistics ? String(statistics[field]) : '暂不可用'
      element.title = statistics
        ? '不蒜子统计；第三方统计可能受网络和浏览器拦截影响'
        : '统计服务连接失败，请稍后刷新重试'
    })
  }
  const previous = pages.get(key)
  if (previous) {
    previous.then(render)
    return
  }
  // Local previews must not increment the production site's counters.
  if (window.location.hostname !== canonicalUrl.hostname) {
    render(null)
    return
  }
  const request = new Promise(resolve => {
    const callback = 'eulerBusuanzi_' + Date.now() + '_' + Math.random().toString(36).slice(2)
    const script = document.createElement('script')
    let finished = false
    const finish = statistics => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      script.remove()
      // A response already in flight may still invoke the callback after timeout.
      window[callback] = () => {}
      setTimeout(() => { delete window[callback] }, 60000)
      if (!statistics) pages.delete(key)
      resolve(statistics)
    }
    window[callback] = statistics => {
      const valid = statistics && fields.every(field =>
        Number.isSafeInteger(statistics[field]) && statistics[field] >= 0)
      finish(valid ? statistics : null)
    }
    script.async = true
    // Match the original client's policy: the full page referrer distinguishes
    // article views; the browser's default origin-only policy merges all pages.
    script.referrerPolicy = 'no-referrer-when-downgrade'
    script.src = 'https://busuanzi.ibruce.info/busuanzi?jsonpCallback=' + callback
    script.onerror = () => finish(null)
    const timer = setTimeout(() => finish(null), 12000)
    document.head.appendChild(script)
  })
  pages.set(key, request)
  request.then(render)
})()
