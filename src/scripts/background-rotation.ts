// Within the page-backgroundImage block, if there is a parent div with a class of 'background-rotation', then the background image will rotate every 5 seconds
// The image rotates on a cross-fade transition, and the next image is randomly selected from the list of child elements with a class of 'background-image-item' within the 'background-rotation' div
// The random selection of the next image is done in a way that ensures that the same image is not displayed twice in a row, and that all images are displayed before any image is repeated
// On mobile, the background image will not rotate, and a random image in the list will be displayed as a static background image
// The background image will also not rotate if the user has set a preference for reduced motion in their system settings
// Figattributes/figcaptions, if included on the image, will also need to be updated to reflect the new image being displayed
// Each image item can include a theme="light" or theme="dark" (default) attribute, which switches the .body-title h1 text color so it stays visible over the current background image (>1200px layout only)
// Options block:
/**
 * Set via the default options, overridden by the options passed to the constructor, and overridden by a window-level variable called 'BackgroundRotationOptions' if it exists. The options are as follows:
 * enabled: Whether the background rotation is enabled (default: true)
 * interval: The interval in milliseconds between image rotations (default: 5000)
 * transitionDuration: The duration of the cross-fade transition in milliseconds (default: 500)
 * transitionClass: The CSS class to apply to the background image container during the transition (default: 'background-rotation-transition')
 * eachImageSelector: The CSS selector for each individual background image (default: '.background-image-item')
 * backgroundImageSelector: The CSS selector for the background image container (default: '.background-rotation')
 * slideOrder: The order in which the images are displayed (default: 'random' [random-bag], other options: 'sequential', 'true-random')
 * randomStart: Whether to start the rotation at a random image (default: true)
 * reducedMotion: Whether to respect the user's preference for reduced motion (default: true)
 * rotateOnMobile: Whether to rotate the background image on mobile devices (default: false)
 * controls: Whether to add back, pause, and forward buttons for the rotation (default: false)
 */

import { ENGrid, EngridLogger } from "@4site/engrid-scripts";

type BackgroundRotationSlideOrder = "random" | "sequential" | "true-random";

interface BackgroundRotationOptions {
  enabled: boolean;
  interval: number;
  transitionDuration: number;
  transitionClass: string;
  eachImageSelector: string;
  backgroundImageSelector: string;
  slideOrder: BackgroundRotationSlideOrder;
  randomStart: boolean;
  reducedMotion: boolean;
  rotateOnMobile: boolean;
  controls: boolean;
}

export class BackgroundRotation {
  private logger: EngridLogger = new EngridLogger(
    "BackgroundRotation",
    "white",
    "rebeccapurple",
    "🌄"
  );
  private defaultOptions: BackgroundRotationOptions = {
    enabled: true,
    interval: 5000,
    transitionDuration: 500,
    transitionClass: "background-rotation-transition",
    eachImageSelector: ".background-image-item",
    backgroundImageSelector: ".background-rotation",
    slideOrder: "random",
    randomStart: true,
    reducedMotion: true,
    rotateOnMobile: false,
    controls: false,
  };
  private options: BackgroundRotationOptions;
  private container: HTMLElement | null = null;
  private items: HTMLElement[] = [];
  private layers: HTMLElement[] = [];
  private currentIndex = -1;
  private randomBag: number[] = [];
  private history: number[] = [];
  private isPaused = false;
  private interactionPauses = new Set<"hover" | "focus">();
  private previousButton: HTMLButtonElement | null = null;
  private pauseButton: HTMLButtonElement | null = null;
  private liveRegion: HTMLElement | null = null;
  private rotationTimer: number | null = null;
  private transitionTimer: number | null = null;
  private mobileMediaQuery = window.matchMedia("(max-width: 1023px)");
  private reducedMotionMediaQuery = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  constructor(options: Partial<BackgroundRotationOptions> = {}) {
    this.options = {
      ...this.defaultOptions,
      ...options,
      ...((window as any).BackgroundRotationOptions ?? {}),
    };
    if (!this.shouldRun()) return;
    this.container = document.querySelector(
      `.page-backgroundImage ${this.options.backgroundImageSelector}`
    );
    this.items = Array.from(
      this.container!.querySelectorAll<HTMLElement>(
        this.options.eachImageSelector
      )
    );
    this.container!.style.setProperty(
      "--background-rotation-transition-duration",
      `${this.options.transitionDuration}ms`
    );
    document.body.style.setProperty(
      "--background-rotation-transition-duration",
      `${this.options.transitionDuration}ms`
    );
    this.prepareItems();
    if (this.items.length === 1) {
      this.showStaticImage();
      return;
    }
    this.updateMode();
    if (!this.options.rotateOnMobile) {
      this.mobileMediaQuery.addEventListener("change", () =>
        this.updateMode()
      );
    }
    if (this.options.reducedMotion) {
      this.reducedMotionMediaQuery.addEventListener("change", () =>
        this.updateMode()
      );
    }
    if (this.options.controls) {
      this.createControls();
    }
  }

