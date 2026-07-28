(() => {
  const deck = window.HTML_SLIDES_DECK;
  const config = window.HTML_SLIDES_CONFIG || {};
  const renderers = window.HtmlSlidesRenderers;
  const diagramRenderer = window.HtmlSlidesDiagrams;
  const chartRenderer = window.HtmlSlidesCharts;

  if (!Array.isArray(deck) || deck.length === 0 || !renderers) {
    throw new Error("HTML Slides failed to load its deck or renderers.");
  }
  renderers.validateDeck(deck);

  const elements = {
    stage: document.getElementById("stage"),
    slideList: document.getElementById("slideList"),
    slideMenu: document.getElementById("slideMenu"),
    menuButton: document.getElementById("menuButton"),
    menuScrim: document.getElementById("menuScrim"),
    toolbarType: document.getElementById("toolbarType"),
    toolbarTitle: document.getElementById("toolbarTitle"),
    pageCounter: document.getElementById("pageCounter"),
    prevButton: document.getElementById("prevButton"),
    nextButton: document.getElementById("nextButton"),
    themeButton: document.getElementById("themeButton"),
    notesButton: document.getElementById("notesButton"),
    notesPanel: document.getElementById("notesPanel"),
    notesTitle: document.getElementById("notesTitle"),
    notesContent: document.getElementById("notesContent"),
    closeNotesButton: document.getElementById("closeNotesButton"),
    presentButton: document.getElementById("presentButton"),
    printButton: document.getElementById("printButton"),
    printDeck: document.getElementById("printDeck"),
  };

  const iconMoon =
    '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5 8.5 8.5 0 1 0 20.5 14.5Z"/></svg>';
  const iconSun =
    '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';

  let currentIndex = 0;
  let notesOpen = false;

  function storageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (_) {
      // Local files can run with storage disabled.
    }
  }

  function setMenuOpen(isOpen) {
    document.body.classList.toggle("menu-open", isOpen);
    elements.menuButton.setAttribute("aria-expanded", String(isOpen));
    elements.menuButton.setAttribute(
      "aria-label",
      isOpen ? "关闭页面导航" : "打开页面导航",
    );
    elements.slideMenu.setAttribute("aria-hidden", String(!isOpen));
    elements.slideMenu.inert = !isOpen;
  }

  function setNotesOpen(isOpen) {
    notesOpen = isOpen;
    elements.notesPanel.classList.toggle("is-open", notesOpen);
    elements.notesPanel.setAttribute("aria-hidden", String(!notesOpen));
    elements.notesButton.setAttribute("aria-pressed", String(notesOpen));
  }

  function setTheme(isDark) {
    document.documentElement.classList.toggle("dark", isDark);
    elements.themeButton.innerHTML = isDark ? iconSun : iconMoon;
    elements.themeButton.setAttribute(
      "title",
      isDark ? "切换到浅色主题" : "切换到深色主题",
    );
    storageSet("html-slides-theme", isDark ? "dark" : "light");
    requestAnimationFrame(() => chartRenderer?.renderAll(elements.stage));
  }

  function renderNavigation() {
    elements.slideList.innerHTML = deck
      .map(
        (slide, index) => `
          <li>
            <button class="nav-button" type="button" data-index="${index}" aria-current="false">
              <span class="nav-index">${String(index + 1).padStart(2, "0")}</span>
              <span class="nav-copy">
                <strong>${renderers.escapeHtml(slide.navTitle || slide.title || slide.statement)}</strong>
                <span>${renderers.escapeHtml(slide.typeLabel || slide.type)}</span>
              </span>
            </button>
          </li>`,
      )
      .join("");
  }

  function renderPrintDeck() {
    elements.printDeck.innerHTML = deck
      .map(
        (slide, index) =>
          `<section class="print-slide">${renderers.render(slide, index, deck.length)}</section>`,
      )
      .join("");
    diagramRenderer?.renderAll(elements.printDeck);
  }

  function render() {
    const slide = deck[currentIndex];
    chartRenderer?.disposeAll(elements.stage);
    elements.stage.innerHTML = renderers.render(slide, currentIndex, deck.length);
    diagramRenderer?.renderAll(elements.stage);
    chartRenderer?.renderAll(elements.stage);
    const article = elements.stage.firstElementChild;
    article.classList.add("is-entering");
    requestAnimationFrame(() => article.classList.remove("is-entering"));

    elements.toolbarType.textContent = slide.typeLabel || slide.type;
    elements.toolbarTitle.textContent =
      slide.navTitle || slide.title || slide.statement;
    elements.pageCounter.textContent = `${String(currentIndex + 1).padStart(2, "0")} / ${String(deck.length).padStart(2, "0")}`;
    elements.prevButton.disabled = currentIndex === 0;
    elements.nextButton.disabled = currentIndex === deck.length - 1;

    elements.slideList.querySelectorAll(".nav-button").forEach((button) => {
      button.setAttribute(
        "aria-current",
        String(Number(button.dataset.index) === currentIndex),
      );
    });

    elements.notesTitle.textContent = `讲者备注 · ${slide.navTitle || slide.title || "当前页"}`;
    elements.notesContent.innerHTML = (slide.notes || ["本页暂无讲者备注。"])
      .map((note) => `<p>${renderers.escapeHtml(note)}</p>`)
      .join("");

    document.title = `${slide.navTitle || slide.title || config.deckTitle || "HTML Slides"} · ${config.deckTitle || "HTML Slides"}`;
  }

  function goTo(index) {
    currentIndex = Math.max(0, Math.min(index, deck.length - 1));
    render();
  }

  async function togglePresent() {
    const presenting = !document.body.classList.contains("presenting");
    document.body.classList.toggle("presenting", presenting);
    setMenuOpen(false);
    setNotesOpen(false);

    if (presenting && document.documentElement.requestFullscreen) {
      try {
        await document.documentElement.requestFullscreen();
      } catch (_) {
        // Presentation styling remains active when fullscreen is unavailable.
      }
    } else if (!presenting && document.fullscreenElement) {
      await document.exitFullscreen();
    }
  }

  async function printDeck() {
    document.body.classList.remove("menu-open", "presenting");
    setMenuOpen(false);
    setNotesOpen(false);
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (_) {
        // Printing can continue when fullscreen exit is declined.
      }
    }
    window.print();
  }

  renderNavigation();
  renderPrintDeck();

  elements.slideList.addEventListener("click", (event) => {
    const button = event.target.closest(".nav-button");
    if (!button) return;
    goTo(Number(button.dataset.index));
    setMenuOpen(false);
  });
  elements.menuButton.addEventListener("click", () =>
    setMenuOpen(!document.body.classList.contains("menu-open")),
  );
  elements.menuScrim.addEventListener("click", () => setMenuOpen(false));
  elements.prevButton.addEventListener("click", () => goTo(currentIndex - 1));
  elements.nextButton.addEventListener("click", () => goTo(currentIndex + 1));
  elements.themeButton.addEventListener("click", () =>
    setTheme(!document.documentElement.classList.contains("dark")),
  );
  elements.notesButton.addEventListener("click", () => setNotesOpen(!notesOpen));
  elements.closeNotesButton.addEventListener("click", () => setNotesOpen(false));
  elements.presentButton.addEventListener("click", togglePresent);
  elements.printButton.addEventListener("click", printDeck);

  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) document.body.classList.remove("presenting");
  });

  window.addEventListener("beforeprint", () => {
    chartRenderer?.renderAll(elements.printDeck);
  });

  window.addEventListener("afterprint", () => {
    chartRenderer?.disposeAll(elements.printDeck);
  });

  document.addEventListener("keydown", (event) => {
    const activeTag = document.activeElement?.tagName;
    if (["INPUT", "TEXTAREA", "SELECT", "VIDEO"].includes(activeTag)) return;

    if (
      ["ArrowRight", "ArrowDown", "PageDown"].includes(event.key) ||
      event.key === " "
    ) {
      event.preventDefault();
      goTo(currentIndex + 1);
    } else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(event.key)) {
      event.preventDefault();
      goTo(currentIndex - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      goTo(0);
    } else if (event.key === "End") {
      event.preventDefault();
      goTo(deck.length - 1);
    } else if (event.key.toLowerCase() === "n") {
      event.preventDefault();
      setNotesOpen(!notesOpen);
    } else if (event.key.toLowerCase() === "f") {
      event.preventDefault();
      togglePresent();
    } else if (
      event.key.toLowerCase() === "p" &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey
    ) {
      event.preventDefault();
      printDeck();
    } else if (event.key === "Escape") {
      setNotesOpen(false);
      setMenuOpen(false);
    }
  });

  const savedTheme = storageGet("html-slides-theme");
  const systemDark =
    window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  setMenuOpen(false);
  setTheme(savedTheme ? savedTheme === "dark" : systemDark);
  render();
})();
