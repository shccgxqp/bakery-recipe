// 材料主檔 + 甜點食譜 — 內建備援資料(Google Sheet 為主來源)

export const INGREDIENTS = {
  "中筋麵粉": {
    packPrice: 85, packGrams: 1000,
    per100g: { kcal: 354, protein: 11.8, fat: 1.2, satFat: 0.3, transFat: 0, carbs: 74, sugar: 1.5, sodium: 1 }
  },
  "伯爵茶粉": {
    packPrice: 238, packGrams: 100,
    per100g: { kcal: 1, protein: 0, fat: 0, satFat: 0, transFat: 0, carbs: 0, sugar: 0, sodium: 0 }
  },
  "依思尼 無鹽奶油": {
    packPrice: 285, packGrams: 500,
    per100g: { kcal: 743, protein: 0.7, fat: 82, satFat: 59, transFat: 2.2, carbs: 0.5, sugar: 0.5, sodium: 30 }
  },
  "全蛋": {
    packPrice: 5, packGrams: 55,
    per100g: { kcal: 134, protein: 12.5, fat: 8.83, satFat: 3, transFat: 0, carbs: 1.83, sugar: 0, sodium: 0 }
  },
  "可爾必思": {
    packPrice: 115, packGrams: 470,
    per100g: { kcal: 228, protein: 2, fat: 0, satFat: 0, transFat: 0, carbs: 55, sugar: 5.5, sodium: 60 }
  },
  "塔塔粉": {
    packPrice: 100, packGrams: 100,
    per100g: { kcal: 1, protein: 0, fat: 0, satFat: 0, transFat: 0, carbs: 0, sugar: 0, sodium: 0 }
  },
  "奇福餅乾": {
    packPrice: 0, packGrams: 100,
    per100g: { kcal: 0, protein: 0, fat: 0, satFat: 0, transFat: 0, carbs: 0, sugar: 0, sodium: 0 }
  },
  "奶粉": {
    packPrice: 0, packGrams: 100,
    per100g: { kcal: 0, protein: 0, fat: 0, satFat: 0, transFat: 0, carbs: 0, sugar: 0, sodium: 0 }
  },
  "希臘式優格": {
    packPrice: 109, packGrams: 400,
    per100g: { kcal: 83, protein: 6.1, fat: 4, satFat: 2.7, transFat: 0, carbs: 5.6, sugar: 4.7, sodium: 67 }
  },
  "愛樂微動物鮮奶油35%": {
    packPrice: 266, packGrams: 1000,
    per100g: { kcal: 335.5, protein: 2, fat: 35.1, satFat: 22.2, transFat: 1.8, carbs: 2.9, sugar: 2.9, sodium: 26 }
  },
  "抹茶粉": {
    packPrice: 220, packGrams: 100,
    per100g: { kcal: 1, protein: 0, fat: 0, satFat: 0, transFat: 0, carbs: 0, sugar: 0, sodium: 0 }
  },
  "杏仁粉": {
    packPrice: 100, packGrams: 200,
    per100g: { kcal: 637, protein: 21, fat: 53, satFat: 4, transFat: 0, carbs: 20, sugar: 5, sodium: 0 }
  },
  "柳丁": {
    packPrice: 75, packGrams: 738,
    per100g: { kcal: 43, protein: 0.8, fat: 0.1, satFat: 0, transFat: 0, carbs: 11, sugar: 0, sodium: 5 }
  },
  "棉花糖": {
    packPrice: 0, packGrams: 100,
    per100g: { kcal: 0, protein: 0, fat: 0, satFat: 0, transFat: 0, carbs: 0, sugar: 0, sodium: 0 }
  },
  "檸檬汁": {
    packPrice: 90, packGrams: 960,
    per100g: { kcal: 0, protein: 0, fat: 0, satFat: 0, transFat: 0, carbs: 0, sugar: 0, sodium: 0 }
  },
  "水手牌高筋麵粉": {
    packPrice: 76, packGrams: 1000,
    per100g: { kcal: 350, protein: 12.3, fat: 1.1, satFat: 0.2, transFat: 0, carbs: 72.7, sugar: 0, sodium: 1 }
  },
  "沙拉油": {
    packPrice: 60, packGrams: 760,
    per100g: { kcal: 828, protein: 0, fat: 92, satFat: 15, transFat: 1.5, carbs: 0, sugar: 0, sodium: 0 }
  },
  "泡打粉": {
    packPrice: 83, packGrams: 100,
    per100g: { kcal: 182, protein: 0, fat: 0, satFat: 0, transFat: 0, carbs: 45.4, sugar: 0, sodium: 10700 }
  },
  "濃縮咖啡": {
    packPrice: 25, packGrams: 40,
    per100g: { kcal: 5, protein: 0.2, fat: 0.1, satFat: 0, transFat: 0, carbs: 1, sugar: 0, sodium: 2 }
  },
  "無糖可可粉": {
    packPrice: 200, packGrams: 200,
    per100g: { kcal: 363, protein: 18.8, fat: 19.8, satFat: 11.9, transFat: 0, carbs: 42.9, sugar: 0, sodium: 17 }
  },
  "無鹽奶油": {
    packPrice: 199, packGrams: 454,
    per100g: { kcal: 740, protein: 0.6, fat: 82.9, satFat: 54.9, transFat: 3.9, carbs: 0.6, sugar: 0.6, sodium: 10 }
  },
  "焦糖醬": {
    packPrice: 50.8, packGrams: 409,
    per100g: { kcal: 369.1, protein: 1, fat: 16.8, satFat: 10.6, transFat: 0.9, carbs: 53.5, sugar: 53.5, sodium: 12.5 }
  },
  "牛奶": {
    packPrice: 81, packGrams: 936,
    per100g: { kcal: 65.3, protein: 3.2, fat: 3.7, satFat: 2.6, transFat: 0, carbs: 4.8, sugar: 4.8, sodium: 42 }
  },
  "玉米粉": {
    packPrice: 40, packGrams: 375,
    per100g: { kcal: 348, protein: 0, fat: 0, satFat: 0, transFat: 0, carbs: 87, sugar: 0, sodium: 20 }
  },
  "玉米糖漿": {
    packPrice: 230, packGrams: 473,
    per100g: { kcal: 400, protein: 0, fat: 0, satFat: 0, transFat: 0, carbs: 100, sugar: 33, sodium: 100 }
  },
  "白鈕扣巧克力": {
    packPrice: 200, packGrams: 500,
    per100g: { kcal: 581, protein: 4.4, fat: 38, satFat: 37.1, transFat: 0, carbs: 55.4, sugar: 55.4, sodium: 52 }
  },
  "砂糖": {
    packPrice: 36, packGrams: 1000,
    per100g: { kcal: 398.4, protein: 0, fat: 0, satFat: 0, transFat: 0, carbs: 99.2, sugar: 99, sodium: 3 }
  },
  "糖粉": {
    packPrice: 65, packGrams: 1000,
    per100g: { kcal: 400, protein: 0, fat: 0, satFat: 0, transFat: 0, carbs: 100, sugar: 98.7, sodium: 0 }
  },
  "紅色色膏": {
    packPrice: 78, packGrams: 35,
    per100g: { kcal: 0, protein: 0, fat: 0, satFat: 0, transFat: 0, carbs: 0, sugar: 0, sodium: 0 }
  },
  "細砂糖": {
    packPrice: 36, packGrams: 1000,
    per100g: { kcal: 400, protein: 0, fat: 0, satFat: 0, transFat: 0, carbs: 100, sugar: 100, sodium: 0 }
  },
  "維西尼手指餅乾": {
    packPrice: 105, packGrams: 200,
    per100g: { kcal: 381, protein: 7.8, fat: 3.8, satFat: 0.9, transFat: 0, carbs: 80, sugar: 42, sodium: 84 }
  },
  "肉桂粉": {
    packPrice: 290, packGrams: 50,
    per100g: { kcal: 240, protein: 3.5, fat: 1.3, satFat: 0.9, transFat: 0, carbs: 51, sugar: 0, sodium: 8 }
  },
  "艾恩摩爾動物性鮮奶油": {
    packPrice: 210, packGrams: 1000,
    per100g: { kcal: 335.5, protein: 2, fat: 35.1, satFat: 22.2, transFat: 1.8, carbs: 2.9, sugar: 2.9, sodium: 26 }
  },
  "艾恩摩爾動物性鮮奶油35.1%": {
    packPrice: 270, packGrams: 1000,
    per100g: { kcal: 335, protein: 2, fat: 35.1, satFat: 22.2, transFat: 1, carbs: 2.9, sugar: 2.9, sodium: 26 }
  },
  "草莓": {
    packPrice: 300, packGrams: 454,
    per100g: { kcal: 32, protein: 0.7, fat: 0.3, satFat: 0, transFat: 0, carbs: 7.7, sugar: 4.9, sodium: 1 }
  },
  "莫諾尼香草醬": {
    packPrice: 250, packGrams: 40,
    per100g: { kcal: 292, protein: 0.8, fat: 1.6, satFat: 0.2, transFat: 0, carbs: 68.7, sugar: 49.4, sodium: 12 }
  },
  "菲力鮮奶油乳酪": {
    packPrice: 130, packGrams: 250,
    per100g: { kcal: 308, protein: 6.6, fat: 30.1, satFat: 21, transFat: 1.7, carbs: 2.7, sugar: 2.5, sodium: 374 }
  },
  "蔓越莓乾": {
    packPrice: 0, packGrams: 100,
    per100g: { kcal: 0, protein: 0, fat: 0, satFat: 0, transFat: 0, carbs: 0, sugar: 0, sodium: 0 }
  },
  "蛋白": {
    packPrice: 5, packGrams: 20,
    per100g: { kcal: 45, protein: 10, fat: 0.5, satFat: 0, transFat: 0, carbs: 1, sugar: 0, sodium: 0 }
  },
  "蛋黃": {
    packPrice: 5, packGrams: 20,
    per100g: { kcal: 308, protein: 15.2, fat: 26.8, satFat: 9, transFat: 0, carbs: 3.6, sugar: 0, sodium: 0 }
  },
  "蜂蜜": {
    packPrice: 800, packGrams: 700,
    per100g: { kcal: 340, protein: 0.5, fat: 0, satFat: 0, transFat: 0, carbs: 84.5, sugar: 65.2, sodium: 0 }
  },
  "鑽石低筋麵粉": {
    packPrice: 90, packGrams: 1000,
    per100g: { kcal: 348, protein: 8.4, fat: 1.5, satFat: 0.3, transFat: 0, carbs: 75.2, sugar: 0.6, sodium: 0 }
  },
  "香蕉": {
    packPrice: 40, packGrams: 1000,
    per100g: { kcal: 89, protein: 1.1, fat: 0.33, satFat: 0.1, transFat: 0, carbs: 22.84, sugar: 12.23, sodium: 1 }
  },
  "馬斯卡邦起司": {
    packPrice: 240, packGrams: 500,
    per100g: { kcal: 411, protein: 3.6, fat: 42, satFat: 30, transFat: 1, carbs: 4.6, sugar: 4.6, sodium: 44 }
  },
  "鹽": {
    packPrice: 17, packGrams: 1000,
    per100g: { kcal: 0, protein: 0, fat: 0, satFat: 0, transFat: 0, carbs: 0, sugar: 0, sodium: 39143 }
  },
  "麥斯萊姆酒": {
    packPrice: 494, packGrams: 750,
    per100g: { kcal: 215, protein: 0, fat: 0, satFat: 0, transFat: 0, carbs: 0, sugar: 0, sodium: 0 }
  },
  "黑糖": {
    packPrice: 50, packGrams: 300,
    per100g: { kcal: 390, protein: 2.1, fat: 0.3, satFat: 0, transFat: 0, carbs: 94.8, sugar: 85.6, sodium: 14 }
  }
};

