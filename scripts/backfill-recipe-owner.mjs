/* 一次性:帳號系統第一階段,把現有食譜標上 ownerId(暫時用 email 當識別值,
   之後如果要換成 Google sub,直接改這個常數重跑一次即可,不影響其他邏輯)。
   用法:node scripts/backfill-recipe-owner.mjs */

import dns from 'dns'
import { readFileSync } from 'fs'
import { MongoClient } from 'mongodb'

dns.setServers(['8.8.8.8', '1.1.1.1'])

const OWNER_ID = 'shccgxqp@gmail.com'

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)

const client = new MongoClient(env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
await client.connect()
try {
  const col = client.db(env.MONGODB_DB).collection('recipes')
  const now = new Date().toISOString()
  const r = await col.updateMany({ deletedAt: null }, { $set: { ownerId: OWNER_ID, updatedAt: now } })
  console.log(`✅ 標記 ownerId="${OWNER_ID}":符合 ${r.matchedCount} 筆,更新 ${r.modifiedCount} 筆`)
} finally {
  await client.close()
}
