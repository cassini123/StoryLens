const { credentials, submitTask, pollTask, REQ_KEY } = require('./_lib/volc-jimeng.cjs')

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  if (req.method === 'GET') {
    const { accessKey } = credentials()
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ status: 'ok', engine: REQ_KEY, credentials: Boolean(accessKey) }))
    return
  }

  if (req.method !== 'POST') {
    res.statusCode = 405
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  let body = {}
  try {
    body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
  } catch {
    res.statusCode = 400
    res.end(JSON.stringify({ error: 'Invalid JSON' }))
    return
  }

  try {
    if (body.action === 'poll') {
      if (!body.task_id) {
        res.statusCode = 400
        res.end(JSON.stringify({ error: 'Missing task_id' }))
        return
      }
      const result = await pollTask(body.task_id)
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(result))
      return
    }

    const prompt = String(body.prompt || '').trim()
    if (!prompt) {
      res.statusCode = 400
      res.end(JSON.stringify({ error: 'Missing prompt' }))
      return
    }
    const result = await submitTask(prompt, body.width || 1024, body.height || 576)
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ status: 'submitted', ...result }))
  } catch (error) {
    res.statusCode = error.statusCode || 500
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: error.message || String(error) }))
  }
}

module.exports.config = { maxDuration: 30 }
