(() => {
  const config = window.HTML_SLIDES_CONFIG || {};

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function safeClass(value) {
    return String(value ?? "").replace(/[^a-z0-9_-]/gi, "");
  }

  function fail(path, message) {
    throw new Error(`${path}: ${message}`);
  }

  function requireObject(value, path) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      fail(path, "must be an object.");
    }
    return value;
  }

  function requireString(value, path) {
    if (typeof value !== "string" || value.trim() === "") {
      fail(path, "must be a non-empty string.");
    }
    return value;
  }

  function optionalString(value, path) {
    if (value !== undefined && value !== null) requireString(value, path);
  }

  function requireArray(value, path, min, max) {
    if (!Array.isArray(value)) fail(path, "must be an array.");
    if (value.length < min) {
      fail(path, `must contain at least ${min} item${min === 1 ? "" : "s"}; received ${value.length}.`);
    }
    if (max !== undefined && value.length > max) {
      fail(path, `must contain ${min}–${max} items; received ${value.length}.`);
    }
    return value;
  }

  function requireEnum(value, allowed, path) {
    if (!allowed.includes(value)) {
      fail(path, `must be one of ${allowed.join(", ")}; received ${String(value)}.`);
    }
    return value;
  }

  function requireFiniteNumber(value, path) {
    if (!Number.isFinite(value)) fail(path, "must be a finite number.");
    return value;
  }

  function requireInteger(value, path, min, max) {
    if (!Number.isInteger(value) || value < min || value > max) {
      fail(path, `must be an integer from ${min} to ${max}; received ${String(value)}.`);
    }
    return value;
  }

  function requireUniqueStrings(items, key, path) {
    const values = new Set();
    items.forEach((item, index) => {
      const value = requireString(item?.[key], `${path}[${index}].${key}`);
      if (values.has(value)) {
        fail(`${path}[${index}].${key}`, `must be unique; duplicate "${value}".`);
      }
      values.add(value);
    });
    return values;
  }

  function requireDisplayValue(value, path) {
    if (
      !["string", "number", "boolean"].includes(typeof value) ||
      (typeof value === "number" && !Number.isFinite(value))
    ) {
      fail(path, "must be displayable text, a finite number, or a boolean.");
    }
  }

  const dayMilliseconds = 24 * 60 * 60 * 1000;

  function parseIsoDate(value, path) {
    requireString(value, path);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      fail(path, "must use YYYY-MM-DD.");
    }
    const [year, month, day] = value.split("-").map(Number);
    const timestamp = Date.UTC(year, month - 1, day);
    const parsed = new Date(timestamp);
    if (
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() !== month - 1 ||
      parsed.getUTCDate() !== day
    ) {
      fail(path, `must be a valid calendar date; received ${value}.`);
    }
    return timestamp;
  }

  function validateMediaItem(media, path = "media") {
    requireObject(media, path);
    const kind = media.kind || "image";
    requireEnum(kind, ["image", "video"], `${path}.kind`);
    requireEnum(media.ratio || "16:9", ["16:9", "3:4", "9:16"], `${path}.ratio`);
    requireEnum(media.fit || "contain", ["contain", "cover"], `${path}.fit`);
    requireString(media.src, `${path}.src`);
    optionalString(media.caption, `${path}.caption`);
    optionalString(media.source, `${path}.source`);
    if (kind === "image") requireString(media.alt, `${path}.alt`);
    if (kind === "video") requireString(media.poster, `${path}.poster`);
    return media;
  }

  function validateIndexedGrid(component, path) {
    requireInteger(component.columns ?? 2, `${path}.columns`, 1, 3);
    const items = requireArray(component.items, `${path}.items`, 2, 6);
    items.forEach((item, index) => {
      requireObject(item, `${path}.items[${index}]`);
      requireString(item.index, `${path}.items[${index}].index`);
      requireString(item.title, `${path}.items[${index}].title`);
      requireString(item.description, `${path}.items[${index}].description`);
    });
  }

  function validateMetrics(component, path) {
    const items = requireArray(component.items, `${path}.items`, 1, 4);
    items.forEach((item, index) => {
      requireObject(item, `${path}.items[${index}]`);
      requireString(item.value, `${path}.items[${index}].value`);
      requireString(item.label, `${path}.items[${index}].label`);
      optionalString(item.unit, `${path}.items[${index}].unit`);
      optionalString(item.description, `${path}.items[${index}].description`);
      optionalString(item.meta, `${path}.items[${index}].meta`);
    });
  }

  function validateTable(component, path) {
    const columns = requireArray(component.columns, `${path}.columns`, 1, 4);
    const columnKeys = requireUniqueStrings(columns, "key", `${path}.columns`);
    columns.forEach((column, index) => {
      requireObject(column, `${path}.columns[${index}]`);
      requireString(column.label, `${path}.columns[${index}].label`);
      if (column.numeric !== undefined && typeof column.numeric !== "boolean") {
        fail(`${path}.columns[${index}].numeric`, "must be a boolean.");
      }
    });
    const rows = requireArray(component.rows, `${path}.rows`, 1, 6);
    rows.forEach((row, rowIndex) => {
      requireObject(row, `${path}.rows[${rowIndex}]`);
      for (const key of columnKeys) {
        if (!Object.prototype.hasOwnProperty.call(row, key)) {
          fail(`${path}.rows[${rowIndex}].${key}`, "is required by the column contract.");
        }
        requireDisplayValue(row[key], `${path}.rows[${rowIndex}].${key}`);
      }
      if (row.summary !== undefined && typeof row.summary !== "boolean") {
        fail(`${path}.rows[${rowIndex}].summary`, "must be a boolean.");
      }
    });
  }

  function validateProcess(component, path) {
    const steps = requireArray(component.steps, `${path}.steps`, 3, 5);
    steps.forEach((step, index) => {
      requireObject(step, `${path}.steps[${index}]`);
      requireString(step.index, `${path}.steps[${index}].index`);
      requireString(step.title, `${path}.steps[${index}].title`);
      requireString(step.description, `${path}.steps[${index}].description`);
      requireEnum(
        step.state || "upcoming",
        ["complete", "current", "upcoming"],
        `${path}.steps[${index}].state`,
      );
    });
  }

  function validateChart(component, path) {
    const variant = requireEnum(
      component.variant,
      ["line", "bar", "donut"],
      `${path}.variant`,
    );
    const categoryMax = variant === "donut" ? 6 : variant === "bar" ? 8 : 12;
    const categoryMin = variant === "line" ? 4 : 2;
    const categories = requireArray(
      component.categories,
      `${path}.categories`,
      categoryMin,
      categoryMax,
    );
    categories.forEach((category, index) =>
      requireString(category, `${path}.categories[${index}]`),
    );
    const series = requireArray(component.series, `${path}.series`, 1, 2);
    if (variant !== "line" && series.length !== 1) {
      fail(`${path}.series`, `${variant} charts require exactly one series.`);
    }
    series.forEach((item, seriesIndex) => {
      requireObject(item, `${path}.series[${seriesIndex}]`);
      requireString(item.name, `${path}.series[${seriesIndex}].name`);
      const values = requireArray(
        item.values,
        `${path}.series[${seriesIndex}].values`,
        categories.length,
        categories.length,
      );
      values.forEach((value, valueIndex) =>
        requireFiniteNumber(
          value,
          `${path}.series[${seriesIndex}].values[${valueIndex}]`,
        ),
      );
    });
    requireString(component.unit, `${path}.unit`);
    requireString(component.period, `${path}.period`);
    requireString(component.source, `${path}.source`);
    requireInteger(
      component.highlightIndex,
      `${path}.highlightIndex`,
      0,
      categories.length - 1,
    );
    requireEnum(
      component.highlightSentiment,
      ["positive", "negative", "neutral"],
      `${path}.highlightSentiment`,
    );
    if (variant === "donut") {
      const values = series[0].values;
      if (values.some((value) => value < 0) || values.reduce((a, b) => a + b, 0) <= 0) {
        fail(`${path}.series[0].values`, "donut values must be non-negative with a positive total.");
      }
      if (component.benchmark !== undefined) {
        fail(`${path}.benchmark`, "is not supported by donut charts.");
      }
    } else {
      requireObject(component.axis, `${path}.axis`);
      const min = requireFiniteNumber(component.axis.min, `${path}.axis.min`);
      const max = requireFiniteNumber(component.axis.max, `${path}.axis.max`);
      if (min >= max) fail(`${path}.axis`, "min must be lower than max.");
      if (component.benchmark !== undefined) {
        requireObject(component.benchmark, `${path}.benchmark`);
        requireFiniteNumber(component.benchmark.value, `${path}.benchmark.value`);
        requireString(component.benchmark.label, `${path}.benchmark.label`);
      }
    }
  }

  function validateGantt(component, path) {
    optionalString(component.taskLabel, `${path}.taskLabel`);
    optionalString(component.ownerLabel, `${path}.ownerLabel`);
    requireString(component.period, `${path}.period`);
    requireString(component.source, `${path}.source`);

    const columns = requireArray(component.columns, `${path}.columns`, 3, 6);
    requireUniqueStrings(columns, "id", `${path}.columns`);
    let previousEnd;
    columns.forEach((column, index) => {
      const columnPath = `${path}.columns[${index}]`;
      requireObject(column, columnPath);
      requireString(column.label, `${columnPath}.label`);
      const start = parseIsoDate(column.start, `${columnPath}.start`);
      const end = parseIsoDate(column.end, `${columnPath}.end`);
      if (start > end) fail(columnPath, "start must not be later than end.");
      if (previousEnd !== undefined && start !== previousEnd + dayMilliseconds) {
        fail(
          `${columnPath}.start`,
          "columns must be chronological, non-overlapping, and date-contiguous.",
        );
      }
      previousEnd = end;
    });

    const rangeStart = parseIsoDate(columns[0].start, `${path}.columns[0].start`);
    const rangeEnd = parseIsoDate(
      columns.at(-1).end,
      `${path}.columns[${columns.length - 1}].end`,
    );
    const items = requireArray(component.items, `${path}.items`, 3, 8);
    items.forEach((item, index) => {
      const itemPath = `${path}.items[${index}]`;
      requireObject(item, itemPath);
      requireString(item.title, `${itemPath}.title`);
      requireString(item.owner, `${itemPath}.owner`);
      requireObject(item.timing, `${itemPath}.timing`);
      const kind = requireEnum(
        item.timing.kind,
        ["execution", "milestone", "dependency"],
        `${itemPath}.timing.kind`,
      );
      if (kind === "milestone") {
        const date = parseIsoDate(item.timing.date, `${itemPath}.timing.date`);
        if (date < rangeStart || date > rangeEnd) {
          fail(`${itemPath}.timing.date`, "must fall within the declared columns.");
        }
        if (item.timing.start !== undefined || item.timing.end !== undefined) {
          fail(`${itemPath}.timing`, "milestones only accept date.");
        }
      } else {
        const start = parseIsoDate(item.timing.start, `${itemPath}.timing.start`);
        const end = parseIsoDate(item.timing.end, `${itemPath}.timing.end`);
        if (start > end) {
          fail(`${itemPath}.timing`, "start must not be later than end.");
        }
        if (start < rangeStart || end > rangeEnd) {
          fail(`${itemPath}.timing`, "must fall within the declared columns.");
        }
        if (item.timing.date !== undefined) {
          fail(`${itemPath}.timing`, `${kind} only accepts start and end.`);
        }
      }
    });
  }

  function validateDiagramNodes(component, path) {
    requireEnum(component.direction, ["RIGHT", "DOWN"], `${path}.direction`);
    const nodes = requireArray(component.nodes, `${path}.nodes`, 3, 7);
    const nodeIds = requireUniqueStrings(nodes, "id", `${path}.nodes`);
    nodes.forEach((node, index) => {
      requireObject(node, `${path}.nodes[${index}]`);
      requireString(node.title, `${path}.nodes[${index}].title`);
      requireString(node.description, `${path}.nodes[${index}].description`);
      requireEnum(
        node.role,
        ["input", "support", "core", "output"],
        `${path}.nodes[${index}].role`,
      );
    });
    const edges = requireArray(component.edges, `${path}.edges`, 2);
    requireUniqueStrings(edges, "id", `${path}.edges`);
    edges.forEach((edge, index) => {
      requireObject(edge, `${path}.edges[${index}]`);
      requireString(edge.source, `${path}.edges[${index}].source`);
      requireString(edge.target, `${path}.edges[${index}].target`);
      if (!nodeIds.has(edge.source)) {
        fail(`${path}.edges[${index}].source`, `references unknown node "${edge.source}".`);
      }
      if (!nodeIds.has(edge.target)) {
        fail(`${path}.edges[${index}].target`, `references unknown node "${edge.target}".`);
      }
      if (edge.source === edge.target) {
        fail(`${path}.edges[${index}]`, "cannot connect a node to itself.");
      }
      requireEnum(
        edge.kind || "default",
        ["default", "primary", "auxiliary"],
        `${path}.edges[${index}].kind`,
      );
    });
  }

  function validateComparison(component, path) {
    requireEnum(component.direction, ["forward", "neutral"], `${path}.direction`);
    ["left", "right"].forEach((side) => {
      requireObject(component[side], `${path}.${side}`);
      requireString(component[side].label, `${path}.${side}.label`);
      requireString(component[side].title, `${path}.${side}.title`);
    });
    const items = requireArray(component.items, `${path}.items`, 2, 4);
    requireUniqueStrings(items, "dimension", `${path}.items`);
    items.forEach((item, index) => {
      requireObject(item, `${path}.items[${index}]`);
      requireString(item.leftValue, `${path}.items[${index}].leftValue`);
      requireString(item.rightValue, `${path}.items[${index}].rightValue`);
      requireString(
        item.rightDescription,
        `${path}.items[${index}].rightDescription`,
      );
    });
  }

  function validateMediaSurface(component, path) {
    const items = requireArray(component.items, `${path}.items`, 1, 2);
    items.forEach((item, index) =>
      validateMediaItem(item, `${path}.items[${index}]`),
    );
  }

  function validateCallout(component, path) {
    requireEnum(component.tone || "accent", ["accent", "neutral"], `${path}.tone`);
    requireString(component.message, `${path}.message`);
    optionalString(component.label, `${path}.label`);
    optionalString(component.description, `${path}.description`);
    optionalString(component.source, `${path}.source`);
  }

  const componentValidators = {
    "indexed-grid": validateIndexedGrid,
    metrics: validateMetrics,
    table: validateTable,
    process: validateProcess,
    chart: validateChart,
    gantt: validateGantt,
    "diagram-nodes": validateDiagramNodes,
    comparison: validateComparison,
    "media-surface": validateMediaSurface,
    callout: validateCallout,
  };

  function validateComponent(component, path = "component") {
    requireObject(component, path);
    requireString(component.kind, `${path}.kind`);
    const validator = componentValidators[component.kind];
    if (!validator) fail(`${path}.kind`, `unsupported component "${component.kind}".`);
    validator(component, path);
    return component;
  }

  function validateNotes(notes, path) {
    const items = requireArray(notes, path, 1);
    items.forEach((note, index) => requireString(note, `${path}[${index}]`));
  }

  function validateSlide(slide, path = "slide") {
    requireObject(slide, path);
    requireString(slide.id, `${path}.id`);
    const type = requireEnum(
      slide.type,
      ["cover", "section", "content", "evidence", "summary"],
      `${path}.type`,
    );
    validateNotes(slide.notes, `${path}.notes`);

    if (type === "cover") {
      requireString(slide.title, `${path}.title`);
      requireString(slide.subtitle, `${path}.subtitle`);
      const meta = requireArray(slide.meta, `${path}.meta`, 1, 4);
      meta.forEach((item, index) => {
        requireObject(item, `${path}.meta[${index}]`);
        requireString(item.label, `${path}.meta[${index}].label`);
        requireString(item.value, `${path}.meta[${index}].value`);
      });
    } else if (type === "section") {
      requireString(slide.sectionNumber, `${path}.sectionNumber`);
      requireString(slide.title, `${path}.title`);
      requireString(slide.description, `${path}.description`);
    } else if (type === "content") {
      requireString(slide.title, `${path}.title`);
      requireString(slide.statement, `${path}.statement`);
      validateComponent(slide.component, `${path}.component`);
    } else if (type === "evidence") {
      requireString(slide.title, `${path}.title`);
      requireString(slide.statement, `${path}.statement`);
      const hasMedia = slide.media !== undefined && slide.media !== null;
      const hasComponent =
        slide.component !== undefined && slide.component !== null;
      if (hasMedia === hasComponent) {
        fail(path, "Evidence requires exactly one subject: media or component.");
      }
      if (hasMedia) validateMediaItem(slide.media, `${path}.media`);
      if (hasComponent) {
        validateComponent(slide.component, `${path}.component`);
        if (!["chart", "table"].includes(slide.component.kind)) {
          fail(`${path}.component.kind`, "Evidence only accepts chart or table.");
        }
      }
      requireObject(slide.explanation, `${path}.explanation`);
      requireString(slide.explanation.title, `${path}.explanation.title`);
      requireString(
        slide.explanation.description,
        `${path}.explanation.description`,
      );
      const points = requireArray(
        slide.explanation.points,
        `${path}.explanation.points`,
        1,
        4,
      );
      points.forEach((point, index) =>
        requireString(point, `${path}.explanation.points[${index}]`),
      );
    } else {
      requireString(slide.title, `${path}.title`);
      const items = requireArray(slide.items, `${path}.items`, 2, 4);
      items.forEach((item, index) =>
        requireString(item, `${path}.items[${index}]`),
      );
    }
    return slide;
  }

  function validateDeck(deck) {
    const slides = requireArray(deck, "deck", 1);
    const ids = new Set();
    slides.forEach((slide, index) => {
      const path = `deck[${index}]${slide?.id ? ` (${slide.id})` : ""}`;
      validateSlide(slide, path);
      if (ids.has(slide.id)) {
        fail(`${path}.id`, `must be unique; duplicate "${slide.id}".`);
      }
      ids.add(slide.id);
    });
    return deck;
  }

  function brandLogo() {
    if (config.brand?.showLogo !== true) {
      const placeholder = escapeHtml(
        config.brand?.placeholder || config.brand?.name || "YOUR BRAND",
      );
      return `<span class="brand-placeholder">${placeholder}</span>`;
    }
    const alt = escapeHtml(config.brand?.name || "Brand");
    return `
      <span class="brand-logo">
        <img class="brand-logo-light" src="./assets/images/logo-light.png" alt="${alt}">
        <img class="brand-logo-dark" src="./assets/images/logo-dark.png" alt="${alt}">
      </span>`;
  }

  function brandLockup(className = "") {
    const department = config.brand?.department
      ? `<span class="brand-lockup-dot" aria-hidden="true"></span><span class="brand-lockup-department">${escapeHtml(config.brand.department)}</span>`
      : "";
    return `<span class="brand-lockup ${safeClass(className)}">${brandLogo()}${department}</span>`;
  }

  function footer(index, total) {
    return `
      <footer class="slide-footer">
        ${brandLockup("footer-brand")}
        <span class="slide-number">${String(index + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}</span>
      </footer>`;
  }

  function standardFrame(slide, index, total, body, extraClass = "") {
    const titleId = `slide-title-${safeClass(slide.id)}`;
    return `
      <article class="slide slide-${safeClass(slide.type)} ${safeClass(extraClass)}" aria-labelledby="${titleId}">
        <div class="slide-frame">
          <h1 class="page-title" id="${titleId}">${escapeHtml(slide.title)}</h1>
          ${slide.statement ? `<p class="page-statement">${escapeHtml(slide.statement)}</p>` : ""}
          <div class="slide-body">${body}</div>
          ${footer(index, total)}
        </div>
      </article>`;
  }

  function renderIndexedGrid(component) {
    const columns = Math.min(Math.max(Number(component.columns) || 2, 1), 3);
    const items = (component.items || [])
      .map(
        (item) => `
          <section class="indexed-item">
            <span class="indexed-item-number">${escapeHtml(item.index)}</span>
            <h2 class="indexed-item-title">${escapeHtml(item.title)}</h2>
            <p class="indexed-item-description">${escapeHtml(item.description)}</p>
          </section>`,
      )
      .join("");
    return `<div class="indexed-grid" style="--columns:${columns}">${items}</div>`;
  }

  function renderMetrics(component) {
    const metrics = component.items || [];
    const columns = Math.min(Math.max(metrics.length, 1), 4);
    return `
      <div class="metric-group" style="--columns:${columns}">
        ${metrics
          .map(
            (metric) => `
              <section class="metric-item">
                <div class="metric-value"><strong>${escapeHtml(metric.value)}</strong>${metric.unit ? `<span>${escapeHtml(metric.unit)}</span>` : ""}</div>
                <h2>${escapeHtml(metric.label)}</h2>
                <p>${escapeHtml(metric.description)}</p>
                ${metric.meta ? `<span class="metric-meta">${escapeHtml(metric.meta)}</span>` : ""}
              </section>`,
          )
          .join("")}
      </div>`;
  }

  function renderTable(component) {
    const columns = component.columns || [];
    const head = columns
      .map(
        (column) =>
          `<th class="${column.numeric ? "is-numeric" : ""}">${escapeHtml(column.label)}</th>`,
      )
      .join("");
    const rows = (component.rows || [])
      .map(
        (row) => `
          <tr class="${row.summary ? "is-summary" : ""}">
            ${columns
              .map(
                (column) =>
                  `<td class="${column.numeric ? "is-numeric" : ""}">${escapeHtml(row[column.key])}</td>`,
              )
              .join("")}
          </tr>`,
      )
      .join("");
    return `<div class="data-table-wrap"><table class="data-table"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function renderProcess(component) {
    const steps = component.steps || [];
    return `
      <div class="process" style="--steps:${Math.max(steps.length, 1)}">
        ${steps
          .map(
            (step) => `
              <section class="process-step is-${safeClass(step.state || "upcoming")}">
                <div class="process-marker">${escapeHtml(step.index)}</div>
                <h2>${escapeHtml(step.title)}</h2>
                <p>${escapeHtml(step.description)}</p>
              </section>`,
          )
          .join("")}
      </div>`;
  }

  function renderChart(component, slide) {
    return `
      <figure class="chart-figure">
        <div class="chart-surface" data-chart-id="${escapeHtml(slide.id)}" role="img" aria-label="${escapeHtml(slide.title)}">
          <p class="chart-loading">正在生成图表…</p>
        </div>
        <figcaption>${escapeHtml(component.period)} · ${escapeHtml(component.unit || "数值")} · 来源：${escapeHtml(component.source)}</figcaption>
      </figure>`;
  }

  function textWidthUnits(value) {
    return Array.from(String(value)).reduce((total, character) => {
      if (/\s/.test(character)) return total + 0.35;
      if (!/[\u0000-\u00ff]/.test(character)) return total + 1;
      if (/[WM@%&]/.test(character)) return total + 0.95;
      if (/[mw]/.test(character)) return total + 0.82;
      if ("ilI1|.,:;'\"!()[]{}".includes(character)) return total + 0.32;
      if (/[A-Z]/.test(character)) return total + 0.72;
      if (/\d/.test(character)) return total + 0.58;
      return total + 0.56;
    }, 0);
  }

  function wrapSvgText(value, maxUnits, maxLines = 2) {
    const characters = Array.from(String(value).trim());
    const lines = [];
    let line = "";
    let lineUnits = 0;
    let truncated = false;

    for (const character of characters) {
      const characterUnits = textWidthUnits(character);
      if (line && lineUnits + characterUnits > maxUnits) {
        if (lines.length >= maxLines - 1) {
          truncated = true;
          break;
        }
        lines.push(line.trimEnd());
        line = character.trimStart();
        lineUnits = textWidthUnits(line);
      } else {
        line += character;
        lineUnits += characterUnits;
      }
    }

    if (line && lines.length < maxLines) lines.push(line.trim());
    if (truncated && lines.length > 0) {
      const lastIndex = lines.length - 1;
      let finalLine = lines[lastIndex].replace(/[.…]+$/u, "").trimEnd();
      while (finalLine && textWidthUnits(`${finalLine}…`) > maxUnits) {
        finalLine = Array.from(finalLine).slice(0, -1).join("").trimEnd();
      }
      lines[lastIndex] = `${finalLine}…`;
    }
    return lines;
  }

  function renderSvgText(
    value,
    x,
    centerY,
    className,
    maxUnits,
    anchor = "start",
  ) {
    const lines = wrapSvgText(value, maxUnits);
    const firstY = centerY - ((lines.length - 1) * 9);
    return `
      <text class="${safeClass(className)}" x="${x}" y="${firstY}" text-anchor="${anchor}">
        ${lines
          .map(
            (line, index) =>
              `<tspan x="${x}" dy="${index === 0 ? 0 : 18}">${escapeHtml(line)}</tspan>`,
          )
          .join("")}
      </text>`;
  }

  function renderGantt(component, slide) {
    const width = 1200;
    const height = 500;
    const taskWidth = 300;
    const ownerWidth = 180;
    const taskTextWidth = taskWidth - 20;
    const ownerTextWidth = ownerWidth - 16;
    const timelineX = taskWidth;
    const timelineWidth = width - taskWidth - ownerWidth;
    const ownerX = timelineX + timelineWidth;
    const top = 10;
    const headerHeight = 48;
    const rowHeight = 49;
    const tableBottom = top + headerHeight + component.items.length * rowHeight;
    const columnWidth = timelineWidth / component.columns.length;
    const columnRanges = component.columns.map((column) => ({
      start: parseIsoDate(column.start, "gantt column start"),
      end: parseIsoDate(column.end, "gantt column end"),
    }));
    const kinds = [...new Set(component.items.map((item) => item.timing.kind))];
    const legendLabels = {
      execution: "执行周期",
      milestone: "交付节点",
      dependency: "外部依赖",
    };

    function datePosition(value, mode = "center") {
      const timestamp = parseIsoDate(value, "gantt date");
      const columnIndex = columnRanges.findIndex(
        (column) => timestamp >= column.start && timestamp <= column.end,
      );
      const { start, end } = columnRanges[columnIndex];
      const days = Math.round((end - start) / dayMilliseconds) + 1;
      const dayIndex = Math.round((timestamp - start) / dayMilliseconds);
      const offset =
        mode === "start"
          ? dayIndex / days
          : mode === "end"
            ? (dayIndex + 1) / days
            : (dayIndex + 0.5) / days;
      return timelineX + (columnIndex + offset) * columnWidth;
    }

    const columnHeaders = component.columns
      .map((column, index) => {
        const x = timelineX + index * columnWidth;
        return `
          <line class="gantt-grid-line" x1="${x}" y1="${top}" x2="${x}" y2="${tableBottom}"></line>
          <text class="gantt-header-label" x="${x + columnWidth / 2}" y="${top + 29}" text-anchor="middle">${escapeHtml(column.label)}</text>`;
      })
      .join("");

    const rows = component.items
      .map((item, index) => {
        const y = top + headerHeight + index * rowHeight;
        const centerY = y + rowHeight / 2;
        let timing;
        if (item.timing.kind === "milestone") {
          const x = datePosition(item.timing.date);
          timing = `
            <circle class="gantt-milestone-ring" cx="${x}" cy="${centerY}" r="8"></circle>
            <circle class="gantt-milestone-dot" cx="${x}" cy="${centerY}" r="3.6"></circle>`;
        } else {
          const x = datePosition(item.timing.start, "start");
          const endX = datePosition(item.timing.end, "end");
          timing = `<rect class="gantt-range is-${safeClass(item.timing.kind)}" x="${x}" y="${centerY - 6}" width="${Math.max(endX - x, 3)}" height="12" rx="6"></rect>`;
        }
        return `
          <g class="gantt-row">
            <line class="gantt-row-line" x1="0" y1="${y}" x2="${width}" y2="${y}"></line>
            <svg class="gantt-text-cell" x="0" y="${y}" width="${taskTextWidth}" height="${rowHeight}" overflow="hidden">
              ${renderSvgText(item.title, 0, rowHeight / 2, "gantt-task-title", 16)}
            </svg>
            ${timing}
            <svg class="gantt-text-cell" x="${ownerX + 16}" y="${y}" width="${ownerTextWidth}" height="${rowHeight}" overflow="hidden">
              ${renderSvgText(item.owner, 0, rowHeight / 2, "gantt-owner", 10)}
            </svg>
          </g>`;
      })
      .join("");

    const legendStart = width - kinds.length * 142;
    const legend = kinds
      .map((kind, index) => {
        const x = legendStart + index * 142;
        const y = 476;
        const symbol =
          kind === "milestone"
            ? `
              <circle class="gantt-milestone-ring" cx="${x + 8}" cy="${y}" r="6"></circle>
              <circle class="gantt-milestone-dot" cx="${x + 8}" cy="${y}" r="2.8"></circle>`
            : `<rect class="gantt-range is-${safeClass(kind)}" x="${x}" y="${y - 5}" width="30" height="10" rx="5"></rect>`;
        return `${symbol}<text class="gantt-legend-label" x="${x + 40}" y="${y}">${legendLabels[kind]}</text>`;
      })
      .join("");

    const titleId = `gantt-title-${safeClass(slide.id)}`;
    const descriptionId = `gantt-description-${safeClass(slide.id)}`;
    return `
      <figure class="gantt-figure">
        <svg class="gantt-svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${titleId} ${descriptionId}">
          <title id="${titleId}">${escapeHtml(slide.title)}</title>
          <desc id="${descriptionId}">${escapeHtml(component.period)}，展示 ${component.items.length} 项重点任务的计划周期、交付节点和负责人。</desc>
          <text class="gantt-header-label is-left" x="0" y="${top + 29}">${escapeHtml(component.taskLabel || "重点任务")}</text>
          ${columnHeaders}
          <line class="gantt-grid-line" x1="${ownerX}" y1="${top}" x2="${ownerX}" y2="${tableBottom}"></line>
          <text class="gantt-header-label is-left" x="${ownerX + 16}" y="${top + 29}">${escapeHtml(component.ownerLabel || "负责人")}</text>
          <line class="gantt-row-line" x1="0" y1="${top + headerHeight}" x2="${width}" y2="${top + headerHeight}"></line>
          ${rows}
          <line class="gantt-row-line" x1="0" y1="${tableBottom}" x2="${width}" y2="${tableBottom}"></line>
          <g class="gantt-legend" aria-label="图例">${legend}</g>
          <text class="gantt-meta" x="0" y="480">${escapeHtml(component.period)} · 来源：${escapeHtml(component.source)}</text>
        </svg>
      </figure>`;
  }

  function renderDiagramNodes(component, slide) {
    return `
      <div class="diagram-surface architecture-diagram" data-architecture-id="${escapeHtml(slide.id)}" aria-label="${escapeHtml(slide.title)}">
        <p class="architecture-loading">正在计算节点布局…</p>
      </div>`;
  }

  function renderComparison(component) {
    const leftItems = component.items
      .map(
        (item) => `
          <div class="comparison-legacy-item">
            <p>${escapeHtml(item.leftValue)}</p>
          </div>`,
      )
      .join("");

    const rightItems = component.items
      .map(
        (item, index) => `
          <div class="comparison-target-item">
            <span class="comparison-index">${String(index + 1).padStart(2, "0")}</span>
            <div>
              <h3>${escapeHtml(item.rightValue)}</h3>
              <p>${escapeHtml(item.rightDescription)}</p>
            </div>
          </div>`,
      )
      .join("");

    return `
      <div class="comparison is-${safeClass(component.direction)}">
        <section class="comparison-panel is-left">
          <header class="comparison-heading">
            <span>${escapeHtml(component.left.label)}</span>
            <h2>${escapeHtml(component.left.title)}</h2>
          </header>
          <div class="comparison-legacy-list">${leftItems}</div>
        </section>
        <section class="comparison-panel is-right">
          <header class="comparison-heading">
            <span>${escapeHtml(component.right.label)}</span>
            <h2>${escapeHtml(component.right.title)}</h2>
          </header>
          <div class="comparison-target-list">${rightItems}</div>
        </section>
      </div>`;
  }

  function renderMediaItem(media, extraClass = "") {
    const kind = media?.kind || "image";
    const ratioClasses = {
      "16:9": "is-landscape",
      "3:4": "is-portrait",
      "9:16": "is-vertical",
    };
    const ratio = media?.ratio || "16:9";
    const ratioClass = ratioClasses[ratio];
    const fit = media?.fit || "contain";

    const mediaElement =
      kind === "video"
        ? `
          <video
            class="content-media-element is-${safeClass(fit)}"
            src="${escapeHtml(media.src)}"
            poster="${escapeHtml(media.poster)}"
            aria-label="${escapeHtml(media.caption || "演示视频")}"
            controls
            preload="metadata"
            playsinline
          ></video>
          <img
            class="content-media-print-poster is-${safeClass(fit)}"
            src="${escapeHtml(media.poster)}"
            alt=""
            aria-hidden="true"
          >`
        : `<img class="content-media-element is-${safeClass(fit)}" src="${escapeHtml(media.src)}" alt="${escapeHtml(media.alt)}">`;
    const caption = media.caption
      ? `<strong>${escapeHtml(media.caption)}</strong>`
      : "";
    const source = media.source
      ? `<span>${escapeHtml(media.source)}</span>`
      : "";

    return `
      <figure class="content-media ${ratioClass} ${safeClass(extraClass)}">
        <div class="content-media-surface">${mediaElement}</div>
        ${caption || source ? `<figcaption>${caption}${source}</figcaption>` : ""}
      </figure>`;
  }

  function renderMediaSurface(component) {
    const items = component.items || [];
    const collectionClass = items.length === 1 ? "is-single" : "is-paired";
    return `
      <div class="content-media-collection ${collectionClass}">
        ${items.map((item) => renderMediaItem(item)).join("")}
      </div>`;
  }

  function renderCallout(component) {
    const tone = component.tone || "accent";
    return `
      <aside class="callout is-${safeClass(tone)}" aria-label="${escapeHtml(component.label || "重点强调")}">
        ${component.label ? `<span class="callout-label">${escapeHtml(component.label)}</span>` : ""}
        <p class="callout-message">${escapeHtml(component.message)}</p>
        <div class="callout-copy">
          ${component.description ? `<p>${escapeHtml(component.description)}</p>` : ""}
          ${component.source ? `<cite>${escapeHtml(component.source)}</cite>` : ""}
        </div>
      </aside>`;
  }

  const componentRenderers = {
    "indexed-grid": renderIndexedGrid,
    metrics: renderMetrics,
    table: renderTable,
    process: renderProcess,
    chart: renderChart,
    gantt: renderGantt,
    "diagram-nodes": renderDiagramNodes,
    comparison: renderComparison,
    "media-surface": renderMediaSurface,
    callout: renderCallout,
  };

  function renderComponent(component, slide) {
    const renderer = componentRenderers[component.kind];
    return renderer(component, slide);
  }

  function renderCover(slide, index, total) {
    const meta = (slide.meta || [])
      .map(
        (item) =>
          `<div><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.value)}</strong></div>`,
      )
      .join("");
    return `
      <article class="slide slide-cover" aria-labelledby="slide-title-${safeClass(slide.id)}">
        <div class="cover-background" aria-hidden="true"></div>
        <div class="cover-copy">
          ${brandLockup("cover-brand")}
          <div class="cover-heading">
            <h1 class="cover-title" id="slide-title-${safeClass(slide.id)}">${escapeHtml(slide.title)}</h1>
            <p class="cover-subtitle">${escapeHtml(slide.subtitle)}</p>
          </div>
          <div class="cover-meta">${meta}</div>
        </div>
        <span hidden>${index + 1} / ${total}</span>
      </article>`;
  }

  function renderSection(slide, index, total) {
    return `
      <article class="slide slide-section" aria-labelledby="slide-title-${safeClass(slide.id)}">
        <div class="slide-frame">
          <div class="section-layout">
            <div class="section-index" aria-hidden="true">${escapeHtml(slide.sectionNumber)}</div>
            <div class="section-copy">
              <h1 id="slide-title-${safeClass(slide.id)}">${escapeHtml(slide.title)}</h1>
              <p>${escapeHtml(slide.description)}</p>
            </div>
          </div>
          ${footer(index, total)}
        </div>
      </article>`;
  }

  function renderContent(slide, index, total) {
    return standardFrame(
      slide,
      index,
      total,
      renderComponent(slide.component, slide),
      `slide-component-${safeClass(slide.component?.kind)}`,
    );
  }

  function renderEvidence(slide, index, total) {
    const hasMedia = Boolean(slide.media);
    const points = (slide.explanation?.points || [])
      .map((point) => `<li>${escapeHtml(point)}</li>`)
      .join("");
    const subject = hasMedia
      ? renderMediaItem(slide.media, "evidence-media")
      : `<div class="evidence-component is-${safeClass(slide.component.kind)}">${renderComponent(slide.component, slide)}</div>`;
    const body = `
      <div class="evidence-layout">
        ${subject}
        <div class="evidence-explanation">
          <h2>${escapeHtml(slide.explanation?.title)}</h2>
          <p>${escapeHtml(slide.explanation?.description)}</p>
          <ul class="evidence-points">${points}</ul>
        </div>
      </div>`;
    return standardFrame(slide, index, total, body);
  }

  function renderSummary(slide, index, total) {
    const items = (slide.items || [])
      .map(
        (item, itemIndex) =>
          `<div class="summary-item"><span>${String(itemIndex + 1).padStart(2, "0")}</span><strong>${escapeHtml(item)}</strong></div>`,
      )
      .join("");
    return `
      <article class="slide slide-summary" aria-labelledby="slide-title-${safeClass(slide.id)}">
        <div class="slide-frame">
          <div class="summary-layout">
            <section class="summary-copy"><h1 id="slide-title-${safeClass(slide.id)}">${escapeHtml(slide.title)}</h1></section>
            <div class="summary-content"><div class="summary-list">${items}</div></div>
          </div>
          ${footer(index, total)}
        </div>
      </article>`;
  }

  const slideRenderers = {
    cover: renderCover,
    section: renderSection,
    content: renderContent,
    evidence: renderEvidence,
    summary: renderSummary,
  };

  window.HtmlSlidesRenderers = {
    escapeHtml,
    validateComponent,
    validateDeck,
    validateMediaItem,
    validateSlide,
    render(slide, index, total) {
      validateSlide(slide, `slide ${slide?.id || "(unknown)"}`);
      const renderer = slideRenderers[slide.type];
      return renderer(slide, index, total);
    },
  };
})();
