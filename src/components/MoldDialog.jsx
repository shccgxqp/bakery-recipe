import { useState } from 'react'
import Dialog from './Dialog.jsx'
import { fmt } from '../lib/calc.js'
import { MOLD_SHAPES, moldVolume } from '../lib/molds.js'

/* 直徑類欄位支援 吋/cm 輸入(存檔一律換算成 cm;1吋=2.54cm) */
function DiaInput({ label, value, unit, setValue, setUnit }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="flex gap-1.5">
        <input type="number" min="0" step="0.1" value={value} required
          onChange={e => setValue(e.target.value)}
          className="min-w-0 flex-1" />
        <select value={unit} onChange={e => setUnit(e.target.value)}
          className="rounded-md border border-line bg-white px-1.5 text-sm">
          <option value="cm">cm</option>
          <option value="in">吋</option>
        </select>
      </div>
    </div>
  )
}

export default function MoldDialog({ mold, onSave, onClose }) {
  const [name, setName] = useState(mold?.name || '')
  const [brand, setBrand] = useState(mold?.brand || '')
  const [count, setCount] = useState(mold?.count ?? 1)
  const [shape, setShape] = useState(mold?.shape || 'round')
  const [dia, setDia] = useState(mold?.dims?.d ?? '')
  const [diaUnit, setDiaUnit] = useState('cm')
  const [innerD, setInnerD] = useState(mold?.dims?.innerD ?? '')
  const [len, setLen] = useState(mold?.dims?.l ?? '')
  const [wid, setWid] = useState(mold?.dims?.w ?? '')
  const [hei, setHei] = useState(mold?.dims?.h ?? '')
  const [vol, setVol] = useState(mold?.volume ?? '')
  const [note, setNote] = useState(mold?.note || '')
  const [saving, setSaving] = useState(false)

  const v = x => { const f = parseFloat(x); return Number.isFinite(f) && f > 0 ? f : 0 }
  const toCm = (x, unit) => v(x) * (unit === 'in' ? 2.54 : 1)

  const buildDoc = () => {
    const dims =
      shape === 'round' || shape === 'tart' ? { d: toCm(dia, diaUnit), h: v(hei) }
      : shape === 'square' ? { w: v(wid), h: v(hei) }
      : shape === 'rect' ? { l: v(len), w: v(wid), h: v(hei) }
      : shape === 'tube' ? { d: toCm(dia, diaUnit), innerD: v(innerD), h: v(hei) }
      : {}
    return {
      name: name.trim(), brand: brand.trim(), count: Math.max(1, parseInt(count, 10) || 1),
      shape, dims, volume: shape === 'other' ? v(vol) : null, note: note.trim(),
    }
  }

  const preview = moldVolume(buildDoc())

  const submit = async e => {
    e.preventDefault()
    const doc = buildDoc()
    if (!doc.name) return
    if (!(moldVolume(doc) > 0)) { alert('尺寸(或容積)必須填寫完整,容積要大於 0 才能用於換算。'); return }
    setSaving(true)
    try {
      await onSave(mold || null, doc)
    } catch (err) {
      alert('儲存失敗:' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      title={mold ? `編輯:${mold.name}` : '新增模具'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={saving}>取消</button>
          <button type="submit" form="mold-form" className="btn btn-primary" disabled={saving}>
            {saving ? '儲存中…' : '儲存'}
          </button>
        </>
      }
    >
      <form id="mold-form" onSubmit={submit}>
        <div className="grid grid-cols-1 gap-x-3.5 gap-y-2.5 sm:grid-cols-2">
          <div className="field sm:col-span-2">
            <label>模具名稱(不含廠牌,廠牌另外填)</label>
            <input value={name} onChange={e => setName(e.target.value)} required autoFocus
              placeholder="例:6吋活動圓模" />
          </div>
          <div className="field">
            <label>廠牌(可空)</label>
            <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="例:三能" />
          </div>
          <div className="field">
            <label>連穴數(單模幾穴;非連模填1)</label>
            <input type="number" min="1" step="1" value={count} onChange={e => setCount(e.target.value)} />
          </div>
          <div className="field sm:col-span-2">
            <label>形狀</label>
            <select value={shape} onChange={e => setShape(e.target.value)}
              className="rounded-md border border-line bg-white px-2.5 py-1.5 text-sm">
              {MOLD_SHAPES.map(([k, zh]) => <option key={k} value={k}>{zh}</option>)}
            </select>
          </div>

          {(shape === 'round' || shape === 'tart' || shape === 'tube') && (
            <DiaInput label={shape === 'tube' ? '外徑' : '直徑'} value={dia} unit={diaUnit}
              setValue={setDia} setUnit={setDiaUnit} />
          )}
          {shape === 'tube' && (
            <div className="field">
              <label>中柱直徑(cm)</label>
              <input type="number" min="0" step="0.1" value={innerD} onChange={e => setInnerD(e.target.value)} required />
            </div>
          )}
          {shape === 'rect' && (
            <div className="field">
              <label>長(cm)</label>
              <input type="number" min="0" step="0.1" value={len} onChange={e => setLen(e.target.value)} required />
            </div>
          )}
          {(shape === 'square' || shape === 'rect') && (
            <div className="field">
              <label>{shape === 'square' ? '邊長(cm)' : '寬(cm)'}</label>
              <input type="number" min="0" step="0.1" value={wid} onChange={e => setWid(e.target.value)} required />
            </div>
          )}
          {shape !== 'other' && (
            <div className="field">
              <label>高(cm)</label>
              <input type="number" min="0" step="0.1" value={hei} onChange={e => setHei(e.target.value)} required />
            </div>
          )}
          {shape === 'other' && (
            <div className="field">
              <label>容積(cm³;裝滿水秤重,1g 水 ≈ 1cm³)</label>
              <input type="number" min="0" step="1" value={vol} onChange={e => setVol(e.target.value)} required />
            </div>
          )}
          <div className="field sm:col-span-2">
            <label>備註(可空)</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="例:活動底、拉高版" />
          </div>
        </div>
        <p className="mt-3 text-[13px] text-ink-soft">
          容積試算:<b className="font-mono text-ink">{preview > 0 ? `${fmt(preview)} cm³` : '—'}</b>
          (換算倍率 = 目標模具容積 ÷ 原模具容積)
        </p>
      </form>
    </Dialog>
  )
}
