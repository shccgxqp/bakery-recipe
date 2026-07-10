# MongoDB 資料庫架構(2026-07-08 定案)

MongoDB Atlas(M0)+ Vercel Serverless Functions。
資料庫名稱:`bakery-recipe-mongoDB`(`.env` 的 `MONGODB_DB`)。
目前資料量:材料 59 筆、食譜 20 道。

## 一、設計原則

1. **以字串 UUID `_id` 互相引用**(前端 `crypto.randomUUID()` 產生,離線新增不用等伺服器
   發號)。食譜引用 `ingredientId` 而非材料名稱,材料改名不會讓食譜斷鏈。
2. **開放欄位**:API 對文件整包存取、不寫死欄位名。之後加新營養素只要改前端 `calc.js`
   的 `NUTR` 陣列;加過敏原類別只要改 `settings.allergenList`——後端完全不用動。
3. **衍生資料一律即時計算、不落地**:成本、營養、過敏原標示、內容物清單都從材料算出來,
   材料改了所有食譜自動正確,沒有「忘了更新」的問題。
4. **`per100g: null` 代表「無營養資料」**,與真實為 0(如水)區分,UI 顯示「無資料」。
5. **公開參考資料與私人營運資料在欄位上分離**(見 ingredients 註記),將來要拆
   多使用者(工作室帳戶)時,私人欄位拆出去加 `ownerId` 即可,公開資料庫不動。

## 二、Collections

### `ingredients`(材料)

```js
{
  _id: "8b1f4c2e-…",            // 字串 UUID,前端產生
  name: "依思尼 無鹽奶油",       // 顯示名稱,unique index(部分索引,見下)

  /* -- 私人營運資料 -- */
  packPrice: 285,               // 採購價 NT$
  packGrams: 500,               // 採購重量 g(成本 = 用量 × packPrice / packGrams)
  unitName: "顆",                // 選填,單位換算用(顆/大匙/片…);'' 或 null = 不提供單位輸入
  unitGrams: 55,                 // 1 個 unitName 是幾克(如全蛋 1 顆≈55g);
                                //  食譜輸入配方時可直接填「3 顆」自動換算成克數

  /* -- 公開參考資料(材料資料庫的主力內容)-- */
  category: "乳製品",            // 分類,值取自 settings.ingCatOrder(台灣烘焙材料行通用分類)
  brand: "依思尼",               // 廠牌;'' = 無廠牌概念(如水、全蛋)
  spec: "",                     // 規格/型號(同廠同名不同型,如「35.1%乳脂」)
  per100g: {                    // 每 100g 營養;null = 尚無資料
    kcal: 743, protein: 0.7, fat: 82, satFat: 59,
    transFat: 2.2, carbs: 0.5, sugar: 0.5, sodium: 30
  },
  allergens: ["牛奶羊奶"],       // 過敏原,值取自 settings.allergenList
  mayContain: [],               // 「可能含有」(產線交叉污染警語,照包裝抄)
  subIngredients: "",           // 包裝「成分」欄原文照抄(含添加物的合規寫法,
                                //  如「膨脹劑(碳酸氫鈉)」),食譜「內容物」標示展開用
  labelDate: null,              // 標示登記日 'YYYY-MM-DD':營養/成分是哪天從包裝抄的。
                                //  廠商改配方 → 直接更新資料+更新此欄;歷史靠每日 git 備份
  note: "",                     // 備註(購買通路…),選填

  deletedAt: null,              // 軟刪除:null=存活,日期=已刪(API 預設過濾)
  createdAt: ISODate, updatedAt: ISODate
}
```

### `recipes`(食譜)

