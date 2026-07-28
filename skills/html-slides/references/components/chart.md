# Chart

在观众需要理解连续变化、类别差距或整体构成时读取。

## 使用边界

- `line` 用于 4–12 个连续周期的趋势，允许 1–2 条序列。
- `bar` 用于 2–8 个类别的同一指标比较，只允许 1 条序列。
- `donut` 用于 2–6 个互斥类别的整体构成，只允许 1 条序列。
- 需要逐项精确核对多个字段时使用 `table`。
- 只有少量时点数字时使用 `metrics`，不以图表增加视觉复杂度。

## 数据契约

```js
{
  kind: "chart",
  variant: "line",
  categories: ["一月", "二月", "三月", "四月"],
  series: [{ name: "完成率", values: [48, 56, 68, 82] }],
  unit: "%",
  axis: { min: 40, max: 90 },
  highlightIndex: 3,
  highlightSentiment: "positive",
  benchmark: { value: 70, label: "目标 70%" },
  period: "2026 Q1–Q2",
  source: "业务系统",
}
```

- `variant` 仅允许 `line`、`bar` 或 `donut`。
- `categories` 与每条 `series.values` 数量完全一致，值必须是数字。
- `highlightIndex` 指定唯一关键类别；`highlightSentiment` 仅允许
  `positive`、`negative` 或 `neutral`。
- `line` 与 `bar` 必须提供合理的 `axis.min` 和 `axis.max`；`donut`
  不使用坐标轴和目标线。
- `period`、`source` 和统一 `unit` 必须静态可见。
- 数据层不接受任意 ECharts `option`。

## 默认视觉行为

- 使用本地 ECharts 和 SVG renderer，保持离线、主题和打印稳定。
- 坐标轴与网格线使用弱边界色，主体序列使用主题色。
- 坐标轴、类别、目标线和数据标签沿用当前幻灯片的 Label / Body 字体层级，
  根据画布宽度换算，不使用独立的固定大字号。
- 只突出一个关键点或类别，不依赖 hover 或 tooltip 才能理解。
- `bar` 直接显示精确值；`line` 只标注关键点；`donut` 直接显示类别和比例。

## 内容与溢出

- 一页最多两条折线，不使用双轴或组合图。
- 类别标签保持短小；标签过长时改写、筛选或拆页。
- 图表标题先给出判断，图表只负责提供可视证据。

## 验收

- 图表类型与要表达的关系匹配。
- 图表文字明显弱于页面标题和核心观点，且不会与数据线争夺注意力。
- 关键值、单位、周期、来源和目标线无需交互即可阅读。
- 浅色、深色、普通预览和打印状态均保持可读。

实现来源：`renderChart()`、`chart-runtime.js` 与 `.chart-*`。
