const FIREBASE_CONFIG_STORAGE_KEY = 'beamDevtoolsFirebaseConfig'
const PORT_MAP_STORAGE_KEY = 'beamDevtoolsPortMap'
const DRIVE_FOLDERS_STORAGE_KEY = 'beamDevtoolsDriveFolders'
const DEFAULT_LOCALHOST_NGO_SLUG = 'home'
const TAB_NAMES = ['checklist', 'context', 'console', 'drive']
const REQUIRED_FIREBASE_KEYS = [
  'NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_API_KEY',
  'NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_APP_ID',
]
const OPTIONAL_FIREBASE_KEYS = [
  'NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_MESSAGING_SENDER_ID',
]
const LEGACY_FIREBASE_KEY_MAP = {
  NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_API_KEY: 'NEXT_PUBLIC_FIREBASE_API_KEY',
  NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_PROJECT_ID: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_AUTH_DOMAIN: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_APP_ID: 'NEXT_PUBLIC_FIREBASE_APP_ID',
  NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_STORAGE_BUCKET: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_MESSAGING_SENDER_ID: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
}
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0'])
const BUILD_CONFIG = window.__BEAM_EXTENSION_BUILD_CONFIG__ || {}
const BUILD_FIREBASE_CONFIG = sanitizeStoredConfig(BUILD_CONFIG.firebaseConfig || {})
const BUILD_META = BUILD_CONFIG.meta || {}

let firebaseAppInstance = null
let firestoreDb = null
let checklistUnsubscribe = null
let currentChecklistSessionId = DEFAULT_LOCALHOST_NGO_SLUG
let currentChecklistItems = []
let currentContext = null
let currentNgoContext = createNgoContext(DEFAULT_LOCALHOST_NGO_SLUG)
let consoleEntries = []
let consoleRefreshTimer = null
let editingNoteItemId = null
let portMap = {}
let driveFolders = []
let currentDriveFolder = null

const elements = {
  ngoEyebrow: document.getElementById('ngoEyebrow'),
  ngoDocLabel: document.getElementById('ngoDocLabel'),
  syncStatus: document.getElementById('syncStatus'),
  tabButtons: [...document.querySelectorAll('[data-tab]')],
  panels: [...document.querySelectorAll('[data-panel]')],
  portMapForm: document.getElementById('portMapForm'),
  portMapPortInput: document.getElementById('portMapPortInput'),
  portMapNgoInput: document.getElementById('portMapNgoInput'),
  portMapStatus: document.getElementById('portMapStatus'),
  portMapList: document.getElementById('portMapList'),
  setupCard: document.getElementById('setupCard'),
  setupForm: document.getElementById('setupForm'),
  setupMessage: document.getElementById('setupMessage'),
  checklistContent: document.getElementById('checklistContent'),
  checklistGroups: document.getElementById('checklistGroups'),
  checklistRouteLabel: document.getElementById('checklistRouteLabel'),
  checklistContextStatus: document.getElementById('checklistContextStatus'),
  pendingCount: document.getElementById('pendingCount'),
  addItemForm: document.getElementById('addItemForm'),
  newItemInput: document.getElementById('newItemInput'),
  refreshChecklistContextButton: document.getElementById('refreshChecklistContextButton'),
  claudeImportForm: document.getElementById('claudeImportForm'),
  claudeImportInput: document.getElementById('claudeImportInput'),
  claudeImportStatus: document.getElementById('claudeImportStatus'),
  refreshContextButton: document.getElementById('refreshContextButton'),
  copyClaudeButton: document.getElementById('copyClaudeButton'),
  contextStatus: document.getElementById('contextStatus'),
  contextNgo: document.getElementById('contextNgo'),
  contextUrl: document.getElementById('contextUrl'),
  contextRoute: document.getElementById('contextRoute'),
  contextAuth: document.getElementById('contextAuth'),
  contextTimestamp: document.getElementById('contextTimestamp'),
  contextDebug: document.getElementById('contextDebug'),
  refreshConsoleButton: document.getElementById('refreshConsoleButton'),
  clearConsoleButton: document.getElementById('clearConsoleButton'),
  consoleStatus: document.getElementById('consoleStatus'),
  consoleList: document.getElementById('consoleList'),
  refreshDriveFolderButton: document.getElementById('refreshDriveFolderButton'),
  captureDriveFolderButton: document.getElementById('captureDriveFolderButton'),
  driveFolderStatus: document.getElementById('driveFolderStatus'),
  driveActiveFolderLabel: document.getElementById('driveActiveFolderLabel'),
  driveCurrentFolderMeta: document.getElementById('driveCurrentFolderMeta'),
  driveFolderForm: document.getElementById('driveFolderForm'),
  driveFolderNameInput: document.getElementById('driveFolderNameInput'),
  driveFolderUrlInput: document.getElementById('driveFolderUrlInput'),
  driveFolderList: document.getElementById('driveFolderList'),
}

bootstrap()

async function bootstrap() {
  bindEvents()
  portMap = await getStoredPortMap()
  driveFolders = await getStoredDriveFolders()
  renderNgoContext()
  renderPortMap()
  renderDriveFolders()
  await syncNgoStateFromActiveTab()
  await refreshDriveFolderContext({ silent: true })
  renderContext()
  renderChecklistComposerContext()
  renderConsole(consoleEntries)

  const storedConfig = await getStoredFirebaseConfig()
  const buildConfig = await hydrateFirebaseConfigFromBuild(storedConfig)
  const resolvedConfig = await hydrateFirebaseConfigFromActiveTab(buildConfig)
  populateSetupForm(resolvedConfig)

  if (!hasRequiredFirebaseConfig(resolvedConfig)) {
    showSetupCard()
    setSyncStatus('Setup required', 'warning')
    setSetupMessage(
      BUILD_META.detectedEnvFile
        ? `No usable Firebase config was detected in ${BUILD_META.detectedEnvFile}. Enter the values below or load them from an active Home tab.`
        : 'Run `npm run build:extension` to auto-detect .env.local, or enter the Firebase values below.'
    )
    return
  }

  await connectFirestore(resolvedConfig)
}

