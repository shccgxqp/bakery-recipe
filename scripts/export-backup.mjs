/* 每日備份:三個 collection 完整匯出成 backup/*.json(含已軟刪除的文件)
   - GitHub Action 上:連線資訊來自環境變數(MONGODB_URI / MONGODB_DB)
   - 本機手動跑:自動 fallback 讀 .env,並改用公共 DNS(家用網路 SRV 查詢問題)
   純備份、單向:網站永遠只讀 MongoDB,這些 JSON 不參與運作。
   還原方式:從 git 歷史取出當天 JSON,寫個小腳本逐筆塞回(日期欄位要 new Date() 復原)。 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { MongoClient } from 'mongodb'

let uri = process.env.MONGODB_URI
let dbName = process.env.MONGODB_DB

if (!uri) {
  const dns = await import('dns')
  dns.setServers(['8.8.8.8', '1.1.1.1'])
  const env = Object.fromEntries(
    readFileSync(new URL('../.env', import.meta.url), 'utf8')
      .split('\n')
      .filter(l => l.includes('=') && !l.trim().startsWith('#'))
      .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
  )
  uri = env.MONGODB_URI
  dbName = dbName || env.MONGODB_DB
}
if (!uri || !dbName) throw new Error('缺 MONGODB_URI / MONGODB_DB')

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 })
await client.connect()
const db = client.db(dbName)
const outDir = new URL('../backup/', import.meta.url)
mkdirSync(outDir, { recursive: true })

try {
  for (const name of ['ingredients', 'recipes', 'molds', 'settings']) {
    /* 依 _id 排序讓輸出穩定,git diff 才看得出真正的變化 */
    const docs = await db.collection(name).find().sort({ _id: 1 }).toArray()
    writeFileSync(new URL(`${name}.json`, outDir), JSON.stringify(docs, null, 2) + '\n')
    console.log(`backup/${name}.json:${docs.length} 筆`)
  }
} finally {
  await client.close()
}
