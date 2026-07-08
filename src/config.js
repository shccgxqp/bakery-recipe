/* 前端設定 */

/* 後端 API(Vercel Serverless Functions)網址,結尾不要斜線 */
export const API_BASE = 'https://bakery-recipe-two.vercel.app'

export const AUTH_KEY = 'bakery-auth'
export const LS_CACHE = 'bakery-cache-v1' // 最近一次成功讀取的資料快取(離線備援)

/* settings 讀不到時的預設值(正式值存在資料庫 settings 文件) */
export const DEFAULT_CAT_ORDER = ['蛋糕冷藏', '餅乾常溫', '醬料', '未分類']
export const DEFAULT_ALLERGENS = [
  '甲殼類', '芒果', '花生', '牛奶羊奶', '蛋', '堅果',
  '芝麻', '含麩質之穀物', '大豆', '魚類', '亞硫酸鹽',
]
export const DEFAULT_ING_CAT_ORDER = [
  '麵粉/澱粉', '糖/甜味劑', '乳製品', '蛋類', '油脂', '巧克力/可可',
  '堅果/果乾', '水果', '茶/咖啡', '膨脹/凝固劑', '調味/香精/色素', '酒類', '其他',
]