function bindEvents() {
  elements.tabButtons.forEach((button) => {
    button.addEventListener('click', () => setActiveTab(button.dataset.tab))
  })

  elements.portMapForm.addEventListener('submit', handlePortMapSubmit)
  elements.setupForm.addEventListener('submit', handleSetupSubmit)
  elements.addItemForm.addEventListener('submit', handleAddItem)
  elements.refreshChecklistContextButton.addEventListener('click', () => refreshChecklistRouteContext())
  elements.claudeImportForm.addEventListener('submit', handleClaudeImport)
  elements.refreshContextButton.addEventListener('click', refreshContext)
  elements.copyClaudeButton.addEventListener('click', copyContextForClaude)
  elements.refreshConsoleButton.addEventListener('click', refreshConsole)
  elements.clearConsoleButton.addEventListener('click', clearConsoleView)
  elements.refreshDriveFolderButton.addEventListener('click', () => refreshDriveFolderContext())
  elements.captureDriveFolderButton.addEventListener('click', handleCaptureDriveFolder)
  elements.driveFolderForm.addEventListener('submit', handleDriveFolderSubmit)
}

function setActiveTab(tabName) {
  if (!TAB_NAMES.includes(tabName)) {
    return
  }

  elements.tabButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.tab === tabName)
  })

  elements.panels.forEach((panel) => {
    panel.classList.toggle('is-active', panel.dataset.panel === tabName)
  })

  if (tabName === 'console') {
    startConsoleRefresh()
  } else {
    stopConsoleRefresh()
  }

  if (tabName === 'checklist') {
    refreshChecklistRouteContext({ silent: true })
  }

  if (tabName === 'context' && !currentContext) {
    refreshContext()
  }

  if (tabName === 'drive') {
    refreshDriveFolderContext({ silent: true })
  }
}

async function handlePortMapSubmit(event) {
  event.preventDefault()

  const port = String(elements.portMapPortInput.value || '').trim()
  const ngoSlug = normalizeNgoSlug(elements.portMapNgoInput.value)

  if (!/^\d{2,5}$/.test(port)) {
    setPortMapStatus('Enter a valid localhost port, for example `3001`.')
    return
  }

  if (!ngoSlug) {
    setPortMapStatus('Enter a site slug, for example `home`.')
    return
  }

  portMap = {
    ...portMap,
    [port]: ngoSlug,
  }

  await chrome.storage.local.set({
    [PORT_MAP_STORAGE_KEY]: portMap,
  })

  elements.portMapPortInput.value = ''
  elements.portMapNgoInput.value = ''
  renderPortMap()
  setPortMapStatus(`Saved localhost:${port} -> ${ngoSlug}.`)
  await syncNgoStateFromActiveTab({ resubscribe: true })
}

async function handleSetupSubmit(event) {
  event.preventDefault()
  setSetupMessage('Connecting to Firestore...')

  const formData = new FormData(elements.setupForm)
  const config = {}

  ;[...REQUIRED_FIREBASE_KEYS, ...OPTIONAL_FIREBASE_KEYS].forEach((key) => {
    config[key] = String(formData.get(key) || '').trim()
  })

  if (!hasRequiredFirebaseConfig(config)) {
    setSetupMessage('All required Firebase fields must be filled in.')
    return
  }

  await chrome.storage.local.set({
    [FIREBASE_CONFIG_STORAGE_KEY]: config,
  })

  await connectFirestore(config)
  setSetupMessage('Connected to Firestore.')
}

async function hydrateFirebaseConfigFromBuild(storedConfig) {
  if (hasRequiredFirebaseConfig(storedConfig)) {
    return storedConfig
  }

  const mergedConfig = mergeStoredConfig(storedConfig, BUILD_FIREBASE_CONFIG)

  if (!hasRequiredFirebaseConfig(mergedConfig)) {
    return storedConfig
  }

  await chrome.storage.local.set({
    [FIREBASE_CONFIG_STORAGE_KEY]: mergedConfig,
  })

  setSetupMessage(
    BUILD_META.detectedEnvFile
      ? `Loaded Firebase config from ${BUILD_META.detectedEnvFile} during the extension build.`
      : 'Loaded Firebase config from the extension build.'
  )

  return mergedConfig
}

async function connectFirestore(storedConfig) {
  if (typeof firebase === 'undefined') {
    showSetupCard()
    setSyncStatus('Firebase unavailable', 'error')
    setSetupMessage('Firebase scripts failed to load in the sidebar.')
    return
  }

  const firebaseConfig = toFirebaseConfig(storedConfig)

  try {
    if (!firebaseAppInstance) {
      const existingApp = firebase.apps.find((app) => app.name === 'beam-devtools')
      firebaseAppInstance = existingApp || firebase.initializeApp(firebaseConfig, 'beam-devtools')
    }

    firestoreDb = firebaseAppInstance.firestore()

    await syncNgoStateFromActiveTab({ resubscribe: true })
    hideSetupCard()
    refreshChecklistRouteContext({ silent: true })
    setSyncStatus('Connected', 'ready')
  } catch (error) {
    console.error('Failed to initialize Firestore:', error)
    showSetupCard()
    setSyncStatus('Connection failed', 'error')
    setSetupMessage(`Firestore connection failed: ${error.message || 'Unknown error'}`)
  }
}

