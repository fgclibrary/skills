# Comparison

在双方可以沿共同维度对应，且页面需要明确突出差异方向时读取。

## 使用边界

- 适合两个对象在 2–4 个共同维度下的一一比较。
- 不用于两段独立介绍、普通并列主题或没有共同维度的方案陈述。
- 需要精确比较多列数值时使用 `table`。
- 只需要解释一组术语时使用 `indexed-grid` 或 `table`，不建立概念专用组件。

## 数据契约

```js
{
  kind: "comparison",
  direction: "forward",
  left: { label: "BEFORE", title: "原有方式" },
  right: { label: "AFTER", title: "目标方式" },
  items: [
    {
      dimension: "比较维度",
      leftValue: "左侧表现",
      rightValue: "右侧结论",
      rightDescription: "一句必要的解释。",
    },
  ],
}
```

- `direction` 仅允许 `forward` 或 `neutral`。
- `left`、`right` 都必须提供简短 `label` 和 `title`。
- `items` 为必需字段，每项同时包含 `dimension`、`leftValue`、`rightValue` 和 `rightDescription`。
- 每个 `dimension` 在当前页面内唯一，并使用短名词。

## 默认视觉行为

- `forward` 使用约 35% / 65% 的非对称结构：左侧弱化，右侧成为视觉主体。
- 左侧用轻量列表呈现旧状态，右侧用编号、结论和说明展开目标状态。
- 两侧标题组从主体区域顶部对齐，不因两侧内容长度不同而整体垂直居中。
- 左侧完整列表组在标题下方的剩余区域垂直居中，项目符号与对应正文垂直居中。
- 两侧使用一条竖向弱分隔线，不绘制表格网格，也不使用对称卡片。
- `neutral` 才使用等宽两侧，但仍保留面板层级而不是表格行。
- 不用红绿颜色暗示好坏；方向由面积、字重和内容密度建立。
- `dimension` 只用于数据层保证左右对应，不在两侧重复显示 eyebrow。
- 右侧编号直接与结论标题垂直居中，说明与标题共享左边缘。

## 内容与溢出

- 默认 2–4 项，最佳为 3 项。
- 左侧 `leftValue` 保持一句；右侧结论与说明各保持一到两行。
- 某一项需要长篇解释时拆成连续页面，不压缩两侧比例。

## 验收

- 每一行都能回答同一个比较维度。
- 左右项目数量和顺序完全一致。
- `forward` 能一眼看出旧状态与目标状态的主次，不会被误读为表格。
- 两侧顶部标题对齐，两侧列表均无 dimension eyebrow；左侧项目符号与正文垂直居中，右侧每项编号与标题对齐。
- 长标签和不同长度的内容不会造成溢出。

实现来源：`renderComparison()`、`.comparison` 与 `.comparison-*`。
