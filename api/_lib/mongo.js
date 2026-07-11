/* api/ 共用:MongoDB 連線快取 + CORS
   (Vercel serverless:同一實例重複呼叫時重用連線,底線開頭的目錄不會成為路由) */

import { MongoClient } from 'mongodb'

let clientPromise = null

export function getDb() {
  if (!clientPromise) clientPromise = new MongoClient(process.env.MONGODB_URI).connect()
  return clientPromise.then(c => c.db(process.env.MONGODB_DB))
}

/* 前端在 GitHub Pages(跨網域),讀取公開、寫入靠使用者登入 token,故 Origin 開放 */
export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

/* 舊前端 sync.js 送 JSON 時沒帶 content-type(避免 preflight),body 可能是字串 */
export function readBody(req) {
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body) } catch { return {} }
  }
  return req.body || {}
}
