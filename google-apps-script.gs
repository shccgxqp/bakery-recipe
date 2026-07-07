/**
 * 烘焙帳本 — Google Sheet 寫入 API(密碼保護版)
 *
 * 全站任何人可讀,只有知道密碼的人(你)能寫入。
 * 密碼以 SHA-256 雜湊存在「指令碼屬性」,不會出現在程式碼或前端。
 *
 * 更新步驟:
 * 1. 開資料庫試算表 → 擴充功能 → Apps Script,整份貼上取代舊程式,存檔
 * 2. 密碼已設定過的話不用重跑 setPassword,直接跳到下一步部署即可
 *    (指令碼屬性裡的密碼雜湊不會被這份程式碼覆蓋)
 * 3. 部署 → 管理部署作業 → 鉛筆編輯 → 版本選「新版本」→ 部署
 *    (網址不變,前端不用改)
 * 4. 建議:試算表共用權限改回「知道連結的任何人:檢視者」。
 *    讀取照常,寫入走這支 API(以你的身分執行),不需要開放編輯權。
 *
 * 更新記錄(每次改動都會加在這裡,複製部署前對一下日期確認是最新版):
 * - 2026-07-07:「材料」分頁寫入新增飽和脂肪g_100g、反式脂肪g_100g、鈉mg_100g 三欄
 *   (對應台灣包裝食品營養標示應遵行事項 8 項必要標示)
 */

/** 執行一次設定密碼,執行完把密碼字串改回預設字樣 */
function setPassword() {
  const newPassword = '在這裡輸入你的新密碼';
  if (newPassword === '在這裡輸入你的新密碼') {
    throw new Error('請先把 newPassword 改成你要的密碼再執行');
  }
  PropertiesService.getScriptProperties().setProperty('PASS_HASH', sha256Hex(newPassword));
  Logger.log('密碼已設定完成,請把程式碼中的密碼改回預設字樣後存檔。');
}

function sha256Hex(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2) })
    .join('');
}

function checkPass(pw) {
  const h = PropertiesService.getScriptProperties().getProperty('PASS_HASH');
  return !!h && typeof pw === 'string' && pw.length > 0 && sha256Hex(pw) === h;
}

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);

    if (d.action === 'verify') {
      return out({ ok: checkPass(d.password) });
    }

    if (!checkPass(d.password)) return out({ ok: false, error: '密碼錯誤' });

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const ingRows = [['材料名稱', '採購價NT', '採購重量g', '熱量kcal_100g', '蛋白質g_100g', '脂肪g_100g', '碳水g_100g', '糖g_100g', '飽和脂肪g_100g', '反式脂肪g_100g', '鈉mg_100g']];
    Object.keys(d.ingredients).forEach(function (n) {
      const i = d.ingredients[n], p = i.per100g;
      ingRows.push([n, i.packPrice, i.packGrams, p.kcal, p.protein, p.fat, p.carbs, p.sugar, p.satFat || 0, p.transFat || 0, p.sodium || 0]);
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

    const extraRows = [['食譜名稱', '步驟(一行一步)', '烘烤(一行一段)', '連結(標題 | 網址,一行一個)']];
    d.recipes.forEach(function (r) {
      extraRows.push([
        r.name,
        (r.steps || []).join('\n'),
        (r.bakes || []).join('\n'),
        (r.links || []).map(function (l) { return l[0] + ' | ' + l[1] }).join('\n'),
      ]);
    });
    writeSheet(ss, '食譜補充', extraRows);

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
