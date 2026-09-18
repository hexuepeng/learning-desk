# 学习台

家庭定制学习台。Expo SDK 57 + Expo Router。页面在 `src/app`。

当前版本：**0.1.2**

## 版本号

每一次功能或修都必须同时提高 `package.json` 与 `app.json` 里的 `version`。

- 新功能或修 bug（0.x）：提高 patch，例如 `0.1.0` → `0.1.1`
- 有不兼容改动：提高 minor，例如 `0.1.1` → `0.2.0`
- 1.0 之后的不兼容改动走 major

不要只改代码不改版本。

## 结构

- `src/app` 路由页面
- `src/lib` 默写台阶、今日卡、词表解析、家长录音覆盖 TTS（纯逻辑，带测试）
- `src/content` 示例词包与原创短绘本
- 数据存在 AsyncStorage；相册书照片与家长录音拷进应用文档目录，无账号、无云同步

文档入口：https://docs.expo.dev/llms.txt
