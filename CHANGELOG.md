# Changelog

所有變更紀錄依 commit 時間由舊到新排列。

本 Repo 使用 [Conventional Commits](https://www.conventionalcommits.org/) 風格，訊息以繁體中文撰寫。

---

## 2026-04-11

| Commit | 說明 |
| --- | --- |
| `1861065` | **feat: 寶寶日記 PWA — 完整實作** — 首次完整版本，包含首頁 / 喝奶 / 睡眠 / 尿布 / 成長 / 日記 / 統計與 PWA 設定 |
| `789dea0` | **feat(import): 加入進度條與批次匯入最佳化** — 改善大量歷史資料匯入體驗 |
| `a11a2af` | **feat: 跨裝置家人協作 — 自動同步寶寶清單 + 設定碼分享** — 讓爸媽與家人可共用同一份紀錄 |
| `290a2ac` | **fix: 修正 GitHub 讀取中文亂碼 (atob UTF-8 decode)** — 修復從 GitHub API 讀回檔案時的中文解碼問題 |
| `04129af` | **fix: 自動修復 avatar 亂碼並寫回 GitHub** — 針對已被亂碼污染的舊資料自動修補 |
| `fe31678` | **feat: 寶寶刪除功能 + 時間軸標題顯示正確日期** — 多寶寶管理改善、時間軸日期顯示修正 |
| `decfc14` | **feat(home): 首頁顯示寶寶頭像、姓名與出生天數** — 首頁 baby banner |
| `901ba40` | **feat(growth): 加入 WHO 0-5 歲生長標準曲線與每項最新數值** — 成長曲線疊加 WHO P3/P50/P97，最新數值改為每項獨立顯示各自日期 |
| `bdd5d99` | **fix(home): 修復快速紀錄「副食品」按鈕無反應** — 補上遺漏的 `QuickSolidsModal` 與 Home.jsx 內的 modal 渲染區塊 |
| `f66063c` | **feat(growth): 成長曲線限定 0-24 個月 + 最新數值顯示 WHO 百分位** — X 軸改為 0-24 月，新增 `estimatePercentile()` helper |
| `e8bdadf` | **fix(growth): WHO 虛線參考曲線同樣限制在 0-24 個月** — 修正 chartData 仍塞入 0-60 月 WHO 參考點 |
| `2cdc4cf` | **fix(settings): 貼上設定碼按鈕展開時缺少狀態顏色回饋** — 依展開狀態切換粉色高亮 / 灰色樣式 |
| `ed14e6b` | **fix(settings): 複製設定碼按鈕改為預設灰底** — 原本硬編碼粉色，改為中性灰色 |
| `f8cbd87` | **feat(about): 版本號改為依 commit 次數自動遞增 + 顯示 SHA** — `vite.config.js` 注入 `__APP_VERSION__` / `__APP_COMMIT__` |
| `845496d` | **ci: checkout 改為 `fetch-depth: 0`** — 讓版本號在 GitHub Pages 上正確顯示 |
| `6c324c5` | **feat(about): 建置時間改用台灣時區並精確到分鐘** — `Intl.DateTimeFormat` + `Asia/Taipei` |
| `824a9f4` | **feat(settings): 複製設定碼按鈕加上已複製視覺回饋** — 點擊後 1.8 秒顯示綠底 ✓「已複製」 |

## 2026-04-12

| Commit | 說明 |
| --- | --- |
| `6848fc4` | **feat(export): 新增 CSV 資料匯出功能** — `/export` 頁面，支援全部匯出或個別類型，UTF-8 BOM 編碼 |
| `e9bc5e9` | **fix(export): 修復尿布匯出失敗 + 防禦 null 記錄** — `Array.isArray` + `filter(Boolean)` 跳過空值 |
| `f1e1d0f` | **fix(export): 全部匯出改為產生單一 CSV** — 避免瀏覽器擋連續多檔下載 |
| `88c7003` | **feat(export): CSV 欄位名與值改為繁體中文** — 欄位標頭與 enum 值全面中文化 |
| `36dfe03` | **feat(import): 分類匯入改為繁中格式並新增擠奶、副食品** — 範本與欄位名改繁中，與匯出格式一致 |
| `d9af845` | **feat(home): 日期選擇器改為可點擊跳轉任意日期** — 點擊日期開啟原生日曆、「今」按鈕一鍵回今天 |
| `2e1d379` | **feat(home): 首頁摘要卡新增擠奶、副食品 + 新建副食品列表頁** — `/solids` 頁面含完整 CRUD |
| `9a0eb2a` | **fix(home): 修正擠奶導向、副食品標題、時間軸可直接編輯紀錄** — 擠奶卡改導向 `/pumping`，時間軸傳入 `editRecord` |
| `f96a122` | **feat: 擠奶/副食品頁面標題 + 副食品新增食量欄位** — Header 標題 + 食量 (ml) 同步匯出匯入 |
| `bf6b9a8` | **fix: 統一所有 modal 按鈕文字** — 編輯時顯示「更新紀錄」，用詞統一為「紀錄」 |
| `a0be4c9` | **fix(growth): 百分位說明文字修正為 0-2 歲** — 與圖表實際範圍一致 |
| `a7d0c03` | **feat(home): 喝奶/尿布摘要卡顯示距離上次多久** — 例如「2 小時 15 分鐘前」 |
| `39d748a` | **feat(home): 摘要卡僅顯示今日有紀錄的類型** — 無紀錄的項目自動隱藏 |
| `fbd033c` | **feat(stats): 統計報表依實際資料動態顯示項目** — 新增擠奶 / 副食品圖表，無資料的類型自動隱藏 |
| `1942d0d` | **feat(settings): 日記功能改為可選開關，預設關閉** — 設定頁「功能開關」toggle，控制底部導覽列日記入口 |
| `6bb0ee0` | **docs: README 精簡為功能說明，commit 歷程獨立為 CHANGELOG.md** — 移除 30+ 行 commit 表格，新建 CHANGELOG.md |
| `2ae7d46` | **ci: 升級 Node.js 20 → 24** — deploy.yml node-version 改 24 + `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true`、package.json 加 `engines >= 24`、新建 `.nvmrc` |
| `d6cff67` | **security: 綜合安全加固 (P0-P2)** — 移除 SW API 快取、加入 CSP、分享設定碼改用 AES-GCM 加密 + 匯入驗證、deepMerge 防護、.gitignore 補強、Actions 釘定 SHA。詳見 [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) |
| `dfa5da9` | **security(P0): serialize-javascript 6.0.2 → 7.0.5** — 精準 scope override 消除 HIGH 漏洞 (RCE + DoS)，剩餘僅 3 moderate dev-only |
| `6962582` | **docs: 新增 CLAUDE.md** — 定義語言規則、Sub Agent 策略、Context Window 管理、Git 推送與文件更新規則 |
| `7d18f0f` | **fix(settings): 修正加密功能在非安全上下文 (HTTP) 失敗** — 加入 `window.isSecureContext` + `crypto.subtle` 可用性檢查，Clipboard API 失敗時改顯示文字框供手動複製，解密流程同步加入安全偵測 |
