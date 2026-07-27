# Diagram Nodes

在内容需要表达层级、依赖、流转或生成关系时读取。

## 使用边界

- 适合由 3–7 个实体组成的单一关系图。
- 每条连线都必须表达真实的依赖、流转或生成关系。
- 普通执行顺序使用 `process`，精确数值关系使用 `chart`。
- 超过 7 个节点、多层嵌套或存在多条交叉主线时拆页或提供局部视图。

## 数据契约

```js
{
  kind: "diagram-nodes",
  direction: "RIGHT",
  nodes: [
    { id: "input", title: "输入", description: "业务资料", role: "input" },
    { id: "core", title: "处理", description: "统一规则", role: "core" },
    { id: "output", title: "输出", description: "稳定页面", role: "output" },
  ],
  edges: [
    { id: "e1", source: "input", target: "core", kind: "default" },
    { id: "e2", source: "core", target: "output", kind: "primary" },
  ],
}
```

- `direction` 仅允许 `RIGHT` 或 `DOWN`。
- 每个节点必须包含全图唯一 `id`、`title`、`description` 和 `role`。
- `role` 仅允许 `input`、`support`、`core` 或 `output`。
- 每条边必须包含唯一 `id`、有效 `source` 与 `target`，且不能自连接。
- 边的 `kind` 仅允许 `default`、`primary` 或 `auxiliary`。
- 页面数据不写死节点坐标。

## 默认视觉行为

- 使用本地 ELK.js 计算分层坐标和正交路径，自定义 SVG renderer 负责视觉。
- 输入与支撑节点保持中性，核心节点使用主题色边界，输出节点使用主题色实心强调。
- 主链路使用主题色实线，普通依赖使用中性色，辅助关系使用低对比虚线。
- 节点保持统一尺寸、圆角、标题和说明层级，不通过任意大小制造重要性。

## 内容与溢出

- 节点标题保持短语，说明保持一行短句。
- 关系过密时删除非关键支线、改为局部图或拆页。
- 不通过缩小全部节点和字体容纳复杂拓扑。

## 验收

- 节点 ID 唯一，所有边端点有效且不存在自连接。
- 自动布局后没有节点重叠，阅读方向明确。
- 角色和边类型具有真实语义，不只是装饰性色彩。
- 浅色、深色和打印状态保持相同关系结构。

实现来源：`renderDiagramNodes()`、`diagram-runtime.js` 与 `.diagram-*`。
