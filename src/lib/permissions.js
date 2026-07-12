/* 前端顯示用的權限判斷(見 docs/roadmap.md 第 2 項 phase 4)——決定要不要
   顯示編輯/刪除按鈕。v4.3.0 起吃伺服器算好的旗標(doc.mine),公開回應
   不再含 email;真正的授權邊界在 api/_lib/auth.js(以資料庫 email 比對),
   前端判斷錯了也不會真的能寫入,只是體驗不一致。 */

export function canEditRecipe(doc, googleUser) {
  return !!googleUser && !!doc?.mine
}

export function canEditShared(doc, googleUser) {
  if (!googleUser) return false
  if (googleUser.role === 'owner') return true
  return !!doc?.mine
}

export function isOwner(googleUser) {
  return !!googleUser && googleUser.role === 'owner'
}
