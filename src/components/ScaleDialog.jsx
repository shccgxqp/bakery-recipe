import { useState, useMemo } from 'react'
import Dialog from './Dialog.jsx'
import { fmt } from '../lib/calc.js'
import { moldVolume, moldDimsText } from '../lib/molds.js'
import { loadUnitPref } from '../lib/units.js'

/* 配方換算:按份數(任何食譜)或按模具(食譜需綁定模具)
   結果唯讀+可複製;倍率僅供參考,烤溫烤時需人工調整 */
export default function ScaleDialog({ recipe: r, ING, molds, onClose }) {
  const srcMold = molds.find(m => m._id === r.moldId)
  const unit = loadUnitPref()
  const [mode, setMode] = useState('servings') // servings | mold
  const [target, setTarget] = useState((r.servings || 1) * 2)
  const [dstId, setDstId] = useState('')
  const [copied, setCopied] = useState(false)

  const dstMold = molds.find(m => m._id === dstId)
  const factor = useMemo(() => {
    if (mode === 'servings') {
      const t = parseFloat(target)
      return t > 0 ? t / (r.servings || 1) : 0
    }
    if (!srcMold || !dstMold) return 0
    const a = moldVolume(srcMold), b = moldVolume(dstMold)
    return a > 0 && b > 0 ? b / a : 0
  }, [mode, target, dstMold, srcMold, r.servings])

  const rows = useMemo(() => {
    if (!(factor > 0)) return []
    return r.items.map(it => ({
      name: ING[it.ingredientId]?.name || '(材料已刪除)',
      layer: it.layer || '',
      from: it.grams,
      to: it.grams * factor,
    }))
  }, [factor, r.items, ING])

  const text = useMemo(() => {
    if (!rows.length) return ''
    const head = mode === 'servings'
      ? `${r.servings} 份 → ${target} 份`
      : `${srcMold?.name} → ${dstMold?.name}`
    const lines = [`⇄ ${r.name} 配方換算(${head},×${fmt(factor, 2)})`, '']
    let layer = null
    for (const row of rows) {
      if (row.layer !== layer) { layer = row.layer; if (layer) lines.push(`◆ ${layer}`) }
      lines.push(`${row.name}  ${fmt(row.to, 1)}g(原 ${fmt(row.from, 1)}g)`)
    }
    if (mode === 'mold') lines.push('', `預估份數:約 ${Math.max(1, Math.round((r.servings || 1) * factor))} 份`)
    lines.push('', '⚠ 倍率僅供參考,烤溫、烤時請自行調整。')
    return lines.join('\n')
  }, [rows, mode, factor, r, target, srcMold, dstMold])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch { alert('複製失敗,瀏覽器不支援剪貼簿權限。') }
  }

  return (
    <Dialog
      title={`配方換算:${r.name}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>關閉</button>
          <button type="button" className="btn btn-primary" disabled={!text} onClick={copy}>
            {copied ? '✓ 已複製' : '📋 複製換算結果'}
          </button>
        </>
      }
    >
      <div className="flex gap-1.5">
        {[['servings', '按份數'], ['mold', '按模具']].map(([k, zh]) => (
          <button key={k} type="button" onClick={() => setMode(k)}
            className={'rounded-full border px-3 py-1 text-[13px] ' +
              (mode === k ? 'border-ink bg-yolk-soft font-bold' : 'border-line text-ink-soft hover:border-yolk')}>
            {zh}
          </button>
        ))}
      </div>

      {mode === 'servings' ? (
        <div className="mt-3 flex items-center gap-2 text-sm">
          原 {r.servings || 1} 份 → 目標
          <input type="number" min="1" step="1" value={target} onChange={e => setTarget(e.target.value)}
            className="w-20 rounded-md border border-line bg-white px-2 py-1.5 text-right font-mono text-sm" />
          份
        </div>
      ) : !srcMold ? (
        <p className="mt-3 text-[13px] text-warn">
          這道食譜還沒綁定模具——請先「編輯」食譜,在「模具」欄選擇原本使用的模具
          (模具庫裡沒有就先去「模具庫」新增),回來才能按模具換算。
        </p>
      ) : (
        <div className="mt-3 space-y-2 text-sm">
          <div className="text-[13px] text-ink-soft">
            原模具:{srcMold.name}({moldDimsText(srcMold, unit)},{fmt(moldVolume(srcMold))} cc)
          </div>
          <div className="flex items-center gap-2">
            換到
            <select value={dstId} onChange={e => setDstId(e.target.value)}
              className="rounded-md border border-line bg-white px-2 py-1.5 text-sm">
              <option value="">選擇目標模具…</option>
              {molds.filter(m => m._id !== srcMold._id).map(m => (
                <option key={m._id} value={m._id}>{m.name}({fmt(moldVolume(m))} cc)</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {factor > 0 && rows.length > 0 && (
        <>
          <p className="mt-3 text-[13px]">
            倍率 <b className="font-mono text-yolk">×{fmt(factor, 2)}</b>
            {mode === 'mold' && <> · 預估約 {Math.max(1, Math.round((r.servings || 1) * factor))} 份</>}
          </p>
          <table className="ltable mt-2">
            <thead>
              <tr><th>材料</th><th className="num">原 g</th><th className="num">換算後 g</th></tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  <td>{row.layer && <span className="mr-1 text-[11px] text-ink-soft">[{row.layer}]</span>}{row.name}</td>
                  <td className="num">{fmt(row.from, 1)}</td>
                  <td className="num font-bold">{fmt(row.to, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-warn">⚠ 倍率僅供參考,烤溫、烤時請自行調整。</p>
        </>
      )}
    </Dialog>
  )
}
