(() => {
	const deck = window.HTML_SLIDES_DECK;
	const renderers = window.HtmlSlidesRenderers;
	const chartInstances = new WeakMap();
	const resizeObservers = new WeakMap();
	const fontFamily = '"Geist", "PingFang SC", sans-serif';

	function clamp(value, min, max) {
		return Math.min(max, Math.max(min, value));
	}

	function linearToSrgb(value) {
		const normalized =
			value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
		return Math.round(clamp(normalized, 0, 1) * 255);
	}

	function oklchToRgb(color) {
		const match = color.match(
			/^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?(?:\s*\/\s*([\d.]+%?))?\s*\)$/i,
		);
		if (!match) return color;

		const lightness = match[1].endsWith("%")
			? Number.parseFloat(match[1]) / 100
			: Number.parseFloat(match[1]);
		const chroma = Number.parseFloat(match[2]);
		const hue = (Number.parseFloat(match[3]) * Math.PI) / 180;
		const alpha = match[4]
			? match[4].endsWith("%")
				? Number.parseFloat(match[4]) / 100
				: Number.parseFloat(match[4])
			: 1;
		const a = chroma * Math.cos(hue);
		const b = chroma * Math.sin(hue);
		const lRoot = lightness + 0.3963377774 * a + 0.2158037573 * b;
		const mRoot = lightness - 0.1055613458 * a - 0.0638541728 * b;
		const sRoot = lightness - 0.0894841775 * a - 1.291485548 * b;
		const l = lRoot ** 3;
		const m = mRoot ** 3;
		const s = sRoot ** 3;
		const red = linearToSrgb(
			4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		);
		const green = linearToSrgb(
			-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		);
		const blue = linearToSrgb(
			-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
		);

		return alpha < 1
			? `rgba(${red}, ${green}, ${blue}, ${clamp(alpha, 0, 1)})`
			: `rgb(${red}, ${green}, ${blue})`;
	}

	function tokenColor(name) {
		const value = getComputedStyle(document.documentElement)
			.getPropertyValue(name)
			.trim();
		return oklchToRgb(value);
	}

	function themeColors() {
		return {
			background: tokenColor("--background"),
			foreground: tokenColor("--foreground"),
			muted: tokenColor("--muted-foreground"),
			border: tokenColor("--border"),
			primary: tokenColor("--primary"),
			destructive: tokenColor("--negative"),
			secondary: tokenColor("--chart-1"),
			chart: [1, 2, 3, 4, 5].map((index) => tokenColor(`--chart-${index}`)),
		};
	}

	function chartTypography(container) {
		const slideWidth =
			container.closest(".slide")?.getBoundingClientRect().width ||
			container.getBoundingClientRect().width ||
			1280;
		const cqw = slideWidth / 100;
		return {
			label: clamp(cqw * 0.82, 9.5, 13),
			category: clamp(cqw * 0.92, 10.5, 14.5),
			emphasis: clamp(cqw * 1.12, 13, 18),
			donutName: clamp(cqw * 0.92, 10.5, 14.5),
			donutValue: clamp(cqw * 0.8, 9.5, 12.5),
			donutNameLine: clamp(cqw * 1.35, 16, 21),
			donutValueLine: clamp(cqw * 1.12, 14, 18),
		};
	}

	function chartFromSlide(slide) {
		const chart = slide?.component;
		if (!chart || chart.kind !== "chart") {
			throw new Error("Chart slide requires component.kind: chart.");
		}
		if (!renderers?.validateComponent) {
			throw new Error("HTML Slides component validator is unavailable.");
		}
		renderers.validateComponent(chart, `slide ${slide.id}.component`);
		return chart;
	}

	function sentimentColor(sentiment, colors) {
		if (sentiment === "positive") return colors.primary;
		if (sentiment === "negative") return colors.destructive;
		return colors.foreground;
	}

	function benchmarkLine(chart, colors, typography) {
		if (!chart.benchmark) return undefined;
		return {
			silent: true,
			symbol: "none",
			lineStyle: {
				color: colors.muted,
				type: "dashed",
				width: 1.5,
			},
			label: {
				show: true,
				formatter: chart.benchmark.label,
				color: colors.muted,
				fontFamily,
				fontSize: typography.label,
				position: "insideEndTop",
			},
			data: [{ yAxis: chart.benchmark.value }],
		};
	}

	function baseOption(colors) {
		return {
			animation: false,
			backgroundColor: "transparent",
			textStyle: { color: colors.foreground, fontFamily },
			tooltip: { show: false },
		};
	}

	function lineOption(chart, colors, typography) {
		const unit = chart.unit || "";
		const palette = [colors.primary, colors.secondary];
		return {
			...baseOption(colors),
			grid: { left: 62, right: 40, top: 34, bottom: 48 },
			xAxis: {
				type: "category",
				boundaryGap: false,
				data: chart.categories,
				axisTick: { show: false },
				axisLine: { lineStyle: { color: colors.border } },
				axisLabel: {
					color: colors.muted,
					fontFamily,
					fontSize: typography.category,
					margin: 16,
				},
			},
			yAxis: {
				type: "value",
				min: chart.axis.min,
				max: chart.axis.max,
				axisTick: { show: false },
				axisLine: { show: false },
				axisLabel: {
					color: colors.muted,
					fontFamily,
					fontSize: typography.label,
					formatter: `{value}${unit}`,
				},
				splitLine: { lineStyle: { color: colors.border, width: 1 } },
			},
			series: chart.series.map((series, seriesIndex) => ({
				name: series.name,
				type: "line",
				smooth: 0.25,
				showSymbol: true,
				symbol: "circle",
				symbolSize: 9,
				data: series.values.map((value, dataIndex) => ({
					value,
					symbolSize: dataIndex === chart.highlightIndex ? 14 : 9,
					itemStyle: {
						color:
							dataIndex === chart.highlightIndex
								? sentimentColor(chart.highlightSentiment, colors)
								: palette[seriesIndex],
					},
				})),
				lineStyle: { color: palette[seriesIndex], width: 4 },
				itemStyle: { color: palette[seriesIndex] },
				label: {
					show: true,
					position: "top",
					distance: 12,
					color: sentimentColor(chart.highlightSentiment, colors),
					fontFamily,
					fontSize: typography.emphasis,
					fontWeight: 650,
					formatter: (params) =>
						params.dataIndex === chart.highlightIndex
							? `${params.value}${unit}`
							: "",
				},
				markLine:
					seriesIndex === 0
						? benchmarkLine(chart, colors, typography)
						: undefined,
			})),
		};
	}

	function barOption(chart, colors, typography) {
		const unit = chart.unit || "";
		const markLine = benchmarkLine(chart, colors, typography);
		if (markLine) {
			markLine.data = [{ xAxis: chart.benchmark.value }];
			markLine.label.position = "insideEndTop";
		}
		const emphasis = sentimentColor(chart.highlightSentiment, colors);
		return {
			...baseOption(colors),
			grid: { left: 90, right: 70, top: 30, bottom: 44 },
			xAxis: {
				type: "value",
				min: chart.axis.min,
				max: chart.axis.max,
				axisTick: { show: false },
				axisLine: { lineStyle: { color: colors.border } },
				axisLabel: {
					color: colors.muted,
					fontFamily,
					fontSize: typography.label,
					formatter: `{value}${unit}`,
				},
				splitLine: { lineStyle: { color: colors.border, width: 1 } },
			},
			yAxis: {
				type: "category",
				inverse: true,
				data: chart.categories,
				axisTick: { show: false },
				axisLine: { show: false },
				axisLabel: {
					color: colors.foreground,
					fontFamily,
					fontSize: typography.category,
					fontWeight: 600,
					margin: 18,
				},
			},
			series: [
				{
					name: chart.series[0].name,
					type: "bar",
					barWidth: 30,
					data: chart.series[0].values.map((value, index) => ({
						value,
						itemStyle: {
							color:
								index === chart.highlightIndex ? emphasis : colors.secondary,
							borderRadius: [0, 5, 5, 0],
						},
					})),
					label: {
						show: true,
						position: "right",
						distance: 12,
						color: colors.foreground,
						fontFamily,
						fontSize: typography.emphasis,
						fontWeight: 650,
						formatter: ({ value }) => `${value}${unit}`,
					},
					markLine,
				},
			],
		};
	}

	function pieOption(chart, colors, typography) {
		const values = chart.series[0].values;
		const emphasis = sentimentColor(chart.highlightSentiment, colors);
		const palette = [...colors.chart];
		palette[chart.highlightIndex] = emphasis;

		return {
			...baseOption(colors),
			color: palette,
			series: [
				{
					name: chart.series[0].name,
					type: "pie",
					radius: ["42%", "68%"],
					center: ["50%", "49%"],
					startAngle: 90,
					minAngle: 4,
					avoidLabelOverlap: true,
					stillShowZeroSum: false,
					percentPrecision: 1,
					data: chart.categories.map((name, index) => ({
						name,
						value: values[index],
						itemStyle: {
							color: palette[index],
							borderColor: colors.background,
							borderWidth: 4,
							borderRadius: 4,
						},
					})),
					label: {
						show: true,
						formatter: "{name|{b}}\n{value|{d}%}",
						rich: {
							name: {
								color: colors.foreground,
								fontFamily,
								fontSize: typography.donutName,
								fontWeight: 600,
								lineHeight: typography.donutNameLine,
							},
							value: {
								color: colors.muted,
								fontFamily,
								fontSize: typography.donutValue,
								fontWeight: 550,
								lineHeight: typography.donutValueLine,
							},
						},
					},
					labelLine: {
						show: true,
						length: 22,
						length2: 34,
						lineStyle: { color: colors.border, width: 1.5 },
					},
					emphasis: { scale: false },
				},
			],
		};
	}

	function optionFor(slide, container) {
		const chart = chartFromSlide(slide);
		const colors = themeColors();
		const typography = chartTypography(container);
		if (chart.variant === "line") return lineOption(chart, colors, typography);
		if (chart.variant === "bar") return barOption(chart, colors, typography);
		return pieOption(chart, colors, typography);
	}

	function disposeChart(container) {
		resizeObservers.get(container)?.disconnect();
		resizeObservers.delete(container);
		const instance =
			chartInstances.get(container) ||
			window.echarts?.getInstanceByDom(container);
		instance?.dispose();
		chartInstances.delete(container);
	}

	function showError(container, message) {
		container.innerHTML = `<p class="chart-error">${message}</p>`;
		container.dataset.chartState = "error";
	}

	function renderChart(container) {
		if (!window.echarts) {
			showError(container, "图表依赖未加载");
			return;
		}
		const slide = deck.find((item) => item.id === container.dataset.chartId);
		if (!slide) {
			showError(container, "未找到图表数据");
			return;
		}

		try {
			disposeChart(container);
			container.replaceChildren();
			const instance = window.echarts.init(container, null, {
				renderer: "svg",
			});
			instance.setOption(optionFor(slide, container), true);
			chartInstances.set(container, instance);
			if (window.ResizeObserver) {
				const observer = new ResizeObserver(() => {
					instance.resize();
					instance.setOption(optionFor(slide, container), true);
				});
				observer.observe(container);
				resizeObservers.set(container, observer);
			}
			container.dataset.chartState = "ready";
		} catch (error) {
			console.error(error);
			disposeChart(container);
			showError(container, "图表数据不符合组件契约");
		}
	}

	function renderAll(root = document) {
		root.querySelectorAll("[data-chart-id]").forEach(renderChart);
	}

	function disposeAll(root = document) {
		root.querySelectorAll("[data-chart-id]").forEach(disposeChart);
	}

	window.HtmlSlidesCharts = { disposeAll, renderAll };
})();
