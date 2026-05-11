# Focus Assistant

一个轻量、无依赖、以本地存储为主的浏览器专注插件。当前版本已经从基础黑名单扩展到多模式分组拦截，并保留后续继续加严规则的结构空间。

当前清单版本：`1.2.0`

## 当前定位

- 以 `Manifest V3 + 原生 JavaScript Modules` 实现
- 不依赖构建工具，仓库加载即可运行
- 核心数据保存在浏览器本地 `storage`
- 用分组把域名按场景拆开，再把每个组绑定到不同专注模式

## 当前能力

- 手动专注模式
- 永久屏蔽模式
- 任意数量的定时专注时段
- 强制型番茄钟专注阶段
- 域名分组管理
- 每个分组独立绑定 `永久屏蔽 / 手动 / 定时 / 番茄钟`
- 域名单项启用开关
- 内置极简 blocked 页面
- blocked 页面短时放行，可在设置中整体禁用
- 自定义 blocked 页面 URL
- 中英文语言包
- 最小核心逻辑测试

## 项目结构

```text
.
├── CHANGELOG.md
├── README.md
├── manifest.json
├── tests
│   └── core-logic.test.mjs
├── _locales
│   ├── en
│   │   └── messages.json
│   └── zh_CN
│       └── messages.json
└── src
    ├── assets
    │   └── icons
    ├── background
    │   ├── controller.js
    │   └── index.js
    ├── core
    │   ├── blocking
    │   │   ├── domain.js
    │   │   └── redirect.js
    │   ├── grouping
    │   │   ├── groups.js
    │   │   └── modes.js
    │   ├── modes
    │   │   ├── bypass.js
    │   │   ├── focus-state.js
    │   │   ├── pomodoro.js
    │   │   └── schedule.js
    │   ├── runtime
    │   │   └── messages.js
    │   └── settings
    │       ├── defaults.js
    │       ├── sanitize-runtime.js
    │       ├── sanitize-settings.js
    │       └── storage.js
    ├── lib
    │   ├── i18n.js
    │   └── time.js
    └── pages
        ├── blocked
        ├── options
        │   ├── domain-section.js
        │   ├── form-fields.js
        │   ├── group-section.js
        │   ├── schedule-section.js
        │   ├── index.css
        │   ├── index.html
        │   └── index.js
        └── popup
```

## 设计约定

- `background`
  只负责事件入口、状态协调、alarm 重建和消息分发。

- `core`
  所有规则判断、模式计算、存储清洗都在这里，不把业务逻辑散落到页面脚本。

- `pages`
  只处理 UI、表单和页面交互。复杂配置优先拆独立 section 模块。

- `tests`
  先覆盖纯逻辑模块。UI 目前仍以人工回归为主。

## 本地加载

1. 打开 Chrome 或 Edge。
2. 进入扩展管理页。
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
3. 开启 `开发者模式`。
4. 点击 `加载已解压的扩展程序`。
5. 选择仓库根目录：
   `/Users/jiarongli/Documents/GitHub/focus-assistant`

## 使用方式

1. 打开 `Options` 页面。
2. 在 `专注模式` 页面调整手动模式和番茄钟基础参数。
3. 在 `定时管理` 页面管理定时时段。
4. 在 `域名与分组` 页先创建或选择一个分组。
5. 给分组勾选生效模式。
6. 进入该分组详情，添加域名。
7. 点击 `保存设置`。
8. 让对应模式生效后访问该域名，页面会被重定向到 blocked 页面。

## 定时模式

当前定时模式已经支持任意数量的窗口配置。每条窗口规则包含：

- 生效星期
- 开始时间
- 结束时间

设置页中的定时时段已经调整为：

- `定时管理` 独立导航页
- 时段列表页
- 时段详情页

列表页只显示摘要，点击某条时段后再进入详情编辑日期和时间。这样不会把 `专注模式` 首页挤得过满，也更适合后续继续扩展时段规则。

这意味着你可以配置：

- 工作日上午
- 工作日下午
- 周一到周四晚间
- 只在周末启用的约束时段
- 跨天规则，例如 `23:00 -> 01:00`

## blocked 页面

当前默认是极简拦截页，不再强制要求用户做多步恢复操作。页面只保留必要信息和动作：

- 当前网站
- 当前拦截来源
- 当前任务
- 最小替代动作
- 返回继续专注
- 临时放行
- 管理设置

如果在设置里关闭了 blocked 页放行权限，按钮会禁用并显示红色提示。

## 测试

当前最小测试入口：

```bash
node --test tests/core-logic.test.mjs
```

UI smoke test 入口：

```bash
npx playwright test
```

如果本机使用 Edge，推荐直接运行：

```bash
npm run test:ui:edge
```

当前 smoke tests 覆盖：

- 打开 options
- 丢弃未保存草稿后正确回滚
- 新增定时时段
- 新建分组
- 新增域名
- 保存设置
- 访问目标站点后跳转到 blocked 页面

当前已覆盖：

- 域名归一化
- 域名去重与排序
- 短时放行匹配
- 永久屏蔽优先级
- 放行覆盖拦截
- 定时状态计算
- 设置 sanitize 边界

## 权限说明

当前 manifest 使用：

- `storage`
  保存设置和运行态。

- `alarms`
  驱动定时模式和番茄钟，不需要常驻后台轮询。

- `tabs`
  在命中规则时重定向当前标签页。

- `host_permissions: <all_urls>`
  当前实现需要判断任意访问网址是否命中规则，所以在开发阶段保留全站访问范围。

这不是最终最小权限形态。后续如果要正式上商店，应该继续评估是否能把 host 范围收窄，或者把“所有网址访问”的理由在商店描述和隐私说明里明确写清楚。

## 已知限制

- UI 自动化当前只覆盖最小 smoke flow，还没有完整覆盖更多边界交互
- 分组悬浮预览目前只显示域名文本，不显示启用状态
- 没有导入 / 导出配置
- 没有白名单
- 还没有商店截图、商店文案和可公开访问的隐私政策 URL
- 当前图标已可用，但还不是专门为 `16px` 识别优化的最终版

## 发布前建议

- 把 [PRIVACY.md](/Users/jiarongli/Documents/GitHub/focus-assistant/PRIVACY.md) 部署成可公开访问的 URL
- 补充商店截图与功能说明
- 明确免费能力和未来可能的增强能力边界
- 固化一次人工回归清单
- 继续补 `schedule / options / background message` 的测试

仓库内已经补了发布辅助文档：

- [PRIVACY.md](/Users/jiarongli/Documents/GitHub/focus-assistant/PRIVACY.md)
- [RELEASE_CHECKLIST.md](/Users/jiarongli/Documents/GitHub/focus-assistant/RELEASE_CHECKLIST.md)

## 当前最值得继续做的方向

- 更严格的规则修改摩擦
- 分组级导入导出
- 更细的 blocked 页面策略
- UI 级回归测试
