(() => {
  const canonicalElement = document.querySelector('link[rel="canonical"]')
  const canonicalUrl = canonicalElement
    ? new URL(canonicalElement.href, window.location.origin)
    : new URL(window.location.href)

  canonicalUrl.search = ''
  canonicalUrl.hash = ''

  if (window.eulerLastCountedPage === canonicalUrl.href) return
  window.eulerLastCountedPage = canonicalUrl.href

  fetch('https://cdn.busuanzi.cc/api.php', {
    method: 'POST',
    body: JSON.stringify({
      url: canonicalUrl.href,
      referrer: document.referrer
    })
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Page view request failed: ${response.status}`)
      }
      return response.json()
    })
    .then(statistics => {
      Object.entries(statistics).forEach(([key, value]) => {
        const element = document.getElementById(key)
        if (element) element.textContent = String(value)
      })
    })
    .catch(() => {
      ;['busuanzi_page_pv', 'busuanzi_site_pv', 'busuanzi_site_uv'].forEach(id => {
        const element = document.getElementById(id)
        if (element) element.textContent = '—'
      })
    })
})()
