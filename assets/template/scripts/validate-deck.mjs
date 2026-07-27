#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const deckRoot = path.resolve(scriptDirectory, "..");
const indexPath = path.join(deckRoot, "index.html");
const errors = [];
const resources = new Map();

function relative(filePath) {
  return path.relative(deckRoot, filePath) || ".";
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function runBrowserScript(context, filePath) {
  const source = read(filePath);
  new vm.Script(source, { filename: relative(filePath) }).runInContext(context);
}

function isRemoteReference(reference) {
  return (
    reference.startsWith("//") ||
    /^[a-z][a-z\d+.-]*:/i.test(reference)
  );
}

function addResource(reference, ownerPath, reason) {
  if (typeof reference !== "string" || reference.trim() === "") {
    errors.push(`${reason}: resource path must be a non-empty string.`);
    return;
  }

  const raw = reference.trim();
  if (raw.startsWith("#") || raw.startsWith("data:")) return;
  if (isRemoteReference(raw)) {
    errors.push(`${reason}: remote resource is not allowed: ${raw}`);
    return;
  }

  let decoded;
  try {
    decoded = decodeURIComponent(raw.split(/[?#]/, 1)[0]);
  } catch {
    errors.push(`${reason}: resource path is not valid URI text: ${raw}`);
    return;
  }

  const absolute = path.resolve(path.dirname(ownerPath), decoded);
  const insideDeck =
    absolute === deckRoot || absolute.startsWith(`${deckRoot}${path.sep}`);
  if (!insideDeck) {
    errors.push(`${reason}: resource escapes the deck directory: ${raw}`);
    return;
  }

  if (!resources.has(absolute)) resources.set(absolute, []);
  resources.get(absolute).push(reason);
}

function collectHtmlResources() {
  const html = read(indexPath);
  const resourceAttributes = {
    script: ["src"],
    link: ["href"],
    img: ["src"],
    video: ["src", "poster"],
    source: ["src"],
    audio: ["src"],
    track: ["src"],
    iframe: ["src"],
    object: ["data"],
  };
  const tagPattern =
    /<(script|link|img|video|source|audio|track|iframe|object)\b[^>]*>/gi;

  for (const tagMatch of html.matchAll(tagPattern)) {
    const tagName = tagMatch[1].toLowerCase();
    for (const attribute of resourceAttributes[tagName]) {
      const attributePattern = new RegExp(
        `\\b${attribute}\\s*=\\s*([\"'])(.*?)\\1`,
        "i",
      );
      const attributeMatch = tagMatch[0].match(attributePattern);
      if (attributeMatch) {
        addResource(
          attributeMatch[2],
          indexPath,
          `index.html <${tagName}> ${attribute}`,
        );
      }
    }
  }
}

function collectCssResources() {
  const checked = new Set();
  let discovered = true;

  while (discovered) {
    discovered = false;
    for (const resourcePath of resources.keys()) {
      if (path.extname(resourcePath).toLowerCase() !== ".css") continue;
      if (checked.has(resourcePath) || !fs.existsSync(resourcePath)) continue;
      checked.add(resourcePath);
      discovered = true;

      const css = read(resourcePath);
      const urlPattern = /url\(\s*(?:(["'])(.*?)\1|([^)"'\s]+))\s*\)/gi;
      for (const match of css.matchAll(urlPattern)) {
        addResource(
          match[2] || match[3],
          resourcePath,
          `${relative(resourcePath)} url()`,
        );
      }
      const importPattern = /@import\s+(["'])(.*?)\1/gi;
      for (const match of css.matchAll(importPattern)) {
        addResource(
          match[2],
          resourcePath,
          `${relative(resourcePath)} @import`,
        );
      }
    }
  }
}

function collectMediaResources(deck) {
  deck.forEach((slide, slideIndex) => {
    const slidePath = `deck[${slideIndex}] (${slide.id})`;
    const mediaItems = [];
    if (slide.media) mediaItems.push({ media: slide.media, path: `${slidePath}.media` });
    if (slide.component?.kind === "media-surface") {
      slide.component.items.forEach((media, itemIndex) => {
        mediaItems.push({
          media,
          path: `${slidePath}.component.items[${itemIndex}]`,
        });
      });
    }
    mediaItems.forEach(({ media, path: mediaPath }) => {
      addResource(media.src, indexPath, `${mediaPath}.src`);
      if (media.kind === "video") {
        addResource(media.poster, indexPath, `${mediaPath}.poster`);
      }
    });
  });
}

function collectBrandResources(config) {
  if (config.brand?.showLogo === true) {
    addResource(
      "./assets/images/logo-light.png",
      indexPath,
      "brand.showLogo light logo",
    );
    addResource(
      "./assets/images/logo-dark.png",
      indexPath,
      "brand.showLogo dark logo",
    );
  }
}

function checkResourceFiles() {
  for (const [resourcePath, reasons] of resources) {
    if (!fs.existsSync(resourcePath)) {
      errors.push(
        `${reasons[0]}: missing local resource ${relative(resourcePath)}`,
      );
      continue;
    }
    if (!fs.statSync(resourcePath).isFile()) {
      errors.push(`${reasons[0]}: resource is not a file: ${relative(resourcePath)}`);
    }
  }
}

function main() {
  try {
    if (!fs.existsSync(indexPath)) {
      throw new Error(`missing template entry: ${indexPath}`);
    }

    const browserWindow = {};
    browserWindow.window = browserWindow;
    const context = vm.createContext({ window: browserWindow, console });

    runBrowserScript(context, path.join(deckRoot, "content/brand-config.js"));
    runBrowserScript(context, path.join(deckRoot, "content/deck-data.js"));
    runBrowserScript(context, path.join(deckRoot, "scripts/renderers.js"));

    const deck = browserWindow.HTML_SLIDES_DECK;
    const config = browserWindow.HTML_SLIDES_CONFIG || {};
    const renderers = browserWindow.HtmlSlidesRenderers;
    if (!renderers?.validateDeck || !renderers?.render) {
      throw new Error("renderer validation API did not load.");
    }

    renderers.validateDeck(deck);
    deck.forEach((slide, index) => {
      const html = renderers.render(slide, index, deck.length);
      if (typeof html !== "string" || html.trim() === "") {
        throw new Error(`deck[${index}] (${slide.id}): renderer returned no HTML.`);
      }
    });

    collectHtmlResources();
    collectMediaResources(deck);
    collectBrandResources(config);
    collectCssResources();
    checkResourceFiles();

    if (errors.length > 0) {
      throw new Error(errors.map((error) => `- ${error}`).join("\n"));
    }

    console.log(
      `✓ Deck valid: ${deck.length} slides rendered; ${resources.size} local resources verified.`,
    );
  } catch (error) {
    console.error("✗ Deck validation failed");
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

main();
