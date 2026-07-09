import { fmt } from '../lib/calc.js'
import { shapeName, moldVolume, moldDimsText } from '../lib/molds.js'

/* 模具庫:幾何制模具主檔(配方換算的基礎) */
export default function MoldsView({ molds, RCP, isEditor, onEdit, onAdd, onDelete }) {
  const list = [...molds].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'))
  const usedCount = id => RCP.filter(r => r.moldId === id).length

  return (
    <>
      <div className="flex flex-wrap items-baseline gap-3.5 border-b-[3px] border-ink pb-3">
        <h2 className="font-serif text-[28px] font-bold">模具庫</h2>
        <span className="text-[13px] text-ink-soft">共 {list.length} 個</span>
        {isEditor && (
          <span className="ml-auto">
            <button className="btn btn-sm btn-primary" onClick={onAdd}>＋ 新增模具</button>
          </span>
        )}
      </div>
      <p className="mb-4 mt-3.5 max-w-2xl text-[13px] text-ink-soft">
        模具以<b>幾何尺寸</b>登記(品牌寫在名稱當識別,計算只看尺寸);同直徑不同高度(拉高版)請建成兩筆。
        食譜綁定模具後,就能用「⇄ 換算」把配方換算到別的模具。
      </p>
      {list.length === 0 ? (
        <p className="mt-6 text-sm text-ink-soft">
          還沒有模具。{isEditor ? '按「＋ 新增模具」建立第一個(例:6吋圓模、方形模21.5cm)。' : '登入後即可建立。'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="ltable">
            <thead>
              <tr>
                <th>名稱</th><th>形狀</th><th>尺寸</th><th className="num">容積 cm³</th>
                <th className="num">使用中食譜</th><th>備註</th>
                {isEditor && <th>操作</th>}
              </tr>
            </thead>
            <tbody>
              {list.map(m => (
                <tr key={m._id}>
                  <td>{m.name}</td>
                  <td>{shapeName(m.shape)}</td>
                  <td className="font-mono text-[12.5px]">{moldDimsText(m)}</td>
                  <td className="num">{fmt(moldVolume(m))}</td>
                  <td className="num">{usedCount(m._id) || '—'}</td>
                  <td className="text-[12.5px] text-ink-soft">{m.note || '—'}</td>
                  {isEditor && (
                    <td className="whitespace-nowrap">
                      <button className="btn btn-sm" onClick={() => onEdit(m._id)}>編輯</button>
                      <button className="btn btn-sm btn-danger ml-1" onClick={() => onDelete(m._id)}>刪除</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