async function hydrateFirebaseConfigFromActiveTab(storedConfig) {
  if (hasRequiredFirebaseConfig(storedConfig)) {
    return storedConfig
  }

  try {
    currentContext = await fetchActivePageContext()
    renderContext()
    renderChecklistComposerContext()
    setChecklistContextStatus(currentContext)

    const contextConfig = mergeStoredConfig(storedConfig, sanitizeStoredConfig(currentContext?.devtoolsConfig || {}))

    if (!hasRequiredFirebaseConfig(contextConfig)) {
      return storedConfig
    }

    await chrome.storage.local.set({
      [FIREBASE_CONFIG_STORAGE_KEY]: contextConfig,
    })

    setSetupMessage('Loaded Firebase config from the active Home tab.')
    return contextConfig
  } catch {
    return storedConfig
  }
}

async function ensureChecklistDocument() {
  if (!firestoreDb) {
    return
  }

  const checklistRef = getChecklistRef()
  const snapshot = await checklistRef.get()

  if (snapshot.exists) {
    return
  }

  await checklistRef.set({
    items: [],
    lastUpdatedBy: getUpdaterId(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  })
}

function subscribeToChecklist() {
  if (!firestoreDb) {
    return
  }

  if (checklistUnsubscribe) {
    checklistUnsubscribe()
  }

  currentChecklistItems = []
  renderChecklist()

  checklistUnsubscribe = getChecklistRef().onSnapshot(
    (snapshot) => {
      const data = snapshot.data() || {}
      currentChecklistItems = Array.isArray(data.items) ? data.items : []
      renderChecklist()
      setSyncStatus('Synced', 'ready')
    },
    (error) => {
      console.error('Checklist snapshot failed:', error)
      setSyncStatus('Sync error', 'error')
    }
  )
}

async function handleAddItem(event) {
  event.preventDefault()

  if (!firestoreDb) {
    showSetupCard()
    return
  }

  const text = elements.newItemInput.value.trim()

  if (!text) {
    return
  }

  const pageContext = await getChecklistPageContext()
  const item = buildChecklistItem({
    text,
    pageContext,
  })

  await getChecklistRef().set(
    {
      items: firebase.firestore.FieldValue.arrayUnion(item),
      lastUpdatedBy: getUpdaterId(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  )

  elements.newItemInput.value = ''
  setChecklistContextStatus(pageContext)
}

async function handleClaudeImport(event) {
  event.preventDefault()

  if (!firestoreDb) {
    showSetupCard()
    return
  }

  const rawText = elements.claudeImportInput.value.trim()

  if (!rawText) {
    setClaudeImportStatus('Paste checklist items from Claude first.')
    return
  }

  setClaudeImportStatus('Importing checklist items...')

  const pageContext = await getChecklistPageContext()
  const items = parseClaudeImport(rawText, pageContext)

  if (!items.length) {
    setClaudeImportStatus('No checklist items were found in that paste.')
    return
  }

  await getChecklistRef().set(
    {
      items: firebase.firestore.FieldValue.arrayUnion(...items),
      lastUpdatedBy: getUpdaterId(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  )

  elements.claudeImportInput.value = ''
  setChecklistContextStatus(pageContext)
  setClaudeImportStatus(`Imported ${items.length} item${items.length === 1 ? '' : 's'} into the shared checklist.`)
}

function renderChecklist() {
  elements.pendingCount.textContent = String(getPendingItemCount())

  if (!currentChecklistItems.length) {
    elements.checklistGroups.innerHTML = `
      <div class="empty-state">
        No checklist items yet. Add one below to start the shared session checklist.
      </div>
    `
    return
  }

  const groups = groupChecklistItems(currentChecklistItems)

  elements.checklistGroups.innerHTML = groups
    .map(([groupName, items]) => {
      return `
        <section class="group-card">
          <div class="group-header">
            <h3>${escapeHtml(groupName)}</h3>
            <span class="group-count">${items.length} item${items.length === 1 ? '' : 's'}</span>
          </div>
          <div class="item-list">
            ${items.map(renderChecklistItem).join('')}
          </div>
        </section>
      `
    })
    .join('')

  attachChecklistItemEvents()
}

function renderChecklistItem(item) {
  const note = typeof item.note === 'string' ? item.note : ''
  const badge = badgeValueForItem(item)
  const priority = priorityValueForItem(item)
  const isEditing = editingNoteItemId === item.id
  const routeContext =
    typeof item.contextPath === 'string' && item.contextPath.trim() && item.contextPath !== item.group
      ? item.contextPath.trim()
      : ''

  return `
    <article class="checklist-item ${item.done ? 'is-done' : ''}" data-item-id="${escapeHtml(item.id)}">
      <div class="item-main">
        <input data-action="toggle-item" type="checkbox" ${item.done ? 'checked' : ''} />
        <div class="item-copy">
          <div class="item-title-row">
            <span class="priority-dot priority-${escapeHtml(priority)}" aria-hidden="true"></span>
            <p class="item-text">${escapeHtml(item.text || 'Untitled item')}</p>
            <span class="badge badge-${escapeHtml(badge)}">${escapeHtml(badge)}</span>
          </div>
          ${routeContext ? `<p class="item-context">From ${escapeHtml(routeContext)}</p>` : ''}
          ${note ? `<p class="item-note">${escapeHtml(note)}</p>` : ''}
          <div class="item-actions">
            <button class="link-button" data-action="edit-note" type="button">${note ? 'Edit note' : 'Add note'}</button>
          </div>
          ${
            isEditing
              ? `<div class="note-editor">
                  <input
                    data-action="note-input"
                    type="text"
                    maxlength="300"
                    value="${escapeHtmlAttribute(note)}"
                    placeholder="Add note"
                  />
                </div>`
              : ''
          }
        </div>
      </div>
    </article>
  `
}

function attachChecklistItemEvents() {
  elements.checklistGroups.querySelectorAll('[data-action="toggle-item"]').forEach((checkbox) => {
    checkbox.addEventListener('change', async (event) => {
      const item = getChecklistItemFromEvent(event)

      if (!item) {
        return
      }

      const nextItem = sanitizeChecklistItem({
        ...item,
        done: event.currentTarget.checked,
        badge: event.currentTarget.checked ? 'done' : item.badge === 'done' ? 'todo' : badgeValueForItem(item),
        updatedAt: new Date().toISOString(),
      })

      await replaceChecklistItem(item, nextItem)
    })
  })

  elements.checklistGroups.querySelectorAll('[data-action="edit-note"]').forEach((button) => {
    button.addEventListener('click', (event) => {
      const item = getChecklistItemFromEvent(event)

      if (!item) {
        return
      }

      editingNoteItemId = item.id
      renderChecklist()

      window.setTimeout(() => {
        const input = elements.checklistGroups.querySelector('[data-action="note-input"]')

        if (input) {
          input.focus()
          input.select()
        }
      }, 0)
    })
  })

  elements.checklistGroups.querySelectorAll('[data-action="note-input"]').forEach((input) => {
    const save = async () => {
      const item = findChecklistItem(editingNoteItemId)

      if (!item) {
        editingNoteItemId = null
        renderChecklist()
        return
      }

      const nextItem = sanitizeChecklistItem({
        ...item,
        note: input.value.trim(),
        updatedAt: new Date().toISOString(),
      })

      editingNoteItemId = null
      renderChecklist()
      await replaceChecklistItem(item, nextItem)
    }

    input.addEventListener('blur', save, { once: true })

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        input.blur()
        return
      }

      if (event.key === 'Escape') {
        editingNoteItemId = null
        renderChecklist()
      }
    })
  })
}

async function replaceChecklistItem(previousItem, nextItem) {
  if (!firestoreDb) {
    return
  }

    setSyncStatus('Saving...', 'warning')

  await getChecklistRef().update({
    items: firebase.firestore.FieldValue.arrayRemove(previousItem),
  })

  await getChecklistRef().set(
    {
      items: firebase.firestore.FieldValue.arrayUnion(nextItem),
      lastUpdatedBy: getUpdaterId(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  )
}

async function fetchActivePageContext() {
  const response = await sendMessageToActiveTab({ type: 'GET_CONTEXT' })

  if (!response || response.type !== 'PAGE_CONTEXT') {
    throw new Error('BEAM page context was not available on the active tab.')
  }

  await syncNgoStateFromPageContext(response, { resubscribe: true })
  return response
}

async function getChecklistPageContext() {
  try {
    currentContext = await fetchActivePageContext()
    renderContext()
    renderChecklistComposerContext()
    return currentContext
  } catch (error) {
    renderChecklistComposerContext()
    elements.checklistContextStatus.textContent = error.message || 'Open a BEAM tab to use route-aware checklist items.'
    return currentContext
  }
}

async function refreshChecklistRouteContext(options = {}) {
  const { silent = false } = options

  if (!silent) {
    elements.checklistContextStatus.textContent = 'Refreshing current BEAM route...'
  }

  const pageContext = await getChecklistPageContext()

  if (!silent) {
    setChecklistContextStatus(pageContext)
  }
}

function setChecklistContextStatus(pageContext) {
  const group = deriveChecklistGroup(pageContext)

  if (!group) {
    elements.checklistContextStatus.textContent = 'Open a BEAM tab to use route-aware checklist items.'
    return
  }

  elements.checklistContextStatus.textContent = `New checklist items will be grouped under ${group} in ${currentNgoContext.displayName}.`
}

async function refreshContext() {
  elements.contextStatus.textContent = 'Refreshing active tab context...'

  try {
    currentContext = await fetchActivePageContext()
    renderContext()
    renderChecklistComposerContext()
    setChecklistContextStatus(currentContext)
    elements.contextStatus.textContent = 'Context synced from the active tab.'
  } catch (error) {
    currentContext = null
    renderContext()
    renderChecklistComposerContext()
    setChecklistContextStatus(null)
    elements.contextStatus.textContent = error.message || 'Open a BEAM tab and try again.'
  }
}

function renderContext() {
  elements.contextNgo.value = currentContext?.ngoSlug || currentNgoContext.slug || '-'
  elements.contextUrl.value = currentContext?.url || '-'
  elements.contextRoute.value = currentContext?.pathname || '-'
  elements.contextAuth.value = currentContext?.firebaseUser?.email || 'not signed in'
  elements.contextTimestamp.value = currentContext?.timestamp || '-'
  elements.contextDebug.value = currentContext?.pageDebug
    ? JSON.stringify(currentContext.pageDebug, null, 2)
    : '-'
}

function renderChecklistComposerContext() {
  const group = deriveChecklistGroup(currentContext)

  elements.checklistRouteLabel.textContent = group || 'No BEAM page selected'
  elements.newItemInput.placeholder = group
    ? `Add checklist item for ${group} (${currentNgoContext.slug})`
    : `Add checklist item for ${currentNgoContext.slug}`
}

async function copyContextForClaude() {
  if (!currentContext) {
    await refreshContext()
  }

  if (!currentContext) {
    elements.contextStatus.textContent = 'No BEAM context is available to copy.'
    return
  }

  if (!consoleEntries.length) {
    await refreshConsole()
  }

  const block = [
    '---',
    `BEAM dev context — ${currentContext.timestamp}`,
    `NGO: ${currentContext.ngoSlug || currentNgoContext.slug}`,
    `URL: ${currentContext.url}`,
    `Route: ${currentContext.pathname}`,
    `Auth: ${currentContext.firebaseUser?.email || 'not signed in'}`,
    `Page debug: ${currentContext.pageDebug ? JSON.stringify(currentContext.pageDebug) : 'none'}`,
    `Open checklist items: ${getPendingItemCount()} items pending`,
    `Recent errors: ${consoleEntries.filter((entry) => entry.level === 'error').length}`,
    '---',
  ].join('\n')

  await navigator.clipboard.writeText(block)
  elements.contextStatus.textContent = 'Context copied to clipboard.'
}

async function refreshConsole() {
  elements.consoleStatus.textContent = 'Refreshing console logs...'

  try {
    const response = await sendMessageToActiveTab({ type: 'GET_LOGS' })
    consoleEntries = Array.isArray(response?.logs) ? response.logs.slice(0, 50) : []
    renderConsole(consoleEntries)
    elements.consoleStatus.textContent = `Showing ${consoleEntries.length} captured log${consoleEntries.length === 1 ? '' : 's'}.`
  } catch (error) {
    consoleEntries = []
    renderConsole(consoleEntries)
    elements.consoleStatus.textContent = error.message || 'Open a BEAM tab and try again.'
  }
}

function renderConsole(entries) {
  if (!entries.length) {
    elements.consoleList.innerHTML = `
      <div class="empty-state">
        No captured warnings or errors yet.
      </div>
    `
    return
  }

  elements.consoleList.innerHTML = entries
    .map((entry) => {
      const level = entry.level === 'error' ? 'ERROR' : 'WARN'

      return `
        <article class="log-entry">
          <div class="log-meta">
            <span>${escapeHtml(formatTime(entry.timestamp))}</span>
            <span class="log-level ${escapeHtml(entry.level)}">${escapeHtml(level)}</span>
          </div>
          <pre class="log-message">${escapeHtml(entry.message || '')}</pre>
        </article>
      `
    })
    .join('')
}

function clearConsoleView() {
  renderConsole([])
  elements.consoleStatus.textContent = 'Cleared local console view. Source logs remain on the page.'
}

function startConsoleRefresh() {
  stopConsoleRefresh()
  refreshConsole()
  consoleRefreshTimer = window.setInterval(refreshConsole, 10000)
}

function stopConsoleRefresh() {
  if (consoleRefreshTimer) {
    window.clearInterval(consoleRefreshTimer)
    consoleRefreshTimer = null
  }
}

async function refreshDriveFolderContext(options = {}) {
  const { silent = false } = options

  if (!silent) {
    setDriveFolderStatus('Checking the active Google Drive tab...')
  }

  currentDriveFolder = await getActiveDriveFolderContext()
  renderDriveFolderContext()

  if (currentDriveFolder) {
    if (!silent) {
      setDriveFolderStatus(`Active folder: ${currentDriveFolder.name}.`)
    }
    return
  }

  if (!silent) {
    setDriveFolderStatus('Open a Google Drive folder tab to capture or switch folders.')
  }
}

function renderDriveFolderContext() {
  elements.driveActiveFolderLabel.textContent = currentDriveFolder?.name || 'No Google Drive folder selected'
  elements.driveCurrentFolderMeta.textContent = currentDriveFolder
    ? `${currentDriveFolder.url} (folder ID: ${currentDriveFolder.folderId})`
    : 'Open a drive.google.com folder tab to capture the active folder.'

  renderDriveFolders()
}

async function getActiveDriveFolderContext() {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  })

  if (!tab || !tab.id || !tab.url) {
    return null
  }

  const normalizedFolder = normalizeDriveFolderInput(tab.url)

  if (!normalizedFolder) {
    return null
  }

  const name = normalizeDriveFolderName(tab.title) || defaultDriveFolderLabel(normalizedFolder.folderId)

  return {
    id: normalizedFolder.folderId,
    folderId: normalizedFolder.folderId,
    name,
    url: normalizedFolder.url,
    tabId: tab.id,
  }
}

async function handleCaptureDriveFolder() {
  const activeDriveFolder = await getActiveDriveFolderContext()

  if (!activeDriveFolder) {
    setDriveFolderStatus('Open a Google Drive folder first, then try Save current folder again.')
    return
  }

  await upsertDriveFolder(activeDriveFolder)
  renderDriveFolderContext()
  setDriveFolderStatus(`Saved ${activeDriveFolder.name}.`)
}

async function handleDriveFolderSubmit(event) {
  event.preventDefault()

  const name = normalizeDriveFolderName(elements.driveFolderNameInput.value)
  const normalizedFolder = normalizeDriveFolderInput(elements.driveFolderUrlInput.value)

  if (!normalizedFolder) {
    setDriveFolderStatus('Enter a Google Drive folder URL or a raw folder ID.')
    return
  }

  await upsertDriveFolder({
    id: normalizedFolder.folderId,
    folderId: normalizedFolder.folderId,
    name: name || defaultDriveFolderLabel(normalizedFolder.folderId),
    url: normalizedFolder.url,
  })

  elements.driveFolderNameInput.value = ''
  elements.driveFolderUrlInput.value = ''
  renderDriveFolderContext()
  setDriveFolderStatus('Saved Google Drive folder.')
}

async function upsertDriveFolder(folder) {
  const normalizedFolder = {
    id: folder.id || folder.folderId || createId(),
    folderId: folder.folderId,
    name: normalizeDriveFolderName(folder.name) || defaultDriveFolderLabel(folder.folderId),
    url: folder.url,
  }

  driveFolders = sortDriveFolders([
    normalizedFolder,
    ...driveFolders.filter((entry) => entry.folderId !== normalizedFolder.folderId),
  ])

  await chrome.storage.local.set({
    [DRIVE_FOLDERS_STORAGE_KEY]: driveFolders,
  })

  renderDriveFolders()
}

function renderDriveFolders() {
  if (!driveFolders.length) {
    elements.driveFolderList.innerHTML = `
      <div class="empty-state">
        No Google Drive folders saved yet. Capture the current folder or add one manually.
      </div>
    `
    return
  }

  elements.driveFolderList.innerHTML = driveFolders
    .map((folder) => renderDriveFolder(folder))
    .join('')

  elements.driveFolderList.querySelectorAll('[data-action="switch-drive-folder"]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      const folder = findDriveFolder(event.currentTarget.dataset.folderId)

      if (!folder) {
        return
      }

      const [tab] = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true,
      })

      if (tab?.id) {
        await chrome.tabs.update(tab.id, { url: folder.url })
      } else {
        await chrome.tabs.create({ url: folder.url })
      }

      currentDriveFolder = folder
      renderDriveFolderContext()
      setDriveFolderStatus(`Switched the active tab to ${folder.name}.`)
    })
  })

  elements.driveFolderList.querySelectorAll('[data-action="open-drive-folder"]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      const folder = findDriveFolder(event.currentTarget.dataset.folderId)

      if (!folder) {
        return
      }

      await chrome.tabs.create({ url: folder.url })
      setDriveFolderStatus(`Opened ${folder.name} in a new tab.`)
    })
  })

  elements.driveFolderList.querySelectorAll('[data-action="delete-drive-folder"]').forEach((button) => {
    button.addEventListener('click', async (event) => {
      const folderId = event.currentTarget.dataset.folderId
      const folder = findDriveFolder(folderId)

      if (!folder) {
        return
      }

      driveFolders = driveFolders.filter((entry) => entry.folderId !== folderId)

      await chrome.storage.local.set({
        [DRIVE_FOLDERS_STORAGE_KEY]: driveFolders,
      })

      if (currentDriveFolder?.folderId === folderId) {
        currentDriveFolder = null
      }

      renderDriveFolderContext()
      setDriveFolderStatus(`Removed ${folder.name}.`)
    })
  })
}

