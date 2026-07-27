# Media Surface

在页面需要直接展示一张图片、一段横向视频或手机竖版素材时读取。

## 使用边界

- 用于图片、产品截图、本地演示视频和手机录屏。
- 媒体对象本身是主要内容时，和 `content` Page Type 组合。
- 媒体需要配合一组观看说明时，使用 `evidence` Page Type；Evidence 复用同一媒体表面。
- 图表和表格继续使用各自的语义组件，不导出成图片冒充媒体。
- 真实演示页通常只使用一个主媒体；两个媒体并列只用于比例对照或确有必要的同步比较。

## 数据契约

```js
{
  kind: "media-surface",
  items: [
    {
      kind: "video",
      ratio: "9:16",
      src: "./assets/videos/mobile-demo.mp4",
      poster: "./assets/images/mobile-demo-poster.png",
      fit: "contain",
      caption: "手机端操作演示",
      source: "内部产品录屏",
    },
  ],
}
```

- `items` 包含 1–2 个媒体对象。
- 媒体 `kind` 仅允许 `image` 或 `video`。
- `ratio` 仅允许 `16:9`、`3:4` 或 `9:16`。
- `fit` 仅允许 `contain` 或 `cover`，默认使用 `contain`。
- 图片必须提供有意义的 `alt`。
- 视频必须提供本地 `src` 和 `poster`，以保证离线播放和 PDF 打印。
- `caption` 与 `source` 可选；证据型素材应提供来源。

## 默认视觉行为

- 横向媒体使用 `16:9`，人物照片和常规纵向截图使用 `3:4`，手机录屏使用 `9:16`。
- 外框跟随素材比例变化，不把竖版素材嵌入固定的横向画框。
- `contain` 保留完整界面；只有允许裁切时才使用 `cover`。
- 视频使用原生 controls、`preload="metadata"` 和 `playsinline`，不自动播放。
- 字幕和来源紧邻媒体底部，不覆盖画面。
- 不叠加装饰性设备外壳、播放按钮或渐变遮罩。

## 打印

- 视频本身不进入 PDF。
- 打印视图隐藏 `<video>`，在相同媒体表面中显示 `poster`。
- Poster 应能独立说明视频内容，不能只使用纯色占位。

## 验收

- 横向与竖向素材保持真实比例，没有拉伸。
- 视频可由演讲者主动播放，切页键不会抢占聚焦视频的空格键。
- 9:16 素材在 16:9 Slide 中作为竖版媒体呈现，而不是改变整套演示画布。
- 深浅主题下边界和字幕清晰。
- PDF 中显示 poster，且尺寸与演示模式中的视频表面一致。

实现来源：`renderMediaItem()`、`renderMediaSurface()`、`.content-media-*` 与
`styles/print.css`。
