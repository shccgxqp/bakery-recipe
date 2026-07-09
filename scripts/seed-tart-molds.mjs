/* 一次性:把「圓塔模與塔皮模規格容量表.md」(三能型錄)填入 molds collection,
   作為新 schema(brand/count 欄位)的試填驗證。
   用法:node scripts/seed-tart-molds.mjs */

import dns from 'dns'
import { readFileSync } from 'fs'
import { MongoClient } from 'mongodb'

dns.setServers(['8.8.8.8', '1.1.1.1'])

const TARTS = [
  { name: '圓塔模-5入(陽極) 6.5cm', d: 6.5, h: 1.7, note: 'SN62415;適用壓模SN4200' },
  { name: '圓塔模-5入(陽極) 7cm',   d: 7.0, h: 1.7, note: 'SN62425;適用壓模SN4201' },
  { name: '圓塔模-5入(陽極) 7.5cm', d: 7.5, h: 1.8, note: 'SN62435;適用壓模SN4202' },
  { name: '圓塔模-5入(陽極) 8cm',   d: 8.0, h: 1.8, note: 'SN62445;適用壓模SN4203' },
  { name: '5cm圓塔模-5入(陽極)',    d: 5.0, h: 2.2, note: 'SN60685;適用4cm壓模' },
  { name: '5cm圓塔模-5入(硬膜)',    d: 5.0, h: 2.2, note: 'SN60695;適用4cm壓模' },
  { name: '7cm圓塔模-5入(陽極)',    d: 7.0, h: 2.5, note: 'SN60715;適用6cm壓模' },
  { name: '7cm圓塔模-5入(硬膜)',    d: 7.0, h: 2.5, note: 'SN60725;適用6cm壓模' },
  { name: '8cm圓塔模-5入(陽極)',    d: 8.0, h: 2.0, note: 'SN60745;適用7cm壓模' },
  { name: '8cm圓塔模-5入(硬膜)',    d: 8.0, h: 2.0, note: 'SN60755;適用7cm壓模' },
  { name: '5cm圓塔模-5入(1000不沾)', d: 5.0, h: 2.2, note: 'SN64075' },
  { name: '7cm圓塔模-5入(1000不沾)', d: 7.0, h: 2.5, note: 'SN64085' },
]

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)

const client = new MongoClient(env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
await client.connect()
try {
  const db = client.db(env.MONGODB_DB)
  const col = db.collection('molds')
  const now = new Date().toISOString()
  let inserted = 0
  for (const t of TARTS) {
    const exists = await col.findOne({ name: t.name, deletedAt: null })
    if (exists) { console.log(`↷ 已存在,略過:${t.name}`); continue }
    await col.insertOne({
      _id: crypto.randomUUID(),
      name: t.name,
      brand: '三能',
      count: 5,
      shape: 'tart',
      dims: { d: t.d, h: t.h },
      volume: null,
      note: t.note,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    })
    inserted++
    console.log(`✅ 新增:${t.name}`)
  }
  console.log(`共新增 ${inserted} 筆(略過 ${TARTS.length - inserted} 筆重複)`)
} finally {
  await client.close()
}
