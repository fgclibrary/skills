# 内容组件

在选择内容表达结构时读取。确定组件后，只继续读取对应的独立规范。

Content Component 负责表达主体区域中的信息关系，不决定整页叙事，也不负责自由
定位。默认与 `type: "content"` 组合，一页只使用一个主要组件。

## 已实现组件

| 表达任务 | `component.kind` | 读取 |
| --- | --- | --- |
| 展示 2–6 个同层级主题 | `indexed-grid` | [indexed-grid.md](components/indexed-grid.md) |
| 展示 1–4 个同口径数字 | `metrics` | [metrics.md](components/metrics.md) |
| 精确查值和横向比较 | `table` | [table.md](components/table.md) |
| 表达变化、差距或构成 | `chart` | [chart.md](components/chart.md) |
| 表达真实顺序或阶段 | `process` | [process.md](components/process.md) |
| 表达层级、依赖、流转或生成关系 | `diagram-nodes` | [diagram-nodes.md](components/diagram-nodes.md) |
| 在共同维度下突出双方差异 | `comparison` | [comparison.md](components/comparison.md) |
| 展示图片、横向视频或手机竖版素材 | `media-surface` | [media-surface.md](components/media-surface.md) |
| 让一个关键判断成为页面焦点 | `callout` | [callout.md](components/callout.md) |

不要因为内容有四项就自动使用卡片，也不要把普通并列内容画成流程。

## 共享编号规则

带编号的内容项使用以下基础结构：

```js
{
  index: "01",
  title: "标题",
  description: "说明",
}
```

- DOM 结构由受控 renderer 维护，不在 reference 或页面数据中复制 HTML；
- 左侧只放编号；
- 右侧标题与描述共享左边缘；
- 编号与标题在同一标题行内垂直居中；
- 描述紧随标题并保持上对齐。

组件使用不同字段名时可以在 renderer 中映射到该结构，不重复发明编号对齐逻辑。

## 新增组件

新增前依次判断：

1. 现有组件能否通过内容调整解决？
2. 是否只是布局差异，而不是新的信息关系？
3. 该结构是否会在不同演示中重复出现？

确需新增时：

1. 在 `references/components/` 定义用途、数据契约、边界和验收项；
2. 在模板中补齐受控 renderer 与 CSS；
3. 在示例 deck 中加入一张代表性页面；
4. 验证深浅主题、长内容、全屏和打印；
5. 最后将组件加入本文的已实现组件路由。
