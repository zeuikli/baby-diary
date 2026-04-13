# Memory.md — 對話摘要

> 自動產生，用於跨 session 延續上下文，減少重複閱讀與 token 消耗。

---

## Session: 2026-04-12

### 完成事項

#### 1. 建立 CLAUDE.md（`6962582`）
- 新增 `/CLAUDE.md`，定義 4 條規則：
  - **語言**：中文 → 繁體中文回覆；英文 → 英文回覆
  - **Sub Agent**：優先委派 Sub Agent，自動指派主 Agent 管理 Todo/Checklist
  - **Context Window**：70% 時通知開新對話；建立 Memory.md 保存摘要
  - **Git 推送**：每次改動自動 push & merge 到 main；按需更新 README.md / CHANGELOG.md

#### 2. 修正加密功能錯誤（`7d18f0f`）
- **問題**：設定頁「複製設定碼」報錯 — `The request is not allowed by the user agent or the platform in the current context`
- **根因**：
  - `crypto.subtle`（Web Crypto API）在非安全上下文（HTTP）下不可用
  - `navigator.clipboard.writeText()` 同樣受安全上下文限制
- **修正**（`src/pages/Settings.jsx`）：
  - 加密/解密前檢查 `window.isSecureContext` + `crypto.subtle` 可用性，不可用時顯示明確提示
  - 將加密與 Clipboard 邏輯分離：Clipboard 失敗時改顯示唯讀文字框供手動複製
  - 解密函式 `handleImportShareCode` 同步加入安全上下文檢查
  - 新增 `generatedCode` state 控制 fallback UI
- **建置驗證**：`npx vite build` 通過，無錯誤

#### 3. 更新文件（`e433866`）
- **README.md**：家人協作功能補充 HTTPS 需求說明、Clipboard fallback 機制
- **CHANGELOG.md**：新增 `6962582`（CLAUDE.md）與 `7d18f0f`（加密修正）兩筆紀錄

### 關鍵檔案
| 檔案 | 說明 |
|------|------|
| `CLAUDE.md` | Claude Code 行為規則 |
| `Memory.md` | 本檔案，對話摘要 |
| `src/pages/Settings.jsx` | 設定頁（加密/解密/Clipboard 修正位置） |
| `README.md` | 專案說明文件 |
| `CHANGELOG.md` | 變更紀錄 |

### 目前分支狀態
- `main`：所有改動已合併並推送
- `claude/add-claude-config-WWn2E`：功能分支，已合併至 main

### 待注意
- `claude-code-workspace` repo（`zeuikli/claude-code-workspace`）已確認可透過 WebFetch 讀取（公開 repo），但 GitHub MCP 工具僅授權 `zeuikli/baby-diary`，無法透過 MCP 存取。

---

## Session: 2026-04-12 (2)

### 完成事項

#### 1. 讀取 `zeuikli/claude-code-workspace` repo
- 透過 WebFetch 讀取了完整 repo 結構與所有檔案內容
- GitHub MCP 工具確認仍限制為 `zeuikli/baby-diary`，無法存取其他 repo
- 使用 `raw.githubusercontent.com` 成功讀取所有檔案

#### 2. 更新 CLAUDE.md（整合 workspace 指引）
- 從 `claude-code-workspace/CLAUDE.md` 整合以下最佳實踐：
  - Sub Agent 策略增加 **IMPORTANT** 標記：研究工作委派 Sub Agent
  - Context Window 增加 **YOU MUST** 標記與 **Compaction 指引**
  - Git 推送增加 **指數退避重試機制**（2s/4s/8s/16s）
  - 新增 **驗證與品質** 區塊（測試 + UI 驗證）
  - 新增 **文件參照** 區塊，連結 workspace repo

### `claude-code-workspace` repo 結構摘要
```
claude-code-workspace/
├── .claude/
│   ├── settings.json        # SessionStart + PreToolUse + PostToolUse hooks
│   └── hooks/
│       ├── session-init.sh       # 本機 git pull / 雲端 git clone
│       ├── memory-pull.sh        # PreToolUse: 讀取前自動 fetch Memory.md
│       ├── memory-sync.sh        # commit + push Memory.md（含重試）
│       └── memory-update-hook.sh # PostToolUse: 偵測 Memory.md 修改後觸發同步
├── CLAUDE.md    # 全域開發指引
├── Memory.md    # 跨 session 記憶
├── CHANGELOG.md # 變更紀錄
└── README.md    # 說明文件
```

