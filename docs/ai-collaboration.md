# Codex × Claude 協作協定

本專案允許 Codex 與 Claude 在**同一個工作目錄**協作。協作的目標是讓兩者共享專案知識與工作進度，同時避免同時改動同一份檔案。

## 資訊的唯一來源

| 資訊 | 位置 | 規則 |
| --- | --- | --- |
| 專案長期規範與架構 | `AGENTS.md`、`CLAUDE.md` | 兩檔必須完全相同；以 `AGENTS.md` 為主檔，修改後執行同步檢查。 |
| 資料模型與法律限制 | `docs/db-schema.md`、`docs/legal/compliance.md` | 動到資料、API 或標示功能前必讀相關文件。 |
| 視覺與產品決策 | `docs/design-guide.md`、`docs/roadmap.md` | 功能設計前使用，避免重新討論已定案事項。 |
| 即時任務、檔案宣告、交接 | `.ai-team/runtime/coordination.json` | 本機共用，不提交 Git。只能透過協作 CLI 更新。 |

## 每次工作的流程

1. 先讀 `AGENTS.md` 或 `CLAUDE.md`，再執行 `node scripts/agent-coord.mjs status`。
2. 在閱讀或規劃階段不需宣告；**開始編輯前**，用 `claim` 宣告任務與所有預計修改的檔案。
3. 若 CLI 回報路徑衝突，先不要編輯。改選不重疊工作、等待對方釋放，或請使用者決定優先順序。
4. 實作期間若範圍變大，先 `release`，再以擴大後的檔案清單重新 `claim`。
5. 完成後先執行適當驗證；用 `handoff` 或 `release` 留下「變更內容、驗證結果、未解風險」。
6. 提交前執行 `node scripts/sync-agent-guides.mjs --check`。涉及網站功能或介面時，仍須遵守 `AGENTS.md` 的版本與 `CHANGELOG.md` 規則。

## 路徑宣告原則

- 宣告實際會寫入的最小檔案集合，例如 `src/components/Detail.jsx,src/lib/labelImage.js`。
- 只有確實需整個區域重構時才宣告目錄，例如 `api/`；目錄會與其下所有檔案互斥。
- 共用文件或 `package.json` / `package-lock.json` 屬高衝突檔案，修改前必須宣告。
- 讀取、測試、review 不取得鎖；但不得順手修改別人已宣告的路徑。
- 緊急接手前，先檢查目前 claim 的時間與摘要；不要自行刪除別人的 claim。

## CLI 速查

```powershell
# 查看目前工作與最近交接
node scripts/agent-coord.mjs status

# 開始改檔（檔案以逗號區隔）
node scripts/agent-coord.mjs claim --agent codex --task "recipe-editor-validation" --files "src/components/RecipeEditView.jsx,src/lib/calc.js" --summary "補齊輸入驗證"

# 留下交接給另一位代理
node scripts/agent-coord.mjs handoff --from codex --to claude --task "recipe-editor-validation" --summary "已完成驗證；npm run build 通過；請 review 邊界案例"

# 任務完成或中止，釋放檔案
node scripts/agent-coord.mjs release --agent codex --task "recipe-editor-validation" --summary "完成，npm run build 通過"
```

`--task` 是短、穩定的 kebab-case 名稱。交接不會自動釋放 claim，交接後的負責人應先確認範圍，再由原代理釋放或明確交由使用者協調。

## 衝突與回報格式

對使用者的最終回報應包含：完成內容、實際修改的檔案、驗證結果，以及任何未完成或需要決策之處。若碰到 claim 衝突，應明確回報衝突任務、重疊路徑與下一步，而不是覆寫。

協作狀態是工作區層級的即時訊號，不是任務歷史的永久紀錄。重要決策、架構改變與使用者需求仍應寫入追蹤的文件、程式碼或 Git commit。
