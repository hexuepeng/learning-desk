# 学习台

家庭定制学习台。Expo SDK 57 + Expo Router。页面在 `src/app`。

当前版本：**0.1.28**

## 版本号

每一次功能或修都必须同时提高 `package.json` 与 `app.json` 里的 `version`。

- 新功能或修 bug（0.x）：提高 patch，例如 `0.1.0` → `0.1.1`
- 有不兼容改动：提高 minor，例如 `0.1.1` → `0.2.0`
- 1.0 之后的不兼容改动走 major

不要只改代码不改版本。

## 结构

- `src/app` 路由页面
- `src/lib` 默写台阶、今日卡、词表解析（含可选英式 IPA）、短句导入与本地模板、KET 闯关 SRS、家长录音覆盖 TTS（纯逻辑，带测试）
- `src/content` 示例词包、内置默认 KET / A2 Key 词包（空库自动种入）、Power Up 1 家庭单元包与原创短绘本
- 数据存在 AsyncStorage；相册书照片与家长录音拷进应用文档目录，无账号、无云同步

文档入口：https://docs.expo.dev/llms.txt

## EAS / TestFlight

`eas.json` 供第一次把 iPad 安装包送到 TestFlight。`development` 打 iOS 模拟器包（internal）；`preview` 是 internal / ad hoc，装到已登记设备；`production` 走 App Store / TestFlight，`cli.appVersionSource` 为 `remote`，`autoIncrement` 由 EAS 远程递增 `ios.buildNumber`。仓库未安装 `expo-dev-client`，因此 development 没有打开 `developmentClient`。`eas-cli` 不是依赖，脚本用 `npx eas-cli`。

`app.json` 里还没有 `expo.extra.eas.projectId`。关联 Expo 项目必须由已登录的人执行，不要手写假的 projectId：

```bash
npx eas-cli login
npx eas-cli init
```

Apple Developer 与 App Store Connect 凭据也在仓库外，由 `npx eas-cli build` / `npx eas-cli submit` 配置。不要把 `.p8`、`.p12`、mobileprovision 或 Apple 密码提交进 git。`ITSAppUsesNonExemptEncryption` 已是 `false`。
