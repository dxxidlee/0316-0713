import './style.css'

const TBODY_ID = 'archive-body'

/** @type {Array<{ id: number, type: string, title: string, source: string, year?: string, dateAdded?: string, dateCreated?: string | null, [key: string]: unknown }>} */
let allEntries = []

/** @type {string} */
let currentFilter = 'default'

/** @type {boolean} */
let expandedAllActive = false

const FILTER_LABELS = {
  'default': 'Default',
  'title': 'Title',
  'date-added': 'Date Added',
  'date-created': 'Date Created',
  'text': 'Text',
  'audio': 'Audio',
  'photo-video': 'Photo/Video'
}

const ICON_PLAY = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>'
const ICON_PAUSE = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>'
const ICON_SKIP_BACK = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z"/></svg>'
const ICON_SKIP_FORWARD = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M6 6v12l8.5-6L6 6zM16 6h2v12h-2V6z"/></svg>'
const ICON_TRIANGLE_LEFT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M15 4l-8 8 8 8V4z"/></svg>'
const ICON_TRIANGLE_RIGHT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9 4l8 8-8 8V4z"/></svg>'

/**
 * Zero-pad row number for display (01, 02, ... 99, 100+)
 */
function padRowNum(index) {
  const n = index + 1
  return n < 100 ? String(n).padStart(2, '0') : String(n)
}

/**
 * Display type label: text -> Text, audio -> Audio, etc.
 */
function formatType(type) {
  if (!type) return ''
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()
}

/**
 * Render table body from entries array. Row numbers are 1-based and zero-padded.
 */
function renderTable(entries) {
  const tbody = document.getElementById(TBODY_ID)
  if (!tbody) return

  tbody.innerHTML = entries
    .map((entry, index) => {
      const rowNum = padRowNum(index)
      const typeLabel = formatType(entry.type)
      const year = entry.year != null ? String(entry.year) : ''
      return `<tr class="archive-row" data-id="${entry.id}" data-type="${entry.type}">
        <td class="col-num"><span class="col-num-value">${rowNum}</span><span class="col-num-arrows" aria-hidden="true"><span class="col-num-arrow"></span><span class="col-num-arrow"></span><span class="col-num-arrow"></span></span></td>
        <td class="col-title">${escapeHtml(entry.title || '')}</td>
        <td class="col-source">${escapeHtml(entry.source || '')}</td>
        <td class="col-year">${escapeHtml(year)}</td>
        <td class="col-type">${escapeHtml(typeLabel)}</td>
      </tr>`
    })
    .join('')
}

function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

/**
 * Apply current filter/sort to allEntries and return array to display.
 * Re-indexing (01, 02, ...) is done in renderTable.
 */
