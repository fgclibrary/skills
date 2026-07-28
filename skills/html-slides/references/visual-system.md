# 视觉系统

在调整颜色、字体、边线、圆角、图片和视觉层级时读取。

## 1. 视觉原则

- 使用克制、清晰的编辑式画布。
- 一页只有一个主要视觉焦点。
- 通过字号、留白、对齐和少量强调色建立层级。
- 图像、图表和关系结构承担解释任务，不作为填空式装饰。
- 不把网站 Dashboard、表单或卡片墙直接放大成演示。

## 2. 语义颜色

所有颜色通过语义 token 使用：

- `background` / `foreground`
- `card` / `card-foreground`
- `muted` / `muted-foreground`
- `primary` / `primary-foreground`
- `border` / `ring`
- `chart-1` 至 `chart-5`

深浅主题使用同一组 token 切换，不在组件中分别手写两套颜色。

一页默认只使用一个强调色；图表确有多个类别时才使用 chart token。

## 3. 品牌身份与预设

- 默认从 `assets/template/` 的 GrapeCity 视觉主题开始；精确颜色值只维护在
  `styles/tokens.css`，本文不复制 token 数值。
- 视觉主题与品牌身份分开维护：主题决定语义颜色，品牌身份决定名称、部门、
  Logo 和封面资源。默认主题是 GrapeCity，不代表每份演示都必须显示
  GrapeCity Logo。
- 用户明确指定部门或其他品牌时，从 `assets/brand-presets/` 选择对应预设，
  将品牌配置、Logo、封面资源和必要的主题 token 以同名文件覆盖到输出目录。
- 品牌 preset 只维护身份资源和必要 token，不复制页面结构、组件或运行时。
- 不在 renderer、内容组件或页面 CSS 中硬编码品牌名称、部门、Logo 路径或
  品牌专属图片。
- 没有指定品牌身份时保留文字占位，但继续使用模板默认的 GrapeCity 主题。
- 部门主题可以覆盖语义颜色，不得借此修改字号、间距、页面构图或组件契约。

应用 GrapeCity 品牌身份时，先完整复制 `assets/template/`，再执行以下同名覆盖：

```text
assets/brand-presets/grapecity/brand-config.js
  -> content/brand-config.js
assets/brand-presets/grapecity/logo-light.png
  -> assets/images/logo-light.png
assets/brand-presets/grapecity/logo-dark.png
  -> assets/images/logo-dark.png
assets/brand-presets/grapecity/cover-background.png
  -> assets/images/cover-background.png
```

覆盖后不要修改 renderer 或组件 CSS。若部门不是 preset 的默认部门，只修改输出
目录中的 `content/brand-config.js`，不要反向修改共享 preset。

## 4. 字体

- 西文与数字优先使用本地 Geist Sans。
- 中文使用稳定的系统 CJK 字体回退。
- 编号、短标签、来源和技术标识可以使用 Geist Mono。
- 一页不超过三个主要字重层级。
- 不通过全大写或超宽字距强调中文。
- 精确字号和字重由 `assets/template/styles/tokens.css`、`slides.css` 和
  `components.css` 维护，reference 不建立第二套数值。
- 保持稳定层级：Cover / Callout 主句高于 Section / Page Title，高于组件标题和
  Body，高于 Label / Source；图表坐标轴和数据标签不得脱离该层级单独放大。
- 字号是可读性标准，不是容纳更多内容的压缩工具。

## 5. 边线、圆角和阴影

- 开放式排版优先使用留白和弱边线。
- 只有真实独立表面才同时使用背景和圆角。
- 同一区域避免同时叠加背景、完整边框、圆角和阴影。
- 基础内容保持无阴影；覆盖层可以使用轻阴影。
- 嵌套表面遵循外层圆角大于内层圆角。

## 6. 图片和图标

- 图片必须承担证据、产品展示或场景解释职责。
- 图片资源、承载画布和图片表面分层处理。
- 默认使用 `object-fit: contain`；只有允许裁切时使用 `cover`。
- 图标用于动作、状态和明确概念，不作为每个标题的装饰。
- 同一演示保持一致的图标体系与描边逻辑。

## 7. 动效

- 动效只帮助理解切页、焦点和结构变化。
- 切页使用短促淡入或轻微位移。
- 不依赖动画才能看到完整信息。
- 尊重 `prefers-reduced-motion`。
- 打印时所有内容静态完整可见。
