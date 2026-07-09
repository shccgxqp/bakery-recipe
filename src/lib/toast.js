/* 輕量 toast pub-sub:任何檔案(元件或 lib)都能直接 import 呼叫 toast(),
   不用把狀態往上提到 App.jsx、也不用 React Context。ToastHost.jsx 訂閱顯示。 */
let listeners = []
let seq = 0

export function toast(message, { type = 'info' } = {}) {
  const t = { id: ++seq, message, type }
  listeners.forEach(fn => fn(t))
  return t.id
}

export function subscribeToast(fn) {
  listeners.push(fn)
  return () => { listeners = listeners.filter(f => f !== fn) }
}
