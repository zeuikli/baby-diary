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
