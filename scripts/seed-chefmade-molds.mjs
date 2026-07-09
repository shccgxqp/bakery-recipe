/* 一次性:把 chefmade(學廚)資料表(docs/mold-specs/chefmade-學廚.md)裡「簡單、有型號、
   尺寸完整」的模具填入 molds collection。
   跟三能型錄不同,chefmade 這份是 Gemini 網路搜尋整理、非官方型錄:
   - 尺寸是「外部最大尺寸」,不是內部烘焙可用容積(三能給的是內徑);沒有扣壁厚,
     容積僅供粗略參考,不是精算值。dataSource='web' 標記較低信心度。
   - 沒有型錄容積可對照驗證公式,也沒有官方型號、缺高度、造型太複雜(多連模穴深不明、
     菊花/卡通造型、冷卻架配件…)的項目一律不收錄,只收「有 WK 型號 + L×W×H(或 Ø×H)
     完整 + 單純幾何形狀」這 18 筆。
   用法:node scripts/seed-chefmade-molds.mjs */

import dns from 'dns'
import { readFileSync } from 'fs'
import { MongoClient } from 'mongodb'

dns.setServers(['8.8.8.8', '1.1.1.1'])
const SUFFIX = '外部最大尺寸,非內徑,容積為粗估'

/* 長方/正方形(rect/square):[name, code, isSquare, L_cm, W_cm, h_cm, note] */
const RECT = [
  ['金色水立方吐司盒', 'WK9317', false, 11.5, 11.4, 10.6, '250g麵糰'],
  ['迷你小吐司盒', 'WK9023', false, 15.5, 8.7, 4.8, '50g麵糰'],
  ['小號1磅蛋糕模', 'WK9064', false, 18.2, 11.3, 6.2, '1磅/約300g麵糰'],
  ['黑色波紋帶蓋吐司盒', 'WK9287', false, 21.3, 12.2, 11.5, '450g(12兩)半條'],
  ['金色波紋帶蓋吐司盒', 'WK9088', false, 21.9, 11.9, 11.2, '450g(12兩)'],
  ['金色長條不沾吐司盒', 'WK9403', false, 22.3, 8.7, 7.7, '300g麵糰'],
  ['中號2磅長方不沾模', 'WK9039', false, 24.3, 14.6, 6.6, '2磅容量'],
  ['黑色中號不沾模', 'WK112009', false, 25.5, 13.2, 6.2, '中號規格'],
  ['半熟芝士模套裝', 'WK9779', false, 6.7, 5.0, 2.6, '4件套裝(含不沾油布)'],
  ['金色13吋加深長方盤', 'WK9041', false, 34.6, 24.7, 6.0, '874g,適合水浴法'],
  ['金色11吋正方形水果捲模', 'WK9055', true, 27.8, 27.8, 2.9, '輕量化鋁合金'],
  ['金色11吋方形捲邊深烤模', 'WK9076', true, 28.6, 28.6, 3.5, '重型碳鋼捲邊'],
  ['13吋不沾淺長方盤', 'WK9042', false, 34.5, 24.6, 2.5, ''],
  ['13吋淺長方烤盤(配蓋)', 'WK9813', false, 36.6, 24.8, 5.3, '含防塵蓋'],
]

/* 圓形(round):[name, code, D_cm, h_cm, note] */
const ROUND = [
  ['玫瑰金4吋蛋糕模(加高)', 'WK9418', 11.7, 9.9, '1mm鋁合金陽極,活動底,無塗層利於戚風攀爬'],
  ['黑色4吋活底圓模', 'WK9935', 11.9, 7.5, '重型碳鋼,加厚黑色不沾'],
  ['金色6吋活動圓模', 'WK9052', 16.8, 7.0, '重型碳鋼,捲邊防翹曲'],
  ['金色8吋活動圓模', 'WK9053', 21.8, 7.4, '重型碳鋼,抗扭曲捲邊'],
]

const docs = []
const push = doc => docs.push({ brand: 'Chefmade 學廚', volume: null, dataSource: 'web', count: 1, ...doc })

for (const [name, code, isSquare, L, W, h, note] of RECT)
  push({
    name, shape: isSquare ? 'square' : 'rect',
    dims: isSquare ? { topW: W, botW: W, h } : { topL: L, topW: W, botL: L, botW: W, h },
    note: [code, note, SUFFIX].filter(Boolean).join(';'),
  })

for (const [name, code, D, h, note] of ROUND)
  push({ name, shape: 'round', dims: { topD: D, bottomD: D, h }, note: [code, note, SUFFIX].filter(Boolean).join(';') })

console.log(`準備寫入 ${docs.length} 筆(rect/square ${RECT.length} round ${ROUND.length})`)

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
  const col = db.collection('molds')
  const now = new Date().toISOString()
  let inserted = 0, skipped = 0
  for (const doc of docs) {
    const exists = await col.findOne({ name: doc.name, deletedAt: null })
    if (exists) { skipped++; continue }
    await col.insertOne({ _id: crypto.randomUUID(), ...doc, deletedAt: null, createdAt: now, updatedAt: now })
    inserted++
  }
  console.log(`✅ 新增 ${inserted} 筆,略過(已存在)${skipped} 筆`)
} finally {
  await client.close()
}
