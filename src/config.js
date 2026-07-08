/* 前端設定 */

/* 後端 API(Vercel Serverless Functions)網址,結尾不要斜線 */
export const API_BASE = 'https://bakery-recipe-two.vercel.app'

export const AUTH_KEY = 'bakery-auth'
export const LS_EDITS = 'bakery-edits-v2' // 本機暫存修改(以 _id 為 key,null = 待刪除)
export const LS_CACHE = 'bakery-cache-v1' // 最近一次成功讀取的資料快取(離線備援)

/* settings 讀不到時的預設值(正式值存在資料庫 settings 文件) */
export const DEFAULT_CAT_ORDER = ['蛋糕冷藏', '餅乾常溫', '醬料', '未分類']
export const DEFAULT_ALLERGENS = [
  '甲殼類', '芒果', '花生', '牛奶羊奶', '蛋', '堅果',
  '芝麻', '含麩質之穀物', '大豆', '魚類', '亞硫酸鹽',
]