  private shouldRun(): boolean {
    if (!this.options.enabled) {
      this.logger.log("Background rotation is disabled");
      return false;
    }
    const container = document.querySelector(
      `.page-backgroundImage ${this.options.backgroundImageSelector}`
    );
    if (!container) return false;
    if (!container.querySelector(this.options.eachImageSelector)) {
      this.logger.log("No background image items found to rotate");
      return false;
    }
    return true;
  }

  private prepareItems() {
    this.items.forEach((item, index) => {
      const layer = this.getItemLayer(item);
      const imageUrl = this.getItemImageUrl(item);
      if (imageUrl) {
        layer.style.backgroundImage = `url('${imageUrl}')`;
      } else {
        this.logger.log("Background image item has no image source", item);
      }
      layer.classList.add("background-rotation-layer");
      layer.setAttribute("aria-hidden", "true");
      this.layers[index] = layer;
    });
  }

  // The item is typically the <img> tag itself. If MediaAttribution has wrapped
  // it in a <figure class="media-with-attribution">, the figure becomes the fade
  // layer so its figattribution cross-fades in sync with the image
  private getItemLayer(item: HTMLElement): HTMLElement {
    if (
      item instanceof HTMLImageElement &&
      item.parentElement?.matches("figure.media-with-attribution")
    ) {
      return item.parentElement;
    }
    return item;
  }

  private getItemImage(item: HTMLElement): HTMLImageElement | null {
    if (item instanceof HTMLImageElement) return item;
    return item.querySelector("img");
  }

  private getItemImageUrl(item: HTMLElement): string | null {
    const img = this.getItemImage(item);
    if (!img) return null;
    return img.getAttribute("data-src") || img.getAttribute("src");
  }

  private isStaticMode(): boolean {
    if (
      this.options.reducedMotion &&
      this.reducedMotionMediaQuery.matches
    ) {
      return true;
    }
    if (!this.options.rotateOnMobile && this.mobileMediaQuery.matches) {
      return true;
    }
    return false;
  }

  // Starts or stops the rotation based on the current viewport and motion
  // preferences, called on page load and whenever they change
  private updateMode() {
    if (this.isStaticMode()) {
      this.stopRotation();
      if (this.currentIndex === -1) {
        this.showStaticImage();
      } else {
        ENGrid.setBodyData("background-rotation", "static");
      }
      this.logger.log("Static background image mode");
      return;
    }
    if (this.rotationTimer !== null) return;
    const startIndex =
      this.currentIndex !== -1
        ? this.currentIndex
        : this.options.randomStart
        ? this.getRandomIndex()
        : 0;
    this.setActiveItem(startIndex);
    ENGrid.setBodyData("background-rotation", "active");
    if (!this.isPaused) this.startRotationTimer();
    this.logger.log(
      `Rotating ${this.items.length} background images every ${this.options.interval}ms`
    );
  }

  private startRotationTimer() {
    this.stopRotationTimer();
    this.rotationTimer = window.setInterval(
      () => this.rotateToNextImage(),
      this.options.interval
    );
  }

  private stopRotationTimer() {
    if (this.rotationTimer !== null) {
      window.clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }
  }

