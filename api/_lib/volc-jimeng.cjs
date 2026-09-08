/**
 * Volcengine Visual API (Jimeng t2i v4.0) helper for Vercel / local Vite.
 * Credentials come from JIMENG_ACCESS_KEY / JIMENG_SECRET_KEY — never from the client.
 */
const crypto = require('crypto')
const https = require('https')

const HOST = 'visual.volcengineapi.com'
const REGION = 'cn-north-1'
const SERVICE = 'cv'
const API_VERSION = '2022-08-31'
const REQ_KEY = 'jimeng_t2i_v40'

function credentials() {
  return {
    accessKey: process.env.JIMENG_ACCESS_KEY || '',
    secretKey: process.env.JIMENG_SECRET_KEY || '',
  }
}

function sign(key, msg) {
  return crypto.createHmac('sha256', key).update(msg, 'utf8').digest()
}

function signingKey(secretKey, dateStamp) {
  const kDate = sign(secretKey, dateStamp)
  const kRegion = sign(kDate, REGION)
  const kService = sign(kRegion, SERVICE)
  return sign(kService, 'request')
}

function jimengRequest(action, bodyParams, accessKey, secretKey) {
  const now = new Date()
  const currentDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')
  const datestamp = currentDate.slice(0, 8)
  const query = `Action=${action}&Version=${API_VERSION}`
  const reqBody = JSON.stringify(bodyParams)
  const payloadHash = crypto.createHash('sha256').update(reqBody).digest('hex')
  const signedHeaders = 'content-type;host;x-content-sha256;x-date'
  const canonicalHeaders =
    `content-type:application/json\n` +
    `host:${HOST}\n` +
    `x-content-sha256:${payloadHash}\n` +
    `x-date:${currentDate}\n`
  const canonicalRequest = `POST\n/\n${query}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`
  const credentialScope = `${datestamp}/${REGION}/${SERVICE}/request`
  const stringToSign =
    `HMAC-SHA256\n${currentDate}\n${credentialScope}\n` +
    crypto.createHash('sha256').update(canonicalRequest).digest('hex')
  const signature = crypto
    .createHmac('sha256', signingKey(secretKey, datestamp))
    .update(stringToSign)
    .digest('hex')
  const authorization =
    `HMAC-SHA256 Credential=${accessKey}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: HOST,
        path: `/?${query}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Date': currentDate,
          Authorization: authorization,
          'X-Content-Sha256': payloadHash,
          'Content-Length': Buffer.byteLength(reqBody),
        },
        timeout: 25000,
      },
      (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8')
          try {
            resolve(JSON.parse(text))
          } catch {
            reject(new Error(`Invalid Jimeng JSON: ${text.slice(0, 400)}`))
          }
        })
      },
    )
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Jimeng request timed out'))
    })
    req.write(reqBody)
    req.end()
  })
}

async function submitTask(prompt, width = 1024, height = 576) {
  const { accessKey, secretKey } = credentials()
  if (!accessKey || !secretKey) {
    const err = new Error('Jimeng credentials are not configured')
    err.statusCode = 503
    throw err
  }
  const result = await jimengRequest(
    'CVSync2AsyncSubmitTask',
    { req_key: REQ_KEY, prompt, width, height },
    accessKey,
    secretKey,
  )
  if (result.code !== 10000) {
    throw new Error(result.message || JSON.stringify(result).slice(0, 400))
  }
  return { task_id: result.data.task_id }
}

function guessFormat(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'jpeg'
  if (buf[0] === 0x52 && buf[1] === 0x49) return 'webp'
  return 'png'
}

function download(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          download(res.headers.location).then(resolve, reject)
          return
        }
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => resolve(Buffer.concat(chunks)))
      })
      .on('error', reject)
  })
}

async function extractImage(result) {
  const data = result.data || {}
  let urls = data.image_urls || []
  if (typeof urls === 'string') urls = [urls]
  if (urls[0]) {
    const buf = await download(urls[0])
    return `data:image/${guessFormat(buf)};base64,${buf.toString('base64')}`
  }
  let list = data.binary_data_base64 || []
  if (typeof list === 'string') list = [list]
  if (list[0]) {
    const buf = Buffer.from(list[0], 'base64')
    return `data:image/${guessFormat(buf)};base64,${buf.toString('base64')}`
  }
  throw new Error('No image in Jimeng result')
}

async function pollTask(taskId) {
  const { accessKey, secretKey } = credentials()
  if (!accessKey || !secretKey) {
    const err = new Error('Jimeng credentials are not configured')
    err.statusCode = 503
    throw err
  }
  const result = await jimengRequest(
    'CVSync2AsyncGetResult',
    { req_key: REQ_KEY, task_id: taskId },
    accessKey,
    secretKey,
  )
  if (result.code !== 10000) {
    return { status: 'error', error: result.message || JSON.stringify(result).slice(0, 400) }
  }
  const status = (result.data && result.data.status) || ''
  if (status === 'done') {
    const data_url = await extractImage(result)
    return { status: 'done', data_url }
  }
  if (status === 'failed' || status === 'error' || status === 'expired') {
    return { status: 'failed', error: `Task ${status}` }
  }
  return { status: status || 'generating' }
}

module.exports = { credentials, submitTask, pollTask, REQ_KEY }
