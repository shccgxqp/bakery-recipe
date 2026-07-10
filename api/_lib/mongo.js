/* api/ 共用:MongoDB 連線快取 + CORS + 密碼驗證
   (Vercel serverless:同一實例重複呼叫時重用連線,底線開頭的目錄不會成為路由) */

import { createHash } from 'crypto'
import { MongoClient } from 'mongodb'

let clientPromise = null

export function getDb() {
  if (!clientPromise) clientPromise = new MongoClient(process.env.MONGODB_URI).connect()
  return clientPromise.then(c => c.db(process.env.MONGODB_DB))
}

/* 前端在 GitHub Pages(跨網域),讀取公開、寫入靠密碼,故 Origin 開放 */
export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Edit-Password')
}

export function checkPassword(pw) {
  const hash = process.env.EDIT_PASSWORD_SHA256
  return !!hash && typeof pw === 'string' && pw.length > 0 &&
    createHash('sha256').update(pw, 'utf8').digest('hex') === hash
}

/* 舊前端 sync.js 送 JSON 時沒帶 content-type(避免 preflight),body 可能是字串 */
export function readBody(req) {
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body) } catch { return {} }
  }
  return req.body || {}
}