function applyFilter(entries, filterValue) {
  let list = [...entries]

  // Type filter
  if (filterValue === 'text') {
    list = list.filter(e => (e.type || '').toLowerCase() === 'text')
  } else if (filterValue === 'audio') {
    list = list.filter(e => (e.type || '').toLowerCase() === 'audio')
  } else if (filterValue === 'photo-video') {
    list = list.filter(e => {
      const t = (e.type || '').toLowerCase()
      return t === 'photo' || t === 'video'
    })
  }

  // Sort
  if (filterValue === 'title') {
    list.sort((a, b) => (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' }))
  } else if (filterValue === 'date-added') {
    list.sort((a, b) => (a.dateAdded || '').localeCompare(b.dateAdded || ''))
  } else if (filterValue === 'date-created') {
    list.sort((a, b) => {
      const da = a.dateCreated || ''
      const db = b.dateCreated || ''
      return da.localeCompare(db)
    })
  }
  // default: keep original order (already a copy of allEntries)

  return list
}

function updateFilterUI(filterValue) {
  const currentEl = document.querySelector('.filter-current')
  const options = document.querySelectorAll('.filter-option')
  if (currentEl) currentEl.textContent = FILTER_LABELS[filterValue] || 'Default'
  const optionArray = Array.from(options)
  const activeIndex = optionArray.findIndex(el => el.getAttribute('data-filter') === filterValue)
  options.forEach(el => {
    const value = el.getAttribute('data-filter')
    const index = optionArray.indexOf(el)
    const isActive = value === filterValue
    el.classList.toggle('active', isActive)
    el.classList.toggle('covered', activeIndex >= 0 && index <= activeIndex)
  })
}

/**
 * Apply search query to a list: keep entries where title or source matches (case-insensitive substring).
 * Empty/whitespace query returns the list unchanged.
 */
function applySearch(entries, query) {
  const q = (query || '').trim().toLowerCase()
  if (!q) return entries
  return entries.filter(e => {
    const title = (e.title || '').toLowerCase()
    const source = (e.source || '').toLowerCase()
    return title.includes(q) || source.includes(q)
  })
}

function applyFilterAndRender() {
  if (expandedAllActive) {
    renderExpandedAll()
    return
  }
  let list = applyFilter(allEntries, currentFilter)
  const searchInput = document.getElementById('search-input')
  const query = searchInput ? searchInput.value : ''
  list = applySearch(list, query)
  renderTable(list)
}

function setupFilterListeners() {
  document.querySelectorAll('.filter-option').forEach(el => {
    el.addEventListener('click', () => {
      const value = el.getAttribute('data-filter')
      if (!value) return
      currentFilter = value
      updateFilterUI(currentFilter)
      applyFilterAndRender()
    })
  })
}

function setupSearchListener() {
  const searchInput = document.getElementById('search-input')
  if (!searchInput) return
  searchInput.addEventListener('input', () => applyFilterAndRender())
}

/**
 * Expand (Steps 6–9): one row/lightbox at a time. Text/audio/video inline; photo = lightbox.
 */
function closePhotoLightbox() {
  const el = document.getElementById('photo-lightbox')
  if (el) el.remove()
  document.removeEventListener('keydown', photoLightboxEscHandler)
}

function photoLightboxEscHandler(e) {
  if (e.key === 'Escape') closePhotoLightbox()
  const overlay = document.getElementById('photo-lightbox')
  if (!overlay || !overlay.dataset.slideshow) return
  if (e.key === 'ArrowLeft') overlay.dispatchEvent(new CustomEvent('photo-lightbox-prev'))
  if (e.key === 'ArrowRight') overlay.dispatchEvent(new CustomEvent('photo-lightbox-next'))
}

function closeVideoLightbox() {
  const el = document.getElementById('video-lightbox')
  if (el) {
    const v = el.querySelector('.video-lightbox-el')
    if (v) v.pause()
    el.remove()
  }
  document.removeEventListener('keydown', videoLightboxEscHandler)
}

function videoLightboxEscHandler(e) {
  if (e.key === 'Escape') closeVideoLightbox()
}

function collapseAllExpanded() {
  const tbody = document.getElementById(TBODY_ID)
  if (tbody) {
    tbody.querySelectorAll('.expand-row').forEach(row => row.remove())
    tbody.querySelectorAll('.archive-row.active').forEach(row => row.classList.remove('active'))
  }
  closePhotoLightbox()
  closeVideoLightbox()
}

/** Get the archive row that was clicked (or that owns the expanded content). */
function getArchiveRowFromClick(target) {
  const row = target.closest('tr')
  if (!row) return null
  if (row.classList.contains('expand-row')) {
    const prev = row.previousElementSibling
    return prev && prev.classList.contains('archive-row') ? prev : null
  }
  if (row.classList.contains('archive-row')) return row
  return null
}

/** Measure archive row and first arrow; set --expand-pull so expand content top aligns with first arrow top. */
function applyExpandPull(expandRow) {
  // Mobile uses normal document flow for expanded rows.
  // Desktop pull-up alignment causes overlap/clipping on small screens.
  if (window.matchMedia('(max-width: 768px)').matches) return

  const archiveRow = expandRow.previousElementSibling
  if (!archiveRow || !archiveRow.classList.contains('archive-row')) return
  const firstArrow = archiveRow.querySelector('.col-num-arrow')
  if (!firstArrow) return
  const expandContent = expandRow.querySelector('.expand-cell > *:first-child')
  if (!expandContent) return
  requestAnimationFrame(() => {
    const rowRect = archiveRow.getBoundingClientRect()
    const arrowRect = firstArrow.getBoundingClientRect()
    const pull = rowRect.bottom - arrowRect.top
    if (pull > 0) expandContent.style.setProperty('--expand-pull', `${pull}px`)
  })
}

function toggleTextExpand(archiveRow) {
  const isActive = archiveRow.classList.contains('active')
  collapseAllExpanded()
  if (isActive) return

  const id = parseInt(archiveRow.getAttribute('data-id'), 10)
  const entry = allEntries.find(e => e.id === id)
  if (!entry) return

  const description = entry.description || ''
  const url = entry.url || ''

  const expandCell = document.createElement('td')
  expandCell.colSpan = 5
  expandCell.className = 'expand-cell expand-cell--text'

  let html = ''
  if (description) html += `<p class="expand-description">${escapeHtml(description)}</p>`
  if (url) html += `<a href="${escapeHtml(url)}" class="expand-link" target="_blank" rel="noopener">${escapeHtml(url)}</a>`
  if (!html) html = '<p class="expand-description">No description or link.</p>'
  expandCell.innerHTML = `<div class="expand-text-inner">${html}</div>`

  const expandRow = document.createElement('tr')
  expandRow.className = 'expand-row'
  expandRow.setAttribute('data-expand-for', String(id))
  expandRow.appendChild(expandCell)
  archiveRow.after(expandRow)
  archiveRow.classList.add('active')
  applyExpandPull(expandRow)
}

/** Step 7 — Audio expand: thumbnail + custom player (no default controls), cyan scrubber. */
function toggleAudioExpand(archiveRow) {
  const isActive = archiveRow.classList.contains('active')
  collapseAllExpanded()
  if (isActive) return

  const id = parseInt(archiveRow.getAttribute('data-id'), 10)
  const entry = allEntries.find(e => e.id === id)
  if (!entry || (entry.type || '').toLowerCase() !== 'audio') return

  const file = entry.file || ''
  const thumb = entry.thumbnail || ''
  const desc = entry.description || ''

  const expandCell = document.createElement('td')
  expandCell.colSpan = 5
  expandCell.className = 'expand-cell expand-cell--audio'

  const thumbSrc = thumb ? escapeHtml(thumb) : ''
  const thumbHtml = thumbSrc
    ? `<img class="expand-audio-thumb" src="${thumbSrc}" alt="" />`
    : '<div class="expand-audio-thumb expand-audio-thumb--placeholder"></div>'

  expandCell.innerHTML = `
    <div class="expand-audio-inner">
      <div class="expand-audio-thumb-wrap">${thumbHtml}</div>
      <div class="expand-audio-player">
        <audio class="expand-audio-el" src="${escapeHtml(file)}" preload="metadata"></audio>
        <div class="expand-audio-controls">
          <button type="button" class="expand-audio-btn" data-action="back" title="Skip back">${ICON_SKIP_BACK}</button>
          <button type="button" class="expand-audio-btn expand-audio-btn--play" data-action="play" title="Play/Pause">${ICON_PLAY}</button>
          <button type="button" class="expand-audio-btn" data-action="forward" title="Skip forward">${ICON_SKIP_FORWARD}</button>
        </div>
        <div class="expand-audio-scrub-wrap">
          <input type="range" class="expand-audio-scrub" min="0" max="100" value="0" />
        </div>
        <div class="expand-audio-time">
          <span class="expand-audio-current">0:00</span>
          <span class="expand-audio-total">0:00</span>
        </div>
        ${desc ? `<p class="expand-audio-desc">${escapeHtml(desc)}</p>` : ''}
      </div>
    </div>
  `

  const expandRow = document.createElement('tr')
  expandRow.className = 'expand-row'
  expandRow.setAttribute('data-expand-for', String(id))
  expandRow.appendChild(expandCell)
  archiveRow.after(expandRow)
  archiveRow.classList.add('active')
  expandCell.addEventListener('click', (ev) => ev.stopPropagation())

  const audioEl = expandCell.querySelector('.expand-audio-el')
  const scrub = expandCell.querySelector('.expand-audio-scrub')
  const currentSpan = expandCell.querySelector('.expand-audio-current')
  const totalSpan = expandCell.querySelector('.expand-audio-total')
  const playBtn = expandCell.querySelector('.expand-audio-btn--play')

  function formatTime(s) {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  audioEl.addEventListener('loadedmetadata', () => {
    totalSpan.textContent = formatTime(audioEl.duration)
  })
  audioEl.addEventListener('timeupdate', () => {
    currentSpan.textContent = formatTime(audioEl.currentTime)
    if (audioEl.duration) {
      scrub.value = (100 * audioEl.currentTime) / audioEl.duration
      scrub.style.setProperty('--scrub-value', scrub.value + '%')
    }
  })
  audioEl.addEventListener('ended', () => {
    playBtn.innerHTML = ICON_PLAY
    scrub.value = 0
    scrub.style.setProperty('--scrub-value', '0%')
    currentSpan.textContent = '0:00'
  })

  scrub.addEventListener('input', () => {
    if (!audioEl.duration) return
    audioEl.currentTime = (scrub.value / 100) * audioEl.duration
    scrub.style.setProperty('--scrub-value', scrub.value + '%')
  })

  const startAudioPlay = () => {
    audioEl.play().then(() => { playBtn.innerHTML = ICON_PAUSE }).catch(() => {})
  }
  audioEl.addEventListener('canplay', startAudioPlay, { once: true })

  expandCell.querySelectorAll('.expand-audio-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const action = btn.getAttribute('data-action')
      if (action === 'play') {
        if (audioEl.paused) {
          audioEl.play()
          playBtn.innerHTML = ICON_PAUSE
        } else {
          audioEl.pause()
          playBtn.innerHTML = ICON_PLAY
        }
      } else if (action === 'back') audioEl.currentTime = Math.max(0, audioEl.currentTime - 10)
      else if (action === 'forward') audioEl.currentTime = Math.min(audioEl.duration || 0, audioEl.currentTime + 10)
    })
  })

  startAudioPlay()
}

