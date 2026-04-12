# 寶寶成長日記 (Baby Diary) 🍼

一個用 React + Vite 打造的行動裝置優先 PWA（漸進式網頁應用），幫爸媽記錄寶寶每天的**喝奶 / 睡眠 / 尿布 / 擠奶 / 副食品 / 成長**軌跡。資料可選擇存在瀏覽器的 localStorage，也可連結自己的 GitHub Repo 作為**零後端、零費用**的雲端儲存，讓家人之間跨裝置共用同一份紀錄。

> 部署版本：GitHub Pages（push 到 `main` 會透過 `.github/workflows/deploy.yml` 自動建置發佈）

---

## ✨ 功能總覽

| 類別 | 功能 |
| --- | --- |
| 📱 首頁 | 寶寶頭像 / 姓名 / 出生天數、今日摘要卡、進行中睡眠計時器、快速記錄按鈕 × 6、今日時間軸 |
| 🍼 喝奶 | 親餵 / 瓶餵 / 母乳瓶餵、奶量、時長、哺乳側邊、備註 |
| 😴 睡眠 | 開始 / 結束時間、進行中睡眠計時、快速停止 |
| 🫧 尿布 | 濕 / 便便 / 混合、顏色、備註 |
| 🤱 擠奶 | 奶量、側邊、備註 |
| 🥣 副食品 | 食物（含常見快選：米糊 / 麥糊 / 蔬菜泥 / 水果泥 / 肉泥 / 粥 / 蛋黃）、反應（喜歡 / 接受 / 拒絕 / 過敏）、備註 |
| 📏 成長曲線 | 體重 / 身高 / 頭圍紀錄、**WHO 0-24 個月國際生長標準百分位曲線 (P3 / P50 / P97)**、最新數值獨立顯示並估算當前百分位 |
| 📖 日記 | 自由文字記事、每日心情紀錄 |
| 📊 統計 | 多日趨勢圖 |
| 📥 匯入 | 一鍵匯入（寶寶成長日記 App 格式）+ 分類匯入（繁中 CSV，支援喝奶 / 睡眠 / 尿布 / 擠奶 / 副食品 / 成長） |
| 📤 匯出 | 全部匯出（單一 CSV）或個別類型匯出，欄位名稱與值皆為繁體中文，匯出可直接匯回 round-trip |
| ⚙️ 設定 | 多寶寶管理、GitHub 雲端同步、家人協作設定碼分享 |
| 👪 家人協作 | 跨裝置自動同步寶寶清單 + 一鍵分享設定碼 |

### 成長曲線亮點

- 依寶寶**性別自動對應** WHO 男 / 女標準曲線
- 以**月齡 0–24 個月為 X 軸**（每 3 個月一個刻度），寶寶實際數據疊加在 P3 / P50 / P97 參考虛線之上
- 「最新數值」分別以 **體重 / 身高 / 頭圍** 各自最近一筆非空紀錄顯示，每項帶上自己的日期，避免只更新單一項目時其他欄位被蓋掉
- 每項最新數值旁邊附上**估算百分位**（P?），依 WHO P3 / P50 / P97 線性內插計算，且以「紀錄當下的月齡」比對，不是今天的月齡
- WHO 參考資料來源：World Health Organization Child Growth Standards（0-5 歲國際嬰幼兒生長標準，內部資料保留至 60 月以便百分位估算）

---

## 🧱 技術棧

- **前端框架**：React 18
- **路由**：React Router v6
- **建置工具**：Vite 5
- **樣式**：Tailwind CSS 3
- **圖表**：Recharts 2
- **圖示**：lucide-react
- **PWA**：vite-plugin-pwa（支援離線使用 / 加入主畫面）
- **Toast 通知**：react-hot-toast
- **儲存後端**：localStorage（預設）或使用者自備的 GitHub Repo（透過 GitHub REST API）
- **部署**：GitHub Pages（`peaceiris/actions-gh-pages`）

---

## 📁 專案結構

