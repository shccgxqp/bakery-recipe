# 材料版本與食譜綁定：架構決策

> 決定日期：2026-07-15。狀態：已拍板、待實作。此決策優先於任何批次材料數據寫入。

## 問題

同一材料的營養、成分、過敏原或來源可能因廠商改配方、包裝版本或資料修正而改變。
食譜若只存 `ingredientId` 並即時計算，材料資料一更新，歷史食譜就會在未經同意的
情況下改變；這會造成營養標示、過敏原和內容物追溯失真。

市面上也可能同時流通新版、舊版與使用者庫存。系統不能把最新版本鎖成唯一選項，
否則強迫使用者假裝自己只買得到新貨。

## 決定

採用三級模型：**材料本體 → 不可變材料版本 → 食譜指定版本**。

```text
牛奶（材料本體 ingredientId）
├─ v01（materialVersionId）100 kcal，舊包裝，仍可選
└─ v02（materialVersionId）120 kcal，目前包裝，預設選取

舊食譜 ─→ 牛奶 v01
新食譜 ─→ 牛奶 v02（可改選 v01）
```

### 材料本體

代表「牛奶」這個可搜尋、可分類的概念；保有穩定 UUID、名稱、分類與目前版本指標，
不直接承載會改變的營養／成分資料。

```js
{
  _id: "ingredient-uuid",
  name: "牛奶",
  category: "乳製品",
  currentVersionId: "material-version-v02-uuid"
}
```

### 材料版本

每份營養、成分、過敏原、來源資料有自己的全域 UUID；版本一經建立即不可改寫。
修正資料或廠商改版時建立新版本，不覆寫舊版本。系統 ID 使用 UUID，不使用容易衝突的
`01`；畫面另顯示人看得懂的 `v01`、`v02`。

```js
{
  _id: "material-version-v01-uuid",
  ingredientId: "ingredient-uuid",
  revision: 1,
  lifecycle: "legacy",        // current | legacy | retired
  availability: "available",  // available | unknown | unavailable
  per100g: { kcal: 100, /* 其餘 7 項 */ },
  allergens: [], mayContain: [], subIngredients: "",
  evidence: [], verification: { status: "verified", latestVerifiedAt: "YYYY-MM-DD" },
  createdAt: ISODate
}
```

- `current`：材料本體的預設選項。
- `legacy + available/unknown`：新增食譜仍可主動選擇，符合舊庫存與通路並行現況。
- `retired` 或 `availability:"unavailable"`：舊食譜仍可看／算，但新增食譜不提供選取。
- 沒有可靠流通資訊時使用 `unknown`，不可自行判定停產。

### 食譜項目

```js
{ ingredientId: "ingredient-uuid", ingredientVersionId: "material-version-v01-uuid", grams: 100, layer: "" }
```

食譜儲存時固定 `ingredientVersionId`。新增食譜預設目前版本，但可展開版本選擇器；
更新材料不會改動任何現有食譜。食譜編輯頁必須提供明確的「改用最新版」與
「選擇其他版本」操作，絕不可自動升版。

## 成本與未來生產紀錄

材料的公開版本鎖定營養、成分、過敏原與來源；私人採購價仍可使用使用者的目前價格
計算。未來的生產紀錄必須另外存完整材料版本與當時採購成本快照，不能只依賴版本 ID。

## 對現有 v4.7.0 的影響

v4.7.0 的 `ingredients.history` 可查看舊資料，但不是正式版本模型，食譜目前也沒有
`ingredientVersionId`，所以**尚不能防止食譜跟著材料變動**。實作本決策前：

1. 暫停將研究候選直接寫入材料資料庫。
2. 遷移每筆既有材料為材料本體＋第一個版本。
3. 遷移每份既有食譜 item，綁定遷移當刻的材料版本。
4. 改寫 `calc.js`、API、材料編輯器與食譜選材器，再開放材料新版本寫入。
