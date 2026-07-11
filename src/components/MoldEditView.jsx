import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fmt } from '../lib/calc.js'
import { MOLD_SHAPES, moldVolume } from '../lib/molds.js'
import { moldPath } from '../lib/slug.js'
import { toast } from '../lib/toast.js'
import { findSimilar } from '../lib/dedup.js'

/* 直徑類欄位支援 吋/cm 輸入(存檔一律換算成 cm;1吋=2.54cm) */
function DiaInput({ label, value, unit, setValue, setUnit, required = true }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div className="flex gap-1.5">
        <input type="number" min="0" step="0.1" value={value} required={required}
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

/* 模具新增/編輯整頁(/mold/new、/mold/:id/edit),取代 MoldDialog。
   欄位跟原對話框一致;新增模式加查重提示(平台化大改造第 4 項)。 */
export default function MoldEditView({ mold, molds, onSave }) {
  const navigate = useNavigate()
  const isNew = !mold
  const d0 = mold?.dims || {}
  const [name, setName] = useState(mold?.name || '')
  const [brand, setBrand] = useState(mold?.brand || '')
  const [count, setCount] = useState(mold?.count ?? 1)
  const [dataSource, setDataSource] = useState(mold?.dataSource || 'manual')
  const [shape, setShape] = useState(mold?.shape || 'round')

  /* round/tart/tube:上下開口徑(型錄常見上大下小的錐形,取平均當柱體算) */
  const [topD, setTopD] = useState(d0.topD ?? d0.d ?? '')
  const [botD, setBotD] = useState(d0.bottomD ?? d0.d ?? '')
  const [diaUnit, setDiaUnit] = useState('cm')
  const [innerD, setInnerD] = useState(d0.innerD ?? '')

  /* square:上下邊長 */
  const [sqTopW, setSqTopW] = useState(d0.topW ?? d0.w ?? '')
  const [sqBotW, setSqBotW] = useState(d0.botW ?? d0.w ?? '')

  /* rect:上下長寬(磅蛋糕模、吐司盒常見) */
  const [rTopL, setRTopL] = useState(d0.topL ?? d0.l ?? '')
  const [rBotL, setRBotL] = useState(d0.botL ?? d0.l ?? '')
  const [rTopW, setRTopW] = useState(d0.topW ?? d0.w ?? '')
  const [rBotW, setRBotW] = useState(d0.botW ?? d0.w ?? '')

  const [hei, setHei] = useState(d0.h ?? '')

  /* log:臥式圓柱(長條圓吐司模),直徑+長度 */
  const [logD, setLogD] = useState(d0.d ?? '')
  const [logLen, setLogLen] = useState(d0.length ?? '')

  const [vol, setVol] = useState(mold?.volume ?? '')
  const [note, setNote] = useState(mold?.note || '')
  const [saving, setSaving] = useState(false)

  const similar = useMemo(
    () => (isNew ? findSimilar(name, molds, null) : []),
    [isNew, name, molds],
  )

  const v = x => { const f = parseFloat(x); return Number.isFinite(f) && f > 0 ? f : 0 }
  const toCm = (x, unit) => v(x) * (unit === 'in' ? 2.54 : 1)

  const buildDoc = () => {
    const dims =
      shape === 'round' || shape === 'tart'
        ? { topD: toCm(topD, diaUnit), bottomD: toCm(botD, diaUnit), h: v(hei) }
      : shape === 'square' ? { topW: v(sqTopW), botW: v(sqBotW), h: v(hei) }
      : shape === 'rect' ? { topL: v(rTopL), botL: v(rBotL), topW: v(rTopW), botW: v(rBotW), h: v(hei) }
      : shape === 'tube' ? { topD: toCm(topD, diaUnit), bottomD: toCm(botD, diaUnit), innerD: v(innerD), h: v(hei) }
      : shape === 'log' ? { d: toCm(logD, diaUnit), length: v(logLen) }
      : {}
    return {
      name: name.trim(), brand: brand.trim(), count: Math.max(1, parseInt(count, 10) || 1),
      shape, dims, volume: v(vol), note: note.trim(), dataSource,
    }
  }

  const preview = moldVolume(buildDoc())
  const cancel = () => navigate(mold ? moldPath(mold) : '/molds')

  const submit = async e => {
    e.preventDefault()
    const doc = buildDoc()
    if (!doc.name) return
    if (!(moldVolume(doc) > 0)) { toast('尺寸(或容積)必須填寫完整,容積要大於 0 才能用於換算。', { type: 'error' }); return }
    setSaving(true)
    try {
      await onSave(mold || null, doc)
    } catch (err) {
      toast('儲存失敗:' + err.message, { type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-baseline gap-3.5 border-b-[3px] border-ink pb-3">
        <button className="btn btn-sm" onClick={cancel}>← 取消</button>
        <h2 className="font-serif text-[28px] font-bold">{mold ? `編輯:${mold.name}` : '新增模具'}</h2>
      </div>

      <form onSubmit={submit} className="mt-5">
        <div className="grid grid-cols-1 gap-x-3.5 gap-y-2.5 sm:grid-cols-2">
          <div className="field sm:col-span-2">
            <label>模具名稱(不含廠牌,廠牌另外填)</label>
            <input value={name} onChange={e => setName(e.target.value)} required autoFocus
              placeholder="例:6吋活動圓模" />
          </div>

          {similar.length > 0 && (
            <div className="sm:col-span-2 rounded-[--radius-sm] border border-warn/40 bg-warn/5 px-3 py-2 text-[13px]">
              <span className="font-bold text-warn">已有相似模具:</span>
              {similar.map((s, i) => (
                <span key={s._id}>
                  {i > 0 && '、'}
                  <button type="button" className="underline underline-offset-2 hover:text-yolk"
                    onClick={() => navigate(moldPath(s))}>
                    {s.name}{s.brand ? `(${s.brand})` : ''}
                  </button>
                </span>
              ))}
              <span className="text-ink-soft"> ——先看看是不是同一個(注意廠牌/高度),確定不同再繼續新增。</span>
            </div>
          )}

          <div className="field">
            <label>廠牌(可空)</label>
            <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="例:三能" />
          </div>
          <div className="field">
            <label>模具入數(連模幾入;單一模填1)</label>
            <input type="number" min="1" step="1" value={count} onChange={e => setCount(e.target.value)} />
          </div>
          <div className="field">
            <label>資料來源(信心度標記,不影響計算)</label>
            <select value={dataSource} onChange={e => setDataSource(e.target.value)}
              className="rounded-md border border-line bg-white px-2.5 py-1.5 text-sm">
              <option value="catalog">廠商官方型錄</option>
              <option value="web">網路搜尋整理</option>
              <option value="manual">自己量測</option>
            </select>
          </div>
          <div className="field">
            <label>形狀</label>
            <select value={shape} onChange={e => setShape(e.target.value)}
              className="rounded-md border border-line bg-white px-2.5 py-1.5 text-sm">
              {MOLD_SHAPES.map(([k, zh]) => <option key={k} value={k}>{zh}</option>)}
            </select>
          </div>

          {(shape === 'round' || shape === 'tart' || shape === 'tube') && (
            <>
              <DiaInput label="上開口徑" value={topD} unit={diaUnit} setValue={setTopD} setUnit={setDiaUnit} />
              <DiaInput label="下開口徑(同上開口可填一樣)" value={botD} unit={diaUnit} setValue={setBotD} setUnit={setDiaUnit} />
            </>
          )}
          {shape === 'tube' && (
            <div className="field">
              <label>中柱直徑(cm)</label>
              <input type="number" min="0" step="0.1" value={innerD} onChange={e => setInnerD(e.target.value)} required />
            </div>
          )}
          {shape === 'square' && (
            <>
              <div className="field">
                <label>上開口邊長(cm)</label>
                <input type="number" min="0" step="0.1" value={sqTopW} onChange={e => setSqTopW(e.target.value)} required />
              </div>
              <div className="field">
                <label>下開口邊長(同上可填一樣)</label>
                <input type="number" min="0" step="0.1" value={sqBotW} onChange={e => setSqBotW(e.target.value)} required />
              </div>
            </>
          )}
          {shape === 'rect' && (
            <>
              <div className="field">
                <label>上開口長(cm)</label>
                <input type="number" min="0" step="0.1" value={rTopL} onChange={e => setRTopL(e.target.value)} required />
              </div>
              <div className="field">
                <label>下開口長(同上可填一樣)</label>
                <input type="number" min="0" step="0.1" value={rBotL} onChange={e => setRBotL(e.target.value)} required />
              </div>
              <div className="field">
                <label>上開口寬(cm)</label>
                <input type="number" min="0" step="0.1" value={rTopW} onChange={e => setRTopW(e.target.value)} required />
              </div>
              <div className="field">
                <label>下開口寬(同上可填一樣)</label>
                <input type="number" min="0" step="0.1" value={rBotW} onChange={e => setRBotW(e.target.value)} required />
              </div>
            </>
          )}
          {(shape === 'round' || shape === 'square' || shape === 'rect' || shape === 'tube' || shape === 'tart') && (
            <div className="field">
              <label>高(cm)</label>
              <input type="number" min="0" step="0.1" value={hei} onChange={e => setHei(e.target.value)} required />
            </div>
          )}
          {shape === 'log' && (
            <>
              <DiaInput label="直徑" value={logD} unit={diaUnit} setValue={setLogD} setUnit={setDiaUnit} />
              <div className="field">
                <label>長度(cm)</label>
                <input type="number" min="0" step="0.1" value={logLen} onChange={e => setLogLen(e.target.value)} required />
              </div>
            </>
          )}
          <div className="field sm:col-span-2">
            <label>
              {shape === 'other' ? '容積(cm³;裝滿水秤重,1g 水 ≈ 1cm³)' : '容積覆寫(cm³,選填;留空用上面尺寸公式算)'}
            </label>
            <input type="number" min="0" step="1" value={vol} onChange={e => setVol(e.target.value)}
              required={shape === 'other'}
              placeholder={shape === 'other' ? '' : '型錄有實測值、或中柱比外壁高導致公式失真時才填'} />
          </div>
          <div className="field sm:col-span-2">
            <label>備註(可空)</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="例:活動底、拉高版、型號" />
          </div>
        </div>
        <p className="mt-3 text-[13px] text-ink-soft">
          容積試算:<b className="font-mono text-ink">{preview > 0 ? `${fmt(preview)} cc` : '—'}</b>
          (換算倍率 = 目標模具容積 ÷ 原模具容積)
        </p>

        <div className="mt-6 flex justify-end gap-2 border-t-2 border-ink pt-3">
          <button type="button" className="btn" onClick={cancel} disabled={saving}>取消</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? '儲存中…' : '儲存'}
          </button>
        </div>
      </form>
    </div>
  )
}
