/* 模具尺寸顯示單位(純顯示層轉換;資料庫一律存 cm,不影響計算)
   偏好存 localStorage,跨頁籤沿用同一顯示單位 */
export const LENGTH_UNITS = [
  ['cm', 'cm'],
  ['mm', 'mm'],
  ['in', '吋'],
]

const KEY = 'bakery-mold-unit'

export const loadUnitPref = () => {
  const v = localStorage.getItem(KEY)
  return LENGTH_UNITS.some(([k]) => k === v) ? v : 'cm'
}
export const saveUnitPref = u => localStorage.setItem(KEY, u)

/* cm → 顯示單位;回傳 { value, decimals } */
export function fromCm(cm, unit) {
  if (!Number.isFinite(cm)) return null
  if (unit === 'mm') return { value: cm * 10, decimals: 0 }
  if (unit === 'in') return { value: cm / 2.54, decimals: 2 }
  return { value: cm, decimals: 1 }
}

export function fmtLen(cm, unit) {
  const r = fromCm(cm, unit)
  return r ? r.value.toFixed(r.decimals) : '?'
}
