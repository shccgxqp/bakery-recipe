/* 模具:形狀定義與容積計算(幾何制——倍率由容積決定,品牌只是名稱備註)
   尺寸一律以公分儲存;「其他」形狀直接填實測容積(裝水量 g ≈ cm³) */

export const MOLD_SHAPES = [
  ['round', '圓模'],
  ['square', '方模'],
  ['rect', '長方模(磅蛋糕條)'],
  ['tube', '中空模(戚風)'],
  ['tart', '塔圈/派盤'],
  ['other', '其他(手動填容積)'],
]

export const shapeName = s => MOLD_SHAPES.find(([k]) => k === s)?.[1] || s

/* 容積 cm³ */
export function moldVolume(m) {
  const d = m.dims || {}
  switch (m.shape) {
    case 'round':
    case 'tart':
      return Math.PI * (d.d / 2) ** 2 * d.h || 0
    case 'square':
      return d.w * d.w * d.h || 0
    case 'rect':
      return d.l * d.w * d.h || 0
    case 'tube':
      return Math.max(0, Math.PI * ((d.d / 2) ** 2 - ((d.innerD || 0) / 2) ** 2) * d.h) || 0
    default:
      return m.volume || 0
  }
}

/* 尺寸描述文字,如「Ø15.2×高7cm」 */
export function moldDimsText(m) {
  const d = m.dims || {}
  const n = v => (Number.isFinite(v) ? +v.toFixed(1) : '?')
  switch (m.shape) {
    case 'round':
    case 'tart':
      return `Ø${n(d.d)}×高${n(d.h)}cm`
    case 'square':
      return `${n(d.w)}×${n(d.w)}×高${n(d.h)}cm`
    case 'rect':
      return `${n(d.l)}×${n(d.w)}×高${n(d.h)}cm`
    case 'tube':
      return `Ø${n(d.d)}(中柱Ø${n(d.innerD)})×高${n(d.h)}cm`
    default:
      return '手動容積'
  }
}