```js
{
  _id: "3fa2d9b0-…",
  name: "黑糖奶油棒",            // unique index(部分索引)
  servings: 12,                 // 份數,≥1
  category: "餅乾常溫",
  price: 80,                    // 每份售價;null = 未定價(利潤率排序沉底)
  note: "方形模21.5cm",
  steps: ["步驟一…", "步驟二…"], // 可為空陣列
  bakes: ["餅乾層 180°C 23分"],  // 烘烤設定,可為空陣列
  links: [{ title: "…(YouTube)", url: "https://…" }],
  items: [                      // 配方明細,順序即顯示順序
    { ingredientId: "8b1f4c2e-…", grams: 160, layer: "餅乾層" },
    { ingredientId: "…",          grams: 238, layer: "奶油層" }
    // layer: "" = 無分層(groupByLayer 會歸為單一無名段)
  ],
  finishedGrams: null,          // 成品重 g(出爐實秤)。標籤的「每一份量X公克」
                                //  和「每100公克」都要用成品重算(烘焙失水,生料重會偏低)
  shelfLifeDays: null,          // 保存期限(天)
  storage: "",                  // 保存條件(如「冷藏」)
  sortOrder: 10,                // 分類內顯示順序(間隔 10 編號,插入取中間值)
  ownerId: "shccgxqp@gmail.com", // 帳號系統第一階段(2026-07-10)加的,暫時存
                                //  Google 登入的 email(之後可能換成穩定的 sub)。
                                //  現階段只是標記,不影響任何讀寫權限或可見度——
                                //  公開/私人切換、per-owner API 權限是第二階段的事
  deletedAt: null,
  createdAt: "…", updatedAt: "…"
}
```

**過敏原與內容物不存在食譜上**——與成本、營養同一個原則:標示永遠即時計算。
食譜過敏原 = 所有材料 `allergens` 的聯集(`mayContain` 同理,已含有的不重複列);
「內容物」= 材料依重量遞減排序,複合材料以 `subIngredients` 展開成
「泡打粉(碳酸氫鈉、酸性焦磷酸鈉、玉米澱粉)」。材料改標註,所有食譜自動正確。

### `molds`(模具,v3.3 新增)

幾何制:換算倍率由容積決定,品牌只是名稱備註(設計討論見 roadmap 第 9 項)。

```js
{
  _id: "uuid…",
  name: "6吋活動圓模",          // 不含廠牌(廠牌獨立欄,可搜尋)
  brand: "三能",                // 選填,'' = 無品牌
  count: 1,                    // 模具入數;非連模固定 1。食譜一份對應「一整模」
                               // (含全部入數),故總容積 = 單顆容積 × count
  shape: "round",              // round|square|rect|tube|tart|log|other
  dims: {                      // 公分。大多數模具上大下小(錐形),容積用上下平均值
                               // 當柱體算(誤差 <1%,見圓塔模驗證);只給一組尺寸時上下視為相同
    topD: 15.2, bottomD: 14.7, h: 7,     // round/tart
    // square: { topW, botW, h }
    // rect:   { topL, topW, botL, botW, h }
    // tube:   { topD, bottomD, innerD, h }(外壁);中柱比外壁高導致公式失真時用 volume 覆寫
    // log:    { d, length }(臥式圓柱,吐司圓模/長條圓模)
    // other:  {}
  },
  volume: null,                // 覆寫用;有值就直接採用(型錄實測容積、或 other 形狀手動填),
                               // 沒填才用 dims 公式算(src/lib/molds.js)
  dataSource: 'catalog',       // 'catalog'(廠商官方型錄實測,如三能)|'web'(網路搜尋整理,
                               // 尺寸未經官方驗證,如 chefmade;多半只有外部最大尺寸,容積是粗估)|
                               // 'manual'(使用者自己量的);不影響計算,只是信心度標記
  note: "",
  deletedAt: null, createdAt, updatedAt
}
```

食譜加選填 `moldId`(null = 未綁定;綁定後才開放「按模具換算」)。

### `settings`(單一文件)

