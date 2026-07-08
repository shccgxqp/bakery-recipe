# bakery-recipe(烘焙帳本)

甜點食譜 + 成本/營養計算網站。個人烘焙工作室的工具,資料全公開。
線上網址:https://shccgxqp.github.io/bakery-recipe/(GitHub Pages)

## 技術棧與架構

React 19 + Vite 6 + Tailwind CSS 4,純 JavaScript(無 TypeScript)。

- **前端**:GitHub Pages 靜態站(`npm run build` → `dist/`)。
- **資料庫**:MongoDB Atlas M0 免費叢集,資料庫名 `bakery-recipe-mongoDB`,
  三個 collection:`ingredients`(59)/ `recipes`(20)/ `settings`。
  完整 schema 見 `docs/db-schema.md`。
- **API**:Vercel Serverless Functions(`api/` 目錄,push 自動部署):
  - `GET /api/data` 公開讀取(過濾軟刪除)
  - `POST /api/save` 帶密碼寫入:逐筆 upsert + 軟刪除,欄位不寫死
  - `POST /api/verify` 密碼驗證(SHA-256 比對環境變數)
  - 共用連線在 `api/_lib/mongo.js`(底線目錄不成為路由)
- **環境變數**(`.env` 本機、Vercel 專案設定各一份):
  `MONGODB_URI`、`MONGODB_DB`、`EDIT_PASSWORD_SHA256`。
- **每日備份**:`.github/workflows/backup.yml` 每天台灣時間 04:00 把三個 collection
  匯出成 `backup/*.json` commit 進 repo。單向純備份,網站不讀這些檔案。
  需要 GitHub Secrets 的 `MONGODB_URI`。

## 前端資料流(直寫模式,2026-07-08 起)

1. 開站 `GET /api/data` → 成功就存 localStorage 快取(`bakery-cache-v1`);
   失敗 fallback 到上次快取(離線唯讀)。
2. **按「儲存」直接寫資料庫**(對話框 await,失敗留在原地顯示錯誤、儲存中鎖按鈕),
   成功後整份重新讀取。沒有本機暫存層、沒有防抖同步(舊的 `bakery-edits-v*` 已廢棄,
   開站會清掉)。
3. 新資料的 `_id` 由前端 `crypto.randomUUID()` 產生。
4. 材料頁:前端即時搜尋(名稱/廠牌/規格/分類子字串)+ 依 `settings.ingCatOrder`
   分類區段顯示;資料量小,搜尋排序都在前端做,不動後端。

## 核心資料結構(詳見 docs/db-schema.md)

- 材料/食譜都以字串 UUID `_id` 互相引用(改名不會斷)。
- 食譜 `items: [{ ingredientId, grams, layer }]`、`links: [{ title, url }]`。
- 材料 `per100g: null` 代表「無營養資料」(UI 顯示無資料,計算以 0 計並警示),
  與真實為 0(如水)區分。
- 材料的公開資料庫欄位:`brand`/`spec`/`allergens`/`mayContain`/`subIngredients`
  (照包裝成分欄原文)/`labelDate`(標示登記日,廠商改配方要更新)。
- 食譜合規標籤欄位:`finishedGrams`(成品重,營養標示每100g用它算)/
  `shelfLifeDays`/`storage`。
- **過敏原/內容物永遠即時計算**(`calc.js` 的 `allergenSummary`),不落地存在食譜上。
- `calc.js` 的 `NUTR` 陣列驅動所有營養欄位渲染;`settings.allergenList`(台灣 11 類)
  驅動過敏原勾選,加類別不用改程式。

## 台灣營養標示合規(2026-07 完成)

「包裝食品營養標示應遵行事項」8 項必要標示:熱量、蛋白質、脂肪、飽和脂肪、
反式脂肪、碳水化合物、糖、鈉,全部支援。反式脂肪注意:無鹽奶油(3.9g/100g)、
依思尼無鹽奶油(2.2g)、各式動物性鮮奶油(1.0~1.8g)、菲力鮮奶油乳酪(1.7g)、
沙拉油(1.5g)、馬斯卡邦起司(1.0g)、焦糖醬(0.9g)都超過「可標0」門檻
(反式脂肪≤0.3g/100g 或總脂肪≤1.0g/100g),不能標 0。

無營養資料的材料(`per100g: null`):奶粉、蔓越莓乾、葡萄糖漿、吉利丁粉、粉紅色色膏。

## 願景與路線圖

- **公開的材料營養/過敏原資料庫是未來主力功能**:廠牌+規格+標示日期的市售品項資料,
  是衛福部通用資料查不到的價值;做起來會有烘焙業者專程來查。SEO 屆時要考慮
  預渲染(搬 Vercel)。
- 待辦:標籤輸出(內容物依重量遞減+過敏原+有效日期)、半成品(食譜當材料引用)。
- 需要帳戶系統才有意義的(末期):進貨紀錄/價格歷史、多工作室、商場綁定。

## 踩過的坑

- **本機網路的 DNS 不回應 SRV 查詢**(`mongodb+srv://` 需要):本機跑連線腳本要
  `dns.setServers(['8.8.8.8'])`;Vercel/GitHub Actions 上不需要。
- **Node 在 `C:\Program Files\nodejs\`**,安裝前就開著的終端機 PATH 沒刷新,
  找不到 `node` 時用完整路徑或開新終端機;npm 有 allowScripts 政策,
  esbuild 的 postinstall 被擋,跑 build 前先 `npm approve-scripts`。
- **Atlas 密碼驗證失敗**時,到「Database Access」重設資料庫使用者密碼
  (跟 Atlas 網站登入密碼是兩回事);連線字串裡不要留範本的角括號 `< >`。
- **git 沒設全域身分**,commit 要用 `git -c user.name="shccgxqp" -c user.email="shccgxqp@gmail.com"`
  inline 指定,不要動 `git config --global`。
- 疑似資料錯誤待確認:焙茶戚風蛋糕「蛋糕體」有一筆檸檬汁 200g,量異常大。

## 版本規則(每次部署必做)

每次 push 前:`package.json` 的 `version` 依語意化版本 +1(主=架構變動、次=新功能、
修訂=修 bug/微調),並在 `CHANGELOG.md` 加一段紀錄(新的在上)。前端會自動從
package.json 讀版本顯示在側欄底部,不用改程式。

## 常用指令

```
npm run dev                      # 本機開發伺服器
npm run build                    # build 到 dist/
node scripts/export-backup.mjs   # 手動備份資料庫到 backup/*.json
```
