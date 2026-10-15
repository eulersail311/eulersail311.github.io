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
  const validNumber = value => Number.isSafeInteger(value) && value >= 0
  const storagePrefix = 'euler:statistics:busuanzi:v1:'
  const readCache = name => {
    try { return JSON.parse(localStorage.getItem(storagePrefix + name)) } catch (_) { return null }
  }
  const writeCache = (name, data) => {
    try { localStorage.setItem(storagePrefix + name, JSON.stringify(data)) } catch (_) {}
  }
  const cachedSite = readCache('site')
  const cachedPage = readCache(key)
  fields.forEach(field => {
    const element = document.getElementById('busuanzi_' + field)
    const cached = field === 'page_pv' ? cachedPage : cachedSite
    if (!element || !cached || !validNumber(cached[field])) return
    const timestamp = Date.parse(cached.updated)
    const embedded = Date.parse(element.dataset.statisticsUpdated || '')
    if (!Number.isFinite(timestamp) || timestamp > Date.now() + 300000 || timestamp <= embedded) return
    element.dataset.statisticsValue = String(cached[field])
    element.dataset.statisticsUpdated = cached.updated
    element.dataset.counterState = 'snapshot'
    element.textContent = cached[field] + '（快照）'
    element.title = '最近成功统计：' + cached.updated + '；实时连接成功后自动更新'
  })
  const render = ({ statistics, error }) => {
    const current = new URL(document.querySelector('link[rel="canonical"]')?.href || window.location.href)
    current.search = ''
    current.hash = ''
    if (current.href !== key) return
    fields.forEach(field => {
      const element = document.getElementById('busuanzi_' + field)
      if (!element) return
      if (statistics) {
        element.textContent = String(statistics[field])
        element.dataset.counterState = 'live'
        element.title = '不蒜子实时统计'
      } else {
        const snapshot = element.dataset.statisticsValue
        const available = snapshot !== undefined && /^\d+$/.test(snapshot) && validNumber(Number(snapshot))
        element.textContent = available ? snapshot + '（快照） ' : '连接失败 '
        element.dataset.counterState = available ? 'snapshot' : 'error'
        element.title = available ? '最近成功统计：' + element.dataset.statisticsUpdated + '；' + error : error
        if (window.location.hostname === canonicalUrl.hostname) {
          const retry = document.createElement('button')
          retry.type = 'button'
          retry.textContent = '重试'
          retry.style.cssText = 'font:inherit;color:inherit;background:transparent;border:0;padding:0 2px;text-decoration:underline;cursor:pointer'
          retry.setAttribute('aria-label', '重新获取' + ({ site_uv: '本站访客数', site_pv: '本站总访问量', page_pv: '本文阅读量' })[field])
          retry.onclick = () => load()
          element.appendChild(retry)
        }
      }
    })
  }
  const previous = pages.get(key)
  if (previous) {
    previous.then(render)
    return
  }
  // Local previews must not increment the production site's counters.
  if (window.location.hostname !== canonicalUrl.hostname) {
    render({ statistics: null, error: '本地预览不计入线上访问' })
    return
  }
  function load () {
    if (pages.has(key)) return
    fields.forEach(field => {
      const element = document.getElementById('busuanzi_' + field)
      if (!element) return
      element.querySelectorAll('button').forEach(button => button.remove())
      if (!element.dataset.statisticsValue) element.textContent = '加载中'
      element.title = '正在连接统计服务'
    })
    const request = new Promise(resolve => {
      let finished = false
      let attempts = 0
      const scripts = []
      const timers = []
      const finish = (statistics, error) => {
        if (finished) return
        finished = true
        timers.forEach(clearTimeout)
        scripts.forEach(({ script, callback }) => {
          script.remove()
          // Ignore a response already in flight after cancellation.
          window[callback] = () => {}
          setTimeout(() => { delete window[callback] }, 60000)
        })
        if (!statistics) pages.delete(key)
        else {
          const updated = new Date().toISOString()
          writeCache('site', { site_uv: statistics.site_uv, site_pv: statistics.site_pv, updated })
          writeCache(key, { page_pv: statistics.page_pv, updated })
        }
        resolve({ statistics, error })
      }
      const attempt = () => {
        attempts++
        const callback = 'eulerBusuanzi_' + Date.now() + '_' + Math.random().toString(36).slice(2)
        const script = document.createElement('script')
        scripts.push({ script, callback })
        let failed = false
        const failure = error => {
          if (finished || failed) return
          failed = true
          clearTimeout(timer)
          // A slow first response may still succeed while the retry is pending.
          if (attempts < 2) timers.push(setTimeout(attempt, 1500))
          else finish(null, error)
        }
        window[callback] = statistics => {
          const valid = statistics && fields.every(field => validNumber(statistics[field]))
          if (valid) finish(statistics)
          else failure('统计服务返回的数据异常')
        }
        script.async = true
        // Match the original client: full referrers distinguish article views.
        script.referrerPolicy = 'no-referrer-when-downgrade'
        script.src = 'https://busuanzi.ibruce.info/busuanzi?jsonpCallback=' + callback
        script.onerror = () => failure('统计服务连接失败或被浏览器拦截')
        const timer = setTimeout(() => failure('统计服务连接超时'), 30000)
        timers.push(timer)
        document.head.appendChild(script)
      }
      // Register the in-flight request before any callbacks can run.
      timers.push(setTimeout(attempt, 0))
    })
    pages.set(key, request)
    request.then(render)
  }
  load()
})()
