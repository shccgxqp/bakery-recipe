/* 模具:形狀定義與容積計算(幾何制——倍率由容積決定,品牌只是名稱備註)
   尺寸一律以公分儲存。多數烘焙模具上大下小(活動模、固定模皆然),
   round/square/rect/tube 都存「上下兩組尺寸」,容積用「上下平均值」當柱體算
   (實測誤差 <1%,見 圓塔模與塔皮模規格容量表.md 驗證);只給單一尺寸時上下視為相同,
   舊資料({d,h} 等單一尺寸格式)照樣相容。
   任何形狀都可用 volume 欄位覆寫算出來的容積(型錄實測值優先於公式,
   戚風模中柱常比外壁高,公式失真時尤其需要)。 */

export const MOLD_SHAPES = [
  ['round', '圓模'],
  ['square', '方模'],
  ['rect', '長方模(磅蛋糕條)'],
  ['tube', '中空模(戚風)'],
  ['tart', '塔圈/派盤'],
  ['log', '臥式圓柱(長條吐司模)'],
  ['other', '其他(手動填容積)'],
]

export const shapeName = s => MOLD_SHAPES.find(([k]) => k === s)?.[1] || s

const avg = (a, b) => ((Number.isFinite(a) ? a : b) + (Number.isFinite(b) ? b : a)) / 2

/* 公式算出的單穴容積 cm³(不含 volume 覆寫) */
function formulaVolume(m) {
  const d = m.dims || {}
  switch (m.shape) {
    case 'round':
    case 'tart': {
      const dia = avg(d.topD ?? d.d, d.bottomD ?? d.d)
      return Math.PI * (dia / 2) ** 2 * d.h || 0
    }
    case 'square': {
      const w = avg(d.topW ?? d.w, d.botW ?? d.w)
      return w * w * d.h || 0
    }
    case 'rect': {
      const l = avg(d.topL ?? d.l, d.botL ?? d.l)
      const w = avg(d.topW ?? d.w, d.botW ?? d.w)
      return l * w * d.h || 0
    }
    case 'tube': {
      const dia = avg(d.topD ?? d.d, d.bottomD ?? d.d)
      return Math.max(0, Math.PI * ((dia / 2) ** 2 - ((d.innerD || 0) / 2) ** 2) * d.h) || 0
    }
    case 'log':
      return Math.PI * (d.d / 2) ** 2 * d.length || 0
    default:
      return 0
  }
}

/* 單穴容積 cm³:有 volume 就用實測覆寫,沒有才用公式算(other 形狀只能靠 volume) */
function cavityVolume(m) {
  return m.volume > 0 ? m.volume : formulaVolume(m)
}

/* 總容積 cm³ = 單穴容積 × 連穴數(count 預設 1;食譜一份對應一整模,含全部穴數) */
export function moldVolume(m) {
  return cavityVolume(m) * (m.count || 1)
}

/* 尺寸描述文字,如「Ø15.2×高7cm」;上下徑不同才顯示兩個數字;連模附註穴數 */
export function moldDimsText(m) {
  const d = m.dims || {}
  const n = v => (Number.isFinite(v) ? +v.toFixed(1) : '?')
  const pair = (top, bot) => (Number.isFinite(top) && Number.isFinite(bot) && top !== bot
    ? `${n(top)}/${n(bot)}` : n(top ?? bot))
  const base = (() => {
    switch (m.shape) {
      case 'round':
      case 'tart':
        return `Ø${pair(d.topD ?? d.d, d.bottomD ?? d.d)}×高${n(d.h)}cm`
      case 'square':
        return `${pair(d.topW ?? d.w, d.botW ?? d.w)}邊×高${n(d.h)}cm`
      case 'rect':
        return `${pair(d.topL ?? d.l, d.botL ?? d.l)}×${pair(d.topW ?? d.w, d.botW ?? d.w)}×高${n(d.h)}cm`
      case 'tube':
        return `Ø${pair(d.topD ?? d.d, d.bottomD ?? d.d)}(中柱Ø${n(d.innerD)})×高${n(d.h)}cm`
      case 'log':
        return `Ø${n(d.d)}×長${n(d.length)}cm(臥式)`
      default:
        return '手動容積'
    }
  })()
  return m.count > 1 ? `${base} ×${m.count}入` : base
}
