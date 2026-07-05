/**
 * 烘焙帳本 — Google Sheet 寫入 API
 *
 * 安裝步驟(一次性):
 * 1. 開啟你的資料庫試算表(1CT2G8P8...)
 * 2. 上方選單「擴充功能」→「Apps Script」
 * 3. 刪掉編輯器裡的預設內容,貼上這整個檔案,存檔
 * 4. 右上「部署」→「新增部署作業」→ 齒輪選「網頁應用程式」
 *    - 執行身分:我
 *    - 誰可以存取:所有人
 * 5. 按「部署」→ 授權自己的 Google 帳號 → 複製「網頁應用程式 URL」(結尾是 /exec)
 * 6. 把 URL 填進 src/config.js 的 SCRIPT_URL
 *
 * 安全性:寫入需 token 相符;建議把試算表共用權限改回「檢視者」,
 * 寫入一律走這支 API(以你的身分執行,不需要開放編輯)。
 */

const TOKEN = 'bakery-7f3a';

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.token !== TOKEN) return out({ ok: false, error: 'bad token' });

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const ingRows = [['材料名稱', '採購價NT', '採購重量g', '熱量kcal_100g', '蛋白質g_100g', '脂肪g_100g', '碳水g_100g', '糖g_100g']];
    Object.keys(d.ingredients).forEach(function (n) {
      const i = d.ingredients[n], p = i.per100g;
      ingRows.push([n, i.packPrice, i.packGrams, p.kcal, p.protein, p.fat, p.carbs, p.sugar]);
    });
    writeSheet(ss, '材料', ingRows);

    const recRows = [['食譜名稱', '份數', '分類', '售價', '備註', '材料', '用量g', '層']];
    d.recipes.forEach(function (r) {
      r.items.forEach(function (it) {
        recRows.push([r.name, r.servings, r.category || '未分類',
          r.price == null ? '' : r.price, r.note || '', it[0], it[1], it[2] || '']);
      });
    });
    writeSheet(ss, '食譜', recRows);

    return out({ ok: true, ingredients: ingRows.length - 1, recipeRows: recRows.length - 1 });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}

function writeSheet(ss, name, rows) {
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  sh.clearContents();
  sh.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
}

function doGet() {
  return out({ ok: true, ping: '烘焙帳本 API 運作中' });
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}
