/* 一次性:材料採購價私有化(roadmap 第 27.2 項)。
   把 ingredients 文件上的 packPrice/packGrams 遷移成 ingredientPrices
   collection 裡屬於站長自己的一筆私人資料,再把這兩個欄位從 ingredients
   文件上移除——現有 59 筆材料的 createdBy 全部是站長,價格原本就只有
   他自己在用,遷移後行為不變(GET /api/data 會把這筆價格併回給他)。
   之後其他使用者如果用到同一項材料,價格欄位對他們是空的,要自己填。
   用法:node scripts/migrate-ingredient-prices.mjs */

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
  const db = client.db(env.MONGODB_DB)
  const ingCol = db.collection('ingredients')
  const priceCol = db.collection('ingredientPrices')
  const now = new Date()

  const ings = await ingCol.find({ deletedAt: null, packPrice: { $ne: null } }).toArray()
  let migrated = 0
  for (const ing of ings) {
    const packPrice = Number(ing.packPrice)
    const packGrams = Number(ing.packGrams)
    if (!Number.isFinite(packPrice) || packPrice < 0) continue
    if (!Number.isFinite(packGrams) || packGrams <= 0) continue
    const _id = `${OWNER_ID}:${ing._id}`
    await priceCol.updateOne(
      { _id },
      { $set: { ingredientId: ing._id, ownerId: OWNER_ID, packPrice, packGrams, updatedAt: now },
        $setOnInsert: { createdAt: now } },
      { upsert: true },
    )
    migrated++
  }
  const unset = await ingCol.updateMany(
    { deletedAt: null },
    { $unset: { packPrice: '', packGrams: '' }, $set: { updatedAt: now.toISOString() } },
  )
  console.log(`✅ 材料採購價遷移完成:共 ${ings.length} 筆有價格,寫入 ingredientPrices ${migrated} 筆;`)
  console.log(`   ingredients 移除 packPrice/packGrams 欄位:${unset.modifiedCount} 筆`)
} finally {
  await client.close()
}
