import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchAdminUsers, updateAdminUser } from '../lib/api.js'
import { getAuthToken } from '../lib/googleAuth.js'
import { isOwner } from '../lib/permissions.js'
import { toast } from '../lib/toast.js'
import { confirmDialog } from '../lib/confirm.js'
import { fmt } from '../lib/calc.js'

const ROLE_ZH = { user: '一般使用者', trusted: '信任貢獻者', owner: '站長' }
const dateOnly = d => (d ? String(d).slice(0, 10) : '—')

/* 站長使用者管理頁(/admin/users):改角色、停用帳號——僅此而已,
   刻意沒有任何「編輯使用者內容」的入口(政策:站長不碰別人的食譜內容,
   材料/模具要修也是走一般的材料/模具編輯頁,見 docs/roadmap.md 第 2 項)。 */
export default function AdminUsersView({ googleUser }) {
  const navigate = useNavigate()
  const [users, setUsers] = useState(null)
  const [busy, setBusy] = useState(null)

  const load = () =>
    fetchAdminUsers(getAuthToken())
      .then(setUsers)
      .catch(err => toast('讀取失敗:' + err.message, { type: 'error' }))

  useEffect(() => { if (isOwner(googleUser)) load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOwner(googleUser)) {
    return (
      <p className="mt-10 text-sm text-ink-soft">
        只有站長能進使用者管理。
        <button className="ml-2 underline hover:text-ink" onClick={() => navigate('/r')}>回主畫面</button>
      </p>
    )
  }

  const changeRole = async (u, role) => {
    if (role === u.role) return
    const ok = await confirmDialog({
      title: '變更角色', confirmText: '變更',
      body: `把 ${u.displayName || u.email} 的角色從「${ROLE_ZH[u.role]}」改成「${ROLE_ZH[role]}」?\n(改了立即生效,不用等對方重新登入)`,
    })
    if (!ok) { load(); return }
    setBusy(u._id)
    try {
      await updateAdminUser(getAuthToken(), { userId: u._id, role })
      toast('角色已更新', { type: 'success' })
      await load()
    } catch (err) { toast(err.message, { type: 'error' }); load() } finally { setBusy(null) }
  }

  const toggleSuspend = async u => {
    const suspending = !u.suspended
    const ok = await confirmDialog({
      title: suspending ? '停用帳號' : '恢復帳號', danger: suspending,
      confirmText: suspending ? '停用' : '恢復',
      body: suspending
        ? `停用 ${u.displayName || u.email}?\n對方將無法登入、無法寫入任何資料(立即生效);已建立的內容保留原樣不會被刪除。`
        : `恢復 ${u.displayName || u.email} 的使用權?`,
    })
    if (!ok) return
    setBusy(u._id)
    try {
      await updateAdminUser(getAuthToken(), { userId: u._id, suspended: suspending })
      toast(suspending ? '帳號已停用' : '帳號已恢復', { type: 'success' })
      await load()
    } catch (err) { toast(err.message, { type: 'error' }) } finally { setBusy(null) }
  }

  return (
    <>
      <div className="flex flex-wrap items-baseline gap-3.5 border-b-[3px] border-ink pb-3">
        <h2 className="font-serif text-[28px] font-bold">使用者管理</h2>
        <span className="text-[13px] text-ink-soft">
          {users ? `共 ${users.length} 位` : '讀取中…'} · 只能改角色/停用,不能動使用者的食譜內容
        </span>
      </div>

      {users && (
        <div className="mt-4 overflow-x-auto">
          <table className="ltable max-w-5xl">
            <thead>
              <tr>
                <th>暱稱</th><th>信箱</th><th>角色</th>
                <th className="num">食譜</th><th className="num">材料</th><th className="num">模具</th>
                <th>加入日期</th><th>狀態</th><th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const self = u.email === googleUser.email
                return (
                  <tr key={u._id} className={u.suspended ? 'opacity-50' : ''}>
                    <td>
                      {u.displayName || <span className="text-ink-soft">未命名烘焙師</span>}
                      {self && <span className="ml-1.5 rounded-full bg-yolk-soft px-2 text-[10.5px] font-bold text-yolk">你</span>}
                    </td>
                    <td className="text-[12.5px] text-ink-soft">{u.email}</td>
                    <td>
                      {self ? (
                        <span className="text-[13px]">{ROLE_ZH[u.role]}</span>
                      ) : (
                        <select value={u.role} disabled={busy === u._id}
                          onChange={e => changeRole(u, e.target.value)}
                          className="rounded-md border border-line bg-white px-1.5 py-0.5 text-[12.5px]">
                          {Object.entries(ROLE_ZH).map(([k, zh]) => <option key={k} value={k}>{zh}</option>)}
                        </select>
                      )}
                    </td>
                    <td className="num">{fmt(u.counts.recipes)}</td>
                    <td className="num">{fmt(u.counts.ingredients)}</td>
                    <td className="num">{fmt(u.counts.molds)}</td>
                    <td className="font-mono text-[12px]">{dateOnly(u.createdAt)}</td>
                    <td className="text-[12.5px]">
                      {u.suspended ? <span className="font-bold text-warn">已停用</span> : <span className="text-ok">正常</span>}
                    </td>
                    <td className="whitespace-nowrap">
                      {!self && (
                        <button className={'btn btn-sm ' + (u.suspended ? '' : 'btn-danger')}
                          disabled={busy === u._id}
                          onClick={() => toggleSuspend(u)}>
                          {u.suspended ? '↺ 恢復' : '停用'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 max-w-2xl text-[12px] text-ink-soft">
        角色與停用即刻生效(寫入時伺服器會重新核對帳號狀態,不受舊 token 影響)。
        「信任貢獻者」目前跟一般使用者權限相同,是之後審核機制的預留分級。
      </p>
    </>
  )
}
