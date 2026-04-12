# 寶寶成長日記 (Baby Diary) 🍼

一個用 React + Vite 打造的行動裝置優先 PWA（漸進式網頁應用），幫爸媽記錄寶寶每天的**喝奶 / 睡眠 / 尿布 / 擠奶 / 副食品 / 成長**軌跡。資料可選擇存在瀏覽器的 localStorage，也可連結自己的 GitHub Repo 作為**零後端、零費用**的雲端儲存，讓家人之間跨裝置共用同一份紀錄。

> 部署版本：GitHub Pages（push 到 `main` 會透過 `.github/workflows/deploy.yml` 自動建置發佈）

---

## ✨ 功能總覽

| 類別 | 功能 |
| --- | --- |
| 📱 首頁 | 寶寶頭像 / 姓名 / 出生天數、今日摘要卡（有紀錄才顯示，含距離上次時間）、進行中睡眠計時器、快速記錄按鈕 × 6、日期選擇器（點擊跳任意日期 / 左右箭頭逐日 / 「今」鍵回今天）、時間軸（點擊可直接編輯紀錄） |
| 🍼 喝奶 | 親餵 / 瓶餵 / 母乳瓶餵、奶量、時長、哺乳側邊、備註 |
| 😴 睡眠 | 開始 / 結束時間、進行中睡眠計時、快速停止 |
| 🫧 尿布 | 濕 / 便便 / 混合、顏色、備註 |
| 🤱 擠奶 | 奶量、側邊、時長、備註（獨立紀錄頁面） |
| 🥣 副食品 | 食物快選標籤、食量 (ml)、反應（喜歡 / 接受 / 拒絕 / 過敏）、備註（獨立紀錄頁面） |
| 📏 成長曲線 | 體重 / 身高 / 頭圍紀錄、**WHO 0-24 個月國際生長標準百分位曲線 (P3 / P50 / P97)**、最新數值獨立顯示並估算當前百分位 |
| 📊 統計報表 | 今日總覽 + 7 天平均 + 趨勢圖，依實際有資料的類型動態顯示（喝奶 / 睡眠 / 尿布 / 擠奶 / 副食品） |
| 📥 匯入 | 一鍵匯入（寶寶成長日記 App 格式）+ 分類匯入（繁中 CSV，支援 6 種類型） |
| 📤 匯出 | 全部匯出（單一 CSV）或個別類型匯出，欄位名稱與值皆為繁體中文，匯出可直接匯回 round-trip |
| ⚙️ 設定 | 多寶寶管理、GitHub 雲端同步、家人協作設定碼分享、功能開關（育兒日記）、版本號 / 建置時間顯示 |
| 👪 家人協作 | 跨裝置自動同步寶寶清單 + 一鍵分享設定碼（複製 / 貼上視覺回饋） |
| 📖 日記 | 自由文字記事、每日心情紀錄（預設關閉，可在設定 → 功能開關啟用） |

### 成長曲線亮點

- 依寶寶**性別自動對應** WHO 男 / 女標準曲線
- 以**月齡 0–24 個月為 X 軸**（每 3 個月一個刻度），寶寶實際數據疊加在 P3 / P50 / P97 參考虛線之上
- 「最新數值」分別以 **體重 / 身高 / 頭圍** 各自最近一筆非空紀錄顯示，每項帶上自己的日期
- 每項最新數值旁邊附上**估算百分位**（P?），依 WHO P3 / P50 / P97 線性內插計算，以「紀錄當下的月齡」比對
- WHO 參考資料來源：World Health Organization Child Growth Standards（內部資料保留至 60 月以便百分位估算）

### 首頁摘要卡

- **動態顯示**：只有今天有紀錄的類型才會出現摘要卡，全無紀錄時整塊隱藏
- 🍼 喝奶 / 🫧 尿布卡片額外顯示「距離上次多久」（例如 `2 小時 15 分鐘前`）
- 點擊摘要卡進入對應類型的完整紀錄頁面（含新增 / 編輯 / 刪除）

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
│   │   ├── Timeline.jsx        # 首頁時間軸（點擊可編輯紀錄）
│   │   ├── Navigation.jsx      # 底部導覽（依功能開關動態顯示）
│   │   ├── BabySelector.jsx    # 寶寶切換 + 日期選擇器
│   │   ├── Modal.jsx           # 共用 Modal 基底
│   │   └── modals/
│   │       ├── QuickFeedingModal.jsx
│   │       ├── QuickSleepModal.jsx
│   │       ├── QuickDiaperModal.jsx   # 同時處理尿布 + 擠奶
│   │       └── QuickSolidsModal.jsx
│   ├── pages/
│   │   ├── Home.jsx            # 首頁 + 摘要卡 + 快速記錄
│   │   ├── Feeding.jsx         # 喝奶紀錄列表
│   │   ├── Sleep.jsx           # 睡眠紀錄列表
│   │   ├── Diaper.jsx          # 尿布紀錄列表
│   │   ├── Pumping.jsx         # 擠奶紀錄列表
│   │   ├── Solids.jsx          # 副食品紀錄列表
│   │   ├── Growth.jsx          # 成長曲線 (WHO 標準對照)
│   │   ├── Stats.jsx           # 統計報表（動態顯示有資料的類型）
│   │   ├── Diary.jsx           # 育兒日記（可選啟用）
│   │   ├── Import.jsx          # 批次匯入
│   │   ├── Export.jsx          # CSV 匯出
│   │   └── Settings.jsx        # 寶寶管理 / GitHub 同步 / 功能開關
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
├── vite.config.js              # PWA + 版本號注入 + base path
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

應用預設使用瀏覽器 localStorage。若想在多裝置之間同步紀錄，可啟用 GitHub 作為儲存後端：

1. 到 https://github.com/settings/tokens 產生一組 **Classic Personal Access Token**，勾選 `repo` 權限
2. 自己建一個 private GitHub Repo（例如 `my-baby-data`）
3. 打開 App → 設定 → 輸入 Token / owner / repo 三項資料
4. 完成後資料會以 JSON 檔存到 `{babyId}/{YYYY-MM-DD}.json`、`{babyId}/growth.json` 等路徑
5. 想讓家人共用：在設定頁產生**設定碼**分享，對方輸入即自動同步寶寶清單

> ⚠️ Personal Access Token **只存在本機 localStorage**，不會被發佈到 GitHub Pages 建置產物中。

---

## 🚢 部署到 GitHub Pages

Repo 內建 `.github/workflows/deploy.yml`，推送到 `main` 或 `master` 時會自動：

1. `checkout@v4` 以 `fetch-depth: 0` 抓完整 git 歷史（用於產生版本號）
2. `npm ci` 安裝依賴
3. `npm run build` 產出 `dist/`
4. 使用 `peaceiris/actions-gh-pages` 將 `dist/` 發佈到 `gh-pages` 分支

### 版本號機制

`vite.config.js` 在 build 時注入版本資訊到前端，「設定 → 關於」會顯示：

```
版本      1.0.38 (1942d0d)
建置時間  2026-04-12 03:20 (UTC+8)
```

版本號格式為 `1.0.<commit 次數>`，每次 push 自動遞增。

---

## 📜 變更紀錄

詳細的 commit 歷程請參閱 [CHANGELOG.md](./CHANGELOG.md)。

---

## 📄 授權

本專案為個人使用的家庭紀錄工具，未附加開源授權。若你想 fork 一份給自己家用，歡迎自便 🍼