function renderDriveFolder(folder) {
  const isActive = folder.folderId === currentDriveFolder?.folderId

  return `
    <article class="drive-folder-card ${isActive ? 'is-active' : ''}">
      <div class="drive-folder-header">
        <div>
          <span class="section-label">Saved folder</span>
          <h3>${escapeHtml(folder.name)}</h3>
        </div>
        ${isActive ? '<span class="status-pill">Active</span>' : ''}
      </div>
      <p class="drive-folder-meta">${escapeHtml(folder.url)}</p>
      <p class="drive-folder-meta">Folder ID: ${escapeHtml(folder.folderId)}</p>
      <div class="drive-folder-actions">
        <button class="primary-button" data-action="switch-drive-folder" data-folder-id="${escapeHtmlAttribute(folder.folderId)}" type="button">
          Switch current
        </button>
        <button class="secondary-button" data-action="open-drive-folder" data-folder-id="${escapeHtmlAttribute(folder.folderId)}" type="button">
          Open new
        </button>
        <button class="secondary-button" data-action="delete-drive-folder" data-folder-id="${escapeHtmlAttribute(folder.folderId)}" type="button">
          Remove
        </button>
      </div>
    </article>
  `
}

function findDriveFolder(folderId) {
  return driveFolders.find((folder) => folder.folderId === folderId) || null
}

