# ClawSnap

> Capture current browser content and forward it to Telegram for Claw logging and analysis.

ClawSnap 是一个基于 Chrome Manifest V3 的轻量扩展。它可以一键捕获当前网页（可见区域截图 + 页面元数据），并把数据发送到 Telegram，方便 Claw 进行记录、总结、待办提取、风险分析等。

## ✨ Features

- 一键捕获当前标签页可见区域截图
- 自动附加页面元数据：
  - 时间戳
  - 站点域名
  - 页面标题
  - URL
  - 自定义备注
- 可配置分析指令模板（内置预设 + 自定义）
- 模板变量注入：
  - `{{timestamp}}`
  - `{{domain}}`
  - `{{url}}`
  - `{{title}}`
  - `{{note}}`
  - `{{snippet}}`
- 发送两条消息到 Telegram：
  1. 截图（caption 含结构化元信息）
  2. 渲染后的分析请求文本

## 📦 Project Structure

```text
claw-telegram-capture-extension/
├── manifest.json
├── popup.html
├── popup.js
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── LICENSE
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
└── CHANGELOG.md
```

## 🚀 Quick Start

### 1) Load extension locally

1. 打开 `chrome://extensions`
2. 打开「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择本目录：`~/.openclaw/projects/claw-telegram-capture-extension`

### 2) Configure Telegram

1. 在 BotFather 创建（或使用已有）bot，拿到 `Bot Token`
2. 准备 `Chat ID`（私聊 ID 或群组 ID）
3. 点击扩展图标，填写：
   - Bot Token
   - Chat ID
4. 选择一个模板预设或改写你的自定义模板
5. 点击「保存配置」

### 3) Send capture

1. 打开目标网页
2. 点击扩展图标
3. 可选填写备注
4. 点击「捕获并发送」


## 🔁 关于“转发给别的机器人”

已按该需求调整：ClawSnap 现在是**直接投递到目标 Chat ID**（你配置的会话），不是先发给你再手动转发。

推荐做法：
1. 建一个群，把「中转 bot」和「目标机器人（如 Claw bot）」都拉进去
2. 在扩展里把 `目标 Chat ID` 配成该群 ID（通常 `-100...`）
3. 可选填写“机器人唤起前缀”如 `@your_claw_bot`，扩展会自动在分析请求前加上它

> Telegram 限制：bot 不能直接给另一个 bot 发私聊消息。
> 因此“bot → bot”最佳实践是通过同一群组/频道会话来触发目标机器人。

## 🧠 Analysis Template

你可以直接在扩展里配置分析模板，示例：

```text
请基于以下页面信息进行总结：
- 时间：{{timestamp}}
- 站点：{{domain}}
- 标题：{{title}}
- URL：{{url}}
- 备注：{{note}}

页面摘要：
{{snippet}}

输出要求：
1) 3-5 条核心要点
2) 一句话结论
3) 标注不确定信息
```

## 🔐 Privacy & Security

- Bot Token 属于敏感凭据，请勿泄露。
- 当前版本将配置存储在浏览器本地存储（`chrome.storage.local`）。
- 建议使用独立 bot，不与其他高权限自动化共用。
- 若用于团队环境，建议接入中间服务做审计、鉴权与速率限制。

更多请见 [SECURITY.md](./SECURITY.md)。

## 🛠️ Development

目前无构建步骤，纯原生 HTML/CSS/JS：

- 修改代码后在 `chrome://extensions` 点击刷新即可生效。

## 📦 Packaging

### Option A: zip package

```bash
cd ~/.openclaw/projects
zip -r ClawSnap.zip claw-telegram-capture-extension -x "*/.DS_Store"
```

### Option B: Chrome `.crx`

1. 打开 `chrome://extensions`
2. 开发者模式开启
3. 点击「打包扩展程序」
4. 扩展根目录选择：`~/.openclaw/projects/claw-telegram-capture-extension`
5. 生成 `.crx` 与 `.pem`

> 请妥善保管 `.pem`，后续同 ID 升级需要该私钥。

## 🗺️ Roadmap

- [ ] 支持多模板分组管理
- [ ] 支持可选发送“仅文本 / 仅截图 / 两者都发”
- [ ] 支持可配置的消息格式（Markdown / HTML）
- [ ] 增加国际化（i18n）

## 🤝 Contributing

欢迎 Issue / PR。提交前请阅读 [CONTRIBUTING.md](./CONTRIBUTING.md) 与 [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)。

## 📄 License

MIT License. See [LICENSE](./LICENSE).
