(() => {
  const deck = window.HTML_SLIDES_STATIC_DECK || [];
  const config = window.HTML_SLIDES_STATIC_CONFIG || {};
  const staticAssets = window.HTML_SLIDES_STATIC_ASSETS || {};

  if (!Array.isArray(deck) || deck.length === 0) {
    throw new Error("Static HTML Slides failed to load its deck.");
  }

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
  };

  let currentIndex = 0;
  let notesOpen = false;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
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

  function slideTitle(slide) {
    return slide.navTitle || slide.title || slide.statement || "当前页";
  }

  function hydrateStaticAssets(root) {
    ["src", "poster"].forEach((attribute) => {
      root.querySelectorAll(`[data-static-${attribute}]`).forEach((element) => {
        const key = element.dataset[`static${attribute[0].toUpperCase()}${attribute.slice(1)}`];
        const value = staticAssets[key];
        if (!value) {
          throw new Error(`Static HTML Slides is missing asset ${key}.`);
        }
        element.setAttribute(attribute, value);
        element.removeAttribute(`data-static-${attribute}`);
      });
    });
  }

  function renderNavigation() {
    elements.slideList.innerHTML = deck
      .map(
        (slide, index) => `
          <li>
            <button class="nav-button" type="button" data-index="${index}" aria-current="false">
              <span class="nav-index">${String(index + 1).padStart(2, "0")}</span>
              <span class="nav-copy">
                <strong>${escapeHtml(slideTitle(slide))}</strong>
                <span>${escapeHtml(slide.typeLabel || slide.type || "")}</span>
              </span>
            </button>
          </li>`,
      )
      .join("");
  }

  function render() {
    const slide = deck[currentIndex];
    elements.stage.innerHTML = slide.html;
    hydrateStaticAssets(elements.stage);
    const article = elements.stage.firstElementChild;
    article?.classList.add("is-entering");
    requestAnimationFrame(() => article?.classList.remove("is-entering"));

    elements.toolbarType.textContent = slide.typeLabel || slide.type || "";
    elements.toolbarTitle.textContent = slideTitle(slide);
    elements.pageCounter.textContent = `${String(currentIndex + 1).padStart(2, "0")} / ${String(deck.length).padStart(2, "0")}`;
    elements.prevButton.disabled = currentIndex === 0;
    elements.nextButton.disabled = currentIndex === deck.length - 1;

    elements.slideList.querySelectorAll(".nav-button").forEach((button) => {
      button.setAttribute(
        "aria-current",
        String(Number(button.dataset.index) === currentIndex),
      );
    });

    elements.notesTitle.textContent = `讲者备注 · ${slideTitle(slide)}`;
    elements.notesContent.innerHTML = (slide.notes || ["本页暂无讲者备注。"])
      .map((note) => `<p>${escapeHtml(note)}</p>`)
      .join("");
    document.title = `${slideTitle(slide)} · ${config.deckTitle || "HTML Slides"}`;
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

  // Static SVG exports use one selected theme. Remove controls that cannot
  // change already-materialized SVG colors.
  elements.themeButton?.remove();
  document.documentElement.classList.toggle("dark", config.theme === "dark");

  renderNavigation();
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
  elements.notesButton.addEventListener("click", () => setNotesOpen(!notesOpen));
  elements.closeNotesButton.addEventListener("click", () => setNotesOpen(false));
  elements.presentButton.addEventListener("click", togglePresent);
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) document.body.classList.remove("presenting");
  });
  document.addEventListener("keydown", (event) => {
    const activeTag = document.activeElement?.tagName;
    if (["INPUT", "TEXTAREA", "SELECT", "VIDEO"].includes(activeTag)) return;
    if (["ArrowRight", "ArrowDown", "PageDown"].includes(event.key) || event.key === " ") {
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
    } else if (event.key === "Escape") {
      setNotesOpen(false);
      setMenuOpen(false);
    }
  });
  setMenuOpen(false);
  render();
})();
