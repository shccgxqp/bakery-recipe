// ============================================================
// 材料主檔 — 由 Google Sheet「材料價目表 + 營養計算」匯入
// 來源試算表:烘焙食譜成本表(2026-07-05 匯入)
//   packPrice : 採購價格(NT$)
//   packGrams : 採購重量(g)
//   per100g   : 每 100g 營養(kcal/protein/fat/carbs/sugar)
// ============================================================

const INGREDIENTS = {
  "中筋麵粉": {
    packPrice: 85, packGrams: 1000,
    per100g: { kcal: 354, protein: 11.8, fat: 1.2, carbs: 74, sugar: 1.5 }
  },
  "伯爵茶粉": {
    packPrice: 238, packGrams: 100,
    per100g: { kcal: 1, protein: 0, fat: 0, carbs: 0, sugar: 0 }
  },
  "依思尼 無鹽奶油": {
    packPrice: 285, packGrams: 500,
    per100g: { kcal: 743, protein: 0.7, fat: 82, carbs: 0.5, sugar: 0.5 }
  },
  "全蛋": {
    packPrice: 5, packGrams: 55,
    per100g: { kcal: 134, protein: 12.5, fat: 8.83, carbs: 1.83, sugar: 0 }
  },
  "可爾必思": {
    packPrice: 115, packGrams: 470,
    per100g: { kcal: 228, protein: 2, fat: 0, carbs: 55, sugar: 5.5 }
  },
  "塔塔粉": {
    packPrice: 100, packGrams: 100,
    per100g: { kcal: 1, protein: 0, fat: 0, carbs: 0, sugar: 0 }
  },
  "奇福餅乾": {
    packPrice: 0, packGrams: 100,
    per100g: { kcal: 0, protein: 0, fat: 0, carbs: 0, sugar: 0 }
  },
  "奶粉": {
    packPrice: 0, packGrams: 100,
    per100g: { kcal: 0, protein: 0, fat: 0, carbs: 0, sugar: 0 }
  },
  "希臘式優格": {
    packPrice: 109, packGrams: 400,
    per100g: { kcal: 83, protein: 6.1, fat: 4, carbs: 5.6, sugar: 4.7 }
  },
  "愛樂微動物鮮奶油35%": {
    packPrice: 266, packGrams: 1000,
    per100g: { kcal: 335.5, protein: 2, fat: 35.1, carbs: 2.9, sugar: 2.9 }
  },
  "抹茶粉": {
    packPrice: 220, packGrams: 100,
    per100g: { kcal: 1, protein: 0, fat: 0, carbs: 0, sugar: 0 }
  },
  "杏仁粉": {
    packPrice: 100, packGrams: 200,
    per100g: { kcal: 637, protein: 21, fat: 53, carbs: 20, sugar: 5 }
  },
  "柳丁": {
    packPrice: 75, packGrams: 738,
    per100g: { kcal: 43, protein: 0.8, fat: 0.1, carbs: 11, sugar: 0 }
  },
  "棉花糖": {
    packPrice: 0, packGrams: 100,
    per100g: { kcal: 0, protein: 0, fat: 0, carbs: 0, sugar: 0 }
  },
  "檸檬汁": {
    packPrice: 90, packGrams: 960,
    per100g: { kcal: 0, protein: 0, fat: 0, carbs: 0, sugar: 0 }
  },
  "水手牌高筋麵粉": {
    packPrice: 76, packGrams: 1000,
    per100g: { kcal: 350, protein: 12.3, fat: 1.1, carbs: 72.7, sugar: 0 }
  },
  "沙拉油": {
    packPrice: 60, packGrams: 760,
    per100g: { kcal: 828, protein: 0, fat: 92, carbs: 0, sugar: 0 }
  },
  "泡打粉": {
    packPrice: 83, packGrams: 100,
    per100g: { kcal: 182, protein: 0, fat: 0, carbs: 45.4, sugar: 0 }
  },
  "濃縮咖啡": {
    packPrice: 25, packGrams: 40,
    per100g: { kcal: 5, protein: 0.2, fat: 0.1, carbs: 1, sugar: 0 }
  },
  "無糖可可粉": {
    packPrice: 200, packGrams: 200,
    per100g: { kcal: 363, protein: 18.8, fat: 19.8, carbs: 42.9, sugar: 0 }
  },
  "無鹽奶油": {
    packPrice: 199, packGrams: 454,
    per100g: { kcal: 740, protein: 0.6, fat: 82.9, carbs: 0.6, sugar: 0.6 }
  },
  "焦糖醬": {
    packPrice: 50.8, packGrams: 409,
    per100g: { kcal: 369.1, protein: 1, fat: 16.8, carbs: 53.5, sugar: 53.5 }
  },
  "牛奶": {
    packPrice: 81, packGrams: 936,
    per100g: { kcal: 65.3, protein: 3.2, fat: 3.7, carbs: 4.8, sugar: 4.8 }
  },
  "玉米粉": {
    packPrice: 40, packGrams: 375,
    per100g: { kcal: 348, protein: 0, fat: 0, carbs: 87, sugar: 0 }
  },
  "玉米糖漿": {
    packPrice: 230, packGrams: 473,
    per100g: { kcal: 400, protein: 0, fat: 0, carbs: 100, sugar: 33 }
  },
  "白鈕扣巧克力": {
    packPrice: 200, packGrams: 500,
    per100g: { kcal: 581, protein: 4.4, fat: 38, carbs: 55.4, sugar: 55.4 }
  },
  "砂糖": {
    packPrice: 36, packGrams: 1000,
    per100g: { kcal: 398.4, protein: 0, fat: 0, carbs: 99.2, sugar: 99 }
  },
  "糖粉": {
    packPrice: 65, packGrams: 1000,
    per100g: { kcal: 400, protein: 0, fat: 0, carbs: 100, sugar: 98.7 }
  },
  "紅色色膏": {
    packPrice: 78, packGrams: 35,
    per100g: { kcal: 0, protein: 0, fat: 0, carbs: 0, sugar: 0 }
  },
  "細砂糖": {
    packPrice: 36, packGrams: 1000,
    per100g: { kcal: 400, protein: 0, fat: 0, carbs: 100, sugar: 100 }
  },
  "維西尼手指餅乾": {
    packPrice: 105, packGrams: 200,
    per100g: { kcal: 381, protein: 7.8, fat: 3.8, carbs: 80, sugar: 42 }
  },
  "肉桂粉": {
    packPrice: 290, packGrams: 50,
    per100g: { kcal: 240, protein: 3.5, fat: 1.3, carbs: 51, sugar: 0 }
  },
  "艾恩摩爾動物性鮮奶油": {
    packPrice: 210, packGrams: 1000,
    per100g: { kcal: 335.5, protein: 2, fat: 35.1, carbs: 2.9, sugar: 2.9 }
  },
  "艾恩摩爾動物性鮮奶油35.1%": {
    packPrice: 270, packGrams: 1000,
    per100g: { kcal: 335, protein: 2, fat: 35.1, carbs: 2.9, sugar: 2.9 }
  },
  "草莓": {
    packPrice: 300, packGrams: 454,
    per100g: { kcal: 32, protein: 0.7, fat: 0.3, carbs: 7.7, sugar: 4.9 }
  },
  "莫諾尼香草醬": {
    packPrice: 250, packGrams: 40,
    per100g: { kcal: 292, protein: 0.8, fat: 1.6, carbs: 68.7, sugar: 49.4 }
  },
  "菲力鮮奶油乳酪": {
    packPrice: 130, packGrams: 250,
    per100g: { kcal: 308, protein: 6.6, fat: 30.1, carbs: 2.7, sugar: 2.5 }
  },
  "蔓越莓乾": {
    packPrice: 0, packGrams: 100,
    per100g: { kcal: 0, protein: 0, fat: 0, carbs: 0, sugar: 0 }
  },
  "蛋白": {
    packPrice: 5, packGrams: 20,
    per100g: { kcal: 45, protein: 10, fat: 0.5, carbs: 1, sugar: 0 }
  },
  "蛋黃": {
    packPrice: 5, packGrams: 20,
    per100g: { kcal: 308, protein: 15.2, fat: 26.8, carbs: 3.6, sugar: 0 }
  },
  "蜂蜜": {
    packPrice: 800, packGrams: 700,
    per100g: { kcal: 340, protein: 0.5, fat: 0, carbs: 84.5, sugar: 65.2 }
  },
  "鑽石低筋麵粉": {
    packPrice: 90, packGrams: 1000,
    per100g: { kcal: 348, protein: 8.4, fat: 1.5, carbs: 75.2, sugar: 0.6 }
  },
  "香蕉": {
    packPrice: 40, packGrams: 1000,
    per100g: { kcal: 89, protein: 1.1, fat: 0.33, carbs: 22.84, sugar: 12.23 }
  },
  "馬斯卡邦起司": {
    packPrice: 240, packGrams: 500,
    per100g: { kcal: 411, protein: 3.6, fat: 42, carbs: 4.6, sugar: 4.6 }
  },
  "鹽": {
    packPrice: 17, packGrams: 1000,
    per100g: { kcal: 0, protein: 0, fat: 0, carbs: 0, sugar: 0 }
  },
  "麥斯萊姆酒": {
    packPrice: 494, packGrams: 750,
    per100g: { kcal: 215, protein: 0, fat: 0, carbs: 0, sugar: 0 }
  },
  "黑糖": {
    packPrice: 50, packGrams: 300,
    per100g: { kcal: 390, protein: 2.1, fat: 0.3, carbs: 94.8, sugar: 85.6 }
  }
};
