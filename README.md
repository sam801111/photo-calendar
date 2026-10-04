# 拍照行事曆 — iPhone 網頁 App

不需要 Mac。這是可放到 iPhone 主畫面的網頁 App（PWA），用 Windows 就能修改與發布。**目前交付的是完整網站檔案，尚未發布正式網址，也尚未在實體 iPhone 驗收。**

## 可以做什麼

1. 使用相機拍照，或從相簿選照片。
2. 在瀏覽器辨識繁體中文與英文文字。
3. 從文字整理活動名稱、完整日期、時間與有標示的地點。
4. 核對內容後，開啟 Google 行事曆的新增活動頁面。
5. 在 Google 選擇帳號、行事曆與提醒，按「儲存」。

**App 開啟 Google 頁面不代表已新增活動。**此版不使用 Google Calendar API，不需要建立 Google OAuth 專案，也不會取得你的 Google 密碼或帳號權杖。

## 最簡單的發布方式：GitHub Pages

如果已有 GitHub 帳號，可用網頁完成：

1. 下載專案 ZIP 並解壓縮。
2. 在 GitHub 點「＋」→「New repository」。名稱可用 `photo-calendar`，選 Public，勾選建立 README，再按 Create repository。
3. 進入專案，點「Add file」→「Upload files」。
4. 將 **PhotoCalendarWeb 資料夾裡面的檔案** 拖入上傳頁面，包含 `icons` 資料夾。不要只上傳 ZIP，也不要在儲存庫根目錄多包一層 PhotoCalendarWeb。
5. 重要：儲存庫根目錄應該直接看得到 `index.html`、`app.js`、`styles.css`、`calendar.js`、`sw.js`、`manifest.webmanifest` 和 `icons`。
6. 在下方按「Commit changes」。
7. 打開儲存庫「Settings」→「Pages」。在 Source 選「Deploy from a branch」，Branch 選 `main` 和 `/(root)`，按 Save。
8. 等待部署完成。Pages 頁面會顯示實際網址，通常像 `https://你的帳號.github.io/photo-calendar/`。請用 Pages 顯示的完整網址；不要把 GitHub 儲存庫頁面當作 App 網址。
9. 先在電腦開啟正式網址，按「試用範例」，確認活動資料有正確填入。再拿 iPhone 測試。

GitHub Pages 的網站內容與程式碼會公開，但你拍攝的照片與瀏覽器裡的草稿不會被上傳到儲存庫。公開網站也不包含你的 Google 帳號登入資訊。免費帳號的此做法使用 Public 儲存庫；如果不想公開原始碼，需另外選適合的託管方式。

## 加入 iPhone 主畫面

1. 在 iPhone 用 **Safari** 開啟剛發布的 HTTPS 網址。
2. 按分享按鈕 →「加入主畫面」。
3. 若顯示「作為網頁 App 開啟」選項，請開啟；按「加入」。
4. 點主畫面的「拍照行事曆」圖示即可使用。

第一次辨識需下載工具與語言資料，請保持網路連線。使用 iPhone 相機拍照時依系統提示允許使用相機；選相簿使用系統選擇器。個別照片格式若無法讀取，請改用 JPG、PNG 或截圖。

## 隱私與連線

- 辨識採用 Tesseract.js，在你的裝置執行，不傳送照片到辨識服務。
- 工具、辨識引擎與語言資料下載自 jsDelivr 和 tessdata.projectnaptha.com。這些服務會收到一般網路請求資訊，如 IP 位址；第三方程式碼會在瀏覽器執行。
- 此版沒有伺服器、追蹤分析或 API 金鑰。
- 活動草稿使用瀏覽器 localStorage，保留文字，不保留照片。共用裝置使用完可按「清除照片與草稿」。私密瀏覽或清除網站資料可能移除草稿。
- 開啟 Google 新增活動時，活動名稱、地點與備註會透過網址傳給 Google，也可能出現在瀏覽器歷史紀錄。原始照片不會附加到活動。
- 網頁介面可在曾開啟後離線讀取；**不保證離線照片辨識**，工具或語言資料未下載時需要連線。開啟 Google 行事曆也需要網路。

## 辨識範圍與確認方式

- 支援 `2026年11月15日`、`2026/11/15`、`2026-11-15`、明確標示 `民國115年11月15日`。
- 支援 `14:00`、`下午2:00–4:00`、`上午9點30分至11點`、`2:00 PM` 等時刻。
- 不會推測缺少年份；像 `11月15日` 需自行補完整日期。未明示「民國」的三位數年份會提示確認。
- 多個完整日期會提供選單；例如報名截止日與活動日，需自行選對。日期區間的結束日期仍需手動核對。
- 日期、時間無法可靠讀取時，欄位保留空白，不會替你設定成現在時間。
- 活動名稱是文字中的候選行，地點需有「地點：」「地址：」等標示；這是規則整理，不是完整 AI 語意理解。
- 中文數字、相對日期（下星期六）、「兩點半」、複雜排版、手寫文字與多活動海報可能無法正確整理。請手動修正。「下午2點半」使用阿拉伯數字時可辨識為 14:30。
- 使用裝置本地時區，介面會顯示時區；一般活動換算成 UTC 傳給 Google，避免固定寫死台灣時區。
- 全天活動的結束日期填「最後一天」，程式轉成 Google 所需的排他結束日。
- 跨午夜活動需把結束日期改到下一天。
- 輸入內容修改後確認勾選會失效；重新打開草稿也需確認。
- 每次開啟 Google 都是新的新增頁面；再次儲存可能建立重複活動，請自行確認。

## Windows 本機預覽（可選）

安裝 Node.js 18 以上後，在此資料夾打開終端機，執行：

```text
npm start
```

在電腦瀏覽器開啟 `http://127.0.0.1:4173/`。不需要安裝套件。此網址只供該電腦預覽，**不能直接拿到 iPhone 開啟**；手機使用請先完成 HTTPS 發布。

如果用檔案總管直接雙擊 index.html，JavaScript 模組可能被瀏覽器限制，請使用本機預覽或正式網站。

## 驗證紀錄與尚待驗收

日期與 Google 連結的自動測試涵蓋：中文與全形數字、民國年份、缺少年份、閏日、無效日期、多日期、上午下午、時區換算、內容編碼、全天結束日與跨午夜。

已完成：10 項自動測試全部通過；電腦瀏覽器匯入中文測試海報、執行實際照片辨識，並驗證辨識後的空格處理能正確保留「下午」時間。測試海報的部分標題中文字仍有辨識錯誤，需人工修正。也已確認 390px 寬度不產生水平溢出，以及確認勾選後可送出、修改欄位後必須重新確認。網站所需的 9 個介面檔案均可正常載入。

尚需在實體 iPhone 驗證拍照權限、不同相簿格式、辨識效能、Safari 加入主畫面，以及登入 Google 後實際儲存活動。Google 頁面會依瀏覽器／帳號狀況開啟登入或新增頁；本網站無法得知你是否完成儲存。

## 官方參考

- [GitHub Pages 發布設定](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [Apple：把網站加入 iPhone 主畫面](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/27/ios/27)
- [Tesseract.js 辨識 API](https://github.com/naptha/tesseract.js/blob/master/docs/api.md)
- [Google：活動新增連結](https://developers.google.com/workspace/calendar/api/concepts/inviting-attendees-to-events)
