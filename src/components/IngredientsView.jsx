import { fmt } from '../lib/calc.js'

export default function IngredientsView({ ING, isEditor, onEdit, onAdd, onDelete }) {
  const list = Object.values(ING).sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'))
  return (
    <>
      <div className="flex flex-wrap items-baseline gap-3.5 border-b-[3px] border-ink pb-3">
        <h2 className="font-serif text-[28px] font-bold">材料主檔</h2>
        {isEditor && (
          <span className="ml-auto">
            <button className="btn btn-sm btn-primary" onClick={onAdd}>＋ 新增材料</button>
          </span>
        )}
      </div>
      <p className="mb-4 mt-3.5 text-[13px] text-ink-soft">
        共 {list.length} 種材料。點「編輯」直接改價格、營養與過敏原,改完所有食譜自動重算。
      </p>
      <div className="overflow-x-auto">
        <table className="ltable">
          <thead>
            <tr>
              <th>材料</th><th>廠牌</th><th className="num">採購價</th><th className="num">採購量 g</th>
              <th className="num">$/100g</th><th className="num">大卡/100g</th><th className="num">蛋白質</th>
              <th className="num">脂肪</th><th className="num">飽和脂肪</th><th className="num">反式脂肪</th>
              <th className="num">碳水</th><th className="num">糖</th><th className="num">鈉 mg</th>
              <th>過敏原</th>
              {isEditor && <th>操作</th>}
            </tr>
          </thead>
          <tbody>
            {list.map(i => {
              const p = i.per100g
              return (
                <tr key={i._id}>
                  <td>
                    {i.name}
                    {i.spec && <span className="ml-1 text-[11px] text-ink-soft">{i.spec}</span>}
                  </td>
                  <td className="text-[12.5px] text-ink-soft">{i.brand || '—'}</td>
                  <td className="num">${fmt(i.packPrice)}</td>
                  <td className="num">{fmt(i.packGrams)}</td>
                  <td className="num">${fmt((i.packPrice * 100) / (i.packGrams || 1), 1)}</td>
                  {p ? (
                    <>
                      <td className="num">{fmt(p.kcal)}</td>
                      <td className="num">{fmt(p.protein, 1)}</td>
                      <td className="num">{fmt(p.fat, 1)}</td>
                      <td className="num">{fmt(p.satFat || 0, 1)}</td>
                      <td className="num">{fmt(p.transFat || 0, 2)}</td>
                      <td className="num">{fmt(p.carbs, 1)}</td>
                      <td className="num">{fmt(p.sugar, 1)}</td>
                      <td className="num">{fmt(p.sodium || 0)}</td>
                    </>
                  ) : (
                    <td colSpan={8} className="text-center text-[12px] text-warn">無資料</td>
                  )}
                  <td className="whitespace-nowrap text-[11.5px] text-ink-soft">
                    {(i.allergens || []).join('、') || '—'}
                    {i.mayContain?.length > 0 && <span title="可能含有">(可:{i.mayContain.join('、')})</span>}
                  </td>
                  {isEditor && (
                    <td className="whitespace-nowrap">
                      <button className="btn btn-sm" onClick={() => onEdit(i._id)}>編輯</button>
                      <button className="btn btn-sm btn-danger ml-1" onClick={() => onDelete(i._id)}>刪除</button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
