// ============================================================
// 材料主檔(手動維護)
// ------------------------------------------------------------
// 每種材料填一次,之後食譜直接用「材料名稱」對照。
//
// 欄位說明:
//   packPrice : 採購價格(NT$)          例:一包 1kg 麵粉 85 元 → 85
//   packGrams : 採購重量(g)            例:1kg → 1000
//   per100g   : 每 100g 的營養成分
//     kcal    : 熱量 (大卡)
//     protein : 蛋白質 (g)
//     fat     : 脂肪 (g)
//     carbs   : 碳水化合物 (g)
//     sugar   : 糖 (g)
//
// ※ 液體(牛奶、蛋液)也一律用「公克」計,秤重最準。
//    參考:牛奶 1ml ≈ 1.03g,全蛋一顆約 50g(去殼)。
// ============================================================

const INGREDIENTS = {
  "高筋麵粉": {
    packPrice: 85, packGrams: 1000,
    per100g: { kcal: 361, protein: 12.5, fat: 1.5, carbs: 73.0, sugar: 0.5 }
  },
  "低筋麵粉": {
    packPrice: 78, packGrams: 1000,
    per100g: { kcal: 363, protein: 8.5, fat: 1.2, carbs: 76.0, sugar: 0.5 }
  },
  "細砂糖": {
    packPrice: 55, packGrams: 1000,
    per100g: { kcal: 387, protein: 0, fat: 0, carbs: 100, sugar: 100 }
  },
  "無鹽奶油": {
    packPrice: 180, packGrams: 454,
    per100g: { kcal: 717, protein: 0.9, fat: 81.0, carbs: 0.1, sugar: 0.1 }
  },
  "全蛋": {
    packPrice: 75, packGrams: 500,   // 一盒10顆約500g(去殼)
    per100g: { kcal: 143, protein: 12.6, fat: 9.5, carbs: 0.7, sugar: 0.4 }
  },
  "奶油乳酪": {
    packPrice: 250, packGrams: 1000,
    per100g: { kcal: 342, protein: 6.2, fat: 34.0, carbs: 4.1, sugar: 3.2 }
  },
  "動物性鮮奶油": {
    packPrice: 165, packGrams: 500,
    per100g: { kcal: 340, protein: 2.1, fat: 36.0, carbs: 2.8, sugar: 2.9 }
  },
  "全脂牛奶": {
    packPrice: 95, packGrams: 936,   // 936ml × 1.03 ≒ 964g,可自行修正
    per100g: { kcal: 63, protein: 3.1, fat: 3.6, carbs: 4.8, sugar: 4.8 }
  },
  "70%黑巧克力": {
    packPrice: 320, packGrams: 500,
    per100g: { kcal: 579, protein: 7.8, fat: 42.6, carbs: 45.9, sugar: 24.0 }
  },
  "可可粉": {
    packPrice: 150, packGrams: 250,
    per100g: { kcal: 228, protein: 19.6, fat: 13.7, carbs: 57.9, sugar: 1.8 }
  },
  "玉米粉": {
    packPrice: 45, packGrams: 400,
    per100g: { kcal: 381, protein: 0.3, fat: 0.1, carbs: 91.3, sugar: 0 }
  },
  "香草精": {
    packPrice: 220, packGrams: 118,
    per100g: { kcal: 288, protein: 0.1, fat: 0.1, carbs: 12.7, sugar: 12.7 }
  }
};
