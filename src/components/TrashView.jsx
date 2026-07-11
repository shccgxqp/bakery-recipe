import { useEffect, useState } from 'react'
import { fetchDeleted } from '../lib/api.js'
import { getAuthToken } from '../lib/googleAuth.js'
import { toast } from '../lib/toast.js'

const TYPES = [
  ['recipes', '食譜'],
  ['ingredients', '材料'],
  ['molds', '模具'],
]

/* 回收桶:軟刪除的材料/食譜/模具都在這,登入才看得到(跟編輯同一信任等級)。
   獨立頁面而非塞進各清單的篩選開關——三個 collection 共用同一個列表元件,邏輯集中一處。 */
export default function TrashView({ onRestore }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      setData(await fetchDeleted(getAuthToken()))
    } catch (err) {
      toast('讀取回收桶失敗:' + err.message, { type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const restore = async (type, id) => {
    setBusy(id)
    try {
      await onRestore(type, id)
      toast('已復原', { type: 'success' })
      await load()
    } catch (err) {
      toast('復原失敗:' + err.message, { type: 'error' })
    } finally {
      setBusy(null)
    }
  }

  const empty = data && TYPES.every(([k]) => !data[k]?.length)

  return (
    <>
      <div className="flex flex-wrap items-baseline gap-3.5 border-b-[3px] border-ink pb-3">
        <h2 className="font-serif text-[28px] font-bold">回收桶</h2>
        <span className="text-[13px] text-ink-soft">已刪除的材料/食譜/模具,復原後回到原本的清單</span>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-ink-soft">讀取中…</p>
      ) : empty ? (
        <p className="mt-6 text-sm text-ink-soft">回收桶是空的。</p>
      ) : (
        TYPES.map(([key, zh]) => (data?.[key]?.length > 0) && (
          <div key={key} className="mt-6">
            <div className="border-b-2 border-ink pb-1 text-xs font-bold tracking-[.12em] text-ink-soft">
              {zh}({data[key].length})
            </div>
            <table className="ltable mt-2">
              <tbody>
                {data[key].map(item => (
                  <tr key={item._id}>
                    <td>{item.name}</td>
                    <td className="text-[12.5px] text-ink-soft">
                      刪除於 {new Date(item.deletedAt).toLocaleString('zh-TW')}
                    </td>
                    <td className="whitespace-nowrap text-right">
                      <button className="btn btn-sm" disabled={busy === item._id}
                        onClick={() => restore(key, item._id)}>
                        {busy === item._id ? '復原中…' : '↺ 復原'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </>
  )
}