function setDriveFolderStatus(message) {
  elements.driveFolderStatus.textContent = message
}

async function sendMessageToActiveTab(message) {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  })

  if (!tab || !tab.id) {
    throw new Error('No active tab is available.')
  }

  try {
    return await chrome.tabs.sendMessage(tab.id, message)
  } catch {
    throw new Error('Open BEAM Home on localhost:3000, localhost:3001, beamthinktank.space, or home.beamthinktank.space.')
  }
}

async function getStoredFirebaseConfig() {
  const result = await chrome.storage.local.get(FIREBASE_CONFIG_STORAGE_KEY)
  return sanitizeStoredConfig(result[FIREBASE_CONFIG_STORAGE_KEY] || {})
}

async function getStoredPortMap() {
  const result = await chrome.storage.local.get(PORT_MAP_STORAGE_KEY)
  return sanitizePortMap(result[PORT_MAP_STORAGE_KEY] || {})
}

async function getStoredDriveFolders() {
  const result = await chrome.storage.local.get(DRIVE_FOLDERS_STORAGE_KEY)
  return sanitizeDriveFolders(result[DRIVE_FOLDERS_STORAGE_KEY] || [])
}

function sanitizeStoredConfig(rawConfig) {
  const nextConfig = {}

  ;[...REQUIRED_FIREBASE_KEYS, ...OPTIONAL_FIREBASE_KEYS].forEach((key) => {
    const legacyKey = LEGACY_FIREBASE_KEY_MAP[key]
    nextConfig[key] = String(rawConfig[key] || rawConfig[legacyKey] || '').trim()
  })

  return nextConfig
}

