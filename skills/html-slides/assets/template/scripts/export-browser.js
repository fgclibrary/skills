(() => {
  const exportButton = document.getElementById("singleFileButton");
  const deck = window.HTML_SLIDES_DECK;
  const renderers = window.HtmlSlidesRenderers;
  const diagramRenderer = window.HtmlSlidesDiagrams;
  const chartRenderer = window.HtmlSlidesCharts;
  const imageInlineLimit = 2 * 1024 * 1024;
  const videoInlineLimit = 5 * 1024 * 1024;
  const transparentLogoBase64 =
    "R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
  const optionalLogoReferences = new Set([
    "assets/images/logo-light.png",
    "assets/images/logo-dark.png",
  ]);
  const staticExportOmittedSelector =
    /\.(?:print-deck|print-slide|content-media-print-poster)(?![\w-])/;

  if (!exportButton || !Array.isArray(deck) || !renderers) return;

  const mimeTypes = {
    ".gif": "image/gif",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".mp4": "video/mp4",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webm": "video/webm",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
  };

  let dialog;

  function getMimeType(relativePath, response) {
    return (
      response.headers.get("content-type")?.split(";", 1)[0] ||
      mimeTypes[relativePath.slice(relativePath.lastIndexOf(".")).toLowerCase()] ||
      "application/octet-stream"
    );
  }

  function toBase64(bytes) {
    let binary = "";
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }
    return btoa(binary);
  }

  function toDataUri(bytes, mimeType) {
    return `data:${mimeType};base64,${toBase64(bytes)}`;
  }

  function serializeForInlineScript(value) {
    return JSON.stringify(value)
      .replaceAll("<", "\\u003c")
      .replaceAll("\u2028", "\\u2028")
      .replaceAll("\u2029", "\\u2029");
  }

  function encodeText(value) {
    return new TextEncoder().encode(value);
  }

  function decodeBase64(value) {
    const binary = atob(value);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  }

  function rootUrl() {
    return new URL("./", window.location.href);
  }

  function resolveLocalReference(reference, ownerUrl) {
    const cleanReference = reference.trim();
    if (
      !cleanReference ||
      cleanReference.startsWith("#") ||
      cleanReference.startsWith("data:")
    ) {
      return null;
    }
    const resolved = new URL(cleanReference, ownerUrl);
    const root = rootUrl();
    if (resolved.origin !== root.origin || !resolved.pathname.startsWith(root.pathname)) {
      throw new Error(`导出只允许本地资源：${reference}`);
    }
    return {
      url: resolved,
      relative: decodeURIComponent(resolved.pathname.slice(root.pathname.length)),
    };
  }

  function limitFor(relativePath, mimeType) {
    if (mimeType.startsWith("video/")) return videoInlineLimit;
    if (mimeType.startsWith("image/")) return imageInlineLimit;
    return Number.POSITIVE_INFINITY;
  }

  async function fetchAsset(reference, ownerUrl, assets) {
    const resolved = resolveLocalReference(reference, ownerUrl);
    if (!resolved) return null;
    if (assets.has(resolved.relative)) return assets.get(resolved.relative);

    const response = await fetch(resolved.url, { cache: "no-store" });
    if (!response.ok) {
      if (
        window.HTML_SLIDES_CONFIG?.brand?.showLogo !== true &&
        optionalLogoReferences.has(resolved.relative)
      ) {
        const placeholder = {
          bytes: decodeBase64(transparentLogoBase64),
          key: `asset-${assets.size}`,
          inline: true,
          mimeType: "image/gif",
          relative: resolved.relative,
        };
        assets.set(resolved.relative, placeholder);
        return placeholder;
      }
      throw new Error(`无法读取资源：${resolved.relative}`);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    const mimeType = getMimeType(resolved.relative, response);
    const asset = {
      bytes,
      key: `asset-${assets.size}`,
      inline: bytes.byteLength <= limitFor(resolved.relative, mimeType),
      mimeType,
      relative: resolved.relative,
    };
    assets.set(resolved.relative, asset);
    return asset;
  }

  async function rewriteCss(css, cssUrl, assets) {
    const pattern = /url\(\s*(?:(['"])(.*?)\1|([^)'"\s]+))\s*\)/gi;
    let output = "";
    let cursor = 0;
    for (const match of css.matchAll(pattern)) {
      output += css.slice(cursor, match.index);
      const reference = match[2] || match[3];
      const asset = await fetchAsset(reference, cssUrl, assets);
      if (!asset) {
        output += match[0];
      } else {
        output += `url("${asset.inline ? toDataUri(asset.bytes, asset.mimeType) : `./${asset.relative}`}")`;
      }
      cursor = match.index + match[0].length;
    }
    return output + css.slice(cursor);
  }

  function stripStaticExportCss(css) {
    if (typeof CSSStyleSheet !== "function") return css;
    try {
      const stylesheet = new CSSStyleSheet();
      stylesheet.replaceSync(css);
      for (let index = stylesheet.cssRules.length - 1; index >= 0; index -= 1) {
        const rule = stylesheet.cssRules[index];
        if (rule.type !== CSSRule.STYLE_RULE) continue;
        const selectors = rule.selectorText
          .split(",")
          .map((selector) => selector.trim())
          .filter((selector) => !staticExportOmittedSelector.test(selector));
        if (selectors.length === 0) {
          stylesheet.deleteRule(index);
        } else if (selectors.length !== rule.selectorText.split(",").length) {
          rule.selectorText = selectors.join(", ");
        }
      }
      return [...stylesheet.cssRules].map((rule) => rule.cssText).join("\n");
    } catch (_) {
      return css;
    }
  }

  async function rewriteMediaReferences(html, assets, mediaAssetKeys) {
    const pattern = /\b(src|poster)\s*=\s*(["'])(.*?)\2/gi;
    let output = "";
    let cursor = 0;
    for (const match of html.matchAll(pattern)) {
      output += html.slice(cursor, match.index);
      const asset = await fetchAsset(match[3], window.location.href, assets);
      if (!asset) {
        output += match[0];
      } else if (asset.inline) {
        mediaAssetKeys.add(asset.key);
        output += `data-static-${match[1].toLowerCase()}=${match[2]}${asset.key}${match[2]}`;
      } else {
        output += `${match[1]}=${match[2]}./${asset.relative}${match[2]}`;
      }
      cursor = match.index + match[0].length;
    }
    return output + html.slice(cursor);
  }

  function settleLayout() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
  }

  function makeChartSvgsResponsive(root) {
    root.querySelectorAll(".chart-surface > div").forEach((wrapper) => {
      wrapper.style.width = "100%";
      wrapper.style.height = "100%";
    });
    root.querySelectorAll(".chart-surface > div > svg").forEach((svg) => {
      const width = Number.parseFloat(svg.getAttribute("width"));
      const height = Number.parseFloat(svg.getAttribute("height"));
      if (Number.isFinite(width) && Number.isFinite(height)) {
        svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      }
      svg.setAttribute("width", "100%");
      svg.setAttribute("height", "100%");
      svg.style.width = "100%";
      svg.style.height = "100%";
      svg.style.display = "block";
    });
  }

  async function renderStaticSlides(theme) {
    const previousDark = document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", theme === "dark");
    await document.fonts?.ready;

    const stageRoot = document.createElement("div");
    const rootStyle = "position:fixed;left:-100000px;top:0;width:1280px;visibility:hidden;pointer-events:none;";
    stageRoot.className = "stage";
    stageRoot.setAttribute("style", `${rootStyle}height:720px;`);
    document.body.append(stageRoot);

    const staticSlides = [];
    try {
      for (const [index, slide] of deck.entries()) {
        chartRenderer?.disposeAll(stageRoot);
        stageRoot.innerHTML = renderers.render(slide, index, deck.length);
        await diagramRenderer?.renderAll(stageRoot);
        chartRenderer?.renderAll(stageRoot);
        await settleLayout();
        makeChartSvgsResponsive(stageRoot);
        stageRoot.querySelectorAll(".content-media-print-poster").forEach((poster) => poster.remove());
        const html = stageRoot.firstElementChild?.outerHTML;

        if (!html) throw new Error(`第 ${index + 1} 页没有生成有效 HTML`);

        staticSlides.push({
          html,
          id: slide.id,
          navTitle: slide.navTitle,
          notes: slide.notes || [],
          statement: slide.statement,
          title: slide.title,
          type: slide.type,
          typeLabel: slide.typeLabel,
        });
      }
    } finally {
      chartRenderer?.disposeAll(stageRoot);
      stageRoot.remove();
      document.documentElement.classList.toggle("dark", previousDark);
    }
    return staticSlides;
  }

  async function loadStyles(assets) {
    const styles = [];
    for (const link of document.querySelectorAll('link[rel="stylesheet"]')) {
      if (link.media.trim().toLowerCase() === "print") continue;
      const response = await fetch(link.href, { cache: "no-store" });
      if (!response.ok) throw new Error(`无法读取样式：${link.href}`);
      const css = await rewriteCss(await response.text(), link.href, assets);
      styles.push({
        css: stripStaticExportCss(css),
        media: link.media || "",
        source: new URL(link.href).pathname,
      });
    }
    return styles;
  }

  async function buildHtml(theme) {
    const assets = new Map();
    const mediaAssetKeys = new Set();
    const staticSlides = await renderStaticSlides(theme);
    const styles = await loadStyles(assets);
    for (const slide of staticSlides) {
      slide.html = await rewriteMediaReferences(slide.html, assets, mediaAssetKeys);
    }
    const staticAppResponse = await fetch("./scripts/static-app.js", { cache: "no-store" });
    if (!staticAppResponse.ok) throw new Error("无法读取静态演示运行时：scripts/static-app.js");
    const staticApp = await staticAppResponse.text();

    const htmlDocument = document.documentElement.cloneNode(true);
    htmlDocument.removeAttribute("data-single-file");
    htmlDocument.dataset.staticExport = "true";
    htmlDocument.classList.toggle("dark", theme === "dark");
    htmlDocument.querySelectorAll("script").forEach((script) => script.remove());
    htmlDocument.querySelectorAll('link[rel="stylesheet"]').forEach((link) => link.remove());
    htmlDocument.querySelector(".export-dialog")?.remove();
    htmlDocument.querySelector("#stage")?.replaceChildren();
    htmlDocument.querySelector("#printButton")?.remove();
    htmlDocument.querySelector("#printDeck")?.remove();
    htmlDocument.querySelector("#singleFileButton")?.remove();

    const head = htmlDocument.querySelector("head");
    styles.forEach(({ css, media, source }) => {
      const style = document.createElement("style");
      if (media) style.media = media;
      style.dataset.staticExportSource = source;
      style.textContent = css;
      head.append(style);
    });

    const inlineAssets = Object.fromEntries(
      [...assets.values()]
        .filter((asset) => asset.inline && mediaAssetKeys.has(asset.key))
        .map((asset) => [asset.key, toDataUri(asset.bytes, asset.mimeType)]),
    );
    const dataScript = document.createElement("script");
    dataScript.textContent = `window.HTML_SLIDES_STATIC_CONFIG=${serializeForInlineScript({
      deckTitle: window.HTML_SLIDES_CONFIG?.deckTitle || "HTML Slides",
      theme,
    })};window.HTML_SLIDES_STATIC_ASSETS=${serializeForInlineScript(inlineAssets)};window.HTML_SLIDES_STATIC_DECK=${serializeForInlineScript(staticSlides)};`;
    const appScript = document.createElement("script");
    appScript.textContent = staticApp;
    htmlDocument.querySelector("body").append(dataScript, appScript);

    const serialized = `<!doctype html>\n${htmlDocument.outerHTML}`;
    return { assets, html: serialized };
  }

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit += 1) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function numberBytes(value, length) {
    const bytes = new Uint8Array(length);
    for (let index = 0; index < length; index += 1) bytes[index] = value >>> (index * 8);
    return bytes;
  }

  function concatBytes(parts) {
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const result = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) {
      result.set(part, offset);
      offset += part.length;
    }
    return result;
  }

  function createZip(entries) {
    const localParts = [];
    const centralParts = [];
    let offset = 0;
    for (const entry of entries) {
      const name = encodeText(entry.name);
      const bytes = entry.bytes;
      const crc = crc32(bytes);
      const header = concatBytes([
        new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
        numberBytes(20, 2), numberBytes(0x800, 2), numberBytes(0, 2),
        numberBytes(0, 2), numberBytes(0, 2), numberBytes(crc, 4),
        numberBytes(bytes.length, 4), numberBytes(bytes.length, 4),
        numberBytes(name.length, 2), numberBytes(0, 2), name, bytes,
      ]);
      localParts.push(header);
      centralParts.push(concatBytes([
        new Uint8Array([0x50, 0x4b, 0x01, 0x02]),
        numberBytes(20, 2), numberBytes(20, 2), numberBytes(0x800, 2),
        numberBytes(0, 2), numberBytes(0, 2), numberBytes(0, 2), numberBytes(crc, 4),
        numberBytes(bytes.length, 4), numberBytes(bytes.length, 4),
        numberBytes(name.length, 2), numberBytes(0, 2), numberBytes(0, 2),
        numberBytes(0, 2), numberBytes(0, 2), numberBytes(0, 4),
        numberBytes(offset, 4), name,
      ]));
      offset += header.length;
    }
    const central = concatBytes(centralParts);
    const local = concatBytes(localParts);
    const end = concatBytes([
      new Uint8Array([0x50, 0x4b, 0x05, 0x06]),
      numberBytes(0, 2), numberBytes(0, 2), numberBytes(entries.length, 2),
      numberBytes(entries.length, 2), numberBytes(central.length, 4),
      numberBytes(local.length, 4), numberBytes(0, 2),
    ]);
    return new Blob([local, central, end], { type: "application/zip" });
  }

  function slug(value) {
    return String(value || "HTML Slides")
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, "-")
      .slice(0, 60) || "HTML-Slides";
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function createDialog() {
    const element = document.createElement("dialog");
    element.className = "export-dialog";
    element.innerHTML = `
      <form method="dialog">
        <p class="export-dialog-kicker">EXPORT</p>
        <h2>导出演示</h2>
        <p class="export-dialog-copy">图表与流程图会固化为 SVG；大图片或视频会保留为 ZIP 内的本地资源。</p>
        <fieldset>
          <legend>选择主题</legend>
          <label><input type="radio" name="theme" value="light" checked> 浅色</label>
          <label><input type="radio" name="theme" value="dark"> 深色</label>
        </fieldset>
        <p class="export-dialog-hint">图片 ≤ 2 MB、视频 ≤ 5 MB 会内嵌 Base64；超过阈值时自动生成 ZIP。</p>
        <p class="export-dialog-status" data-export-status></p>
        <div class="export-dialog-actions">
          <button class="text-button" value="cancel">取消</button>
          <button class="text-button" value="export" data-export-submit>开始导出</button>
        </div>
      </form>`;
    element.querySelector("form").addEventListener("submit", (event) => {
      if (event.submitter?.value !== "export") return;
      event.preventDefault();
      const theme = element.querySelector('input[name="theme"]:checked').value;
      runExport(theme);
    });
    document.body.append(element);
    return element;
  }

  async function runExport(theme) {
    if (window.location.protocol === "file:") {
      window.alert(
        "当前页面通过 file:// 打开，浏览器无法读取导出所需资源。\n\n在演示目录运行：\npython3 -m http.server 8000 --bind 127.0.0.1\n\n然后访问：\nhttp://127.0.0.1:8000/\n\n重新点击“导出 HTML / ZIP”。",
      );
      return;
    }
    const status = dialog.querySelector("[data-export-status]");
    const submit = dialog.querySelector("[data-export-submit]");
    submit.disabled = true;
    status.textContent = "正在生成 SVG 并整理资源…";
    try {
      const result = await buildHtml(theme);
      const externalAssets = [...result.assets.values()].filter((asset) => !asset.inline);
      const base = slug(window.HTML_SLIDES_CONFIG?.deckTitle);
      if (externalAssets.length === 0) {
        download(new Blob([result.html], { type: "text/html;charset=utf-8" }), `${base}-${theme}.html`);
        status.textContent = "已生成单文件 HTML。";
      } else {
        const entries = [{ name: "index.html", bytes: encodeText(result.html) }];
        for (const asset of externalAssets) entries.push({ name: asset.relative, bytes: asset.bytes });
        const notices = await fetch("./THIRD_PARTY_NOTICES.md", { cache: "no-store" });
        if (notices.ok) entries.push({ name: "THIRD_PARTY_NOTICES.md", bytes: encodeText(await notices.text()) });
        download(createZip(entries), `${base}-${theme}.zip`);
        status.textContent = "已生成 ZIP 演示包。";
      }
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : String(error);
    } finally {
      submit.disabled = false;
    }
  }

  function open() {
    if (!dialog) dialog = createDialog();
    dialog.querySelector("[data-export-status]").textContent = "";
    dialog.showModal();
  }

  window.HtmlSlidesExport = { open };
})();