/** Step 8 — Video expand: inline video + custom controls (cyan scrubber). */
function toggleVideoExpand(archiveRow) {
  const isActive = archiveRow.classList.contains('active')
  collapseAllExpanded()
  if (isActive) return

  const id = parseInt(archiveRow.getAttribute('data-id'), 10)
  const entry = allEntries.find(e => e.id === id)
  if (!entry || (entry.type || '').toLowerCase() !== 'video') return

  const file = entry.file || ''
  const caption = entry.caption || ''

  const expandCell = document.createElement('td')
  expandCell.colSpan = 5
  expandCell.className = 'expand-cell expand-cell--video'

  expandCell.innerHTML = `
    <div class="expand-video-wrap">
      <div class="expand-video-frame">
        <video class="expand-video-el" src="${escapeHtml(file)}" preload="metadata"></video>
        <div class="expand-video-controls">
          <span class="expand-video-controls-edge" aria-hidden="true"></span>
          <button type="button" class="expand-video-btn" data-action="back">${ICON_SKIP_BACK}</button>
          <button type="button" class="expand-video-btn expand-video-btn--play" data-action="play">${ICON_PLAY}</button>
          <button type="button" class="expand-video-btn" data-action="forward">${ICON_SKIP_FORWARD}</button>
          <div class="expand-video-scrub-wrap">
            <input type="range" class="expand-video-scrub" min="0" max="100" value="0" />
          </div>
          <span class="expand-video-current">0:00</span>
          <span class="expand-video-total">0:00</span>
          <span class="expand-video-controls-edge expand-video-controls-edge--right" aria-hidden="true"></span>
        </div>
      </div>
      ${caption ? `<p class="expand-video-caption">${escapeHtml(caption)}</p>` : ''}
    </div>
  `

  const expandRow = document.createElement('tr')
  expandRow.className = 'expand-row'
  expandRow.setAttribute('data-expand-for', String(id))
  expandRow.appendChild(expandCell)
  archiveRow.after(expandRow)
  archiveRow.classList.add('active')
  applyExpandPull(expandRow)
  expandCell.addEventListener('click', (ev) => ev.stopPropagation())

  const videoFrame = expandCell.querySelector('.expand-video-frame')
  videoFrame.addEventListener('click', () => {
    const tbody = document.getElementById(TBODY_ID)
    const expandRow = expandCell.closest('tr.expand-row')
    const forId = expandRow && expandRow.getAttribute('data-expand-for')
    const archiveRow = forId && tbody ? tbody.querySelector(`.archive-row[data-id="${forId}"]`) : null
    if (!archiveRow) return
    videoEl.pause()
    playBtn.innerHTML = ICON_PLAY
    expandRow.remove()
    archiveRow.classList.remove('active')
    openVideoLightbox(archiveRow)
  })

  const videoEl = expandCell.querySelector('.expand-video-el')
  videoEl.muted = false
  const scrub = expandCell.querySelector('.expand-video-scrub')
  const currentSpan = expandCell.querySelector('.expand-video-current')
  const totalSpan = expandCell.querySelector('.expand-video-total')
  const playBtn = expandCell.querySelector('.expand-video-btn--play')

  function formatTime(s) {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  videoEl.addEventListener('loadedmetadata', () => {
    totalSpan.textContent = formatTime(videoEl.duration)
    const w = videoEl.videoWidth
    const h = videoEl.videoHeight
    if (w && h) {
      const maxW = 640
      const maxH = 360
      const scale = Math.min(maxW / w, maxH / h, 1)
      const dw = Math.round(w * scale)
      const dh = Math.round(h * scale)
      videoFrame.style.width = dw + 'px'
      videoFrame.style.height = dh + 'px'
    }
  })
  const startInlinePlay = () => {
    videoEl.play().then(() => { playBtn.innerHTML = ICON_PAUSE }).catch(() => {})
  }
  videoEl.addEventListener('canplay', startInlinePlay, { once: true })
  videoEl.addEventListener('timeupdate', () => {
    currentSpan.textContent = formatTime(videoEl.currentTime)
    if (videoEl.duration) {
      scrub.value = (100 * videoEl.currentTime) / videoEl.duration
      scrub.style.setProperty('--scrub-value', scrub.value + '%')
    }
  })
  videoEl.addEventListener('ended', () => {
    playBtn.innerHTML = ICON_PLAY
  })

  scrub.addEventListener('input', () => {
    if (!videoEl.duration) return
    videoEl.currentTime = (scrub.value / 100) * videoEl.duration
    scrub.style.setProperty('--scrub-value', scrub.value + '%')
  })

  expandCell.querySelectorAll('.expand-video-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const action = btn.getAttribute('data-action')
      if (action === 'play') {
        if (videoEl.paused) {
          videoEl.play()
          playBtn.innerHTML = ICON_PAUSE
        } else {
          videoEl.pause()
          playBtn.innerHTML = ICON_PLAY
        }
      } else if (action === 'back') videoEl.currentTime = Math.max(0, videoEl.currentTime - 10)
      else if (action === 'forward') videoEl.currentTime = Math.min(videoEl.duration || 0, videoEl.currentTime + 10)
    })
  })

  const controlsEl = expandCell.querySelector('.expand-video-controls')
  let hideControlsTimer = null
  function scheduleHideControls() {
    if (hideControlsTimer) clearTimeout(hideControlsTimer)
    hideControlsTimer = setTimeout(() => {
      controlsEl.classList.add('expand-video-controls--hidden')
      hideControlsTimer = null
    }, 1000)
  }
  function showControls() {
    if (hideControlsTimer) {
      clearTimeout(hideControlsTimer)
      hideControlsTimer = null
    }
    controlsEl.classList.remove('expand-video-controls--hidden')
  }
  videoFrame.addEventListener('mouseenter', showControls)
  videoFrame.addEventListener('mouseleave', scheduleHideControls)
  scheduleHideControls()

  startInlinePlay()
}