function mergeStoredConfig(primaryConfig, secondaryConfig) {
  const mergedConfig = {}

  ;[...REQUIRED_FIREBASE_KEYS, ...OPTIONAL_FIREBASE_KEYS].forEach((key) => {
    mergedConfig[key] = String(primaryConfig[key] || secondaryConfig[key] || '').trim()
  })

  return mergedConfig
}

function hasRequiredFirebaseConfig(config) {
  return REQUIRED_FIREBASE_KEYS.every((key) => Boolean(config[key]))
}

function toFirebaseConfig(config) {
  return {
    apiKey: config.NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_API_KEY,
    authDomain: config.NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_AUTH_DOMAIN,
    projectId: config.NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_PROJECT_ID,
    appId: config.NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_APP_ID,
    storageBucket: config.NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_STORAGE_BUCKET || undefined,
    messagingSenderId: config.NEXT_PUBLIC_BEAM_DEVTOOLS_FIREBASE_MESSAGING_SENDER_ID || undefined,
  }
}

function populateSetupForm(config) {
  ;[...REQUIRED_FIREBASE_KEYS, ...OPTIONAL_FIREBASE_KEYS].forEach((key) => {
    const input = elements.setupForm.elements.namedItem(key)

    if (input) {
      input.value = config[key] || ''
    }
  })
}

