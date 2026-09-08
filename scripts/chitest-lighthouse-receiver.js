#!/usr/bin/env node
/**
 * Run this on the Tencent Lighthouse (ubuntu@your-server) so participant JSON
 * is written to disk. Vercel forwards POSTs here; you can ls the files over SSH.
 *
 *   export CHITEST_VIEW_TOKEN='your-secret'
 *   export CHITEST_DATA_DIR="$HOME/chitest-sessions"
 *   node scripts/chitest-lighthouse-receiver.js
 */
const http = require('http')
const os = require('os')
const path = require('path')

process.env.CHITEST_STORAGE = 'fs'
process.env.CHITEST_REQUIRE_UPLOAD_TOKEN = process.env.CHITEST_REQUIRE_UPLOAD_TOKEN || '1'
process.env.CHITEST_DATA_DIR =
  process.env.CHITEST_DATA_DIR || path.join(os.homedir(), 'chitest-sessions')

const handler = require('../api/chitest-session.js')
const port = Number(process.env.PORT || 8787)
const host = process.env.HOST || '0.0.0.0'

http
  .createServer((req, res) => {
    Promise.resolve(handler(req, res)).catch((error) => {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: error.message || String(error) }))
    })
  })
  .listen(port, host, () => {
    console.log(`CHItest receiver on http://${host}:${port}`)
    console.log(`writing JSON to ${process.env.CHITEST_DATA_DIR}`)
  })
