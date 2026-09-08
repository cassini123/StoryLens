const { getRecord, listRecords, saveRecord, storageStatus, viewTokenOk } = require('./_lib/chitest-store.cjs')

function send(res, status, body, type = 'application/json') {
  res.statusCode = status
  res.setHeader('Content-Type', type)
  res.end(typeof body === 'string' ? body : JSON.stringify(body))
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function requestToken(req, url) {
  const header = String(req.headers.authorization || '')
  const bearer = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : ''
  return url.searchParams.get('token') || bearer || ''
}

function wantsHtml(req, url) {
  if (url.searchParams.get('format') === 'json') return false
  if (url.searchParams.get('format') === 'html') return true
  return String(req.headers.accept || '').includes('text/html')
}

function listHtml(records, token) {
  const tokenQuery = token ? `&token=${encodeURIComponent(token)}` : ''
  const rows = records
    .map((item) => {
      const href = `?id=${encodeURIComponent(item.id)}${tokenQuery}`
      return `<li><a href="${escapeHtml(href)}">${escapeHtml(item.participant_id)} · ${escapeHtml(item.session_id)} · ${escapeHtml(item.kind)}</a> <span>${escapeHtml(item.uploaded_at)} · ${item.bytes || 0} bytes</span></li>`
    })
    .join('\n')
  return `<!doctype html>
<meta charset="utf-8">
<title>CHItest submissions</title>
<style>
  body { font-family: Helvetica, Arial, sans-serif; margin: 24px; max-width: 880px; }
  li { margin: 8px 0; }
  span { color: #555; }
</style>
<h1>CHItest submissions</h1>
<p>${records.length} records</p>
<ul>
${rows || '<li>No submissions yet.</li>'}
</ul>
`
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  const host = req.headers.host || 'localhost'
  const url = new URL(req.url || '/', `http://${host}`)

  if (req.method === 'GET') {
    if (url.searchParams.get('health') === '1') {
      send(res, 200, { status: 'ok', ...storageStatus() })
      return
    }
    const token = requestToken(req, url)
    if (!viewTokenOk(token)) {
      send(res, 401, { error: 'Missing or invalid CHITEST_VIEW_TOKEN' })
      return
    }
    try {
      const id = url.searchParams.get('id')
      if (id) {
        const record = await getRecord(id)
        if (!record) {
          send(res, 404, { error: 'Not found' })
          return
        }
        send(res, 200, record)
        return
      }
      const records = await listRecords()
      if (wantsHtml(req, url)) {
        send(res, 200, listHtml(records, token), 'text/html; charset=utf-8')
        return
      }
      send(res, 200, { status: 'ok', ...storageStatus(), records })
    } catch (error) {
      send(res, error.statusCode || 500, { error: error.message || String(error) })
    }
    return
  }

  if (req.method !== 'POST') {
    send(res, 405, { error: 'Method not allowed' })
    return
  }

  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  let body = {}
  try {
    body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
  } catch {
    send(res, 400, { error: 'Invalid JSON' })
    return
  }

  const packet = body.packet && typeof body.packet === 'object' ? body.packet : body
  const participantId = String(body.participant_id || packet.participant_id || '').trim()
  const sessionId = String(body.session_id || packet.session_id || '').trim()
  const kind = String(body.kind || 'final').trim() || 'final'
  if (!participantId || !sessionId) {
    send(res, 400, { error: 'Missing participant_id or session_id' })
    return
  }
  if (!['final', 'checkpoint'].includes(kind)) {
    send(res, 400, { error: 'kind must be final or checkpoint' })
    return
  }

  const uploadedAt = new Date().toISOString()
  const payload = {
    uploaded_at: uploadedAt,
    kind,
    participant_id: participantId,
    session_id: sessionId,
    packet,
  }

  try {
    const saved = await saveRecord(
      {
        participant_id: participantId,
        session_id: sessionId,
        kind,
        uploaded_at: uploadedAt,
      },
      payload,
    )
    send(res, 200, { status: 'saved', ...saved, ...storageStatus() })
  } catch (error) {
    send(res, error.statusCode || 500, { error: error.message || String(error), ...storageStatus() })
  }
}

module.exports.config = { maxDuration: 30 }
