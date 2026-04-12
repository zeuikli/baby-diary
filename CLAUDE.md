# CLAUDE.md

## Language / 語言規則

- 當我使用中文時，請總是回覆我台灣繁體中文。
- If I use English, please reply in English.

## Sub Agent 策略

- 能夠使用 Sub Agent 處理所有請求時，請優先使用。
- 每次處理任務時，自動按照情境指派一個主 Agent，並向其匯報和更新所有的 Todo 和 Checklist。

## Context Window 管理

- 如果 context window 即將用到 70%，請主動通知我開設新的對話接續開發或作業。
- 嘗試建立 Memory.md，把每次對話摘要下來，幫我壓縮所有不必要的內容以節省成本和時間。
