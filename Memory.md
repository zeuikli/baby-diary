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
- `claude-code-workspace` repo（`zeuikli/claude-code-workspace`）回傳 404，可能為私有或尚未建立。若需跨 repo 共用 Memory.md，需開放該 repo 的 MCP 存取權限。
