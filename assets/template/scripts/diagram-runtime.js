(() => {
	const SVG_NS = "http://www.w3.org/2000/svg";
	const deck = window.HTML_SLIDES_DECK;
	const elk = window.ELK ? new window.ELK() : null;
	let renderSequence = 0;

	function svgElement(tagName, attributes = {}) {
		const element = document.createElementNS(SVG_NS, tagName);
		for (const [name, value] of Object.entries(attributes)) {
			element.setAttribute(name, String(value));
		}
		return element;
	}

	function architectureGraph(slide) {
		const graph = slide.component;
		const direction = ["RIGHT", "DOWN"].includes(graph.direction)
			? graph.direction
			: "RIGHT";
		return {
			id: `${slide.id}-root`,
			layoutOptions: {
				"elk.algorithm": "layered",
				"elk.direction": direction,
				"elk.edgeRouting": "ORTHOGONAL",
				"elk.padding": "[top=24,left=24,bottom=24,right=24]",
				"elk.spacing.nodeNode": "36",
				"elk.layered.spacing.nodeNodeBetweenLayers": "76",
				"elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
			},
			children: graph.nodes.map((node) => ({
				id: node.id,
				width: node.width || 190,
				height: node.height || 64,
			})),
			edges: graph.edges.map((edge) => ({
				id: edge.id,
				sources: [edge.source],
				targets: [edge.target],
			})),
		};
	}

	function pointDistance(first, second) {
		return Math.hypot(second.x - first.x, second.y - first.y);
	}

	function pointToward(origin, target, distance) {
		const totalDistance = pointDistance(origin, target);
		if (!totalDistance) return origin;
		const ratio = distance / totalDistance;
		return {
			x: origin.x + (target.x - origin.x) * ratio,
			y: origin.y + (target.y - origin.y) * ratio,
		};
	}

	function edgePath(section) {
		const points = [
			section.startPoint,
			...(section.bendPoints || []),
			section.endPoint,
		];
		if (points.length < 3) {
			return points
				.map(
					(point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`,
				)
				.join(" ");
		}

		const commands = [`M ${points[0].x} ${points[0].y}`];
		for (let index = 1; index < points.length - 1; index += 1) {
			const previous = points[index - 1];
			const current = points[index];
			const next = points[index + 1];
			const radius = Math.min(
				10,
				pointDistance(previous, current) / 2,
				pointDistance(current, next) / 2,
			);
			const beforeCorner = pointToward(current, previous, radius);
			const afterCorner = pointToward(current, next, radius);
			commands.push(
				`L ${beforeCorner.x} ${beforeCorner.y}`,
				`Q ${current.x} ${current.y} ${afterCorner.x} ${afterCorner.y}`,
			);
		}
		const lastPoint = points.at(-1);
		commands.push(`L ${lastPoint.x} ${lastPoint.y}`);
		return commands.join(" ");
	}

	function appendMarker(defs, markerId, kind) {
		const marker = svgElement("marker", {
			id: markerId,
			viewBox: "0 0 8 8",
			refX: 7.2,
			refY: 4,
			markerWidth: 6,
			markerHeight: 6,
			orient: "auto-start-reverse",
			class: `architecture-arrow is-${kind}`,
		});
		marker.append(svgElement("path", { d: "M 0 0 L 8 4 L 0 8 Z" }));
		defs.append(marker);
	}

	function appendMarkers(svg, markerIds) {
		const defs = svgElement("defs");
		for (const [kind, markerId] of Object.entries(markerIds)) {
			appendMarker(defs, markerId, kind);
		}
		svg.append(defs);
	}

	function appendEdges(svg, graph, slide, markerIds) {
		const edgeData = new Map(
			slide.component.edges.map((edge) => [edge.id, edge]),
		);
		const weight = { auxiliary: 0, default: 1, primary: 2 };
		const orderedEdges = [...(graph.edges || [])].sort((first, second) => {
			const firstKind = edgeData.get(first.id)?.kind || "default";
			const secondKind = edgeData.get(second.id)?.kind || "default";
			return weight[firstKind] - weight[secondKind];
		});
		const group = svgElement("g", { class: "architecture-svg-edges" });
		for (const edge of orderedEdges) {
			const kind = edgeData.get(edge.id)?.kind || "default";
			for (const section of edge.sections || []) {
				group.append(
					svgElement("path", {
						class: `architecture-svg-edge is-${kind}`,
						d: edgePath(section),
						"marker-end": `url(#${markerIds[kind]})`,
					}),
				);
			}
		}
		svg.append(group);
	}

	function appendNodes(svg, graph, slide) {
		const nodeData = new Map(
			slide.component.nodes.map((node) => [node.id, node]),
		);
		const group = svgElement("g", { class: "architecture-svg-nodes" });
		for (const layoutNode of graph.children || []) {
			const node = nodeData.get(layoutNode.id);
			if (!node) continue;
			const nodeGroup = svgElement("g", {
				class: `architecture-svg-node is-${node.role || "support"}`,
				transform: `translate(${layoutNode.x} ${layoutNode.y})`,
			});
			nodeGroup.append(
				svgElement("rect", {
					width: layoutNode.width,
					height: layoutNode.height,
					rx: 14,
				}),
			);

			const title = svgElement("text", {
				class: "architecture-svg-title",
				x: 16,
				y: 26,
			});
			title.textContent = node.title;
			nodeGroup.append(title);

			const description = svgElement("text", {
				class: "architecture-svg-description",
				x: 16,
				y: 47,
			});
			description.textContent = node.description;
			nodeGroup.append(description);
			group.append(nodeGroup);
		}
		svg.append(group);
	}

	async function renderDiagram(container) {
		if (!elk) {
			container.dataset.state = "error";
			container.textContent = "ELK.js 未加载，无法计算架构布局。";
			return;
		}
		const slide = deck.find(
			(item) => item.id === container.dataset.architectureId,
		);
		if (slide?.component?.kind !== "diagram-nodes") return;

		try {
			const graph = await elk.layout(architectureGraph(slide));
			if (!container.isConnected) return;
			const sequence = renderSequence++;
			const markerIds = {
				default: `architecture-arrow-default-${sequence}`,
				primary: `architecture-arrow-primary-${sequence}`,
				auxiliary: `architecture-arrow-auxiliary-${sequence}`,
			};
			const svg = svgElement("svg", {
				class: "architecture-svg",
				viewBox: `0 0 ${graph.width} ${graph.height}`,
				role: "img",
				"aria-label": slide.statement,
				preserveAspectRatio: "xMidYMid meet",
			});
			appendMarkers(svg, markerIds);
			appendEdges(svg, graph, slide, markerIds);
			appendNodes(svg, graph, slide);
			container.replaceChildren(svg);
			container.dataset.state = "ready";
		} catch (error) {
			container.dataset.state = "error";
			container.textContent = `架构布局失败：${error.message}`;
		}
	}

	window.HtmlSlidesDiagrams = {
		renderAll(root = document) {
			return Promise.all(
				[...root.querySelectorAll(".architecture-diagram")].map(renderDiagram),
			);
		},
	};
})();
