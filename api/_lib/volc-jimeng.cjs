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

const ACCESS_ALIASES = [
  'JIMENG_ACCESS_KEY',
  'JIMENG_ACCESS_KEY_ID',
  'VOLC_ACCESS_KEY',
  'VOLCENGINE_ACCESS_KEY',
]
const SECRET_ALIASES = [
  'JIMENG_SECRET_KEY',
  'JIMENG_SECRET_ACCESS_KEY',
  'VOLC_SECRET_KEY',
  'VOLCENGINE_SECRET_KEY',
]

function cleanEnv(value) {
  if (value == null) return ''
  return String(value)
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .trim()
}

function readEnv(names) {
  for (const name of names) {
    const value = cleanEnv(process.env[name])
    if (value) return { name, value }
  }
  return { name: '', value: '' }
}

function credentials() {
  const access = readEnv(ACCESS_ALIASES)
  const secret = readEnv(SECRET_ALIASES)
  return {
    accessKey: access.value,
    secretKey: secret.value,
    accessKeyName: access.name,
    secretKeyName: secret.name,
  }
}

function credentialStatus() {
  const { accessKey, secretKey, accessKeyName, secretKeyName } = credentials()
  return {
    credentials: Boolean(accessKey && secretKey),
    has_access_key: Boolean(accessKey),
    has_secret_key: Boolean(secretKey),
    access_key_source: accessKeyName || null,
    secret_key_source: secretKeyName || null,
    expected: ['JIMENG_ACCESS_KEY', 'JIMENG_SECRET_KEY'],
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

const RETRYABLE_CODES = new Set([50200, 50411, 50413, 50429, 50430, 50500])

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableNetwork(error) {
  const msg = String((error && error.message) || error || '')
  return /timed out|timeout|ECONNRESET|ECONNREFUSED|ENOTFOUND|EPIPE|ETIMEDOUT|socket hang up|429|502|503|504/i.test(
    msg,
  )
}

async function jimengRequestRetry(action, bodyParams, accessKey, secretKey, attempts = 3) {
  let lastError
  for (let i = 0; i < attempts; i += 1) {
    try {
      const result = await jimengRequest(action, bodyParams, accessKey, secretKey)
      if (RETRYABLE_CODES.has(Number(result.code)) && i < attempts - 1) {
        await sleep(400 * 2 ** i)
        continue
      }
      return result
    } catch (error) {
      lastError = error
      if (i < attempts - 1 && isRetryableNetwork(error)) {
        await sleep(400 * 2 ** i)
        continue
      }
      throw error
    }
  }
  throw lastError
}

function rateLimitError(message) {
  const err = new Error(message)
  err.statusCode = 429
  err.retryable = true
  return err
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
        timeout: 20000,
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

async function submitTask(prompt, width = 1664, height = 936, images = []) {
  const { accessKey, secretKey } = credentials()
  if (!accessKey || !secretKey) {
    const err = new Error(
      'Jimeng credentials are not configured. Set JIMENG_ACCESS_KEY and JIMENG_SECRET_KEY on the Vercel project for Production + Preview, then Redeploy.',
    )
    err.statusCode = 503
    err.retryable = false
    throw err
  }
  let w = Number(width) || 1664
  let h = Number(height) || 936
  if (w * h < 1024 * 1024) {
    const scale = Math.sqrt((1024 * 1024) / (w * h))
    w = Math.ceil((w * scale) / 8) * 8
    h = Math.ceil((h * scale) / 8) * 8
  }
  const body = { req_key: REQ_KEY, prompt, width: w, height: h }
  const binaries = (Array.isArray(images) ? images : [])
    .map((item) => {
      if (!item) return ''
      const text = String(item)
      const comma = text.indexOf(',')
      return comma >= 0 ? text.slice(comma + 1) : text
    })
    .filter(Boolean)
  if (binaries.length) body.binary_data_base64 = binaries
  const result = await jimengRequestRetry(
    'CVSync2AsyncSubmitTask',
    body,
    accessKey,
    secretKey,
    2,
  )
  if (result.code !== 10000) {
    const message = result.message || JSON.stringify(result).slice(0, 400)
    if (RETRYABLE_CODES.has(Number(result.code))) throw rateLimitError(message)
    throw new Error(message)
  }
  return { task_id: result.data.task_id }
}

function guessFormat(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'jpeg'
  if (buf[0] === 0x52 && buf[1] === 0x49) return 'webp'
  return 'png'
}

function downloadOnce(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          downloadOnce(res.headers.location).then(resolve, reject)
          return
        }
        if (res.statusCode === 429 || res.statusCode >= 500) {
          reject(new Error(`Image download HTTP ${res.statusCode}`))
          return
        }
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => resolve(Buffer.concat(chunks)))
      })
      .on('error', reject)
  })
}

async function download(url) {
  let lastError
  for (let i = 0; i < 3; i += 1) {
    try {
      return await downloadOnce(url)
    } catch (error) {
      lastError = error
      if (i < 2 && isRetryableNetwork(error)) {
        await sleep(400 * 2 ** i)
        continue
      }
      throw error
    }
  }
  throw lastError
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
    const err = new Error(
      'Jimeng credentials are not configured. Set JIMENG_ACCESS_KEY and JIMENG_SECRET_KEY on the Vercel project for Production + Preview, then Redeploy.',
    )
    err.statusCode = 503
    err.retryable = false
    throw err
  }
  const result = await jimengRequestRetry(
    'CVSync2AsyncGetResult',
    { req_key: REQ_KEY, task_id: taskId },
    accessKey,
    secretKey,
  )
  if (result.code !== 10000) {
    const error = result.message || JSON.stringify(result).slice(0, 400)
    if (RETRYABLE_CODES.has(Number(result.code))) {
      return { status: 'generating', retryable: true, error }
    }
    return { status: 'error', error }
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

module.exports = { credentials, credentialStatus, submitTask, pollTask, REQ_KEY }
