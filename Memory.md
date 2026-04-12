# Memory — baby-diary

> 本檔案為 AI Agent 工作記憶，供後續 session 快速恢復上下文。
> 格式：Markdown，可被任何 AI Agent 解析。
> 最後更新：2026-04-12（session `01Hp2kiupbD71gWRKjfrvLLN`）

---

## 1. 專案概述

| 項目 | 值 |
| --- | --- |
| 名稱 | 寶寶成長日記 (Baby Diary) |
| 類型 | React 18 + Vite 5 PWA |
| 部署 | GitHub Pages（push main → auto deploy） |
| 儲存 | localStorage（預設）或使用者自備 GitHub Repo |
| Repo | `zeuikli/baby-diary` |
| 主分支 | `main` |
| 開發分支 | `claude/add-growth-standards-ejwMG` |
| Node.js | 24（已從 20 升級） |
| 版本號 | `1.0.<commit count>` + short SHA，build 時注入 |

## 2. 技術棧

React 18, React Router v6, Vite 5, Tailwind CSS 3, Recharts 2, lucide-react, react-hot-toast, vite-plugin-pwa, Web Crypto API (AES-GCM)

## 3. 檔案結構重點

```
src/
├── components/
│   ├── BabySelector.jsx    # 寶寶切換 + 日期選擇器（含原生 date picker）
│   ├── Timeline.jsx        # 時間軸（點擊可編輯紀錄）
│   ├── Navigation.jsx      # 底部導覽（依 enableDiary 動態顯示）
│   └── modals/             # QuickFeedingModal / SleepModal / DiaperModal / SolidsModal
├── pages/
│   ├── Home.jsx            # 摘要卡（動態顯示 + 距離上次時間）+ 快速記錄 + 時間軸
│   ├── Feeding / Sleep / Diaper / Pumping / Solids.jsx  # 各類型完整 CRUD
│   ├── Growth.jsx          # WHO 0-24 月成長曲線 + 百分位估算
│   ├── Stats.jsx           # 統計報表（依有資料的類型動態顯示）
│   ├── Import.jsx          # 一鍵匯入（Baby Diary App）+ 分類匯入（繁中 CSV）
│   ├── Export.jsx          # 全部匯出（單一 CSV）+ 個別類型匯出
│   ├── Settings.jsx        # GitHub 同步 / 家人協作（AES-GCM 加密）/ 功能開關 / 關於
│   └── Diary.jsx           # 育兒日記（預設關閉，設定啟用）
├── data/whoStandards.js    # WHO 0-60 月 P3/P50/P97（體重/身高/頭圍 男女）
├── services/github.js      # GitHub REST API 封裝
├── services/localStorage.js # 本機儲存（含 deepMerge 原型鏈防護）
└── context/AppContext.jsx   # 全域狀態
```

## 4. 本次 Session 完成的主要功能

### 成長曲線
- WHO 0-24 月 P3/P50/P97 百分位曲線（體重/身高/頭圍，依性別）
- 最新數值各項獨立顯示 + 估算百分位（以紀錄當下月齡計算）
- X 軸 0-24 月，每 3 月一刻度

### 首頁改善
- 摘要卡：有紀錄才顯示、喝奶/尿布顯示「距離上次多久」
- 快速記錄：修復副食品按鈕無反應（缺 QuickSolidsModal）
- 時間軸：點擊紀錄直接編輯（傳入 editRecord）
- 日期選擇器：點擊日期開啟原生 date picker + 「今」按鈕

### 新增頁面
- `/pumping` — 擠奶紀錄列表（獨立 CRUD）
- `/solids` — 副食品紀錄列表（獨立 CRUD，含食量 ml）
- `/export` — CSV 匯出（全部匯出合併為單一 CSV，欄位繁中）