### 關鍵檔案
| 檔案 | 說明 |
|------|------|
| `CLAUDE.md` | 已更新，整合 workspace 最佳實踐 |
| `Memory.md` | 本檔案，新增本次 session 紀錄 |

### 目前分支狀態
- `claude/check-repo-access-BOiWw`：本次工作分支

---

## Session: 2026-04-12 (3)

### 完成事項

#### 1. 尿布記錄功能擴充
- **顏色選項**：從 4 色（黃色/棕色/綠色/黑色）擴充為 7 色（黃色/綠色/黃褐色/��色/棕色/黑色/灰白）
- **新增「形狀」欄位**：顆粒/硬/正常/鬆軟/黏稠/稀（僅便便/混合時顯示）
- **新增「多寡」���位**：少量/中等/量多（僅便便/混合時顯���）
- 列表頁同步顯示新欄位 tag（顏色=amber、形狀=orange、多寡=teal）
- CSV 匯出/匯入/模板全部同步更新

### 修改檔案
| 檔案 | 說明 |
|------|------|
| `src/components/modals/QuickDiaperModal.jsx` | 新增 consistency/amount 欄位、更新 colorOptions 為 7 色 |
| `src/pages/Diaper.jsx` | 列表顯示 consistency/amount tag |
| `src/pages/Export.jsx` | diaper 匯出增加形狀/多寡欄位，全部匯出同步更新 |
| `src/pages/Import.jsx` | rowToDiaper 讀取 consistency/amount、sample 更新、previewLabel 更新 |
| `imports/templates/diaper-template.csv` | 新增 consistency/amount 欄位 |
| `CHANGELOG.md` | 新增本次變更紀錄 |

### 目前分支狀態
- `claude/check-repo-access-BOiWw`：已 merge 至 main 並推送

---

## Session: 2026-04-13

### 完成事項

#### 1. Claude Blog 自動歸檔排程
- **需求**：每天台灣 09:00 自動抓取 https://claude.com/blog 文章，歸檔到獨立 branch
- **研究**：Webflow SSR 渲染、支援 JSON-LD metadata、curl 直接可用
- **實作**：
  - `scripts/fetch-claude-blog.py` — Python 爬蟲腳本（僅用標準庫，無需 pip install）
    - 解析列表頁抓取所有文章 slug
    - 逐篇抓取 JSON-LD metadata + HTML 正文轉 Markdown
    - YAML front matter：title / slug / date / description / categories / image
    - `index.json` 追蹤已歸檔文章，偵測新增/更新
  - `.github/workflows/archive-claude-blog.yml` — GitHub Actions workflow
    - cron: `0 1 * * *`（UTC 01:00 = 台灣 09:00）
    - 支援 `workflow_dispatch` 手動觸發
    - 歸檔到 `archive/claude-blog` branch
    - 有變更才 commit + push
    - Job Summary 顯示統計結果
- **本地測試**：成功抓取 22 篇文章，YAML 語法驗證通過

### 修改檔案
| 檔案 | 說明 |
|------|------|
| `scripts/fetch-claude-blog.py` | 新建，Blog 爬蟲腳本 |
| `.github/workflows/archive-claude-blog.yml` | 新建，定時排程 workflow |
| `CHANGELOG.md` | 新增本次變更紀錄 |
| `Memory.md` | 本檔案 |

### 目前分支狀態
- `main`：Blog archiver 已移除，轉至 claude-code-workspace

---

## Session: 2026-04-13 (2)

### 完成事項

#### 1. 全面安全審查（4 個 Sub Agent 平行掃描）
- **依賴套件掃描**：3 moderate CVE（esbuild via vite）、多個主版本落後
- **服務/資料層審查**：deepMerge prototype pollution、PIN 強度不足、PAT 明文存 Context、path traversal 等
- **前端 UI 層審查**：CSP unsafe-inline、SPA redirect 開放重定向、Clickjacking 無防護等
- **Git 歷史掃描**：清潔，無 secret 洩漏

