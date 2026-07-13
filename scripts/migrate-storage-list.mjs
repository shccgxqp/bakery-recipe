/* 一次性:食譜的保存期限從「單一 storage 字串 + shelfLifeDays 數字」
   改成彈性清單 storage: [{ method, days }],冷藏冷凍可以並行標示。
   用法:node scripts/migrate-storage-list.mjs */

import dns from 'dns'
import { readFileSync } from 'fs'
import { MongoClient } from 'mongodb'

dns.setServers(['8.8.8.8', '1.1.1.1'])

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
  const recipes = await col.find({}).toArray() // 含軟刪除:回收桶復原後才看得到,不遷移的話復原後會壞
  const now = new Date().toISOString()
  let migrated = 0
  for (const r of recipes) {
    if (Array.isArray(r.storage)) continue // 已經是新格式,跳過
    const list = []
    if (r.storage || r.shelfLifeDays > 0) {
      list.push({ method: r.storage || '', days: r.shelfLifeDays > 0 ? `${r.shelfLifeDays} 天` : '' })
    }
    await col.updateOne(
      { _id: r._id },
      { $set: { storage: list, updatedAt: now }, $unset: { shelfLifeDays: '' } },
    )
    migrated++
  }
  console.log(`✅ 保存期限遷移完成:共 ${recipes.length} 道食譜,改格式 ${migrated} 筆`)
} finally {
  await client.close()
}