```js
{
  _id: "main",
  catOrder: ["蛋糕冷藏", "餅乾常溫", "醬料", "未分類"],
  allergenList: [               // 台灣強制標示 11 類,驅動材料編輯表單(NUTR 模式)
    "甲殼類", "芒果", "花生", "牛奶羊奶", "蛋", "堅果",
    "芝麻", "含麩質之穀物", "大豆", "魚類", "亞硫酸鹽"
  ],
  ingCatOrder: [                // 材料分類顯示順序(台灣烘焙材料行通用分類)
    "麵粉/澱粉", "糖/甜味劑", "乳製品", "蛋類", "油脂", "巧克力/可可",
    "堅果/果乾", "水果", "茶/咖啡", "膨脹/凝固劑", "調味/香精/色素", "酒類", "其他"
  ]
}
```

### 索引(部分唯一索引,配合軟刪除)

```js
// 只約束「存活」文件的名稱唯一;已軟刪除的不佔名額,同名可重建(已在 Atlas 實測)
db.ingredients.createIndex({ name: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } })
db.recipes.createIndex({ name: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } })
```

### 軟刪除

刪除 = `$set { deletedAt: now }`,不做物理刪除。`GET /api/data` 預設過濾
`deletedAt: null`;之後可做「資源回收桶」介面還原。誤刪可救、同步時「刪除」
不再是危險操作。client 在 upsert 裡夾帶的 `deletedAt` 會被伺服器剝除,
不能用寫入偽造刪除狀態。

## 三、API(Vercel Serverless Functions,`api/` 目錄)

- `GET  /api/data` — 公開讀取,一次回 `{ ingredients, recipes, molds, settings }`(已過濾軟刪除)。
- `POST /api/save` — 帶密碼;逐筆 upsert + 軟刪除 + 復原
  (`{ password, upserts: {ingredients, recipes, molds}, deletes: {...}, restores: {...} }`)。
  時間戳由伺服器管;名稱撞唯一索引回 409。
- `POST /api/verify` — 密碼驗證(SHA-256 比對環境變數 `EDIT_PASSWORD_SHA256`)。
- `POST /api/deleted` — 帶密碼;回收桶用,回傳三個 collection 裡 `deletedAt` 不是
  `null` 的文件。跟編輯同一信任等級(已刪除資料不公開)。

環境變數:`MONGODB_URI`、`MONGODB_DB`、`EDIT_PASSWORD_SHA256`
(`.env` 供本機;Vercel 專案設定要另外貼一份,`.env` 不會自動上傳)。

## 四、每日自動備份(單向,純備份)

`.github/workflows/backup.yml` 每天台灣時間 04:00(UTC 20:00)執行
`scripts/export-backup.mjs`,把三個 collection(含已軟刪除)匯出成
`backup/*.json` commit 進 repo。**網站永遠只讀 MongoDB,備份檔不參與運作**;
需要救資料時從 git 歷史撈當天 JSON 灌回。M0 免費層沒有自動備份,這招補上,
也天然保留材料配方的歷史版本(廠商改配方前的舊值都查得到)。
需要在 GitHub repo 的 Settings → Secrets 加 `MONGODB_URI`。

## 五、資料註記

- 無營養資料(`per100g: null`,共 5):奶粉、蔓越莓乾、葡萄糖漿、吉利丁粉、粉紅色色膏。
  「水」為真實全 0,不算無資料。
- 「焦糖醬」同時是食譜(醬料分類)也是材料(給焦糖伯爵紅茶蛋糕用)——
  「食譜當材料引用(半成品)」列為未來擴充,屆時 items 加 `type` 欄位區分即可,
  既有資料不用改。
- 待人工確認:焙茶戚風蛋糕「蛋糕體」有一筆**檸檬汁 200g**,量異常大,疑似打錯。

## 六、未來擴充(依優先序)

1. 標籤輸出:品名+內容物(重量遞減、複合材料展開)+過敏原+淨重(`finishedGrams`)
   +有效日期(`shelfLifeDays`)——欄位都已就緒,做輸出介面即可。
2. 公開材料資料庫頁:每個材料固定網址,SEO 考慮預渲染(整站搬 Vercel)。
3. 半成品引用、烘焙日誌、採購清單。
4. 需帳戶系統(末期):進貨紀錄/價格歷史(`purchases` collection)、多工作室
   (私人欄位加 `ownerId`)、商場綁定。
