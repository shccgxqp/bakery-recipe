/* 寫回 Google Sheet:Apps Script Web App(見 google-apps-script.gs)
   所有寫入都帶密碼,由 Apps Script 端以 SHA-256 雜湊驗證。 */

export async function pushToSheet(scriptUrl, password, ING, RCP) {
  const res = await fetch(scriptUrl, {
    method: 'POST',
    body: JSON.stringify({ password, ingredients: ING, recipes: RCP }),
  })
  const j = await res.json()
  if (!j.ok) throw new Error(j.error || '寫入失敗')
  return j
}

export async function verifyPassword(scriptUrl, password) {
  const res = await fetch(scriptUrl, {
    method: 'POST',
    body: JSON.stringify({ action: 'verify', password }),
  })
  const j = await res.json()
  return !!j.ok
}
