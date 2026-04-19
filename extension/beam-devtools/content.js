const MAX_LOG_ENTRIES = 50
const PAGE_SOURCE = 'beam-devtools-page'
const EXTENSION_SOURCE = 'beam-devtools-extension'
const PORT_MAP_STORAGE_KEY = 'beamDevtoolsPortMap'
const DEFAULT_LOCALHOST_NGO_SLUG = 'home'
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0'])

const consoleLogs = []
let latestDevtoolsConfig = null
let latestFirebaseUser = null
let latestPageDebug = null
let pendingContextResolver = null

installPageBridge()

window.addEventListener('message', (event) => {
  if (event.source !== window || !event.data || event.data.source !== PAGE_SOURCE) {
    return
  }

  if (event.data.type === 'PAGE_CONTEXT_BRIDGE') {
    latestDevtoolsConfig = event.data.devtoolsConfig ?? null
    latestFirebaseUser = event.data.firebaseUser ?? null
    latestPageDebug = event.data.pageDebug ?? null

    if (pendingContextResolver) {
      pendingContextResolver({
        devtoolsConfig: latestDevtoolsConfig,
        firebaseUser: latestFirebaseUser,
        pageDebug: latestPageDebug,
      })
      pendingContextResolver = null
    }

    return
  }

  if (event.data.type === 'CONSOLE_LOG') {
    pushConsoleLog(event.data)
  }
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== 'object') {
    return false
  }

  if (message.type === 'GET_CONTEXT') {
    getPageContext()
      .then(async (context) => {
        const ngoSlug = await resolveNgoSlug(window.location.href)
        sendResponse({
          type: 'PAGE_CONTEXT',
          ngoSlug,
          url: window.location.href,
          pathname: window.location.pathname,
          search: window.location.search,
          title: document.title,
          devtoolsConfig: context?.devtoolsConfig ?? latestDevtoolsConfig,
          firebaseUser: context?.firebaseUser ?? latestFirebaseUser,
          pageDebug: context?.pageDebug ?? latestPageDebug,
          timestamp: new Date().toISOString(),
        })
      })
      .catch(async () => {
        const ngoSlug = await resolveNgoSlug(window.location.href)
        sendResponse({
          type: 'PAGE_CONTEXT',
          ngoSlug,
          url: window.location.href,
          pathname: window.location.pathname,
          search: window.location.search,
          title: document.title,
          devtoolsConfig: latestDevtoolsConfig,
          firebaseUser: latestFirebaseUser,
          pageDebug: latestPageDebug,
          timestamp: new Date().toISOString(),
        })
      })

    return true
  }

  if (message.type === 'GET_LOGS') {
    sendResponse({
      type: 'LOGS',
      logs: [...consoleLogs].reverse(),
    })
    return false
  }

  return false
})

function installPageBridge() {
  if (document.documentElement.dataset.beamDevtoolsBridgeInstalled === 'true') {
    return
  }

  document.documentElement.dataset.beamDevtoolsBridgeInstalled = 'true'

  const script = document.createElement('script')
  script.src = chrome.runtime.getURL('page-bridge.js')
  script.async = false
  script.onload = () => script.remove()

  ;(document.head || document.documentElement).appendChild(script)
}

function getPageContext() {
  return new Promise((resolve) => {
    const timeoutId = window.setTimeout(() => {
      if (pendingContextResolver) {
        pendingContextResolver = null
      }

      resolve({
        devtoolsConfig: latestDevtoolsConfig,
        firebaseUser: latestFirebaseUser,
        pageDebug: latestPageDebug,
      })
    }, 300)

    pendingContextResolver = (context) => {
      window.clearTimeout(timeoutId)
      resolve(context)
    }

    window.postMessage(
      {
        source: EXTENSION_SOURCE,
        type: 'REQUEST_CONTEXT',
      },
      '*'
    )
  })
}

function pushConsoleLog(entry) {
  if (!entry || typeof entry.message !== 'string') {
    return
  }

  consoleLogs.push({
    type: 'CONSOLE_LOG',
    level: entry.level === 'error' ? 'error' : 'warn',
    message: entry.message,
    timestamp: entry.timestamp || new Date().toISOString(),
  })

  if (consoleLogs.length > MAX_LOG_ENTRIES) {
    consoleLogs.splice(0, consoleLogs.length - MAX_LOG_ENTRIES)
  }
}

async function resolveNgoSlug(url) {
  try {
    const parsed = new URL(url)

    if (LOCAL_HOSTNAMES.has(parsed.hostname)) {
      const result = await chrome.storage.local.get(PORT_MAP_STORAGE_KEY)
      const rawPortMap = result[PORT_MAP_STORAGE_KEY]
      const mappedSlug =
        rawPortMap && typeof rawPortMap === 'object' ? normalizeNgoSlug(rawPortMap[parsed.port]) : ''

      return mappedSlug || DEFAULT_LOCALHOST_NGO_SLUG
    }

    if (parsed.hostname.endsWith('.beamthinktank.space')) {
      return normalizeNgoSlug(parsed.hostname.split('.')[0]) || DEFAULT_LOCALHOST_NGO_SLUG
    }
  } catch {
    // Ignore invalid URLs and fall back to the repo default slug.
  }

  return DEFAULT_LOCALHOST_NGO_SLUG
}

function normalizeNgoSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}
