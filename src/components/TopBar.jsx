import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isOwner } from '../lib/permissions.js'

/* 上方導覽列(v4.3.0 導覽重整):上方 bar 管全站內容區塊,側欄只管當前
   工作區清單(國際慣例:Cookpad 三支柱/King Arthur 頂部導覽)。
   帳本規線風格:3px 墨線底、實色、無陰影。
   landing/login/register/label(客人頁)不顯示這條。 */

const NAV = [
  ['explore', '/explore', '探索食譜'],
  ['ings', '/ings', '材料庫'],
  ['molds', '/molds', '模具庫'],
]

/* view → 目前所在的導覽區塊(食譜相關視圖都算「探索食譜」這條線) */
const sectionOf = view => {
  if (['explore', 'recipe', 'recipe-new', 'recipe-edit'].includes(view)) return 'explore'
  if (['ledger', 'ledger-recipe'].includes(view)) return 'ledger'
  if (['ings', 'ing-detail', 'ing-new', 'ing-edit'].includes(view)) return 'ings'
  if (['molds', 'mold-detail', 'mold-new', 'mold-edit'].includes(view)) return 'molds'
  return null
}

export default function TopBar({ view, googleUser, onLogout, onExportJSON }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const section = sectionOf(view)

  useEffect(() => {
    if (!menuOpen) return
    const onDown = e => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false) }
    const onKey = e => { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const go = path => { setMenuOpen(false); navigate(path) }

  const MenuItem = ({ onClick, children }) => (
    <button type="button" role="menuitem"
      className="block w-full px-3.5 py-2 text-left text-[13.5px] hover:bg-yolk-soft"
      onClick={onClick}>
      {children}
    </button>
  )

  return (
    <header className="border-b-[3px] border-ink bg-paper print:hidden">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 md:px-6">
        <button className="font-serif text-[19px] font-bold tracking-[.06em]" onClick={() => navigate('/explore')}>
          焙啾啾
        </button>

        <nav className="flex gap-x-1">
          {[...NAV, ...(googleUser ? [['ledger', '/ledger', '我的帳本']] : [])].map(([key, path, zh]) => (
            <button key={key} onClick={() => navigate(path)}
              className={
                'border-b-2 px-2.5 py-1 text-[13.5px] tracking-[.04em] ' +
                (section === key
                  ? 'border-ink font-bold text-ink'
                  : 'border-transparent text-ink-soft hover:border-line hover:text-ink')
              }>
              {zh}
            </button>
          ))}
        </nav>

        <span className="ml-auto flex items-center gap-2">
          {googleUser ? (
            <>
              <button className="btn btn-sm btn-primary" onClick={() => navigate('/r/new')}>＋ 新增食譜</button>
              <div ref={menuRef} className="relative">
                <button type="button" aria-haspopup="menu" aria-expanded={menuOpen}
                  className={'btn btn-sm ' + (menuOpen ? 'btn-active' : '')}
                  onClick={() => setMenuOpen(v => !v)}
                  title={googleUser.email}>
                  👤 {googleUser.displayName || '未命名烘焙師'} ▾
                </button>
                {menuOpen && (
                  <div role="menu"
                    className="absolute right-0 top-full z-50 mt-1 min-w-44 border-[2.5px] border-ink bg-paper py-1">
                    <MenuItem onClick={() => go('/me')}>👤 個人頁</MenuItem>
                    <MenuItem onClick={() => go('/trash')}>🗑 回收桶</MenuItem>
                    <MenuItem onClick={() => { setMenuOpen(false); onExportJSON() }}>⬇ 備份全部資料</MenuItem>
                    {isOwner(googleUser) && (
                      <MenuItem onClick={() => go('/admin/users')}>👥 使用者管理</MenuItem>
                    )}
                    <MenuItem onClick={() => go('/changelog')}>📋 更新紀錄</MenuItem>
                    <div className="my-1 border-t border-line" />
                    <MenuItem onClick={() => { setMenuOpen(false); onLogout() }}>登出</MenuItem>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button className="btn btn-sm" onClick={() => navigate('/login')}>🔑 登入</button>
          )}
        </span>
      </div>
    </header>
  )
}
