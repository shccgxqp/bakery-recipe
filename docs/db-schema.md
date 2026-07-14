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

  /* 採購價/採購重量(packPrice/packGrams)v4.6.0 起搬到 ingredientPrices
     collection(見下),不再是這個文件的欄位——每個人買同一項材料的價格
     不同,而且對工作室是機密,不該公開;GET /api/data 回應會把目前登入者
     自己的價格併回這個材料物件上(欄位名稱不變,前端 calc.js 不用改) */

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
  labelDate: null,              // 標示登記日 'YYYY-MM-DD':營養/成分是哪天從包裝抄的
  note: "",                     // 備註(購買通路…),選填

  /* 資料來源與查核(v4.7.0):數值、成分、過敏原都必須可追溯。
     包裝商品優先 package_label/manufacturer;原型食材優先 official_db;
     不確定時 status:'pending'+per100g:null,不猜測或套用相似品。 */
  verification: {
    status: "verified",        // "pending" | "verified" | "needs_review" | "outdated"
    latestVerifiedAt: "2026-07-15" // 最近人工核對日;null = 未查核
  },
  evidence: [{
    id: "uuid…",               // 前端產生,只在本材料目前版本內唯一
    type: "package_label",     // "package_label" | "manufacturer" | "official_db" |
                                // "user_input" | "unknown"
    scopes: ["identity", "nutrition", "ingredients", "allergens"],
    title: "Isigny 無鹽奶油包裝營養標示", // 來源頁名或包裝描述
    url: "https://…",          // 原廠/代理商/政府頁;實體包裝可為空字串
    reference: "條碼或 TFDA 品項名稱", // 可空,用來鎖定同品項
    checkedAt: "2026-07-15",   // 此來源的查核日
    confidence: "high"         // "high" | "medium" | "pending"
  }],

  /* 僅供追溯的舊版(v4.7.0):伺服器管理,client 不可自行覆寫。任一公開參考資料
     改變時,原本的資料自動封存至此。一般材料搜尋/選材/營養計算只讀根層目前值;
     /ing/:id/history 才查看 history,避免同品項的新舊資料混在一起。 */
  history: [{
    id: "uuid…",
    archivedAt: ISODate,
    reason: "材料資料更新",
    name: "依思尼 無鹽奶油", category: "乳製品", brand: "依思尼", spec: "",
    per100g: { /* 舊版 8 項營養,或 null */ },
    allergens: ["牛奶羊奶"], mayContain: [], subIngredients: "…",
    labelDate: "2025-03-01", note: "", evidence: [/* 當時來源 */],
    verification: { status: "verified", latestVerifiedAt: "2025-03-01" }
  }],

  createdBy: "shccgxqp@gmail.com", // 帳號系統 phase 4(2026-07-10)加的;伺服器蓋章,
                                //  不信任 client。建立者本人或站長(role:"owner")才能改/刪
                                //  這筆;舊資料沒有這欄 = 只有站長能動(見 api/_lib/auth.js
                                //  canWriteShared)
  lastEditedBy: null,           // 站長修正別人建立的資料時蓋章(材料/模具是公開資料庫,
  lastEditedAt: null,           //  站長能改;跟建立者不同時才有值,讓建立者事後看得到)

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
  steps: ["步驟一…", "步驟二…"], // 一步一筆字串,可為空陣列
  bakes: [                      // 一段一筆物件(v4.2.0 起,舊格式是純字串陣列,
                                //  已遷移現有 6 筆);note 是位置/備註,可空
    { temp: "160/150°C", time: "13分鐘", note: "中層" },
  ],
  links: [{ title: "…(YouTube)", url: "https://…" }],
  items: [                      // 配方明細,順序即顯示順序
    { ingredientId: "8b1f4c2e-…", grams: 160, layer: "餅乾層" },
    { ingredientId: "…",          grams: 238, layer: "奶油層" }
    // layer: "" = 無分層(groupByLayer 會歸為單一無名段)
  ],
  finishedGrams: null,          // 成品重 g(出爐實秤)。標籤的「每一份量X公克」
                                //  和「每100公克」都要用成品重算(烘焙失水,生料重會偏低)
  storage: [                    // 保存期限(v4.6.0 起改彈性清單,取代舊的單一
                                //  storage 字串+shelfLifeDays 數字——冷藏冷凍
                                //  可以並行標示,不限定只有這兩種保存方式)
    { method: "冷藏", days: "3~5天" },
    { method: "冷凍", days: "2~3週" },
  ],                            // 可為空陣列(沒填保存資訊)
  sortOrder: 10,                // 分類內顯示順序(間隔 10 編號,插入取中間值)
  ownerId: "shccgxqp@gmail.com", // 帳號系統第一階段(2026-07-10)加的,存建立者
                                //  email。phase 4(2026-07-10)起這是真正的權限判斷
                                //  依據:只有 ownerId 相符的本人能改/刪這道食譜,
                                //  站長(role:"owner")不例外,連站長密碼也一樣受這條
                                //  規則約束(見 api/_lib/auth.js canWriteRecipe)。
                                //  伺服器蓋章,不信任 client payload
  public: true,                 // false = 私人:GET /api/data 只回給 ownerId 本人
                                //  (帶自己的登入 token 才看得到,站長也沒有例外,
                                //  v4.0.0 收斂);欄位不存在 = 當 true(舊資料不用遷移)。
                                //  注意 /api/label 不受此限(標示卡靠不可猜 UUID 分享)
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
  createdBy: null,             // 帳號系統 phase 4(2026-07-10)加的,同 ingredients.createdBy
  lastEditedBy: null, lastEditedAt: null,
  deletedAt: null, createdAt, updatedAt
}
```

食譜加選填 `moldId`(null = 未綁定;綁定後才開放「按模具換算」)。

### `ingredientPrices`(材料採購價,v4.6.0 新增,私人資料)

每個使用者對同一項材料的採購價/採購重量各自獨立——同一項材料每個人買的
通路、時間點不同,價格不一樣,而且這類進貨金額對工作室是機密。一筆
`(ingredientId, ownerId)` 一個文件,只有 `ownerId` 本人能寫/讀到自己這筆
(不是 `canWriteShared` 那種本人或站長皆可的規則,站長對別人的採購價沒有
特例,純粹私人資料)。

```js
{
  _id: "user@example.com:8b1f4c2e-…",  // 伺服器組出來的複合字串鍵,不信任
                                        //  client 傳的 _id,天然防止跨帳戶覆蓋
  ingredientId: "8b1f4c2e-…",
  ownerId: "user@example.com",         // 一律等於寫入者自己的 token email
  packPrice: 285,                      // 採購價 NT$
  packGrams: 500,                      // 採購重量 g
  createdAt, updatedAt
}
```

`GET /api/data` 只在使用者帶合法登入 token 時,把呼叫者自己的價格列
`find({ ownerId: caller })` 一次撈出,依 `ingredientId` 併回對應材料物件的
`packPrice`/`packGrams` 欄位再回傳;訪客或還沒替這項材料設過價格的使用者,
這兩個欄位就不存在(跟 `per100g: null` 的「尚無資料」是同一種概念,
`calc.js` 用 0 計並列入 `noPrice` 警示,不當真的免費)。
`POST /api/save` 新增 `prices: [{ ingredientId, packPrice, packGrams }]`
這個 top-level 鍵,伺服器一律用呼叫者自己的 `caller.id` 組 `_id`/`ownerId`,
不接受 client 指定要寫誰的價格。

### `users`(帳號系統,2026-07-10 新增)

跨網域(前端 GitHub Pages、API Vercel)不能用 cookie session,登入身份用
`api/_lib/authToken.js` 手刻的簽章 token,存前端 localStorage,打 API 帶
`Authorization: Bearer <token>`。**v4.0.0 起 token 是唯一身份**——站長密碼
機制已整個移除(`EDIT_PASSWORD_SHA256`/`api/verify.js` 已刪),站長 =
`role:"owner"` 的帳號(`scripts/promote-owner.mjs` 一次性標記)。
寫入端點用 `resolveCallerChecked`(`api/_lib/auth.js`):token 驗完再查一次
users 表——停用帳號即刻生效、role 以資料庫為準(升降權不用重新登入)。

```js
{
  _id: "uuid…",                 // 後端產生,不用 Google sub(信箱密碼帳號沒有 sub)
  email: "user@example.com",    // 統一小寫,唯一索引——帳號整合的關鍵:
                                 // Google 登入與信箱密碼登入,email 一樣就是同一人
  passwordHash: "a1b2…:c3d4…" ,  // "<salt hex>:<hash hex>",scrypt(見 api/_lib/password.js);
                                 // null = 純 Google 帳號,沒設過密碼
  googleSub: "1234567890" ,     // null = 純信箱密碼帳號,沒連過 Google
  emailVerified: false,         // 目前沒有寄驗證信的能力(網域還沒買)——欄位留著,不強制
  displayName: "",              // 公開暱稱(真名/email 永不公開)。Google 建帳號刻意不抄
                                 // Google 名字(多半是真名),留空由首次登入引導自取(/me)
  studioName: "",               // 工作室名稱(選填,v4.0.0 /me 個人頁)
  website: "",                  // 個人網頁/社群連結(選填,需 http(s):// 開頭)
  role: "user",                 // "user" | "trusted" | "owner";owner 對材料/模具有站長權限
                                 // (能改/刪任何人建立的),但對食譜沒有站長豁免——
                                 // 只有 ownerId 相符的本人能動自己的食譜。trusted 是
                                 // 之後審核機制的預留分級,目前權限同 user
  suspended: false,             // 停用(站長在 /admin/users 操作);寫入路徑查 DB 即刻生效,
                                 // 登入也擋;內容保留原樣不刪
  failedAttempts: 0,            // 信箱密碼登入失敗次數,達 5 次鎖 15 分鐘(見 api/auth/login.js)
  lockedUntil: null,
  tosAcceptedAt: null,          // 註冊時勾選服務條款的時間(合規鐵證,見 compliance.md)
  labelTermsAcceptedAt: null,   // 第一次取得標示卡連結時同意免責的時間(同上)
  createdAt, updatedAt
}
db.users.createIndex({ email: 1 }, { unique: true })
```

- `POST /api/auth/register`、`POST /api/auth/login`:信箱+密碼註冊/登入
  (註冊必帶 `tosAccepted: true`)。
- `GET /api/auth/google/start` → `GET /api/auth/google/callback`:Google 登入,
  callback 裡用 email 查/建 `users` 文件,跟信箱密碼是同一張表(帳號整合)。
- `GET/POST /api/auth/me`:讀取/更新自己的公開個人資料(暱稱/工作室/網頁),
  POST 成功回重簽 token(role 從資料庫重讀)。
- `POST /api/auth/terms`:記錄同意條款時間(`kind:'label'` → `labelTermsAcceptedAt`)。
- `GET/POST /api/admin/users`:站長管理使用者(清單+內容數統計/改角色/停用),
  防呆不能改自己。
- 各登入路簽出來的 token payload 格式一致:`{ sub, email, displayName, role }`
  (Google 登入另外多帶 `picture`)。

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

### v4.7.0 既有材料回填

部署來源／版本歷史功能後，執行一次 `node scripts/backfill-ingredient-provenance.mjs`。
它會對**包含軟刪除資料**在內、還沒有新欄位的材料，僅補上
`verification:{status:'pending',latestVerifiedAt:null}`、`evidence:[]`、`history:[]`；
不會修改營養、成分、過敏原或既有來源資料。執行前仍須先完成備份。

## 三、API(Vercel Serverless Functions,`api/` 目錄;v4.0.0 全面 token 制)

- `GET  /api/data` — 公開讀取,一次回 `{ ingredients, recipes, molds, settings }`(已過濾軟刪除)。
  帶合法登入 token(header `Authorization: Bearer`)時 `recipes` 額外回**自己的**
  私人食譜;沒帶或無效只回 `public !== false` 的。沒有「站長看全部」的特例。
  **隱私(v4.3.0)**:回應**不含任何 email**——`ownerId`/`createdBy`/
  `lastEditedBy` 由伺服器 join users 表換成 `ownerName`/`creatorName`/
  `editorName`(暱稱,空暱稱顯示「未命名烘焙師」、站長歸屬顯示站長暱稱)
  與 `mine`/`editedByMe` 旗標(給前端顯示層權限與個人頁清單用);
  資料庫文件本身仍存 email,寫入授權不受影響。
- `POST /api/save` — 帶登入 token;逐筆 upsert + 軟刪除 + 復原
  (`{ upserts: {ingredients, recipes, molds}, deletes: {...}, restores: {...},
  prices: [{ingredientId, packPrice, packGrams}] }`)。時間戳與擁有權欄位由
  伺服器管;名稱撞唯一索引回 409。**逐筆檢查擁有權**:食譜只有 `ownerId`
  相符本人能寫(站長不例外);材料/模具本人或站長皆可,站長編輯蓋
  `lastEditedBy`/`lastEditedAt`;`prices` 一律寫呼叫者自己的 `ingredientPrices`
  文件,不需要額外授權檢查(`_id`/`ownerId` 伺服器組,不接受 client 指定)。
  整批 payload 有任何一筆沒過權限檢查就整批 403、不寫入任何東西。寫入用
  `resolveCallerChecked`(查 DB:停用擋下、role 即時)。
- `GET  /api/label?id=` — 對外標示卡專屬端點:任何人可讀、不受公開/私人影響
  (id 是不可猜 UUID);後端算好只回標示欄位(營養 8 項/過敏原/內容物重量遞減/
  保存),**成本/售價/配方克數不出後端**。
- `POST /api/deleted` — 帶登入 token;回收桶,範圍比照寫入權限(食譜只看自己的;
  材料/模具站長看全部、一般使用者看自己建立的)。
- `api/auth/*`、`api/admin/users` — 見上方 `users` 段落。
- ~~`POST /api/verify`~~ — v4.0.0 已移除(站長密碼制退場)。

環境變數:`MONGODB_URI`、`MONGODB_DB`、`AUTH_SECRET`、`GOOGLE_CLIENT_ID`、
`GOOGLE_CLIENT_SECRET`(`.env` 供本機;Vercel 專案設定要另外貼一份)。
~~`EDIT_PASSWORD_SHA256`~~ 已不再使用,可從 Vercel 刪除。

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
   +有效日期(`storage`)——欄位都已就緒,做輸出介面即可。
2. 公開材料資料庫頁:每個材料固定網址,SEO 考慮預渲染(整站搬 Vercel)。
3. 半成品引用、烘焙日誌、採購清單。
4. 需帳戶系統(末期):進貨紀錄/價格歷史(`purchases` collection,記錄每次
   進貨的時間點,`ingredientPrices` 目前只有「現在這個價格」,還沒有歷史)、
   多工作室(私人欄位加 `ownerId`)、商場綁定。
