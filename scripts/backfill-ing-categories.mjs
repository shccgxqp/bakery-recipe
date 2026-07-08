/* 一次性:為既有材料回填「分類」欄位(依台灣烘焙材料行通用分類),
   並把分類顯示順序寫入 settings.ingCatOrder。
   之後材料的分類在網站編輯表單維護,本腳本不會再需要。
   用法:node scripts/backfill-ing-categories.mjs */

import dns from 'dns'
import { readFileSync } from 'fs'
import { MongoClient } from 'mongodb'

dns.setServers(['8.8.8.8', '1.1.1.1'])

const ING_CAT_ORDER = [
  '麵粉/澱粉', '糖/甜味劑', '乳製品', '蛋類', '油脂', '巧克力/可可',
  '堅果/果乾', '水果', '茶/咖啡', '膨脹/凝固劑', '調味/香精/色素', '酒類', '其他',
]

const MAP = {
  '麵粉/澱粉': ['中筋麵粉', '水手牌高筋麵粉', '鑽石低筋麵粉', '玉米粉'],
  '糖/甜味劑': ['砂糖', '細砂糖', '糖粉', '黑糖', '蜂蜜', '玉米糖漿', '葡萄糖漿', '焦糖醬'],
  '乳製品': [
    '無鹽奶油', '依思尼 無鹽奶油', '愛樂微 無鹽奶油', '牛奶', '奶粉', '希臘式優格',
    '愛樂微動物鮮奶油35%', '艾恩摩爾動物性鮮奶油', '艾恩摩爾動物性鮮奶油35.1%',
    '安佳動物鮮奶油', '菲力鮮奶油乳酪', '馬斯卡邦起司',
  ],
  '蛋類': ['全蛋', '蛋白', '蛋黃'],
  '油脂': ['沙拉油'],
  '巧克力/可可': ['白鈕扣巧克力', '無糖可可粉'],
  '堅果/果乾': ['杏仁粉', '杏仁粒', '核桃', '蔓越莓乾'],
  '水果': ['柳丁', '香蕉', '草莓', '藍莓', '檸檬汁'],
  '茶/咖啡': ['抹茶粉', '伯爵茶粉', '焙茶粉', '濃縮咖啡'],
  '膨脹/凝固劑': ['泡打粉', '塔塔粉', '吉利丁粉', '吉利丁片'],
  '調味/香精/色素': ['莫諾尼香草醬', '肉桂粉', '紅色色膏', '粉紅色色膏', '鹽'],
  '酒類': ['麥斯萊姆酒'],
  '其他': ['雞蛋布丁粉', '奇福餅乾', '維西尼手指餅乾', '棉花糖', '可爾必思', '水'],
}

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
  const col = db.collection('ingredients')
  let set = 0
  for (const [cat, names] of Object.entries(MAP)) {
    const r = await col.updateMany({ name: { $in: names } }, { $set: { category: cat } })
    set += r.modifiedCount
  }
  /* 名單外的(未來新增又沒填的)補「未分類」;只補沒有此欄位的,不動人工已填的 */
  const rest = await col.updateMany({ category: { $exists: false } }, { $set: { category: '未分類' } })
  await db.collection('settings').updateOne({ _id: 'main' }, { $set: { ingCatOrder: ING_CAT_ORDER } })
  console.log(`✅ 已分類 ${set} 筆;補「未分類」${rest.modifiedCount} 筆`)
  console.log(`✅ settings.ingCatOrder = ${ING_CAT_ORDER.join(' → ')}`)
  const check = await col.find({ category: '未分類' }, { projection: { name: 1 } }).toArray()
  if (check.length) console.log(`ℹ️ 目前未分類:${check.map(d => d.name).join('、')}`)
} finally {
  await client.close()
}
