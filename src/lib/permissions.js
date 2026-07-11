/* 前端顯示用的權限判斷(見 docs/roadmap.md 第 2 項 phase 4)——決定要不要
   顯示編輯/刪除按鈕。真正的授權邊界在 api/_lib/auth.js,這裡故意寫成鏡像
   邏輯:前端判斷錯了也不會真的能寫入,只是體驗會不一致(按鈕顯示但存檔會被
   API 擋+跳 toast)。 */

export function canEditRecipe(doc, googleUser) {
  return !!googleUser && doc.ownerId === googleUser.email
}

export function canEditShared(doc, googleUser) {
  if (!googleUser) return false
  if (googleUser.role === 'owner') return true
  return doc.createdBy === googleUser.email
}

export function isOwner(googleUser) {
  return !!googleUser && googleUser.role === 'owner'
}
