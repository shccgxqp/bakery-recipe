/* 自製確認對話框(取代原生 confirm())的輕量 pub-sub,跟 toast.js 同一套模式:
   任何檔案直接 import confirmDialog() 呼叫,回傳 Promise<boolean>,
   ConfirmHost.jsx 掛在 App.jsx 根層訂閱顯示。 */
let current = null
let subscribers = []

export function confirmDialog(req) {
  return new Promise(resolve => {
    current = { req, resolve }
    subscribers.forEach(fn => fn(current))
  })
}

export function answerConfirm(result) {
  if (!current) return
  const { resolve } = current
  current = null
  subscribers.forEach(fn => fn(null))
  resolve(result)
}

export function subscribeConfirm(fn) {
  subscribers.push(fn)
  return () => { subscribers = subscribers.filter(f => f !== fn) }
}