export const RECIPES = [
  {
    name: "黑糖奶油棒",
    servings: 12,
    category: "餅乾常溫",
    price: 80,
    note: "方形模21.5cm",
    links: [
      ["如此耐嚼👍完美的奶油糖果黃油棒(YouTube)", "https://www.youtube.com/watch?v=tTcFBrCDu6I&t=204s"]
    ],
    items: [
      ["鑽石低筋麵粉", 160, "餅乾層"],
      ["杏仁粉", 25, "餅乾層"],
      ["細砂糖", 42, "餅乾層"],
      ["鹽", 1.7, "餅乾層"],
      ["玉米糖漿", 20, "餅乾層"],
      ["依思尼 無鹽奶油", 110, "餅乾層"],
      ["依思尼 無鹽奶油", 238, "奶油層"],
      ["黑糖", 263, "奶油層"],
      ["鹽", 2.5, "奶油層"],
      ["玉米糖漿", 68, "奶油層"],
      ["全蛋", 68, "奶油層"],
      ["莫諾尼香草醬", 3.4, "奶油層"],
      ["中筋麵粉", 200, "奶油層"]
    ]
  },
  {
    name: "原味奶油棒",
    servings: 12,
    category: "餅乾常溫",
    price: 80,
    note: "方形模21.5cm",
    bakes: ["餅乾層 180°C 23分", "奶油層 170°C 40分"],
    links: [
      ["실패없는 버터바 만들기 (YouTube)", "https://www.youtube.com/watch?v=3nAbbCQLbn0"]
    ],
    items: [
      ["鑽石低筋麵粉", 160, "餅乾層"],
      ["杏仁粉", 40, "餅乾層"],
      ["細砂糖", 40, "餅乾層"],
      ["鹽", 1.7, "餅乾層"],
      ["玉米糖漿", 40, "餅乾層"],
      ["依思尼 無鹽奶油", 120, "餅乾層"],
      ["依思尼 無鹽奶油", 300, "奶油層"],
      ["細砂糖", 230, "奶油層"],
      ["鹽", 4, "奶油層"],
      ["玉米糖漿", 80, "奶油層"],
      ["全蛋", 100, "奶油層"],
      ["愛樂微動物鮮奶油35%", 48, "奶油層"],
      ["中筋麵粉", 234, "奶油層"]
    ]
  },
  {
    name: "厚燒奶油酥餅",
    servings: 12,
    category: "餅乾常溫",
    price: 15,
    note: "",
    steps: [
      "為了避免奶油融化,乾性材料(麵粉、糖粉、鹽、杏仁粉,以及紅茶口味的紅玉紅茶粉)秤在一起,進冷凍庫冰30分鐘以上。奶油切成小塊後,淋上香草醬、鮮奶油,進冷藏室冰30分鐘以上。(Pro Tip:奶油不要冰冷凍庫!溫度太低反而會讓麵團無法成團)",
      "食物處理機內先加入乾性材料運轉30秒混合均勻,加入奶油碗,麵團一開始會呈現砂礫狀,不要擔心它不成團,繼續打2分鐘左右,當麵團開始成團後立即停止。",
      "放在保鮮膜上來回整形成緊密的麵團(避免中心有孔洞),直徑約4cm的長條狀,移動到烘焙紙捲起來用刮板收成圓形。烘焙紙兩端扭轉收起,放進冷凍庫內冰兩小時以上。",
      "不用退冰,直接切成一片1.5cm厚度,如果餅乾有變形的話這時候稍微在桌面滾一滾恢復圓形,用手捏著餅乾中心邊緣在粗砂糖的碗內滾一圈,沾滿糖粒。",
      "烤盤上放洞洞矽膠墊,擺上餅乾,放中層以160/150度烤13分鐘,轉180/170度續烤10分鐘直到表面微微上色,總共烘烤23分鐘,出爐,完全放涼再移動至烤盤架上。(Pro Tip:山崎烤箱烤溫平均中途不需掉頭;若烤箱上色不均,第一階段結束請180度掉頭)"
    ],
    bakes: ["中層 160/150°C 13分鐘", "180/170°C 續烤10分鐘(共23分鐘)"],
    links: [
      ["厚燒奶油酥餅 / Galette au beurre — ciao.kitchen", "https://ciao.kitchen/thick-butter-cookies/"]
    ],
    items: [
      ["依思尼 無鹽奶油", 100],
      ["杏仁粉", 30],
      ["水手牌高筋麵粉", 70],
      ["鑽石低筋麵粉", 30],
      ["糖粉", 40],
      ["鹽", 2],
      ["艾恩摩爾動物性鮮奶油", 5],
      ["莫諾尼香草醬", 3]
    ]
  },
  {
    name: "雪球餅乾",
    servings: 35,
    category: "餅乾常溫",
    price: null,
    note: "",
    items: [
      ["無鹽奶油", 100],
      ["糖粉", 35],
      ["鑽石低筋麵粉", 130],
      ["杏仁粉", 50],
      ["鹽", 1],
      ["糖粉", 40]
    ]
  },
  {
    name: "莎布蕾",
    servings: 35,
    category: "餅乾常溫",
    price: null,
    note: "",
    items: [
      ["無鹽奶油", 120],
      ["糖粉", 70],
      ["鑽石低筋麵粉", 200],
      ["蛋黃", 20],
      ["鹽", 1],
      ["細砂糖", 30]
    ]
  },
  {
    name: "雪Q餅",
    servings: 45,
    category: "餅乾常溫",
    price: null,
    note: "",
    items: [
      ["無鹽奶油", 60],
      ["棉花糖", 200],
      ["奇福餅乾", 300],
      ["奶粉", 30],
      ["蔓越莓乾", 80]
    ]
  },
  {
    name: "馬卡龍",
    servings: 23,
    category: "餅乾常溫",
    price: 70,
    note: "",
    bakes: ["70°C 20分鐘結皮", "150-160°C 16分鐘"],
    links: [
      ["初學者馬卡龍(抹茶奶油夾心)(YouTube)", "https://www.youtube.com/watch?v=5lqotmZa-xc"]
    ],
    items: [
      ["杏仁粉", 84, "馬卡龍麵糊"],
      ["糖粉", 84, "馬卡龍麵糊"],
      ["蛋白", 84, "馬卡龍麵糊"],
      ["細砂糖", 84, "馬卡龍麵糊"],
      ["菲力鮮奶油乳酪", 80, "果醬內餡"],
      ["草莓", 40, "果醬內餡"],
      ["檸檬汁", 5, "果醬內餡"]
    ]
  },
  {
    name: "可麗露",
    servings: 12,
    category: "餅乾常溫",
    price: 60,
    note: "",
    items: [
      ["牛奶", 550],
      ["無鹽奶油", 50],
      ["砂糖", 220],
      ["鹽", 2],
      ["水手牌高筋麵粉", 110],
      ["全蛋", 110],
      ["蛋黃", 40],
      ["麥斯萊姆酒", 50],
      ["蜂蜜", 15],
      ["莫諾尼香草醬", 5]
    ]
  },
  {
    name: "馬琳糖",
    servings: 80,
    category: "餅乾常溫",
    price: 1,
    note: "",
    items: [
      ["蛋白", 80],
      ["細砂糖", 80],
      ["玉米粉", 2],
      ["紅色色膏", 2]
    ]
  },
  {
    name: "費南雪",
    servings: 13,
    category: "餅乾常溫",
    price: 50,
    note: "(675) 겉바속촉 기본 휘낭시에 만들기 feat.금괴모양구음과자 - Plain Financier recipe l 호야 TV - YouTube",
    links: [
      ["기본 휘낭시에 Plain Financier — 호야TV (YouTube)", "https://www.youtube.com/watch?v=5-NrkmYUYZc"]
    ],
    items: [
      ["蛋白", 124],
      ["糖粉", 126],
      ["蜂蜜", 12],
      ["莫諾尼香草醬", 2],
      ["鑽石低筋麵粉", 50],
      ["杏仁粉", 48],
      ["無鹽奶油", 125]
    ]
  },
  {
    name: "司康",
    servings: 6,
    category: "餅乾常溫",
    price: null,
    note: "https://www.youtube.com/watch?v=UyR1BD9M5Do",
    links: [
      ["司康做法 (YouTube)", "https://www.youtube.com/watch?v=UyR1BD9M5Do"]
    ],
    items: [
      ["鑽石低筋麵粉", 300],
      ["依思尼 無鹽奶油", 180],
      ["泡打粉", 9],
      ["砂糖", 60],
      ["鹽", 3],
      ["全蛋", 60],
      ["牛奶", 60]
    ]
  },
  {
    name: "提拉米蘇",
    servings: 8,
    category: "蛋糕冷藏",
    price: 100,
    note: "",
    links: [
      ["食不相瞞 #96 義式經典提拉米蘇 (YouTube)", "https://www.youtube.com/watch?v=IUt0l_QUGR0"]
    ],
    items: [
      ["維西尼手指餅乾", 100],
      ["蛋黃", 40],
      ["細砂糖", 53],
      ["馬斯卡邦起司", 340],
      ["艾恩摩爾動物性鮮奶油35.1%", 120],
      ["麥斯萊姆酒", 30],
      ["濃縮咖啡", 100],
      ["無糖可可粉", 3]
    ]
  },
  {
    name: "起司蛋糕",
    servings: 8,
    category: "蛋糕冷藏",
    price: 70,
    note: "東京No.1起司蛋糕 Mr. Cheesecake 米其林三星主廚的夢幻甜點",
    links: [
      ["Mr. Cheesecake 東京No.1起司蛋糕 (YouTube)", "https://www.youtube.com/watch?v=_4q_Rn7_JgQ&t=339s"]
    ],
    items: [
      ["菲力鮮奶油乳酪", 225],
      ["艾恩摩爾動物性鮮奶油", 280],
      ["細砂糖", 100],
      ["全蛋", 110],
      ["希臘式優格", 50],
      ["玉米粉", 20],
      ["白鈕扣巧克力", 50],
      ["檸檬汁", 39],
      ["莫諾尼香草醬", 3]
    ]
  },
  {
    name: "可爾必思生乳捲",
    servings: 8,
    category: "蛋糕冷藏",
    price: 60,
    note: "",
    links: [
      ["日式捲餅(字幕解釋)(YouTube)", "https://www.youtube.com/watch?v=d_DpRm33QdY"],
      ["不掉皮蛋糕捲|濃郁起士生乳捲 (YouTube)", "https://www.youtube.com/watch?v=_Q1ixxFxNqA&t=673s"]
    ],
    items: [
      ["全蛋", 100],
      ["沙拉油", 45],
      ["細砂糖", 50],
      ["鑽石低筋麵粉", 55],
      ["蜂蜜", 5],
      ["檸檬汁", 3],
      ["牛奶", 45],
      ["艾恩摩爾動物性鮮奶油", 300],
      ["可爾必思", 70]
    ]
  },
  {
    name: "柳丁磅蛋糕",
    servings: 16,
    category: "蛋糕冷藏",
    price: 70,
    note: "",
    bakes: ["170°C 40分"],
    items: [
      ["柳丁", 300],
      ["全蛋", 165],
      ["細砂糖", 280],
      ["沙拉油", 50],
      ["鑽石低筋麵粉", 240],
      ["泡打粉", 10],
      ["艾恩摩爾動物性鮮奶油", 480],
      ["抹茶粉", 12],
      ["可爾必思", 120],
      ["白鈕扣巧克力", 70]
    ]
  },
  {
    name: "香蕉磅蛋糕",
    servings: 9,
    category: "蛋糕冷藏",
    price: 60,
    note: "",
    bakes: ["170°C 30~40分"],
    items: [
      ["香蕉", 375],
      ["鑽石低筋麵粉", 240],
      ["全蛋", 165],
      ["無鹽奶油", 75],
      ["沙拉油", 75],
      ["細砂糖", 60],
      ["砂糖", 75],
      ["白鈕扣巧克力", 50],
      ["泡打粉", 15],
      ["麥斯萊姆酒", 5],
      ["莫諾尼香草醬", 7],
      ["肉桂粉", 2.5],
      ["鹽", 3.5]
    ]
  },
  {
    name: "焙茶戚風蛋糕",
    servings: 8,
    category: "蛋糕冷藏",
    price: 120,
    note: "",
    links: [
      ["焙茶戚風 — Cookpad", "https://cookpad.com/jp/recipes/20310551"],
      ["鐵觀音茶香戚風蛋糕:烤出皇冠/劃線/判斷爐溫 (YouTube)", "https://www.youtube.com/watch?v=tcCQaTpLeqg&t=3s"]
    ],
    items: [
      ["全蛋", 165, "焙茶戚風蛋糕體"],
      ["細砂糖", 45, "焙茶戚風蛋糕體"],
      ["牛奶", 43, "焙茶戚風蛋糕體"],
      ["沙拉油", 30, "焙茶戚風蛋糕體"],
      ["鑽石低筋麵粉", 60, "焙茶戚風蛋糕體"],
      ["塔塔粉", 1, "焙茶戚風蛋糕體"],
      ["玉米粉", 8, "焙茶戚風蛋糕體"],
      ["檸檬汁", 200, "焙茶戚風蛋糕體"],
      ["蛋黃", 42, "卡士達鮮奶油內餡"],
      ["細砂糖", 42, "卡士達鮮奶油內餡"],
      ["鑽石低筋麵粉", 16, "卡士達鮮奶油內餡"],
      ["無鹽奶油", 10, "卡士達鮮奶油內餡"],
      ["莫諾尼香草醬", 2, "卡士達鮮奶油內餡"],
      ["艾恩摩爾動物性鮮奶油35.1%", 160, "卡士達鮮奶油內餡"],
      ["艾恩摩爾動物性鮮奶油35.1%", 150, "外層水果推薦"],
      ["細砂糖", 10, "外層水果推薦"],
      ["草莓", 60, "外層水果推薦"]
    ]
  },
  {
    name: "焦糖伯爵紅茶蛋糕",
    servings: 8,
    category: "蛋糕冷藏",
    price: 110,
    note: "8吋蛋糕模",
    links: [
      ["焦糖伯爵紅茶蛋糕 (YouTube)", "https://www.youtube.com/watch?v=rGboMSc3Nr0&list=PLYcmjDnmiHO6I_VhipyLIw3Dpc3pRNFmj&index=15"]
    ],
    items: [
      ["沙拉油", 57, "伯爵茶蛋糕片"],
      ["伯爵茶粉", 9, "伯爵茶蛋糕片"],
      ["牛奶", 85, "伯爵茶蛋糕片"],
      ["鑽石低筋麵粉", 89, "伯爵茶蛋糕片"],
      ["蛋黃", 89, "伯爵茶蛋糕片"],
      ["蛋白", 169, "伯爵茶蛋糕片"],
      ["細砂糖", 80, "伯爵茶蛋糕片"],
      ["檸檬汁", 9, "伯爵茶蛋糕片"],
      ["菲力鮮奶油乳酪", 160, "焦糖鮮奶油"],
      ["牛奶", 71, "焦糖鮮奶油"],
      ["愛樂微動物鮮奶油35%", 533, "焦糖鮮奶油"],
      ["焦糖醬", 178, "焦糖鮮奶油"]
    ]
  },
  {
    name: "焦糖醬",
    servings: 1,
    category: "醬料",
    price: null,
    note: "",
    items: [
      ["細砂糖", 213],
      ["愛樂微動物鮮奶油35%", 196]
    ]
  },
  {
    name: "蛋黃醬",
    servings: 1,
    category: "醬料",
    price: null,
    note: "",
    items: [
      ["蛋黃", 40],
      ["鑽石低筋麵粉", 40],
      ["牛奶", 400],
      ["細砂糖", 80],
      ["莫諾尼香草醬", 5]
    ]
  }
];