/** Photo expand: side-by-side images; click an image to open lightbox (zoom). */
function togglePhotoExpand(archiveRow) {
  const isActive = archiveRow.classList.contains('active')
  collapseAllExpanded()
  if (isActive) return

  const id = parseInt(archiveRow.getAttribute('data-id'), 10)
  const entry = allEntries.find(e => e.id === id)
  if (!entry || (entry.type || '').toLowerCase() !== 'photo') return

  const files = Array.isArray(entry.files) && entry.files.length > 0
    ? entry.files
    : (entry.file ? [entry.file] : [])
  const caption = entry.caption || ''

  const expandCell = document.createElement('td')
  expandCell.colSpan = 5
  expandCell.className = 'expand-cell expand-cell--photo'

  const imagesHtml = files.map((src, i) =>
    `<div class="expand-photo-img-wrap"><img class="expand-photo-img" src="${escapeHtml(src)}" alt="${escapeHtml(entry.title || '')} ${i + 1}" data-photo-src="${escapeHtml(src)}" /></div>`
  ).join('')

  expandCell.innerHTML = `
    <div class="expand-photo-wrap">
      <div class="expand-photo-inner">
        ${imagesHtml}
      </div>
      ${caption ? `<p class="expand-photo-caption">${escapeHtml(caption)}</p>` : ''}
    </div>
  `

  const expandRow = document.createElement('tr')
  expandRow.className = 'expand-row'
  expandRow.setAttribute('data-expand-for', String(id))
  expandRow.appendChild(expandCell)
  archiveRow.after(expandRow)
  archiveRow.classList.add('active')
  expandCell.addEventListener('click', (ev) => ev.stopPropagation())

  expandCell.querySelectorAll('.expand-photo-img').forEach((img) => {
    img.addEventListener('click', () => {
      const tbody = document.getElementById(TBODY_ID)
      const forId = expandRow.getAttribute('data-expand-for')
      const row = forId && tbody ? tbody.querySelector(`.archive-row[data-id="${forId}"]`) : null
      if (!row) return
      openPhotoLightbox(row, img.getAttribute('data-photo-src') || img.src)
    })
  })
}

/** Step 9 — Photo lightbox: full-screen overlay, blur, rounded image, cyan border, caption, ESC/click outside. Multi-image = slideshow with prev/next. */
function openPhotoLightbox(archiveRow, imageSrc) {
  if (!imageSrc) collapseAllExpanded()

  const id = parseInt(archiveRow.getAttribute('data-id'), 10)
  const entry = allEntries.find(e => e.id === id)
  if (!entry || (entry.type || '').toLowerCase() !== 'photo') return

  const files = Array.isArray(entry.files) && entry.files.length > 0
    ? entry.files
    : (entry.file ? [entry.file] : [])
  const currentIndex = imageSrc ? Math.max(0, files.indexOf(imageSrc)) : 0
  const file = files[currentIndex] || imageSrc || entry.file || ''
  const caption = entry.caption || ''
  const isSlideshow = files.length > 1

  const overlay = document.createElement('div')
  overlay.id = 'photo-lightbox'
  overlay.className = 'photo-lightbox'
  if (isSlideshow) overlay.dataset.slideshow = '1'
  overlay.innerHTML = `
    <div class="photo-lightbox-backdrop" aria-hidden="true"></div>
    <div class="photo-lightbox-content">
      <div class="photo-lightbox-slide-wrap">
        ${isSlideshow ? `<button type="button" class="photo-lightbox-prev" aria-label="Previous image">${ICON_TRIANGLE_LEFT}</button>` : ''}
        <img class="photo-lightbox-img" src="${escapeHtml(file)}" alt="${escapeHtml(entry.title || '')}" />
        ${isSlideshow ? `<button type="button" class="photo-lightbox-next" aria-label="Next image">${ICON_TRIANGLE_RIGHT}</button>` : ''}
      </div>
      ${isSlideshow ? `<span class="photo-lightbox-counter" aria-live="polite">${currentIndex + 1} / ${files.length}</span>` : ''}
      ${caption ? `<p class="photo-lightbox-caption">${escapeHtml(caption)}</p>` : ''}
    </div>
  `

  overlay.querySelector('.photo-lightbox-backdrop').addEventListener('click', closePhotoLightbox)
  overlay.querySelector('.photo-lightbox-content').addEventListener('click', (e) => e.stopPropagation())
  overlay.querySelector('.photo-lightbox-img').addEventListener('click', (e) => e.stopPropagation())

  if (isSlideshow) {
    const imgEl = overlay.querySelector('.photo-lightbox-img')
    const counterEl = overlay.querySelector('.photo-lightbox-counter')
    let index = currentIndex

    function go(delta) {
      index = (index + delta + files.length) % files.length
      imgEl.src = files[index]
      imgEl.alt = `${entry.title || ''} ${index + 1}`
      if (counterEl) counterEl.textContent = `${index + 1} / ${files.length}`
    }

    overlay.addEventListener('photo-lightbox-prev', () => go(-1))
    overlay.addEventListener('photo-lightbox-next', () => go(1))
    overlay.querySelector('.photo-lightbox-prev')?.addEventListener('click', (e) => { e.stopPropagation(); go(-1) })
    overlay.querySelector('.photo-lightbox-next')?.addEventListener('click', (e) => { e.stopPropagation(); go(1) })
  }

  document.body.appendChild(overlay)
  document.addEventListener('keydown', photoLightboxEscHandler)
}