### 匯入匯出
- 匯出：欄位名 + enum 值全繁中，全部匯出產生單一 CSV 避免瀏覽器攔截
- 匯入：分類匯入範本改繁中、新增擠奶/副食品類型、副食品加食量欄位

### 統計報表
- 依 7 天內實際有資料的類型動態顯示（今日總覽 / 7 天平均 / 圖表 tab）
- 新增擠奶 (ml) 和副食品 (次數) 圖表

### 設定
- 日記功能改為可選開關（預設關閉），控制 Navigation 是否顯示
- 版本號 `1.0.<commit count> (SHA)`，建置時間台灣時區
- 複製設定碼：綠色「已複製」回饋 1.8 秒
- 貼上設定碼：展開時粉色高亮

### CI/CD
- Node.js 20 → 24 升級（workflow + engines + .nvmrc）
- `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true`
- `fetch-depth: 0`（版本號需完整歷史）

## 5. 安全加固（Security Audit）

詳見 `SECURITY_AUDIT.md`

### 已修復
| ID | 項目 | 狀態 |
| --- | --- | --- |
| P0 | serialize-javascript 6.0.2 → 7.0.5 (override) | ✅ HIGH 歸零 |
| P1-1 | 移除 SW GitHub API runtime caching | ✅ |
| P1-2 | CSP meta tag (index.html) | ✅ |
| P1-3 | 分享設定碼匯入：型態驗證 + regex + confirm 目標 repo | ✅ |
| P1-4 | deepMerge 原型鏈污染防護 | ✅ |
| P1-5 | .gitignore 補強 (*.pem, *.key, .env.*) | ✅ |
| P2-1 | 分享設定碼改用 AES-GCM 加密（Web Crypto API + PBKDF2） | ✅ |
| P2-2 | Actions 釘定 commit SHA | ✅ |

### 已知問題（未修）
| 項目 | 原因 |
| --- | --- |
| 3 moderate 漏洞 (esbuild/vite) | dev-only，需 vite 5→8 breaking change |
| Web Crypto clipboard 權限 | PWA standalone 模式下 `navigator.clipboard.writeText` 在 async 函式中可能被瀏覽器拒絕（非 user gesture），需改為先加密再同步寫入剪貼簿 |

## 6. 剩餘待辦 / 已知 Bug

- [ ] **加密設定碼複製失敗**：`handleCopyShareCode` 是 async，`await crypto.subtle.*` 後呼叫 `navigator.clipboard.writeText` 已離開 user gesture context，部分瀏覽器（特別是 PWA standalone）會拒絕。修復方向：先同步複製一個 placeholder，或改用 `<textarea>` + `document.execCommand('copy')` fallback。
- [ ] Vite 5 → 8 升級（中期，修復 3 moderate dev-only 漏洞）
- [ ] 日記照片 src 驗證為 data URI

## 7. Commit 慣例

Conventional Commits 繁中：`feat(scope):` / `fix(scope):` / `docs:` / `ci:` / `security:`

## 8. 部署流程

```
push main → .github/workflows/deploy.yml
  → checkout (fetch-depth: 0)
  → setup-node 24
  → npm ci → npm run build (注入版本號 + 建置時間 UTC+8)
  → peaceiris/actions-gh-pages → gh-pages branch → GitHub Pages
```

## 9. 關鍵決策紀錄

| 決策 | 理由 |
| --- | --- |
| PAT 存 localStorage | 無後端架構，已知限制，透過 CSP 緩解 |
| 成長曲線限 0-24 月 | 使用者需求，WHO 原始資料保留到 60 月供百分位計算 |
| 全部匯出合併為單一 CSV | 行動瀏覽器會攔截連續多檔下載 |
| 分享設定碼改 AES-GCM | 原本 Base64 明碼，安全風險 HIGH |
| 日記預設關閉 | 使用者要求，減少導覽列項目 |
| serialize-javascript 用 scoped override | 全域 override 會導致 workbox-build ESM/CJS 衝突 |
