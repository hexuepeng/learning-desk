# Power Up 1 家庭单元包

家里自用的本机单元词包，主题对齐 Cambridge Power Up 1 学生用书（子宸在学的那套），词和短句来自家庭项目 `hexuepeng/EnglishStudy` 的 `backend/seed.js`。

**不是**剑桥官方产品，也不主张剑桥授权。界面请写「Power Up 1 家庭单元包」。

## 文件

- `manifest.json` — 11 个单元索引
- `unit-*-*.txt` — 每行 `english,chinese`，和书桌粘贴导入同一格式
- `*-sentences.txt` — 每行 `english|chinese`，给今日短句库
- `all-words-with-sentences.tsv` — 全量对照，给核对用

应用读取 `src/content/powerUp1Packs.ts`（同一份正文）。书桌一键按单元追加，不覆盖内置 KET / A2 Key 默认包。