#### 2. Phase 1 安全修復（P1 + 關鍵 P2）
- **vite 5→7 升級**（`2901f62`）：消除 esbuild CVE，npm audit 0 漏洞
- **path traversal 防護**（`62e41fc`）：github.js 加入 sanitizePath + sanitizeDateSegment
- **CSV formula injection**（`62e41fc`）：Export.jsx escapeCSV 攔截 `=+\-@` 前綴
- **PIN 安全化**（`2027235`）：改 type="password"、最低 6 字元
- **PAT 移出 Context**（`2027235`）：token 不再存於 React state
- **Clickjacking 防護**（`ce826ba`）：framebusting 腳本 + iframe 偵測
- **SPA redirect 白名單**（`ce826ba`）：路徑驗證防開放重定向
- **CSP 合規**（`ce826ba`）：內聯腳本移至 spa-guard.js

### 修改檔案
| 檔案 | 說明 |
|------|------|
| `package.json` / `package-lock.json` | vite 7 升級 |
| `src/services/github.js` | sanitizePath / sanitizeDateSegment |
| `src/pages/Export.jsx` | escapeCSV formula injection 防護 |
| `src/pages/Settings.jsx` | PIN type="password" + 6 字元驗證 |
| `src/context/AppContext.jsx` | PAT 移出 state |
| `index.html` | 內聯腳本改外部引用 |
| `public/spa-guard.js` | 新建，Clickjacking + SPA redirect |
| `public/404.html` | Clickjacking + 路徑白名單 |

### 目前分支狀態
- `main`：所有 Phase 1 修復已合併

---

## Session: 2026-04-13 (3)

### 完成事項

#### Phase 2 安全維護修復（4 個 Sub Agent 平行執行）

1. **console.error 清理**（`09bcc61`）
   - 11 處 console.error 改為只輸出 `e.message`，消除 stack trace
   - 涵蓋：AppContext(4)、github.js(1)、Growth(1)、Diary(1)、Export(2)、Import(2)

2. **window.confirm → ConfirmModal**（`398b9a2`）
   - 新增 `src/components/modals/ConfirmModal.jsx` 通用確認對話框
   - 8 個頁面全部替換：Feeding、Sleep、Diaper、Pumping、Solids、Growth、Diary、Settings
   - 支援 danger 樣式（紅色按鈕用於刪除）

3. **Import 檔案限制**（`e02d611`）
   - 快速/手動匯入加入 10MB 上限
   - CSV 解析後加入 50,000 列限制
   - UI 顯示限制提示

4. **React/Router 升級**（`72028c4`）
   - react 18.3.1 → 19.2.5
   - react-dom 18.3.1 → 19.2.5
   - react-router-dom 6.30.3 → 7.14.0
   - 0 個檔案需程式碼修改，建置通過

### 修改檔案
| 檔案 | 說明 |
|------|------|
| `src/components/modals/ConfirmModal.jsx` | 新建，通用確認 Modal |
| `src/context/AppContext.jsx` | console.error 清理 |
| `src/services/github.js` | console.error 清理 |
| `src/pages/Feeding.jsx` | confirm → ConfirmModal |
| `src/pages/Sleep.jsx` | confirm → ConfirmModal |
| `src/pages/Diaper.jsx` | confirm → ConfirmModal |
| `src/pages/Pumping.jsx` | confirm → ConfirmModal |
| `src/pages/Solids.jsx` | confirm → ConfirmModal |
| `src/pages/Growth.jsx` | confirm → ConfirmModal + console.error |
| `src/pages/Diary.jsx` | confirm → ConfirmModal + console.error |
| `src/pages/Settings.jsx` | confirm → ConfirmModal |
| `src/pages/Export.jsx` | console.error 清理 |
| `src/pages/Import.jsx` | 檔案大小限制 + console.error |
| `package.json` / `package-lock.json` | React 19 + Router 7 升級 |

### 驗證結果
- `vite build`：通過
- `npm audit`：0 vulnerabilities
- `confirm()` 殘留：0 處
- React 19 相容性：所有套件正常

### 剩餘待辦
- lucide-react 升級（消除 React 19 peer dep 警告）
- 清除冗餘遠端分支

### 目前分支狀態
- `security/phase2-maintenance`：待審閱後 merge 至 main