function showSetupCard() {
  elements.setupCard.classList.remove('hidden')
  elements.checklistContent.classList.add('hidden')
}

function hideSetupCard() {
  elements.setupCard.classList.add('hidden')
  elements.checklistContent.classList.remove('hidden')
}

function setSetupMessage(message) {
  elements.setupMessage.textContent = message
}

function setSyncStatus(text, tone) {
  elements.syncStatus.textContent = text
  elements.syncStatus.dataset.tone = tone
}

function getChecklistRef() {
  return firestoreDb.collection('devChecklists').doc(currentChecklistSessionId)
}

async function syncNgoStateFromActiveTab(options = {}) {
  const [tab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true,
  })

  return syncNgoStateFromUrl(tab?.url || '', options)
}

async function syncNgoStateFromPageContext(pageContext, options = {}) {
  return syncNgoStateFromUrl(pageContext?.url || '', options, pageContext?.ngoSlug)
}

async function syncNgoStateFromUrl(url, options = {}, preferredSlug) {
  const nextNgoContext = await resolveNgoContextFromUrl(url, preferredSlug)
  const ngoChanged = nextNgoContext.slug !== currentNgoContext.slug

  currentNgoContext = nextNgoContext
  renderNgoContext()
  renderContext()
  renderChecklistComposerContext()

  if (!options.resubscribe || !firestoreDb) {
    return currentNgoContext
  }

  if (!ngoChanged && checklistUnsubscribe) {
    return currentNgoContext
  }

  currentChecklistSessionId = currentNgoContext.slug
  await ensureChecklistDocument()
  subscribeToChecklist()
  return currentNgoContext
}

function renderNgoContext() {
  elements.ngoEyebrow.textContent = currentNgoContext.displayName
  elements.ngoDocLabel.textContent = `Checklist: devChecklists/${currentNgoContext.slug}`
}

function renderPortMap() {
  const entries = Object.entries(portMap).sort(([left], [right]) => Number(left) - Number(right))

  if (!entries.length) {
    elements.portMapList.innerHTML = `
      <div class="mapping-chip">No localhost overrides saved. This repo defaults to ${escapeHtml(DEFAULT_LOCALHOST_NGO_SLUG)}.</div>
    `
    return
  }

  elements.portMapList.innerHTML = entries
    .map(([port, slug]) => `<div class="mapping-chip">localhost:${escapeHtml(port)} -> ${escapeHtml(slug)}</div>`)
    .join('')
}

function setPortMapStatus(message) {
  elements.portMapStatus.textContent = message
}

async function resolveNgoContextFromUrl(url, preferredSlug) {
  const normalizedSlug = normalizeNgoSlug(preferredSlug)

  if (normalizedSlug) {
    return createNgoContext(normalizedSlug)
  }

  try {
    const parsed = new URL(url)

    if (LOCAL_HOSTNAMES.has(parsed.hostname)) {
      const mappedSlug = normalizeNgoSlug(portMap[parsed.port]) || DEFAULT_LOCALHOST_NGO_SLUG
      return createNgoContext(mappedSlug)
    }

    if (parsed.hostname.endsWith('.beamthinktank.space')) {
      const slug = normalizeNgoSlug(parsed.hostname.split('.')[0])
      if (slug) {
        return createNgoContext(slug)
      }
    }
  } catch {
    // Ignore invalid or empty tab URLs and fall back to the repo default.
  }

  return createNgoContext(DEFAULT_LOCALHOST_NGO_SLUG)
}

function createNgoContext(slug) {
  const normalizedSlug = normalizeNgoSlug(slug) || DEFAULT_LOCALHOST_NGO_SLUG

  return {
    slug: normalizedSlug,
    displayName: `BEAM ${titleCaseNgoSlug(normalizedSlug)}`,
  }
}

function sanitizePortMap(rawPortMap) {
  if (!rawPortMap || typeof rawPortMap !== 'object') {
    return {}
  }

  return Object.entries(rawPortMap).reduce((nextMap, [port, slug]) => {
    if (!/^\d{2,5}$/.test(port)) {
      return nextMap
    }

    const normalizedSlug = normalizeNgoSlug(slug)

    if (normalizedSlug) {
      nextMap[port] = normalizedSlug
    }

    return nextMap
  }, {})
}

function sanitizeDriveFolders(rawFolders) {
  if (!Array.isArray(rawFolders)) {
    return []
  }

  const nextFolders = []
  const seenFolderIds = new Set()

  rawFolders.forEach((folder) => {
    const normalizedFolder = normalizeDriveFolderInput(folder?.url || folder?.folderId || '')

    if (!normalizedFolder || seenFolderIds.has(normalizedFolder.folderId)) {
      return
    }

    seenFolderIds.add(normalizedFolder.folderId)
    nextFolders.push({
      id: String(folder?.id || normalizedFolder.folderId),
      folderId: normalizedFolder.folderId,
      name: normalizeDriveFolderName(folder?.name) || defaultDriveFolderLabel(normalizedFolder.folderId),
      url: normalizedFolder.url,
    })
  })

  return sortDriveFolders(nextFolders)
}

function normalizeNgoSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}

