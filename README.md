# Focus Assistant

一个轻量、无依赖的浏览器插件脚手架，当前第一版能力是屏蔽分心网站。

## 技术方案

- Manifest V3
- 原生 JavaScript Modules
- HTML + CSS
- `tabs` 导航重定向

这样做的目的很明确：

- 不引入构建工具，仓库开箱可用
- 运行时更轻量，适合浏览器插件
- 权限和逻辑边界更清晰，便于后续扩展

## 项目结构

```text
.
├── manifest.json
├── README.md
├── _locales
│   ├── en
│   │   └── messages.json
│   └── zh_CN
│       └── messages.json
└── src
    ├── background
    │   └── index.js
    ├── core
    │   ├── blocking
    │   │   ├── domain.js
    │   │   └── redirect.js
    │   └── settings
    │       ├── defaults.js
    │       └── storage.js
    ├── lib
    │   └── i18n.js
    └── pages
        ├── blocked
        │   ├── index.css
        │   ├── index.html
        │   └── index.js
        ├── options
        │   ├── index.css
        │   ├── index.html
        │   └── index.js
        └── popup
            ├── index.css
            ├── index.html
            └── index.js
```

## 目录约定

- `background`
  插件后台入口，只做事件绑定和流程调度，不堆业务细节

- `core`
  业务核心层，后续加白名单、定时模式、临时放行、统计时，优先往这里扩

- `lib`
  纯工具层，放与业务无关的通用能力，例如国际化、时间格式化、URL 工具

- `pages`
  页面层，只负责 UI、表单、交互展示，不直接承载核心规则判断

- `_locales`
  浏览器原生语言包

这套分层的目的是把“规则逻辑”和“页面展示”切开。后面新增功能时，通常只需要：

1. 在 `src/core` 增加能力模块
2. 在 `src/pages` 接入对应界面
3. 在 `src/background/index.js` 做少量事件连接

这样可以避免功能一多就被迫重构目录。

## 当前能力

- 全局启用或暂停网站屏蔽
- 在插件本地存储中维护屏蔽域名列表
- 当你在当前已打开的网站上新增黑名单时，插件会自动重定向匹配标签页，让拦截立即生效
- 通过 `popup` 做快速开关
- 通过 `options` 页面管理黑名单
- 默认跳转到插件内置 `blocked.html`
- 支持改成自定义 URL，例如云端页面或本地 `http://127.0.0.1` 页面
- 提供浏览器原生 `i18n` 语言包，当前内置中文和英文

## 本地部署 / 本地加载

当前这个项目是浏览器插件，不需要传统意义上的服务器部署。

本地使用方式：

1. 打开 Chrome 或 Edge。
2. 进入扩展管理页：
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
3. 打开右上角 `开发者模式`。
4. 点击 `加载已解压的扩展程序` 或 `Load unpacked`。
5. 选择这个仓库根目录：
   `/Users/jiarongli/Documents/GitHub/focus-assistant`

加载成功后：

- 浏览器工具栏会出现插件图标
- 点击图标可以打开 `popup`
- 在扩展详情页可以进入 `选项页`

## 如何使用

1. 先加载插件。
2. 打开插件的设置页（Options）。
3. 在文本框里每行输入一个域名，例如：

```text
youtube.com
facebook.com
instagram.com
```

4. 点击 `Save settings`。
5. 确保 `Focus mode` 是开启状态。
6. 访问对应网站，浏览器会跳转到 blocked 页面。

## 如何验证是否生效

建议用下面这个最小测试流程：

1. 在设置页添加 `example.com`
2. 保存设置
3. 访问 `https://example.com`
4. 如果规则生效，页面会跳转到 blocked 页面

当前版本的行为：

- 命中黑名单后，将标签页重定向到 blocked 页面
- 默认使用插件内置页面 `src/blocked/blocked.html`
- 也可以在设置页改成外部 URL

当前版本不会做：

- 页面内容读取
- 页面脚本注入
- 页面元素级别屏蔽

所以这一版的权限面相对比较小。

## 权限说明

- `storage`
  用于本地保存插件设置和黑名单

- `host_permissions: <all_urls>`
  允许插件识别任意网站导航并执行重定向

- `tabs`
  用于在命中黑名单时重定向当前标签页

这套方案的关键点是：插件不需要读取网页内容，只在标签页导航时判断 URL 并执行跳转。

如果你选择外部 URL，当前实现只允许：

- `http://`
- `https://`

这样比直接放开所有协议更安全，也更容易预期行为。

## 如果你要“发布”而不是“本地加载”

有两种常见方式。

### 方式 1：自己本地长期使用

继续用 `Load unpacked` 即可。

特点：

- 最快
- 不需要上架
- 修改代码后点一次扩展页的刷新按钮即可

适合当前阶段开发和自用。

### 方式 2：打包并发布到浏览器商店

如果后面你希望给别人安装，需要走商店发布流程。

Chrome 大致流程：

1. 准备好图标、说明文案、截图
2. 确认 `manifest.json`、权限说明和功能完整
3. 将仓库内容打包成 zip
4. 登录 Chrome Web Store Developer Dashboard
5. 上传插件包并填写商店信息
6. 等待审核发布

Edge 也有类似的 Add-ons 发布流程。

当前仓库还没补这些发布必需项：

- 插件图标
- 商店介绍文案
- 隐私说明页
- 更完整的拦截交互页

所以现阶段最合理的“部署”方式就是本地加载。

## 开发时如何更新

你修改完代码以后，不需要重新安装。

步骤：

1. 回到扩展管理页
2. 找到 `Focus Assistant`
3. 点击刷新按钮
4. 重新打开插件或目标网页测试

如果改的是：

- `manifest.json`
- `src/background/index.js`
- 权限相关配置

建议刷新扩展后，再重新测试一次目标网站。

## 关于开发者模式

开发和测试阶段不要关闭浏览器的开发者模式。

原因：

- `Load unpacked` 本地加载扩展依赖开发者模式
- 你修改代码后，需要在扩展页刷新插件继续测试
- 关闭后，本地未打包扩展的开发流程会中断

结论：

- 开发期间保持开启
- 真正发布时再走打包和商店上架流程

## 后续建议

下一步比较值得补的是：

- 白名单机制
- 临时放行
- 定时专注模式
- 导入导出规则