  private stopRotation() {
    this.stopRotationTimer();
    // Settle any in-progress transition so only the current image stays visible
    window.clearTimeout(this.transitionTimer ?? undefined);
    this.layers.forEach((layer, index) => {
      if (index !== this.currentIndex) {
        layer.classList.remove("active");
        layer.setAttribute("aria-hidden", "true");
      }
    });
    this.container?.classList.remove(this.options.transitionClass);
  }

  private showStaticImage() {
    const index = this.options.randomStart ? this.getRandomIndex() : 0;
    this.setActiveItem(index);
    ENGrid.setBodyData("background-rotation", "static");
  }

  private setActiveItem(index: number) {
    const layer = this.layers[index];
    if (!layer) return;
    layer.classList.add("active");
    layer.removeAttribute("aria-hidden");
    this.currentIndex = index;
    const imageUrl = this.getItemImageUrl(this.items[index]);
    if (imageUrl) {
      document.body.style.setProperty(
        "--background-rotation-image",
        `url('${imageUrl}')`
      );
    }
    setTimeout(() => {
      ENGrid.setBodyData(
        "background-rotation-theme",
        this.getItemTheme(this.items[index])
      );
    }, 300);
    this.logger.log(
      "Active background image",
      index + 1,
      "of",
      this.items.length,
      this.getItemAttribution(this.items[index]) ?? ""
    );
  }

  private rotateToNextImage() {
    this.goToImage(this.getNextIndex());
  }

  private goToImage(nextIndex: number, addToHistory = true) {
    if (nextIndex === this.currentIndex) return;
    if (addToHistory && this.currentIndex !== -1) {
      this.history.push(this.currentIndex);
      if (this.history.length > this.items.length * 2) this.history.shift();
    }
    this.updatePreviousButtonState();
    const previousLayer = this.layers[this.currentIndex];
    this.container!.classList.add(this.options.transitionClass);
    this.setActiveItem(nextIndex);
    window.clearTimeout(this.transitionTimer ?? undefined);
    this.transitionTimer = window.setTimeout(() => {
      previousLayer?.classList.remove("active");
      previousLayer?.setAttribute("aria-hidden", "true");
      this.container!.classList.remove(this.options.transitionClass);
    }, this.options.transitionDuration);
  }

  private goToNextImage() {
    this.goToImage(this.getNextIndex());
    this.announceImage();
    if (!this.isPaused) this.startRotationTimer();
  }

  private goToPreviousImage() {
    const previousIndex = this.history.pop();
    if (previousIndex === undefined) {
      this.logger.log("No previous background image in the history");
      return;
    }
    this.goToImage(previousIndex, false);
    this.announceImage();
    if (!this.isPaused) this.startRotationTimer();
  }

