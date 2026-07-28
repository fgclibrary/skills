# 运行时与打印

在创建演示工程、修改 Shell、交互、主题、Notes、全屏或 PDF 导出时读取。

## 1. 工程分层

创建新演示时，先完整复制 `assets/template/`。模板已经提供离线入口、结构化 deck data、受控 renderer、语义样式、Notes、全屏和打印，不应重新实现这些基础能力。

保持以下职责：

| 层级 | 职责 |
| --- | --- |
| Presentation Shell | 导航、主题、全屏、Notes、打印 |
| Slide Stage | 16:9 画布、等比缩放、切页 |
| Page Renderer | 页面类型的稳定结构 |
| Content Renderer | 受控内容组件 |
| Slide Data | 标题、正文、数据、资源和 Notes |
| Styles / Tokens | 视觉语义和布局规则 |
| Validator | 数据契约、逐页 renderer 与本地资源完整性 |

数据中不直接包含任意 CSS、无约束 HTML 或页面坐标补丁。

`deckTitle` 只设置浏览器标签标题，不渲染到 Slide 画布。模板中的“HTML 演示
模板”是示例值；生成真实演示时可以替换浏览器标题，但不要把它或真实演示标题
放入 Footer。标准 Footer 只保留品牌身份和页码。

模板的主要修改入口：

- `content/brand-config.js`：品牌名称、部门和 Logo 模式；
- `content/deck-data.js`：浏览器标签标题、页面内容和 Notes；
- `styles/tokens.css`：主题与视觉 token；
- `styles/slides.css`：页面框架；
- `styles/components.css`：内容组件；
- `scripts/renderers.js`：页面和组件 renderer；
- `scripts/validate-deck.mjs`：复用 renderer 契约的命令行校验；
- `scripts/app.js`：Shell 行为。

## 2. 离线要求

- `index.html` 可以直接打开。
- 字体、图片、视频和浏览器依赖保存在演示目录内。
- 不使用 CDN、远程字体或运行时网络请求作为基础能力。
- 第三方依赖固定版本并保留许可证。

## 3. 演示控制

至少支持：

- 左右方向键、PageUp / PageDown 翻页；
- Home / End 跳转；
- 全屏演示；
- 深浅主题；
- 打开和关闭当前页 Notes；
- 触发打印或导出 PDF。

浏览器工具栏和 Notes 属于 Shell，不进入幻灯片构图。
聚焦原生视频控件时，空格键和方向键优先交给视频，不触发 Slide 翻页。

## 4. Notes

- Notes 与每页数据关联。
- 在真实演示中，Notes 的内容就是当前页的讲者讲稿，不是制作说明、数据来源
  备忘或待办事项。
- 讲稿使用自然口语，补充而不复读画面，包含必要的前后页转场，并与整套演示
  的目标时长一致。
- 模板 `deck-data.js` 中的 Notes 仅用于解释样例页；从模板生成真实演示时必须
  逐页替换。
- Notes 面板可以滚动，但不改变 Slide Stage 尺寸。
- 切页时同步显示当前页 Notes。
- 演示模式可以按明确方式打开或关闭 Notes。
- Notes 不进入打印输出。

## 5. 打印

打印 CSS 必须保证：

- 使用 `@page` 设置 16:9 横向页面；
- 一张幻灯片对应一个打印页；
- 所有幻灯片在打印时可见；
- 移除 Shell、工具栏、导航和 Notes；
- 保留背景、图片、Footer 和页码；
- 视频在打印时隐藏，并在相同媒体表面显示必需的 poster；
- 关闭动效和过渡；
- 避免页面缩放造成额外空白或裁切。

推荐页面尺寸为 `13.333in × 7.5in`。

浏览器支持时提醒用户启用背景图形、关闭页眉页脚并使用无边距。

## 6. 修改已有演示

先确定：

- 哪些文件是内容源；
- 哪些文件由脚本生成；
- 哪些文件是手写 renderer 和样式；
- 资源路径相对于哪个入口解析；
- 是否存在主题、打印或 Notes 的专属扩展。

不要直接修改生成文件来获得短期效果。

## 7. 统一校验

在演示目录中运行：

```bash
node scripts/validate-deck.mjs
```

页面类型和内容组件的数据契约只维护在 `scripts/renderers.js`。浏览器运行时和
CLI 必须调用同一组 `validateDeck()`、`validateSlide()` 与
`validateComponent()`，不要在图表、图形或 CLI 中复制第二套规则。

CLI 负责：

- 校验 Slide ID、Page Type、Notes 和各组件字段；
- 逐页调用 renderer，确认数据可以生成稳定 HTML；
- 检查 HTML、CSS、字体、图片、视频、poster、Logo 和本地依赖存在；
- 拒绝远程运行依赖以及逃出演示目录的资源路径。

普通 `<a href>` 外链不是演示运行依赖，可以保留；它仍需在内容验收中检查地址、
显示文字和来源。脚本、样式、字体、图片和视频等基础资源必须保持本地可用。

CLI 不负责判断叙事、语气、视觉层级、对齐效果或内容是否拥挤。这些属于浏览器
视觉检查与人工验收。
