// Vercel serverless function: handles entry uploads via GitHub API
// Requires env var: GITHUB_TOKEN (personal access token with repo scope)
// Repo is hardcoded to dxxidlee/0316-0713 — change if repo is renamed

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const REPO_OWNER = 'dxxidlee'
const REPO_NAME = '0316-0713'
const BRANCH = 'main'
const ENTRIES_PATH = '0316/entries.json'

const TYPE_FOLDER = {
  video: '0316/public/media/video',
  audio: '0316/public/media/audio',
  photo: '0316/public/media/photos',
}

const ALLOWED_EXTENSIONS = {
  video: ['.mp4', '.mov'],
  audio: ['.mp3'],
  photo: ['.jpg', '.jpeg', '.png', '.webp', '.avif'],
  text: [],
}

async function githubGet(path) {
  const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?ref=${BRANCH}`, {
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
    },
  })
  if (!res.ok) throw new Error(`GitHub GET ${path} failed: ${res.status}`)
  return res.json()
}

async function githubPut(path, content, message, sha) {
  const body = {
    message,
    content,
    branch: BRANCH,
  }
  if (sha) body.sha = sha

  const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`GitHub PUT ${path} failed: ${res.status} ${err}`)
  }
  return res.json()
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!GITHUB_TOKEN) {
    return res.status(500).json({ error: 'Server not configured (missing GITHUB_TOKEN).' })
  }

  const { type, title, source, year, dateAdded, dateCreated, description, url, fileName, fileContent } = req.body || {}

  if (!type || !title || !source) {
    return res.status(400).json({ error: 'type, title, and source are required.' })
  }

  const allowedExts = ALLOWED_EXTENSIONS[type.toLowerCase()]
  if (allowedExts === undefined) {
    return res.status(400).json({ error: `Unknown type: ${type}` })
  }

  let filePath = null

  // Upload file to GitHub if provided
  if (fileName && fileContent) {
    const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase()
    if (allowedExts.length > 0 && !allowedExts.includes(ext)) {
      return res.status(400).json({ error: `File type not allowed for ${type}. Allowed: ${allowedExts.join(', ')}` })
    }

    const folder = TYPE_FOLDER[type.toLowerCase()]
    if (!folder) {
      return res.status(400).json({ error: `No upload folder for type: ${type}` })
    }

    // Sanitize filename: remove spaces, special chars except hyphens/underscores/dots
    const safeName = fileName.replace(/[^a-zA-Z0-9._\-]/g, '_')
    const ghPath = `${folder}/${safeName}`

    // Check if file already exists to get SHA (for overwrite)
    let existingSha = null
    try {
      const existing = await githubGet(ghPath)
      existingSha = existing.sha
    } catch (_) {
      // File doesn't exist yet — that's fine
    }

    await githubPut(ghPath, fileContent, `upload: add ${safeName}`, existingSha)
    filePath = `/media/${type === 'video' ? 'video' : type === 'audio' ? 'audio' : 'photos'}/${safeName}`
  }

  // Fetch and update entries.json
  const entriesFile = await githubGet(ENTRIES_PATH)
  const existingEntries = JSON.parse(Buffer.from(entriesFile.content, 'base64').toString('utf8'))

  const maxId = existingEntries.reduce((m, e) => Math.max(m, e.id || 0), 0)
  const newId = maxId + 1

  const today = new Date().toISOString().slice(0, 10)

  const newEntry = {
    id: newId,
    type: type.toLowerCase(),
    title,
    source,
    year: year || null,
    dateAdded: dateAdded || today,
    dateCreated: dateCreated || null,
    file: filePath || null,
    description: description || null,
    url: url || null,
    caption: null,
    thumbnail: null,
  }

  existingEntries.push(newEntry)

  const updatedContent = Buffer.from(JSON.stringify(existingEntries, null, 2)).toString('base64')
  await githubPut(ENTRIES_PATH, updatedContent, `upload: add entry ${newId} — ${title}`, entriesFile.sha)

  return res.status(200).json({ ok: true, id: newId })
}
