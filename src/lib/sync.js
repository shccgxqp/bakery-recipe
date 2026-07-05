/* 寫回 Google Sheet:Apps Script Web App(見 google-apps-script.gs) */
export async function pushToSheet(scriptUrl, token, ING, RCP) {
  const res = await fetch(scriptUrl, {
    method: 'POST',
    body: JSON.stringify({ token, ingredients: ING, recipes: RCP }),
  })
  const j = await res.json()
  if (!j.ok) throw new Error(j.error || '寫入失敗')
  return j
}
