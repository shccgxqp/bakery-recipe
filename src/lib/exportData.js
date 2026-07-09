/* 資料匯出:完整 JSON 備份 + 材料 CSV(Excel 可開) */

import { NUTR } from './calc.js'
import { APP_VERSION } from '../config.js'

function download(filename, text, mime) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type: mime }))
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

const today = () => new Date().toISOString().slice(0, 10)

export function exportBackupJSON(base) {
  download(
    `烘焙帳本備份-${today()}.json`,
    JSON.stringify({ app: 'bakery-recipe', version: APP_VERSION, exportedAt: new Date().toISOString(), ...base }, null, 2),
    'application/json;charset=utf-8'
  )
}

const csvCell = v => {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function exportIngredientsCSV(ING) {
  const head = [
    '名稱', '分類', '廠牌', '規格', '採購價NT', '採購重量g', '每100g單價NT',
    ...NUTR.map(([, zh, unit]) => `${zh}(${unit}/100g)`),
    '過敏原', '可能含有', '成分', '標示登記日', '備註',
  ]
  const rows = Object.values(ING)
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'))
    .map(i => [
      i.name, i.category || '', i.brand || '', i.spec || '',
      i.packPrice, i.packGrams,
      ((i.packPrice * 100) / (i.packGrams || 1)).toFixed(1),
      ...NUTR.map(([k]) => (i.per100g ? (i.per100g[k] ?? 0) : '無資料')),
      (i.allergens || []).join('、'), (i.mayContain || []).join('、'),
      i.subIngredients || '', i.labelDate || '', i.note || '',
    ])
  /* ﻿ BOM:讓 Excel 以 UTF-8 開啟不亂碼 */
  const csv = '﻿' + [head, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n')
  download(`材料主檔-${today()}.csv`, csv, 'text/csv;charset=utf-8')
}
