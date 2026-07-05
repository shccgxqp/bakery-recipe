import { fmt } from '../lib/calc.js'

export default function IngredientsView({ ING, isEditor, onEdit, onAdd, onDelete }) {
  const names = Object.keys(ING)
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
        共 {names.length} 種材料。點「編輯」直接改價格與營養,改完所有食譜自動重算。
      </p>
      <div className="overflow-x-auto">
        <table className="ltable">
          <thead>
            <tr>
              <th>材料</th><th className="num">採購價</th><th className="num">採購量 g</th>
              <th className="num">$/100g</th><th className="num">大卡/100g</th><th className="num">蛋白質</th>
              <th className="num">脂肪</th><th className="num">碳水</th><th className="num">糖</th>
              {isEditor && <th>操作</th>}
            </tr>
          </thead>
          <tbody>
            {names.map(n => {
              const i = ING[n], p = i.per100g
              return (
                <tr key={n}>
                  <td>{n}</td>
                  <td className="num">${fmt(i.packPrice)}</td>
                  <td className="num">{fmt(i.packGrams)}</td>
                  <td className="num">${fmt((i.packPrice * 100) / i.packGrams, 1)}</td>
                  <td className="num">{fmt(p.kcal)}</td>
                  <td className="num">{fmt(p.protein, 1)}</td>
                  <td className="num">{fmt(p.fat, 1)}</td>
                  <td className="num">{fmt(p.carbs, 1)}</td>
                  <td className="num">{fmt(p.sugar, 1)}</td>
                  {isEditor && (
                    <td className="whitespace-nowrap">
                      <button className="btn btn-sm" onClick={() => onEdit(n)}>編輯</button>
                      <button className="btn btn-sm btn-danger ml-1" onClick={() => onDelete(n)}>刪除</button>
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
