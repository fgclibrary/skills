---
name: html-slides
description: 创建、改写或扩展具有统一 UI 的 16:9 HTML 幻灯片，将提纲、Markdown、文档或现有 HTML deck 转化为可离线运行、可全屏播放、带讲者备注并可打印为 PDF 的静态网页演示。当用户明确要求 HTML slides、HTML deck、浏览器演示、离线网页幻灯片、html-slides 模板，或修改这类演示的内容、布局、组件、主题、备注和打印能力时使用。
---

# HTML Slides

## 目标

把内容资料转化为稳定、克制、易读的 HTML 演示，而不是把文档段落逐页搬运，或为每份资料重新发明一套 UI。

最终产物应当：

- 保持固定 16:9 构图并随浏览器等比缩放；
- 可以离线打开，不依赖 CDN 或远程字体；
- 支持键盘翻页、全屏、深浅主题和讲者备注；
- 可以通过浏览器打印为一页一张的 16:9 PDF；
- 使用结构化内容、受控页面类型、布局规则和内容组件；
- 在真实渲染结果中完成视觉检查。

## 运行环境

- 使用 Node.js 18+ 执行确定性校验。
- 使用支持容器查询、OKLCH 和 `color-mix()` 的现代浏览器演示与打印。

## 适用任务

- 从提纲、Markdown、文档或结构化数据创建新演示；
- 修改已有的 HTML 演示；
- 新增具有复用价值的页面、布局或内容组件；
- 修复主题、演示模式、备注、溢出和 PDF 打印问题。

## 渐进式读取

不要一次读取全部参考资料。先判断任务，再读取对应文件：

| 当前任务 | 读取 |
| --- | --- |
| 规划新演示、改写文案或调整顺序 | [content-and-story.md](references/content-and-story.md) |
| 判断一页承担什么叙事职责 | [page-types.md](references/page-types.md) |
| 选择或修改页面的默认视觉构图 | [page-patterns.md](references/page-patterns.md) |
| 调整安全区、间距、对齐、分栏或溢出 | [layout-rules.md](references/layout-rules.md) |
| 选择、新增或修改内容表达结构 | [components.md](references/components.md) |
| 调整颜色、字体、边线、圆角或图片风格 | [visual-system.md](references/visual-system.md) |
| 创建工程、修改交互、备注、全屏或打印 | [runtime-and-print.md](references/runtime-and-print.md) |
| 准备交付 | [quality-gates.md](references/quality-gates.md) |

新建完整演示时，按工作流逐步读取相关文件；局部修改只读取受影响的规则和最终验收清单。

## 规范来源与冲突

- `references/` 定义选择逻辑、使用边界和稳定的视觉行为。
- `assets/template/` 定义精确 DOM、token、尺寸、样式和运行结果。
- Markdown 不重复维护可以直接从 renderer 或 CSS 获得的具体数值。
- `references/` 与 `assets/template/` 不一致时，将其视为 Skill 缺陷，先向用户指出冲突，再决定修改规则还是实现；不要静默选择一方。

## 核心模型

依次完成三个判断：

1. **Page Type**：这一页为什么存在，要完成什么叙事任务。
2. **Layout Rules**：内容怎样占据空间并保持稳定秩序。
3. **Content Component**：页面中的信息用什么结构表达。

不要把三者合并成一个页面模板名称。Grid、Columns、Stack、Center 等只是实现方式，不是内容语义。

## 工作流

### 1. 检查输入和目标

- 确认受众、使用场景、演示目标、预计时长和输出目录。
- 阅读全部输入资料，区分事实、观点、案例、来源和讲者补充。
- 修改已有演示时，先确认内容源、生成文件、手写文件和资源边界。
- 信息不足但不影响结构时使用明确占位；不能验证的事实不要自行补全。

### 2. 规划叙事

- 为整套演示确定一条可复述的主线。
- 先写每页要回答的问题，再写标题、核心观点和证据。
- 一页只承担一个主要判断或关系。
- 删除重复背景，必要时调整顺序或拆页。

读取 `content-and-story.md`。

### 3. 选择页面、布局和组件

- 根据叙事职责选择 Page Type。
- 使用该 Page Type 在 `page-patterns.md` 中定义的默认视觉模式。
- 根据内容关系应用安全区、间距、对齐和分栏。
- 根据表达任务选择最小、最直接的 Content Component。
- 优先复用已有结构；只有出现新的通用信息关系时才新增组件。

按需读取 `page-types.md`、`page-patterns.md`、`layout-rules.md` 和 `components.md`。

### 4. 实现演示

- 将 `assets/template/` 完整复制到新的输出目录，从这套可运行模板开始，不重新搭建 Shell、页面画布和基础样式。
- 基础模板默认使用 GrapeCity 视觉主题；颜色 token 的精确值以模板 CSS 为唯一来源。
- 模板中的品牌名称、部门和 Logo 身份仍使用可替换配置；用户指定部门或其他品牌时，从 `assets/brand-presets/` 选择对应 preset，以同名配置、资源和必要的主题 token 覆盖输出目录。
- 保持内容数据、renderer、CSS、资源和演示 Shell 分离。
- 使用语义 token，不在单页散落颜色、字号和坐标补丁。
- 把观众需要看到的内容放在画布，把逐页讲者讲稿放入 Notes。
- 在真实演示中，Notes 就是逐页讲者讲稿：使用自然口语补充画面、承接前后页，并服从演示总时长。
- 只有 `assets/template/content/deck-data.js` 的样例 Notes 是模板页面说明；复制模板生成真实演示时，必须逐页全部替换，不能保留为制作备注。
- 忽略模板 `deckTitle` 的示例值“HTML 演示模板”。`deckTitle` 只用于浏览器
  标签标题，不进入 Slide 画布；不要把真实演示标题放入底部 Footer。
- 标准 Footer 只显示品牌身份和页码，不增加演示标题、章节标题或重复说明。
- 保留离线、主题、键盘、全屏、备注和打印能力。
- 优先通过 `content/deck-data.js` 填充内容；只有现有页面或组件确实无法表达任务时才扩展 renderer 和 CSS。

按需读取 `visual-system.md` 和 `runtime-and-print.md`。

### 5. 处理溢出

按以下顺序处理：

1. 删除重复或不影响理解的内容；
2. 缩短标题、标签和说明；
3. 换用更合适的组件；
4. 拆成连续页面；
5. 最后才在允许范围内微调字号或间距。

不要自动缩小整页字号，不要压缩行高，也不要扩大画布。

### 6. 验证

完整读取 `quality-gates.md`，然后：

- 在输出目录运行 `node scripts/validate-deck.mjs`，先检查数据契约、逐页
  renderer 和本地资源；
- 在浏览器中逐页检查，而不是只阅读源码；
- 验证浅色、深色、普通预览和全屏演示；
- 验证长标题、自然换行、编号对齐和内容溢出；
- 打开打印预览，确认一张幻灯片对应一页；
- 汇报生成的文件、验证结果和仍需人工确认的内容。

CLI 校验只处理可以确定真假的工程规则，不判断视觉主次、语气、叙事质量或
页面是否“好看”。这些仍需要浏览器逐页检查和人工判断。

## 输出要求

创建新演示时，输出一个独立目录，至少分离：

```text
deck/
├── index.html
├── assets/
├── styles/
├── scripts/
└── content/
```

该结构应当来自 `assets/template/`。具体文件可以根据任务调整，但不能把内容、样式、交互和全部资源退化为一个不可维护的巨大 HTML 文件。