```
baby-diary/
├── public/                     # 靜態資源 (icons, favicon, 404.html)
├── src/
│   ├── components/
│   │   ├── Timeline.jsx        # 首頁時間軸
│   │   ├── Navigation.jsx      # 底部導覽
│   │   ├── Modal.jsx           # 共用 Modal 基底
│   │   └── modals/
│   │       ├── QuickFeedingModal.jsx
│   │       ├── QuickSleepModal.jsx
│   │       ├── QuickDiaperModal.jsx
│   │       └── QuickSolidsModal.jsx
│   ├── pages/
│   │   ├── Home.jsx            # 首頁 + 快速記錄
│   │   ├── Feeding.jsx         # 喝奶紀錄列表
│   │   ├── Sleep.jsx
│   │   ├── Diaper.jsx
│   │   ├── Growth.jsx          # 成長曲線 (WHO 標準對照)
│   │   ├── Diary.jsx
│   │   ├── Stats.jsx
│   │   ├── Import.jsx          # 批次匯入
│   │   ├── Export.jsx          # CSV 匯出 (全部 / 個別類型)
│   │   └── Settings.jsx        # 寶寶管理 / GitHub 同步
│   ├── data/
│   │   └── whoStandards.js     # WHO 0-60 月 P3/P50/P97 參考資料
│   ├── services/
│   │   ├── github.js           # GitHub REST API 封裝 (資料同步)
│   │   └── localStorage.js     # 本機儲存封裝
│   ├── context/
│   │   └── AppContext.jsx      # 全域狀態 / addRecord, updateRecord…
│   ├── App.jsx
│   └── main.jsx
├── .github/workflows/
│   └── deploy.yml              # push main → build → gh-pages
├── vite.config.js              # PWA + base path (/baby-diary/)
├── tailwind.config.js
└── package.json
```

---

## 🚀 本機開發

```bash
# 1. 安裝依賴
npm install

# 2. 啟動 Vite dev server (預設 http://localhost:3000)
npm run dev

# 3. 建置生產版本 (輸出到 dist/)
npm run build

# 4. 預覽 build 結果
npm run preview
```

### 環境需求

- Node.js 20+
- npm 10+（或使用 pnpm / yarn）

---

## ☁️ GitHub 雲端同步設定（選配）

應用預設使用瀏覽器 localStorage。若想在多裝置（爸爸的手機、媽媽的平板、阿嬤的電腦）之間同步同一份寶寶紀錄，可以啟用 GitHub 作為儲存後端：

1. 到 https://github.com/settings/tokens 產生一組 **Classic Personal Access Token**，勾選 `repo` 權限
2. 自己建一個 private GitHub Repo（例如 `my-baby-data`）
3. 打開 App → 設定 → 輸入 Token / owner / repo 三項資料
4. 完成後資料會以 JSON 檔存到 `{babyId}/{YYYY-MM-DD}.json`、`{babyId}/growth.json` 等路徑
5. 想讓家人共用：在設定頁產生**設定碼**分享，對方輸入即自動同步寶寶清單

> ⚠️ Personal Access Token **只存在本機 localStorage**，不會被發佈到 GitHub Pages 建置產物中。CI 僅會注入非機密的 `VITE_GH_OWNER` / `VITE_GH_REPO`（若有設定 Secrets）。

---

## 🚢 部署到 GitHub Pages

Repo 內建 `.github/workflows/deploy.yml`，推送到 `main` 或 `master` 時會自動：

1. `checkout@v4` 以 `fetch-depth: 0` 抓完整 git 歷史（用於產生版本號）
2. `npm ci` 安裝依賴
3. `npm run build` 產出 `dist/`
4. 使用 `peaceiris/actions-gh-pages` 將 `dist/` 發佈到 `gh-pages` 分支

### 版本號機制

`vite.config.js` 在 build 時以 `execSync` 呼叫 git 指令，透過 Vite `define` 把下列常數注入到前端：

| 常數 | 內容 | 來源 |
| --- | --- | --- |
| `__APP_VERSION__` | `1.0.<commit 次數>` | `git rev-list --count HEAD` |
| `__APP_COMMIT__` | short SHA | `git rev-parse --short HEAD` |
| `__APP_BUILD_DATE__` | `YYYY-MM-DD HH:mm` | `Intl.DateTimeFormat` with `Asia/Taipei` |

「設定 → 關於」會顯示為：

```
版本      1.0.24 (824a9f4)
建置時間  2026-04-12 02:10 (UTC+8)
資料儲存  GitHub + 本機
```

