/* 查重:名稱正規化後雙向包含比對(「三能6吋圓模」vs「三能 6吋活動圓模」這種
   都抓得到)。材料/模具的新增頁與食譜編輯頁的快速新增共用同一套,
   不讓任何入口變成繞過查重的後門(見 docs/design-guide.md)。 */

export const norm = s => (s || '').toLowerCase().replace(/[\s()()【】\-_/]/g, '')

/* list: 文件陣列(要有 name);excludeId: 編輯模式排除自己 */
export function findSimilar(name, list, excludeId) {
  const n = norm(name)
  if (n.length < 2) return []
  return list
    .filter(d => d._id !== excludeId)
    .filter(d => {
      const t = norm(d.name)
      return t.includes(n) || n.includes(t)
    })
    .slice(0, 3)
}
