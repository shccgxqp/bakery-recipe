# 烘焙帳本 — 甜點成本與營養自動計算

純靜態網頁,可直接部署到 GitHub Pages(免費)。
選一道甜點即可看到:配方明細、材料成本、每份成本、台式營養標示(每份 / 每100g)。

## 檔案結構

```
bakery-calc/
├── index.html          ← 頁面 + 計算邏輯(不用動)
└── data/
    ├── ingredients.js  ← 材料主檔:採購價、採購量、每100g營養(手動維護)
    └── recipes.js      ← 甜點食譜:材料名 + 用量g(手動填寫)
```

## 部署到 GitHub Pages(一次設定)

1. 在 GitHub 建一個新 repo(例如 `bakery-calc`),把這三個檔案推上去
2. Repo → **Settings → Pages** → Source 選 `Deploy from a branch`,
   Branch 選 `main` / `(root)` → Save
3. 一分鐘後網址就是 `https://<你的帳號>.github.io/bakery-calc/`

## 日常使用

- **新增材料**:編輯 `data/ingredients.js`,照現有格式加一筆
  (營養成分可查衛福部食品營養成分資料庫,或包裝上的營養標示)
- **新增甜點**:編輯 `data/recipes.js`,只填材料名 + 克數
- commit 後 GitHub Pages 幾十秒內自動更新,手機瀏覽器也能直接改(GitHub 網頁編輯器)
- 食譜中的材料名稱要和材料主檔完全一致,對不到時卡片會顯示紅字警告

## 本機預覽

因為資料用 `<script>` 載入(不是 fetch),直接雙擊 `index.html` 就能開,不需要架 server。

## 計算邏輯

- 材料成本 = 用量g × (採購價 ÷ 採購量g)
- 營養 = 用量g × (每100g營養 ÷ 100),加總後除以份數得「每份」
- 「每100公克」以生料總重計,實際成品因水分蒸發會略高
