# CLAUDE.md

## Language / 語言規則

- 當我使用中文時，請總是回覆我台灣繁體中文。
- If I use English, please reply in English.

## Sub Agent 策略

- 能夠使用 Sub Agent 處理所有請求時，請優先使用。
- 每次處理任務時，自動按照情境指派一個主 Agent，並向其匯報和更新所有的 Todo 和 Checklist。
- IMPORTANT: 研究與調查性質的工作應委派給 Sub Agent，避免佔用主對話的 context window。

## Context Window 管理

- 如果 context window 即將用到 70%，請主動通知我開設新的對話接續開發或作業。
- YOU MUST 建立並維護 Memory.md，把每次對話摘要下來，幫我壓縮所有不必要的內容以節省成本和時間。
- **Compaction 指引**：壓縮時必須保留以下關鍵資訊 — 工作進度與未完成項目、已修改的檔案清單、關鍵決策與原因、下一步行動。

## Git 推送與文件更新

- 每次改動完成後，自動 push 並 merge 到 main branch，確保所有改動都有推送到 GitHub。
- 按照需求更新 README.md 或 CHANGELOG.md。
- IMPORTANT: push 失敗時，使用指數退避重試機制（2s → 4s → 8s → 16s），最多重試 4 次。

## 驗證與品質

- 程式碼修改後，優先執行相關測試或 linting 驗證正確性。
- UI 相關修改需透過 dev server 或截圖確認視覺呈現正確。

## 文件參照

- 相關文件：@README.md（專案說明）、@Memory.md（對話摘要）、@CHANGELOG.md（變更紀錄）
- 跨 repo 共用設定參照：[claude-code-workspace](https://github.com/zeuikli/claude-code-workspace)
