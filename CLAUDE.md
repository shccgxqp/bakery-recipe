# bakery-recipe(烘焙帳本)

甜點食譜 + 成本/營養計算網站。單人使用,個人烘焙工作室的內部工具。
線上網址:https://shccgxqp.github.io/bakery-recipe/(GitHub Pages,靜態網站)

## 技術棧

React 19 + Vite 6 + Tailwind CSS 4,純 JavaScript(無 TypeScript,無型別定義檔)。
沒有後端伺服器——GitHub Pages 只能放靜態檔案。

## 資料架構(目前,舊制)

三層資料來源,優先順序由上到下:

1. **Google Sheet**(主要來源,唯讀)——`src/lib/sheet.js` 用 gviz CSV 匯出端點讀取
   `材料`、`食譜`、`食譜補充` 三個分頁,不需要 API Key,分頁要設「知道連結者可檢視」。
   Sheet ID 設在 `src/config.js`(`SHEET_ID`)。
2. **`src/data/base.js`**(離線備援)——Google Sheet 讀取失敗時的內建常數,`INGREDIENTS`+`RECIPES`。
3. **localStorage**(`bakery-edits-v1`)——使用者在網頁上編輯/新增的暫存修改,跟 base 合併成最終資料。

**寫入**走 Google Apps Script Web App(`google-apps-script.gs`,部署在 Google 那邊,
網址設在 `src/config.js` 的 `SCRIPT_URL`):密碼經 SHA-256 雜湊比對後,才允許把
`材料`/`食譜`/`食譜補充` 三個分頁**整表清空重寫**。`src/lib/sync.js` 負責呼叫這支 API,
`App.jsx` 裡編輯後 1.5 秒防抖(debounce)會自動觸發同步。

`src/lib/exportFiles.js` 是另一條路:把目前資料下載成新的 `base.js`,手動取代 repo 裡的
檔案再 commit,當作「沒接 Apps Script 時」的備援存檔方式。

## 核心資料結構

材料(ingredient),key 是材料名稱:
```js
"中筋麵粉": {
  packPrice: 85, packGrams: 1000,
  per100g: { kcal, protein, fat, satFat, transFat, carbs, sugar, sodium }
}
```

食譜(recipe):
```js
{
  name, servings, category, price, note,
  steps: [...], bakes: [...], links: [[title, url], ...],
  items: [["材料名", 用量g, "層(可選)"], ...]
}
```

`src/lib/calc.js` 的 `NUTR` 陣列是「陣列驅動渲染」的核心——所有營養欄位的順序、中文名、
單位、小數位數都在這裡定義一次,`Detail.jsx` 的營養標示表格、`IngredientDialog.jsx` 的
編輯表單都是照這個陣列自動產生,新增欄位只需要改 `NUTR`(和對應的表單/列表如有寫死欄位)。

## 這次(2026-07)完成的工作:台灣營養標示合規

台灣「包裝食品營養標示應遵行事項」要求 8 項必要標示:熱量、蛋白質、脂肪、**飽和脂肪**、
**反式脂肪**、碳水化合物、糖、**鈉**。原本系統只有 5 項,缺後面加粗的 3 項。

- `calc.js`、`Detail.jsx`、`IngredientDialog.jsx`、`IngredientsView.jsx`、`sheet.js`、
  `google-apps-script.gs`、`exportFiles.js` 都已補齊這 3 個欄位(commit `d4fcdf3`)。
- `base.js` 的 47 項材料中,43 項已用使用者提供的舊營養紀錄回填真實數值;
  **棉花糖、奇福餅乾、奶粉、蔓越莓乾這 4 項還沒有資料**(舊資料也標「無資料」),
  目前顯示 0,之後有真實數據要再補。
- 反式脂肪特別注意:無鹽奶油(3.9g/100g)、依思尼無鹽奶油(2.2g)、各式動物性鮮奶油
  (1.0~1.8g)、菲力鮮奶油乳酪(1.7g)、沙拉油(1.5g)、馬斯卡邦起司(1.0g)、焦糖醬(0.9g)
  都**超過「可標0」的門檻(反式脂肪≤0.3g/100g 或總脂肪≤1.0g/100g)**,這些材料的食譜
  營養標示上反式脂肪不能標 0,要顯示真實數值。

## 踩過的坑

- **Apps Script 重新部署會換網址**:「管理部署作業 → 編輯現有部署 → 選新版本 → 部署」
  才會保留原網址;如果用「新增部署作業」會產生全新網址,`config.js` 的 `SCRIPT_URL`
  沒跟著改的話,前端還是打舊網址、吃不到新程式碼。已經因為這個踩過一次雷(commit `c158160`)。
- **Apps Script 寫入邏輯目前是寫死欄位名稱**(`ingRows.push([n, i.packPrice, ..., p.kcal, ...])`),
  每次資料結構加新欄位都要改程式碼+手動重新部署,使用者覺得很麻煩、也擔心漏部署導致資料被覆蓋
  (`writeSheet()` 是整表 `clearContents()` 後重寫,舊欄位資料真的會被吃掉)。
- **本機開發環境沒有安裝 Node/npm**,這個工作環境(Windows,Claude Code)沒辦法跑
  `npm run build`/`npm run dev` 驗證,測試改用仔細看 diff + 追資料流的方式代替。
- **git 沒設全域身分**,commit 要用 `git -c user.name="shccgxqp" -c user.email="shccgxqp@gmail.com"`
  inline 指定(照既有 commit 紀錄的作者),不要動 `git config --global`。

## 進行中的決定:遷移到 MongoDB Atlas + Vercel

使用者想擺脫 Google Sheets/Apps Script 這套(手動貼資料、手動重新部署太麻煩),決定改用：

- **MongoDB Atlas M0 免費叢集**(512MB,永久免費)當資料庫。
- **重要**:MongoDB Atlas 的 Data API 和 App Services(含 Functions、HTTPS Endpoints)
  已於 **2025-09-30 正式下線**,不能再用這條路做寫入 API,官方也是叫大家自己架 API。
- 因此改用 **Vercel(或 Netlify)Serverless Functions** 當中間層 API,連 MongoDB 驅動程式讀寫,
  密碼驗證邏輯寫在 function 裡。Vercel 接上 GitHub repo 後**每次 git push 自動部署**,
  這樣以後改後端程式碼(例如加新營養欄位)完全不需要使用者手動操作,直接 commit+push 生效——
  這才是真正解決「太麻煩、常忘記部署」問題的做法。

**目前卡在**:需要使用者自己完成兩個一次性帳號設定(我沒有瀏覽器操作能力,不能代勞):
1. 註冊 MongoDB Atlas,開 M0 免費叢集,拿到連線字串。
2. 註冊 Vercel,連結這個 GitHub repo。

這兩步完成之後,才能繼續:設計 schema、把 `base.js` 資料搬進 MongoDB、重寫
`sheet.js`/`sync.js`、砍掉舊的 Google Sheets/Apps Script 讀寫邏輯。

## 常用指令

```
npm run dev      # 本機開發伺服器(此環境目前沒裝 node,需在使用者自己的機器上跑)
npm run build    # build 到 dist/
```
