/* 營養標示 → PNG 下載(canvas 繪製)
   免責聲明「烙印」在圖片下緣,隨圖轉傳、不可分離。 */

import { fmt, NUTR, DV_NOTE } from './calc.js'

const FONT = '"Noto Sans TC", "Microsoft JhengHei", sans-serif'

/* 依最大寬度把中文長句折行(中文無空格,逐字量測) */
function wrapText(ctx, text, maxW) {
  const lines = []
  let line = ''
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxW && line) {
      lines.push(line)
      line = ch
    } else line += ch
  }
  if (line) lines.push(line)
  return lines
}

export function downloadNutritionLabel(r, c, al) {
  const s = r.servings || 1
  const labelGrams = r.finishedGrams > 0 ? r.finishedGrams : c.grams

  const W = 560, PAD = 26, SCALE = 2
  const rowH = 30
  const cv = document.createElement('canvas')
  const ctx = cv.getContext('2d')

  /* ---- 先量測動態文字高度 ---- */
  ctx.font = `12px ${FONT}`
  const noteLines = wrapText(ctx, '＊參考值未訂定。' + DV_NOTE, W - PAD * 2)
  const alTexts = []
  if (al.has.length) alTexts.push(`過敏原資訊:本產品含有${al.has.join('、')}。`)
  if (al.may.length) alTexts.push(`本產品可能含有${al.may.join('、')}。`)
  const alLines = alTexts.flatMap(t => wrapText(ctx, t, W - PAD * 2))
  const noNutrLines = c.noNutr.length
    ? wrapText(ctx, `注意:${c.noNutr.join('、')}尚無營養資料,以 0 計算。`, W - PAD * 2)
    : []
  const disclaimer = '本標示由「烘焙帳本」公開資料庫試算,僅供參考;販售用正式標示依法應以實際檢驗數據為準,使用前請自行核對。'
  const discLines = wrapText(ctx, disclaimer, W - PAD * 2)

  const tableTop = 118
  const tableH = rowH * (NUTR.length + 1)
  const noteTop = tableTop + tableH + 12
  const alTop = noteTop + noteLines.length * 18 + (alLines.length ? 10 : 0)
  const warnTop = alTop + alLines.length * 18 + (noNutrLines.length ? 8 : 0)
  const discTop = warnTop + noNutrLines.length * 18 + 16
  const H = discTop + discLines.length * 18 + PAD

  cv.width = W * SCALE
  cv.height = H * SCALE
  ctx.scale(SCALE, SCALE)

  /* ---- 背景與外框 ---- */
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = '#1a1a1a'
  ctx.lineWidth = 2.5
  ctx.strokeRect(8, 8, W - 16, H - 16)

  ctx.fillStyle = '#1a1a1a'
  ctx.textBaseline = 'middle'

  /* 標題與品名 */
  ctx.font = `bold 22px ${FONT}`
  ctx.textAlign = 'center'
  ctx.fillText('營養標示', W / 2, 40)
  ctx.font = `13px ${FONT}`
  ctx.fillText(`${r.name} · 每一份量 ${fmt(labelGrams / s)} 公克 · 本包裝含 ${s} 份`, W / 2, 68)

  /* 表格 */
  const colX = [PAD, W * 0.42, W * 0.62, W * 0.8, W - PAD] // 欄位左緣/右緣基準
  const rows = [
    ['', '每份', '每100公克', '每日參考值%'],
    ...NUTR.map(([k, zh, unit, d, dv]) => [
      zh,
      `${fmt(c.tot[k] / s, d)} ${unit}`,
      `${fmt((c.tot[k] * 100) / Math.max(labelGrams, 1), d)} ${unit}`,
      dv ? fmt((c.tot[k] / s / dv) * 100) + '%' : '＊',
    ]),
  ]
  ctx.lineWidth = 1
  rows.forEach((cells, i) => {
    const y = tableTop + i * rowH
    ctx.font = `${i === 0 ? 'bold ' : ''}13.5px ${FONT}`
    ctx.textAlign = 'left'
    ctx.fillText(cells[0], colX[0], y + rowH / 2)
    ctx.textAlign = 'right'
    ctx.fillText(cells[1], colX[2] - 8, y + rowH / 2)
    ctx.fillText(cells[2], colX[3] + 12, y + rowH / 2)
    ctx.fillText(cells[3], colX[4], y + rowH / 2)
    ctx.strokeStyle = i === 0 ? '#1a1a1a' : '#d9d2c5'
    ctx.beginPath()
    ctx.moveTo(PAD, y + rowH)
    ctx.lineTo(W - PAD, y + rowH)
    ctx.stroke()
  })
  /* 表格頂線 */
  ctx.strokeStyle = '#1a1a1a'
  ctx.beginPath(); ctx.moveTo(PAD, tableTop); ctx.lineTo(W - PAD, tableTop); ctx.stroke()

  /* 參考值註腳 */
  ctx.textAlign = 'left'
  ctx.font = `12px ${FONT}`
  ctx.fillStyle = '#555'
  noteLines.forEach((l, i) => ctx.fillText(l, PAD, noteTop + i * 18 + 8))

  /* 過敏原 */
  ctx.fillStyle = '#1a1a1a'
  ctx.font = `bold 13px ${FONT}`
  alLines.forEach((l, i) => ctx.fillText(l, PAD, alTop + i * 18 + 8))

  /* 無資料警示 */
  ctx.fillStyle = '#b3541e'
  ctx.font = `12px ${FONT}`
  noNutrLines.forEach((l, i) => ctx.fillText(l, PAD, warnTop + i * 18 + 8))

  /* 免責聲明(烙印) */
  ctx.fillStyle = '#777'
  ctx.font = `11.5px ${FONT}`
  discLines.forEach((l, i) => ctx.fillText(l, PAD, discTop + i * 18 + 8))

  cv.toBlob(blob => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${r.name}-營養標示.png`
    a.click()
    URL.revokeObjectURL(a.href)
  }, 'image/png')
}
