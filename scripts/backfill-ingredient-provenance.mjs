/* 一次性:為既有材料補齊 v4.7.0 的來源/查核/歷史預設結構。
   不會猜測、覆寫或更動任何既有營養值、成分、過敏原與資料來源。
   用法:node scripts/backfill-ingredient-provenance.mjs */

import dns from 'dns'
import { readFileSync } from 'node:fs'
import { MongoClient } from 'mongodb'

dns.setServers(['8.8.8.8', '1.1.1.1'])

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter(line => line.includes('=') && !line.trim().startsWith('#'))
    .map(line => [line.slice(0, line.indexOf('=')).trim(), line.slice(line.indexOf('=') + 1).trim()]),
)

const client = new MongoClient(env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
await client.connect()
try {
  const col = client.db(env.MONGODB_DB).collection('ingredients')
  const now = new Date().toISOString()
  const result = await col.updateMany(
    {
      $or: [
        { verification: { $exists: false } },
        { evidence: { $exists: false } },
        { history: { $exists: false } },
      ],
    },
    [{
      $set: {
        verification: { $ifNull: ['$verification', { status: 'pending', latestVerifiedAt: null }] },
        evidence: { $ifNull: ['$evidence', []] },
        history: { $ifNull: ['$history', []] },
        updatedAt: now,
      },
    }],
  )
  console.log(`✅ 材料來源結構回填完成:符合條件 ${result.matchedCount} 筆,更新 ${result.modifiedCount} 筆。`)
  console.log('   所有既有資料維持原樣；新欄位一律為待確認、無來源、無歷史。')
} finally {
  await client.close()
}