/** Video lightbox: same as photo (centered, enlarged, blur), with controls that hide after 3s no hover. */
function openVideoLightbox(archiveRow) {
  const id = parseInt(archiveRow.getAttribute('data-id'), 10)
  const entry = allEntries.find(e => e.id === id)
  if (!entry || (entry.type || '').toLowerCase() !== 'video') return

  const file = entry.file || ''
  const caption = entry.caption || ''

  const overlay = document.createElement('div')
  overlay.id = 'video-lightbox'
  overlay.className = 'video-lightbox'
  overlay.innerHTML = `
    <div class="video-lightbox-backdrop" aria-hidden="true"></div>
    <div class="video-lightbox-content">
      <div class="video-lightbox-inner">
        <video class="video-lightbox-el" src="${escapeHtml(file)}" preload="metadata"></video>
        <div class="expand-video-controls video-lightbox-controls">
          <span class="expand-video-controls-edge" aria-hidden="true"></span>
          <button type="button" class="expand-video-btn" data-action="back">${ICON_SKIP_BACK}</button>
          <button type="button" class="expand-video-btn expand-video-btn--play" data-action="play">${ICON_PLAY}</button>
          <button type="button" class="expand-video-btn" data-action="forward">${ICON_SKIP_FORWARD}</button>
          <div class="expand-video-scrub-wrap">
            <input type="range" class="expand-video-scrub" min="0" max="100" value="0" />
          </div>
          <span class="expand-video-current">0:00</span>
          <span class="expand-video-total">0:00</span>
          <span class="expand-video-controls-edge expand-video-controls-edge--right" aria-hidden="true"></span>
        </div>
      </div>
      ${caption ? `<p class="video-lightbox-caption">${escapeHtml(caption)}</p>` : ''}
    </div>
  `

  overlay.querySelector('.video-lightbox-backdrop').addEventListener('click', closeVideoLightbox)
  const content = overlay.querySelector('.video-lightbox-content')
  content.addEventListener('click', (e) => e.stopPropagation())

  const videoEl = overlay.querySelector('.video-lightbox-el')
  videoEl.muted = false
  const lightboxInner = overlay.querySelector('.video-lightbox-inner')
  const scrub = overlay.querySelector('.expand-video-scrub')
  const currentSpan = overlay.querySelector('.expand-video-current')
  const totalSpan = overlay.querySelector('.expand-video-total')
  const playBtn = overlay.querySelector('.expand-video-btn--play')
  const controlsEl = overlay.querySelector('.video-lightbox-controls')

  function formatTime(s) {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${String(sec).padStart(2, '0')}`
  }

  videoEl.addEventListener('loadedmetadata', () => {
    totalSpan.textContent = formatTime(videoEl.duration)
    const w = videoEl.videoWidth
    const h = videoEl.videoHeight
    if (w && h && lightboxInner) {
      const maxW = Math.min(window.innerWidth * 0.9, 900)
      const maxH = window.innerHeight * 0.85
      const scale = Math.min(maxW / w, maxH / h, 1)
      const dw = Math.round(w * scale)
      const dh = Math.round(h * scale)
      lightboxInner.style.width = dw + 'px'
      lightboxInner.style.height = dh + 'px'
    }
  })
  const startLightboxPlay = () => {
    videoEl.play().then(() => { playBtn.innerHTML = ICON_PAUSE }).catch(() => {})
  }
  videoEl.addEventListener('canplay', startLightboxPlay, { once: true })
  videoEl.addEventListener('timeupdate', () => {
    currentSpan.textContent = formatTime(videoEl.currentTime)
    if (videoEl.duration) {
      scrub.value = (100 * videoEl.currentTime) / videoEl.duration
      scrub.style.setProperty('--scrub-value', scrub.value + '%')
    }
  })
  videoEl.addEventListener('ended', () => {
    playBtn.innerHTML = ICON_PLAY
  })

  scrub.addEventListener('input', () => {
    if (!videoEl.duration) return
    videoEl.currentTime = (scrub.value / 100) * videoEl.duration
    scrub.style.setProperty('--scrub-value', scrub.value + '%')
  })

  overlay.querySelectorAll('.expand-video-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const action = btn.getAttribute('data-action')
      if (action === 'play') {
        if (videoEl.paused) {
          videoEl.play()
          playBtn.innerHTML = ICON_PAUSE
        } else {
          videoEl.pause()
          playBtn.innerHTML = ICON_PLAY
        }
      } else if (action === 'back') videoEl.currentTime = Math.max(0, videoEl.currentTime - 10)
      else if (action === 'forward') videoEl.currentTime = Math.min(videoEl.duration || 0, videoEl.currentTime + 10)
    })
  })

  let hideControlsTimer = null
  function scheduleHideControls() {
    if (hideControlsTimer) clearTimeout(hideControlsTimer)
    hideControlsTimer = setTimeout(() => {
      controlsEl.classList.add('expand-video-controls--hidden')
      hideControlsTimer = null
    }, 1000)
  }
  function showControls() {
    if (hideControlsTimer) {
      clearTimeout(hideControlsTimer)
      hideControlsTimer = null
    }
    controlsEl.classList.remove('expand-video-controls--hidden')
  }
  content.addEventListener('mouseenter', showControls)
  content.addEventListener('mouseleave', scheduleHideControls)
  scheduleHideControls()

  document.body.appendChild(overlay)
  document.addEventListener('keydown', videoLightboxEscHandler)

  startLightboxPlay()
}

function handleRowExpandClick(e) {
  if (e.target.closest('a.expand-link')) return
  const archiveRow = getArchiveRowFromClick(e.target)
  if (!archiveRow) return

  e.preventDefault()
  const type = (archiveRow.getAttribute('data-type') || '').toLowerCase()

  if (type === 'text') toggleTextExpand(archiveRow)
  else if (type === 'audio') toggleAudioExpand(archiveRow)
  else if (type === 'video') toggleVideoExpand(archiveRow)
  else if (type === 'photo') togglePhotoExpand(archiveRow)
}

function setupExpandListeners() {
  const tbody = document.getElementById(TBODY_ID)
  if (!tbody) return
  tbody.addEventListener('click', handleRowExpandClick)
}

/**
 * Load entries.json and render the table.
 */
async function loadAndRender() {
  try {
    const res = await fetch('/entries.json')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const entries = await res.json()
    if (!Array.isArray(entries)) throw new Error('entries.json is not an array')
    allEntries = entries
    currentFilter = 'default'
    updateFilterUI(currentFilter)
    applyFilterAndRender()
    setupFilterListeners()
    setupSearchListener()
    setupExpandListeners()
  } catch (err) {
    console.error('Failed to load entries:', err)
    const tbody = document.getElementById(TBODY_ID)
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="5" class="col-title">Could not load archive.</td></tr>'
    }
  }
}

function startLiveClock() {
  const clockEl = document.getElementById('live-clock')
  if (!clockEl) return

  function update() {
    const now = new Date()
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    clockEl.textContent = `${hours}:${minutes}:${seconds}`
  }

  update()
  setInterval(update, 1000)
}

/** Info overlay */
function closeInfoOverlay() {
  const el = document.getElementById('info-overlay')
  if (el) el.remove()
  document.querySelector('.sidebar-btn--info')?.classList.remove('active')
  document.removeEventListener('keydown', infoOverlayEscHandler)
}

function infoOverlayEscHandler(e) {
  if (e.key === 'Escape') closeInfoOverlay()
}

function openInfoOverlay() {
  if (document.getElementById('info-overlay')) { closeInfoOverlay(); return }
  document.querySelector('.sidebar-btn--info')?.classList.add('active')

  const overlay = document.createElement('div')
  overlay.id = 'info-overlay'
  overlay.className = 'info-overlay'
  overlay.innerHTML = `
    <div class="info-overlay-backdrop" aria-hidden="true"></div>
    <div class="info-overlay-content">
      <p class="info-overlay-text">0316*0713 is an archive for Nicole and myself. A birthday gift for Nicole's 21st birthday but also an archive that will grow and be edited through time and grow larger in size slowly.</p>
      <p class="info-overlay-text">Upload and delete function will come soon with a mobile compatible version.</p>
      <p class="info-overlay-text info-overlay-love">I love you and happy birthday Nicole.</p>
  </div>
`

  overlay.querySelector('.info-overlay-backdrop').addEventListener('click', closeInfoOverlay)
  overlay.querySelector('.info-overlay-content').addEventListener('click', (e) => e.stopPropagation())

  document.body.appendChild(overlay)
  document.addEventListener('keydown', infoOverlayEscHandler)
}

function setupInfoButton() {
  const btn = document.querySelector('.sidebar-btn--info')
  if (btn) btn.addEventListener('click', openInfoOverlay)
}

function setupViewButtons() {
  const listBtn = document.querySelector('.sidebar-btn--list')
  if (!listBtn) return
  listBtn.addEventListener('click', () => {
    if (expandedAllActive) closeExpandedAll()
    listBtn.classList.add('active')
    document.querySelector('.sidebar-btn--grid')?.classList.remove('active')
  })
}

/* ===== Expanded-all view ===== */

/** Build a single expanded-all card for one entry (no autoplay). */
function buildExpandedAllCard(entry, index) {
  const type = (entry.type || '').toLowerCase()
  const rowNum = padRowNum(index)

  const card = document.createElement('div')
  card.className = 'expanded-all-card'
  card.setAttribute('data-id', String(entry.id))

  let contentHtml = ''

  if (type === 'text') {
    const desc = entry.description || ''
    const url = entry.url || ''
    contentHtml = `<div class="expand-cell--text expand-text-inner">
      ${desc ? `<p class="expand-description">${escapeHtml(desc)}</p>` : ''}
      ${url ? `<a href="${escapeHtml(url)}" class="expand-link" target="_blank" rel="noopener">${escapeHtml(url)}</a>` : ''}
      ${!desc && !url ? '<p class="expand-description">No description or link.</p>' : ''}
    </div>`
  } else if (type === 'audio') {
    const file = entry.file || ''
    const thumb = entry.thumbnail || ''
    const thumbHtml = thumb
      ? `<img class="expand-audio-thumb" src="${escapeHtml(thumb)}" alt="" />`
      : '<div class="expand-audio-thumb expand-audio-thumb--placeholder"></div>'
    contentHtml = `<div class="expand-audio-inner">
      <div class="expand-audio-thumb-wrap">${thumbHtml}</div>
      <div class="expand-audio-player">
        <audio class="expanded-all-audio" src="${escapeHtml(file)}" preload="metadata"></audio>
        <div class="expand-audio-controls">
          <button type="button" class="expand-audio-btn" data-action="back">${ICON_SKIP_BACK}</button>
          <button type="button" class="expand-audio-btn expand-audio-btn--play" data-action="play">${ICON_PLAY}</button>
          <button type="button" class="expand-audio-btn" data-action="forward">${ICON_SKIP_FORWARD}</button>
        </div>
        <div class="expand-audio-scrub-wrap">
          <input type="range" class="expand-audio-scrub" min="0" max="100" value="0" />
        </div>
        <div class="expand-audio-time">
          <span class="expand-audio-current">0:00</span>
          <span class="expand-audio-total">0:00</span>
        </div>
      </div>
    </div>`
  } else if (type === 'video') {
    const file = entry.file || ''
    const caption = entry.caption || ''
    contentHtml = `<div class="expand-video-wrap">
      <div class="expand-video-frame expanded-all-video-frame">
        <video class="expand-video-el expanded-all-video" src="${escapeHtml(file)}" preload="metadata"></video>
        <div class="expand-video-controls">
          <span class="expand-video-controls-edge" aria-hidden="true"></span>
          <button type="button" class="expand-video-btn" data-action="back">${ICON_SKIP_BACK}</button>
          <button type="button" class="expand-video-btn expand-video-btn--play" data-action="play">${ICON_PLAY}</button>
          <button type="button" class="expand-video-btn" data-action="forward">${ICON_SKIP_FORWARD}</button>
          <div class="expand-video-scrub-wrap">
            <input type="range" class="expand-video-scrub" min="0" max="100" value="0" />
          </div>
          <span class="expand-video-current">0:00</span>
          <span class="expand-video-total">0:00</span>
          <span class="expand-video-controls-edge expand-video-controls-edge--right" aria-hidden="true"></span>
        </div>
      </div>
      ${caption ? `<p class="expand-video-caption">${escapeHtml(caption)}</p>` : ''}
    </div>`
  } else if (type === 'photo') {
    const files = Array.isArray(entry.files) && entry.files.length > 0
      ? entry.files : (entry.file ? [entry.file] : [])
    const caption = entry.caption || ''
    const imgsHtml = files.map((src, i) =>
      `<div class="expand-photo-img-wrap" data-photo-src="${escapeHtml(src)}"><img class="expand-photo-img" src="${escapeHtml(src)}" alt="${escapeHtml(entry.title || '')} ${i + 1}" /></div>`
    ).join('')
    contentHtml = `<div class="expand-photo-wrap">
      <div class="expand-photo-inner">${imgsHtml}</div>
      ${caption ? `<p class="expand-photo-caption">${escapeHtml(caption)}</p>` : ''}
    </div>`
  }

  card.innerHTML = `
    <div class="expanded-all-header">
      <span class="expanded-all-num">${rowNum}</span>
      <span class="expanded-all-title">${escapeHtml(entry.title || '')}</span>
      <span class="expanded-all-source">${escapeHtml(entry.source || '')}</span>
      <span class="expanded-all-year">${escapeHtml(entry.year ? String(entry.year) : '')}</span>
      <span class="expanded-all-type">${escapeHtml(formatType(entry.type))}</span>
    </div>
    <div class="expanded-all-body">${contentHtml}</div>
  `

  return card
}

/** Wire up audio controls on a card (no autoplay). */
function wireAudioCard(card) {
  const audioEl = card.querySelector('.expanded-all-audio')
  if (!audioEl) return
  const scrub = card.querySelector('.expand-audio-scrub')
  const currentSpan = card.querySelector('.expand-audio-current')
  const totalSpan = card.querySelector('.expand-audio-total')
  const playBtn = card.querySelector('.expand-audio-btn--play')

  function fmt(s) {
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  }
  audioEl.addEventListener('loadedmetadata', () => { totalSpan.textContent = fmt(audioEl.duration) })
  audioEl.addEventListener('timeupdate', () => {
    currentSpan.textContent = fmt(audioEl.currentTime)
    if (audioEl.duration) {
      scrub.value = (100 * audioEl.currentTime) / audioEl.duration
      scrub.style.setProperty('--scrub-value', scrub.value + '%')
    }
  })
  audioEl.addEventListener('ended', () => {
    playBtn.innerHTML = ICON_PLAY
    scrub.value = 0
    scrub.style.setProperty('--scrub-value', '0%')
    currentSpan.textContent = '0:00'
  })
  scrub.addEventListener('input', () => {
    if (!audioEl.duration) return
    audioEl.currentTime = (scrub.value / 100) * audioEl.duration
    scrub.style.setProperty('--scrub-value', scrub.value + '%')
  })
  card.querySelectorAll('.expand-audio-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const action = btn.getAttribute('data-action')
      if (action === 'play') {
        if (audioEl.paused) { audioEl.play(); playBtn.innerHTML = ICON_PAUSE }
        else { audioEl.pause(); playBtn.innerHTML = ICON_PLAY }
      } else if (action === 'back') audioEl.currentTime = Math.max(0, audioEl.currentTime - 10)
      else if (action === 'forward') audioEl.currentTime = Math.min(audioEl.duration || 0, audioEl.currentTime + 10)
    })
  })
}

/** Wire up video controls on a card (no autoplay). */
function wireVideoCard(card) {
  const videoEl = card.querySelector('.expanded-all-video')
  if (!videoEl) return
  videoEl.muted = false
  const frame = card.querySelector('.expanded-all-video-frame')
  const scrub = card.querySelector('.expand-video-scrub')
  const currentSpan = card.querySelector('.expand-video-current')
  const totalSpan = card.querySelector('.expand-video-total')
  const playBtn = card.querySelector('.expand-video-btn--play')
  const controlsEl = card.querySelector('.expand-video-controls')

  function fmt(s) {
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  }
  videoEl.addEventListener('loadedmetadata', () => {
    totalSpan.textContent = fmt(videoEl.duration)
    const w = videoEl.videoWidth, h = videoEl.videoHeight
    if (w && h && frame) {
      const maxW = 640, maxH = 360
      const scale = Math.min(maxW / w, maxH / h, 1)
      frame.style.width = Math.round(w * scale) + 'px'
      frame.style.height = Math.round(h * scale) + 'px'
    }
  })
  videoEl.addEventListener('timeupdate', () => {
    currentSpan.textContent = fmt(videoEl.currentTime)
    if (videoEl.duration) {
      scrub.value = (100 * videoEl.currentTime) / videoEl.duration
      scrub.style.setProperty('--scrub-value', scrub.value + '%')
    }
  })
  videoEl.addEventListener('ended', () => { playBtn.innerHTML = ICON_PLAY })
  scrub.addEventListener('input', () => {
    if (!videoEl.duration) return
    videoEl.currentTime = (scrub.value / 100) * videoEl.duration
    scrub.style.setProperty('--scrub-value', scrub.value + '%')
  })
  card.querySelectorAll('.expand-video-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const action = btn.getAttribute('data-action')
      if (action === 'play') {
        if (videoEl.paused) { videoEl.play(); playBtn.innerHTML = ICON_PAUSE }
        else { videoEl.pause(); playBtn.innerHTML = ICON_PLAY }
      } else if (action === 'back') videoEl.currentTime = Math.max(0, videoEl.currentTime - 10)
      else if (action === 'forward') videoEl.currentTime = Math.min(videoEl.duration || 0, videoEl.currentTime + 10)
    })
  })
  let hideTimer = null
  function scheduleHide() {
    if (hideTimer) clearTimeout(hideTimer)
    hideTimer = setTimeout(() => { controlsEl.classList.add('expand-video-controls--hidden'); hideTimer = null }, 1000)
  }
  function showControls() {
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
    controlsEl.classList.remove('expand-video-controls--hidden')
  }
  frame.addEventListener('mouseenter', showControls)
  frame.addEventListener('mouseleave', scheduleHide)
  scheduleHide()
}

/** Wire up photo click-to-zoom on a card. */
function wirePhotoCard(card, entry) {
  card.querySelectorAll('.expand-photo-img-wrap').forEach(wrap => {
    wrap.addEventListener('click', () => {
      const src = wrap.getAttribute('data-photo-src')
      const archiveTable = document.querySelector('.archive-table')
      const archiveRow = archiveTable && archiveTable.querySelector(`.archive-row[data-id="${entry.id}"]`)
      if (!archiveRow) return
      openPhotoLightbox(archiveRow, src)
    })
  })
}

function renderExpandedAll() {
  const page = document.querySelector('.page')
  const mainEl = document.querySelector('.main')
  if (!page || !mainEl) return

  mainEl.style.display = 'none'

  const existingContainer = document.getElementById('expanded-all-container')
  if (existingContainer) existingContainer.remove()

  const container = document.createElement('div')
  container.id = 'expanded-all-container'
  container.className = 'expanded-all-container'

  let list = applyFilter(allEntries, currentFilter)
  const searchInput = document.getElementById('search-input')
  if (searchInput && searchInput.value) list = applySearch(list, searchInput.value)

  list.forEach((entry, index) => {
    const card = buildExpandedAllCard(entry, index)
    const type = (entry.type || '').toLowerCase()
    if (type === 'audio') wireAudioCard(card)
    if (type === 'video') wireVideoCard(card)
    if (type === 'photo') wirePhotoCard(card, entry)
    container.appendChild(card)
  })

  page.appendChild(container)
}

function closeExpandedAll() {
  const container = document.getElementById('expanded-all-container')
  if (container) container.remove()
  const mainEl = document.querySelector('.main')
  if (mainEl) mainEl.style.display = ''
  expandedAllActive = false
  document.querySelector('.sidebar-btn--grid')?.classList.remove('active')
  document.querySelector('.sidebar-btn--list')?.classList.add('active')
}

function setupExpandedAllButton() {
  const btn = document.querySelector('.sidebar-btn--grid')
  if (!btn) return
  btn.addEventListener('click', () => {
    if (expandedAllActive) {
      closeExpandedAll()
    } else {
      collapseAllExpanded()
      document.querySelector('.sidebar-btn--list')?.classList.remove('active')
      btn.classList.add('active')
      expandedAllActive = true
      renderExpandedAll()
    }
  })
}

/* ===== Upload ===== */
const UPLOAD_PASSWORD = 'nyangmong2026'
let uploadUnlocked = false

function closeUploadModal() {
  const el = document.getElementById('upload-modal')
  if (el) el.remove()
  document.querySelector('.sidebar-btn--upload')?.classList.remove('active')
  document.removeEventListener('keydown', uploadEscHandler)
}

function uploadEscHandler(e) {
  if (e.key === 'Escape') closeUploadModal()
}

function openUploadModal() {
  if (document.getElementById('upload-modal')) { closeUploadModal(); return }
  document.querySelector('.sidebar-btn--upload')?.classList.add('active')

  const modal = document.createElement('div')
  modal.id = 'upload-modal'
  modal.className = 'upload-modal'

  if (!uploadUnlocked) {
    modal.innerHTML = `
      <div class="upload-modal-backdrop" aria-hidden="true"></div>
      <div class="upload-modal-content upload-modal-password">
        <h2 class="upload-modal-title">Enter Password</h2>
        <input type="password" id="upload-password-input" class="upload-input" placeholder="Password" autocomplete="off" />
        <div class="upload-modal-error" id="upload-password-error"></div>
        <button type="button" class="upload-btn-primary" id="upload-password-submit">Unlock</button>
      </div>
    `
    modal.querySelector('.upload-modal-backdrop').addEventListener('click', closeUploadModal)
    modal.querySelector('.upload-modal-content').addEventListener('click', e => e.stopPropagation())
    document.body.appendChild(modal)
    document.addEventListener('keydown', uploadEscHandler)

    const input = modal.querySelector('#upload-password-input')
    const errEl = modal.querySelector('#upload-password-error')
    const submitBtn = modal.querySelector('#upload-password-submit')

    function tryUnlock() {
      if (input.value === UPLOAD_PASSWORD) {
        uploadUnlocked = true
        closeUploadModal()
        openUploadModal()
      } else {
        errEl.textContent = 'Incorrect password.'
        input.value = ''
        input.focus()
      }
    }
    submitBtn.addEventListener('click', tryUnlock)
    input.addEventListener('keydown', e => { if (e.key === 'Enter') tryUnlock() })
    setTimeout(() => input.focus(), 50)
    return
  }

  modal.innerHTML = `
    <div class="upload-modal-backdrop" aria-hidden="true"></div>
    <div class="upload-modal-content">
      <h2 class="upload-modal-title">Upload Entry</h2>

      <label class="upload-label">Type <span class="upload-required">*</span></label>
      <select id="upload-type" class="upload-input upload-select">
        <option value="">Select type</option>
        <option value="text">Text</option>
        <option value="audio">Audio</option>
        <option value="video">Video</option>
        <option value="photo">Photo</option>
      </select>

      <label class="upload-label">Title <span class="upload-required">*</span></label>
      <input type="text" id="upload-title" class="upload-input" placeholder="Entry title" />

      <label class="upload-label">Source <span class="upload-required">*</span></label>
      <input type="text" id="upload-source" class="upload-input" placeholder="Author, artist, creator..." />

      <label class="upload-label">Year</label>
      <input type="text" id="upload-year" class="upload-input" placeholder="e.g. 2024" />

      <label class="upload-label">Date Added</label>
      <input type="date" id="upload-date-added" class="upload-input" />

      <label class="upload-label">Date Created</label>
      <input type="date" id="upload-date-created" class="upload-input" />

      <label class="upload-label">Description / Caption</label>
      <textarea id="upload-description" class="upload-input upload-textarea" placeholder="Description or caption..."></textarea>

      <label class="upload-label">Link (Text entries)</label>
      <input type="url" id="upload-url" class="upload-input" placeholder="https://..." />

      <label class="upload-label" id="upload-file-label">File (MP4, MOV, MP3, JPG, PNG)</label>
      <input type="file" id="upload-file" class="upload-input upload-file-input" accept="video/mp4,video/quicktime,audio/mpeg,image/jpeg,image/png,image/webp,image/avif" />

      <div class="upload-modal-error" id="upload-error"></div>
      <div class="upload-progress" id="upload-progress" style="display:none">
        <div class="upload-progress-bar" id="upload-progress-bar"></div>
        <span class="upload-progress-label" id="upload-progress-label">Uploading...</span>
      </div>

      <div class="upload-modal-actions">
        <button type="button" class="upload-btn-secondary" id="upload-cancel">Cancel</button>
        <button type="button" class="upload-btn-primary" id="upload-submit">Upload</button>
      </div>
    </div>
  `

  modal.querySelector('.upload-modal-backdrop').addEventListener('click', closeUploadModal)
  modal.querySelector('.upload-modal-content').addEventListener('click', e => e.stopPropagation())
  modal.querySelector('#upload-cancel').addEventListener('click', closeUploadModal)
  document.body.appendChild(modal)
  document.addEventListener('keydown', uploadEscHandler)

  const typeSelect = modal.querySelector('#upload-type')
  const fileInput = modal.querySelector('#upload-file')
  const fileLabel = modal.querySelector('#upload-file-label')

  typeSelect.addEventListener('change', () => {
    const t = typeSelect.value
    if (t === 'text') {
      fileLabel.textContent = 'File (optional)'
      fileInput.accept = '*/*'
    } else if (t === 'video') {
      fileLabel.textContent = 'Video file (MP4, MOV) *'
      fileInput.accept = 'video/mp4,video/quicktime,.mp4,.mov'
    } else if (t === 'audio') {
      fileLabel.textContent = 'Audio file (MP3) *'
      fileInput.accept = 'audio/mpeg,.mp3'
    } else if (t === 'photo') {
      fileLabel.textContent = 'Image file (JPG, PNG, WEBP) *'
      fileInput.accept = 'image/jpeg,image/png,image/webp,image/avif,.jpg,.jpeg,.png,.webp,.avif'
    }
  })

  modal.querySelector('#upload-submit').addEventListener('click', () => handleUploadSubmit(modal))
}

async function handleUploadSubmit(modal) {
  const errEl = modal.querySelector('#upload-error')
  const progressWrap = modal.querySelector('#upload-progress')
  const progressBar = modal.querySelector('#upload-progress-bar')
  const progressLabel = modal.querySelector('#upload-progress-label')
  const submitBtn = modal.querySelector('#upload-submit')
  errEl.textContent = ''

  const type = modal.querySelector('#upload-type').value.trim()
  const title = modal.querySelector('#upload-title').value.trim()
  const source = modal.querySelector('#upload-source').value.trim()
  const year = modal.querySelector('#upload-year').value.trim()
  const dateAdded = modal.querySelector('#upload-date-added').value.trim()
  const dateCreated = modal.querySelector('#upload-date-created').value.trim()
  const description = modal.querySelector('#upload-description').value.trim()
  const url = modal.querySelector('#upload-url').value.trim()
  const fileInput = modal.querySelector('#upload-file')
  const file = fileInput.files[0] || null

  if (!type) { errEl.textContent = 'Please select a type.'; return }
  if (!title) { errEl.textContent = 'Title is required.'; return }
  if (!source) { errEl.textContent = 'Source is required.'; return }
  if (type !== 'text' && !file) { errEl.textContent = 'Please select a file to upload.'; return }

  submitBtn.disabled = true
  progressWrap.style.display = 'flex'
  progressLabel.textContent = file ? 'Reading file...' : 'Submitting...'
  progressBar.style.width = '10%'

  try {
    let base64Content = null
    let fileName = null

    if (file) {
      base64Content = await fileToBase64(file)
      progressBar.style.width = '40%'
      progressLabel.textContent = 'Uploading file to GitHub...'
      fileName = file.name
    }

    progressBar.style.width = '60%'
    progressLabel.textContent = 'Updating archive...'

    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, title, source, year, dateAdded, dateCreated, description, url, fileName, fileContent: base64Content })
    })

    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Upload failed')

    progressBar.style.width = '100%'
    progressLabel.textContent = 'Done! Deploying...'
    progressLabel.style.color = 'var(--cyan)'

    setTimeout(() => {
      closeUploadModal()
      alert('Upload successful. The archive will update after Vercel redeploys (usually 30-60 seconds).')
    }, 800)
  } catch (err) {
    errEl.textContent = err.message || 'Upload failed. Try again.'
    submitBtn.disabled = false
    progressWrap.style.display = 'none'
    progressBar.style.width = '0%'
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function setupUploadButton() {
  const btn = document.querySelector('.sidebar-btn--upload')
  if (btn) btn.addEventListener('click', openUploadModal)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    loadAndRender()
    startLiveClock()
    setupInfoButton()
    setupExpandedAllButton()
    setupUploadButton()
    setupViewButtons()
  })
} else {
  loadAndRender()
  startLiveClock()
  setupInfoButton()
  setupExpandedAllButton()
  setupUploadButton()
  setupViewButtons()
}