function titleCaseNgoSlug(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

function normalizeDriveFolderInput(value) {
  const trimmedValue = String(value || '').trim()

  if (!trimmedValue) {
    return null
  }

  if (/^[A-Za-z0-9_-]{10,}$/.test(trimmedValue) && !trimmedValue.includes('/')) {
    return {
      folderId: trimmedValue,
      url: `https://drive.google.com/drive/folders/${trimmedValue}`,
    }
  }

  try {
    const parsed = new URL(trimmedValue)

    if (parsed.hostname !== 'drive.google.com') {
      return null
    }

    const folderMatch = parsed.pathname.match(/^\/drive\/folders\/([^/?#]+)/)
    const folderId = folderMatch?.[1] || parsed.searchParams.get('id')?.trim() || ''

    if (!folderId) {
      return null
    }

    return {
      folderId,
      url: `https://drive.google.com/drive/folders/${folderId}`,
    }
  } catch {
    return null
  }
}

function normalizeDriveFolderName(value) {
  return String(value || '')
    .replace(/\s+-\s+Google Drive$/i, '')
    .trim()
}

function defaultDriveFolderLabel(folderId) {
  return `Drive ${folderId.slice(0, 8)}`
}

function sortDriveFolders(folders) {
  return [...folders].sort((left, right) => left.name.localeCompare(right.name))
}

function getPendingItemCount() {
  return currentChecklistItems.filter((item) => !item.done).length
}

function deriveChecklistGroup(pageContext) {
  const pathname = typeof pageContext?.pathname === 'string' ? pageContext.pathname.trim() : ''

  if (!pathname) {
    return ''
  }

  return pathname === '/' ? 'Home' : pathname
}

function buildChecklistItem({ text, done = false, group, note = '', pageContext }) {
  return sanitizeChecklistItem({
    id: createId(),
    text,
    note,
    done,
    badge: done ? 'done' : 'todo',
    priority: 'gray',
    group: typeof group === 'string' ? group : deriveChecklistGroup(pageContext),
    updatedAt: new Date().toISOString(),
    contextPath: pageContext?.pathname || '',
    contextTitle: pageContext?.title || '',
    contextUrl: pageContext?.url || '',
  })
}

function parseClaudeImport(rawText, pageContext) {
  const defaultGroup = deriveChecklistGroup(pageContext)
  let currentGroup = defaultGroup

  return rawText.split(/\r?\n/).reduce((items, line) => {
    const trimmed = line.trim()

    if (!trimmed || shouldIgnoreClaudeLine(trimmed)) {
      return items
    }

    if (isChecklistSectionHeader(trimmed)) {
      currentGroup = trimmed.replace(/:$/, '').trim() || defaultGroup
      return items
    }

    const parsedLine = parseChecklistLine(trimmed)

    if (!parsedLine) {
      return items
    }

    items.push(
      buildChecklistItem({
        text: parsedLine.text,
        done: parsedLine.done,
        group: currentGroup,
        pageContext,
      })
    )

    return items
  }, [])
}

function parseChecklistLine(line) {
  let normalized = line
  let done = false

  const checkboxMatch = normalized.match(/^(?:[-*•]\s*)?\[(x|X| )\]\s*(.+)$/)

  if (checkboxMatch) {
    done = checkboxMatch[1].toLowerCase() === 'x'
    normalized = checkboxMatch[2]
  } else {
    normalized = normalized.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, '')
  }

  normalized = normalized.trim()

  if (!normalized) {
    return null
  }

  return {
    text: normalized,
    done,
  }
}

function shouldIgnoreClaudeLine(line) {
  return (
    line === '---' ||
    line.startsWith('```') ||
    /^(BEAM dev context|NGO:|URL:|Route:|Auth:|Open checklist items:|Recent errors:)/i.test(line)
  )
}

function isChecklistSectionHeader(line) {
  if (!line.endsWith(':')) {
    return false
  }

  if (/^(?:[-*•]|\d+\.)/.test(line)) {
    return false
  }

  const normalized = line.replace(/:$/, '').trim().toLowerCase()

  return !['checklist', 'checklist items', 'tasks', 'to do', 'todo', 'action items'].includes(normalized)
}

function groupChecklistItems(items) {
  const groups = new Map()

  items.forEach((item) => {
    const groupName = (typeof item.group === 'string' && item.group.trim()) || 'Uncategorized'

    if (!groups.has(groupName)) {
      groups.set(groupName, [])
    }

    groups.get(groupName).push(item)
  })

  return [...groups.entries()]
}

function findChecklistItem(itemId) {
  return currentChecklistItems.find((item) => item.id === itemId) || null
}

function getChecklistItemFromEvent(event) {
  const article = event.currentTarget.closest('[data-item-id]')

  if (!article) {
    return null
  }

  return findChecklistItem(article.dataset.itemId)
}

function badgeValueForItem(item) {
  return item.badge || (item.done ? 'done' : 'todo')
}

function priorityValueForItem(item) {
  const priority = item.priority || 'gray'
  return ['red', 'amber', 'gray'].includes(priority) ? priority : 'gray'
}

function sanitizeChecklistItem(item) {
  const nextItem = {
    id: item.id,
    text: item.text,
    done: Boolean(item.done),
    badge: badgeValueForItem(item),
    priority: priorityValueForItem(item),
    group: typeof item.group === 'string' ? item.group : '',
    updatedAt: item.updatedAt || new Date().toISOString(),
  }

  if (typeof item.note === 'string' && item.note.trim()) {
    nextItem.note = item.note.trim()
  }

  if (typeof item.contextPath === 'string' && item.contextPath.trim()) {
    nextItem.contextPath = item.contextPath.trim()
  }

  if (typeof item.contextTitle === 'string' && item.contextTitle.trim()) {
    nextItem.contextTitle = item.contextTitle.trim()
  }

  if (typeof item.contextUrl === 'string' && item.contextUrl.trim()) {
    nextItem.contextUrl = item.contextUrl.trim()
  }

  return nextItem
}

function setClaudeImportStatus(message) {
  elements.claudeImportStatus.textContent = message
}

function getUpdaterId() {
  return `beam-devtools:${chrome.runtime.id}`
}

function createId() {
  if (crypto && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `item-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
}

function formatTime(isoString) {
  const date = isoString ? new Date(isoString) : new Date()

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function escapeHtmlAttribute(value) {
  return escapeHtml(value).replaceAll('`', '&#96;')
}