  private togglePause() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.stopRotationTimer();
      this.logger.log("Background rotation paused");
    } else {
      this.startRotationTimer();
      this.logger.log("Background rotation resumed");
    }
    this.updatePauseButton();
  }

  private createControls() {
    const controls = document.createElement("div");
    controls.className = "background-rotation-controls";
    controls.setAttribute("role", "group");
    controls.setAttribute("aria-label", "Background image rotation controls");

    // Pause the auto-rotation while the user is hovering or tabbing through the
    // controls, so nobody has to chase a moving target
    controls.addEventListener("mouseenter", () =>
      this.pauseForInteraction("hover")
    );
    controls.addEventListener("mouseleave", () =>
      this.resumeFromInteraction("hover")
    );
    controls.addEventListener("focusin", () =>
      this.pauseForInteraction("focus")
    );
    controls.addEventListener("focusout", (event) => {
      if (!controls.contains(event.relatedTarget as Node)) {
        this.resumeFromInteraction("focus");
      }
    });

    this.previousButton = this.createControlButton(
      "background-rotation-prev",
      "Previous background image",
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>'
    );
    this.previousButton.addEventListener("click", () =>
      this.goToPreviousImage()
    );

    this.pauseButton = this.createControlButton(
      "background-rotation-pause",
      "Pause background rotation",
      this.pauseIcon()
    );
    this.pauseButton.setAttribute("aria-pressed", "false");
    this.pauseButton.addEventListener("click", () => this.togglePause());

    const nextButton = this.createControlButton(
      "background-rotation-next",
      "Next background image",
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>'
    );
    nextButton.addEventListener("click", () => this.goToNextImage());

    this.liveRegion = document.createElement("div");
    this.liveRegion.className = "engrid__sr-only";
    this.liveRegion.setAttribute("aria-live", "polite");
    this.liveRegion.setAttribute("aria-atomic", "true");

    controls.append(
      this.previousButton,
      this.pauseButton,
      nextButton,
      this.liveRegion
    );
    document.body.appendChild(controls);
    this.updatePreviousButtonState();
  }

  // Auto-rotation pauses while the user interacts with the controls, separately
  // from a user-initiated pause, and resumes when the interaction ends
  private pauseForInteraction(kind: "hover" | "focus") {
    this.interactionPauses.add(kind);
    if (!this.isPaused) this.stopRotationTimer();
  }

  private resumeFromInteraction(kind: "hover" | "focus") {
    this.interactionPauses.delete(kind);
    if (
      this.interactionPauses.size === 0 &&
      !this.isPaused &&
      this.rotationTimer === null &&
      !this.isStaticMode()
    ) {
      this.startRotationTimer();
    }
  }

  private updatePreviousButtonState() {
    if (this.previousButton) {
      this.previousButton.disabled = this.history.length === 0;
    }
  }

  // Announce user-initiated image changes to screen readers. Auto-rotation is
  // intentionally not announced to avoid interrupting every few seconds.
  private announceImage() {
    if (!this.liveRegion) return;
    const item = this.items[this.currentIndex];
    const description =
      this.getItemImage(item)?.getAttribute("alt") ||
      this.getItemAttribution(item);
    this.liveRegion.textContent = `Background image ${
      this.currentIndex + 1
    } of ${this.items.length}${description ? `: ${description}` : ""}`;
  }

  private createControlButton(
    className: string,
    ariaLabel: string,
    icon: string
  ): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.setAttribute("aria-label", ariaLabel);
    button.innerHTML = icon;
    return button;
  }

  private updatePauseButton() {
    if (!this.pauseButton) return;
    this.pauseButton.innerHTML = this.isPaused
      ? this.playIcon()
      : this.pauseIcon();
    this.pauseButton.setAttribute(
      "aria-label",
      this.isPaused ? "Play background rotation" : "Pause background rotation"
    );
    this.pauseButton.setAttribute("aria-pressed", String(this.isPaused));
  }

  private pauseIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>';
  }

  private playIcon(): string {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  }

  private getNextIndex(): number {
    switch (this.options.slideOrder) {
      case "sequential":
        return (this.currentIndex + 1) % this.items.length;
      case "true-random":
        return this.getRandomIndex(this.currentIndex);
      case "random":
      default:
        return this.getNextFromRandomBag();
    }
  }

  // "Random bag" selection: every image is displayed once before any image is
  // repeated, and the current image is never repeated back-to-back
  private getNextFromRandomBag(): number {
    if (this.randomBag.length === 0) {
      this.randomBag = this.items
        .map((_, index) => index)
        .filter((index) => index !== this.currentIndex);
      for (let i = this.randomBag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.randomBag[i], this.randomBag[j]] = [
          this.randomBag[j],
          this.randomBag[i],
        ];
      }
    }
    return this.randomBag.pop() as number;
  }

  private getRandomIndex(excludeIndex = -1): number {
    if (this.items.length <= 1) return 0;
    let index = excludeIndex;
    while (index === excludeIndex) {
      index = Math.floor(Math.random() * this.items.length);
    }
    return index;
  }

  // Each item can set a theme="light" or theme="dark" (default) attribute to
  // control the .body-title h1 text color shown over its image
  private getItemTheme(item: HTMLElement): "light" | "dark" {
    return item.getAttribute("theme")?.toLowerCase() === "light"
      ? "light"
      : "dark";
  }

  // Each item carries its own figattribution/figcaption (added by the MediaAttribution
  // component or authored directly), so it cross-fades in sync with its image
  private getItemAttribution(item: HTMLElement): string | null {
    const attribution = item.matches("img")
      ? item.parentElement?.querySelector("figattribution, figcaption")
      : item.querySelector("figattribution, figcaption");
    return attribution ? attribution.textContent : null;
  }
}
