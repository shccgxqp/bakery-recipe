/* 一次性:站長密碼機制退場,改成純 Google/token 身份判斷後,把你的帳號標成
   role:"owner"(見 docs/roadmap.md 第 2 項)。前提:你已經用 Google 登入過
   一次(或用這個 email 註冊過信箱密碼帳號),users 文件已經存在。
   用法:node scripts/promote-owner.mjs */

import dns from 'dns'
import { readFileSync } from 'fs'
import { MongoClient } from 'mongodb'

dns.setServers(['8.8.8.8', '1.1.1.1'])

const OWNER_EMAIL = 'shccgxqp@gmail.com'

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)

const client = new MongoClient(env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
await client.connect()
try {
  const col = client.db(env.MONGODB_DB).collection('users')
  const existing = await col.findOne({ email: OWNER_EMAIL })
  if (!existing) {
    console.error(`❌ 找不到 email="${OWNER_EMAIL}" 的 users 文件——先用 Google 登入一次再重跑。`)
    process.exitCode = 1
  } else {
    const r = await col.updateOne({ email: OWNER_EMAIL }, { $set: { role: 'owner', updatedAt: new Date().toISOString() } })
    console.log(`✅ email="${OWNER_EMAIL}" 標記 role:"owner":符合 ${r.matchedCount} 筆,更新 ${r.modifiedCount} 筆`)
  }
} finally {
  await client.close()
}