因此每次 push 到 `main` 觸發部署後，版本號會自動遞增並對應到新的 commit SHA，方便使用者回報問題時能對到具體版本。

`vite.config.js` 會在 CI 環境下把 `base` 設為 `/baby-diary/`，本機開發時仍使用 `/`。

---

## 📜 開發歷程（依 commit 歷史）

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
| `29937ca` | **docs: 新增 Repo README** — 依 commit 歷史整理功能總覽、技術棧、專案結構與開發流程說明 |
| `f66063c` | **feat(growth): 成長曲線限定 0-24 個月 + 最新數值顯示 WHO 百分位** — X 軸改為 0-24 月 (每 3 月一刻度)，新增 `estimatePercentile()` helper，最新數值卡片顯示估算百分位 |
| `e8bdadf` | **fix(growth): WHO 虛線參考曲線同樣限制在 0-24 個月** — 修正 chartData 仍塞入 0-60 月 WHO 參考點，導致虛線超出圖表窗格的問題 |
| `2cdc4cf` | **fix(settings): 貼上設定碼按鈕展開時缺少狀態顏色回饋** — 家人協作區的貼上按鈕改為依展開狀態切換粉色高亮 / 灰色樣式 |
| `ed14e6b` | **fix(settings): 複製設定碼按鈕改為預設灰底** — 原本硬編碼粉色導致展開貼上面板後兩個按鈕都是粉色，改為中性灰色 |
| `f8cbd87` | **feat(about): 版本號改為依 commit 次數自動遞增 + 顯示 SHA** — `vite.config.js` 以 `execSync` 讀取 git 資訊，透過 `define` 注入 `__APP_VERSION__` / `__APP_COMMIT__`，關於頁面顯示 `1.0.<count> (sha)` |
| `845496d` | **ci: checkout 改為 `fetch-depth: 0`** — 讓版本號在 GitHub Pages 上能正確顯示完整 commit 次數 |
| `6c324c5` | **feat(about): 建置時間改用台灣時區並精確到分鐘** — 以 `Intl.DateTimeFormat` + `Asia/Taipei` 產生 `YYYY-MM-DD HH:mm` 格式並加註 UTC+8 |
| `824a9f4` | **feat(settings): 複製設定碼按鈕加上已複製視覺回饋** — 點擊後 1.8 秒內顯示綠底 ✓「已複製」，`useRef` 保存 timeout 避免 memory leak |
| `6848fc4` | **feat(export): 新增 CSV 資料匯出功能** — `/export` 頁面可一鍵全部匯出或個別選擇六種記錄類型，CSV 格式與 Import 相同可 round-trip，UTF-8 BOM 編碼 |
| `e9bc5e9` | **fix(export): 修復尿布匯出失敗 + 防禦 null 記錄** — 資料陣列含 null 項目時會拋 TypeError，改用 `Array.isArray` + `filter(Boolean)` 跳過空值 |
| `f1e1d0f` | **fix(export): 全部匯出改為產生單一 CSV** — 瀏覽器會擋連續多檔下載，改為合併所有類型到一個 CSV 並以 `記錄類型` 欄位區分 |
| `88c7003` | **feat(export): CSV 欄位名與值改為繁體中文** — 欄位標頭與 enum 值全面中文化（親餵 / 瓶餵 / 尿尿 / 便便 / 左側 等） |
| `36dfe03` | **feat(import): 分類匯入改為繁中格式並新增擠奶、副食品** — 範本與欄位名改繁中，與匯出 CSV 格式一致，新增擠奶 / 副食品兩種分類匯入 |

---

## 🤝 Commit 慣例

本 Repo 使用 [Conventional Commits](https://www.conventionalcommits.org/) 風格：

- `feat(scope): …` — 新功能
- `fix(scope): …` — Bug 修復
- `refactor(scope): …` — 重構
- `docs(scope): …` — 文件

訊息內容以繁體中文撰寫，聚焦於「**為什麼改**」而非「**改了什麼檔案**」。

---

## 📄 授權

本專案為個人使用的家庭紀錄工具，未附加開源授權。若你想 fork 一份給自己家用，歡迎自便 🍼
