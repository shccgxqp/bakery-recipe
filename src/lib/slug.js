/* 食譜網址:/r/:id/:name —— id 是定位依據,name 只是裝飾(分享連結好看),
   改名不會斷連結;讀網址時完全不看 name,只信 id。 */
export const recipePath = r => `/r/${r._id}/${encodeURIComponent(r.name)}`
