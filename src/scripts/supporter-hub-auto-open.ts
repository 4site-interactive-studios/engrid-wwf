// Opens a Supporter Hub gadget (e.g. "Manage my recurring gift") as soon as
// the hub loads and shows it inline, as part of the page, instead of as a
// lightbox. Supporters coming from an email land on the open widget.
//
// Opt-in per page with a Code Block on the Supporter Hub page:
//
//   <script>
//     window.EngridSupporterHubAutoOpen = "PLEDGE";
//   </script>
//
// The value is the gadget's data-componenttype ("PLEDGE" for "Manage my
// recurring gift"). Only PLEDGE has been validated.
//
// How it works:
// - Engaging Networks routes hub gadgets through the URL hash
//   (#gadget/{componentId}/{type}): setting the hash opens the gadget and
//   clearing it closes it. We reuse that router instead of faking clicks.
// - EN appends the overlay to the form when it opens. We move it right after
//   the gadget tile, hide the tile, and restyle the overlay
//   (src/sass/supporter-hub-inline.scss).
// - ENgrid's SupporterHub component treats the overlay as a modal (inert page,
//   aria-modal, Escape closes it). We undo that while the overlay is inline.
// - If the overlay is closed for any reason, we open it again, so the widget
//   is always on the page.
import { A11y, ENGrid, EngridLogger } from "@4site/engrid-scripts";

declare global {
  interface Window {
    EngridSupporterHubAutoOpen?: string;
  }
}

export class SupporterHubAutoOpen {
  private logger: EngridLogger = new EngridLogger(
    "SupporterHubAutoOpen",
    "black",
    "pink",
    "🎁"
  );
  // How long to wait for EN's hash router before falling back to a click
  private fallbackDelay: number = 1500;
  // Guard against reopening in a loop if EN keeps closing the overlay
  private maxReopens: number = 3;
  private reopenWindow: number = 10000;
  private reopenTimestamps: number[] = [];

  private inlineClass: string = "engrid-hub-inline";
  private hiddenGadgetClass: string = "engrid-hub-inline__gadget";
  private backButtonClass: string = "engrid-hub-inline__back";

  private gadgetType: string = "";
  private gadget: HTMLElement | null = null;
  private componentId: string = "";
  private hasShownList: boolean = false;
  private isReturningToList: boolean = false;

  constructor() {
    if (!this.shouldRun()) return;
    this.watchOverlay();
    this.watchModalAttributes();
    this.blockEscape();

    const overlay = this.getOverlay();
    if (overlay) {
      this.makeInline(overlay);
    } else if (!window.location.hash.startsWith("#gadget/")) {
      this.open();
    } else {
      // Another gadget is being opened from the URL, let EN handle it
      this.logger.log("Another gadget hash is present, not opening");
    }
  }

  private shouldRun(): boolean {
    if (ENGrid.getPageType() !== "SUPPORTERHUB") return false;

    const setting = window.EngridSupporterHubAutoOpen;
    if (typeof setting !== "string" || setting.trim() === "") return false;
    this.gadgetType = setting.trim().toUpperCase();

    this.gadget = document.querySelector(
      `.en__component--hubgadget[data-componenttype="${this.gadgetType}"]:not(.en__component--hubgadget--inactive)`
    ) as HTMLElement | null;
    this.componentId = this.gadget?.dataset.componentid ?? "";

    if (!this.gadget || !this.componentId) {
      this.logger.log(`No active ${this.gadgetType} gadget found on this page`);
      return false;
    }
    return true;
  }

  private getOverlaySelector(): string {
    return `.en__hubOverlay.en__hubOverlay--${this.gadgetType.toLowerCase()}`;
  }

  private getOverlay(): HTMLElement | null {
    return document.querySelector(this.getOverlaySelector());
  }

  private getGadgetHash(): string {
    return `#gadget/${this.componentId}/${this.gadgetType.toLowerCase()}`;
  }

  private open() {
    const gadget = this.gadget as HTMLElement;
    gadget.classList.add(this.hiddenGadgetClass);
    this.logger.log(`Opening ${this.gadgetType} gadget ${this.componentId}`);

    if (window.location.hash === this.getGadgetHash()) {
      // Same hash means no hashchange event, so EN won't react to it
      gadget.click();
    } else {
      // replace() doesn't add a history entry, so the browser Back button
      // leaves the page instead of closing the widget
      window.location.replace(this.getGadgetHash());
    }

    window.setTimeout(() => {
      if (this.getOverlay()) return;
      this.logger.log("Overlay not found after setting the hash, clicking gadget");
      gadget.click();
      // Still nothing: show the tile again so the supporter can open it
      window.setTimeout(() => {
        if (!this.getOverlay()) {
          this.logger.log("Overlay didn't open, showing the gadget tile");
          gadget.classList.remove(this.hiddenGadgetClass);
        }
      }, this.fallbackDelay);
    }, this.fallbackDelay);
  }

  private reopen() {
    const now = Date.now();
    this.reopenTimestamps = this.reopenTimestamps.filter(
      (time) => now - time < this.reopenWindow
    );
    if (this.reopenTimestamps.length >= this.maxReopens) {
      this.logger.log("Overlay closed too many times, not reopening");
      this.gadget?.classList.remove(this.hiddenGadgetClass);
      return;
    }
    this.reopenTimestamps.push(now);
    this.open();
  }

  // EN adds and removes the overlay (and swaps the list and edit views inside
  // it) as the supporter navigates, so we watch the whole form.
  private watchOverlay() {
    const form = document.querySelector(".en__component--page");
    if (!form) return;
    const overlaySelector = this.getOverlaySelector();

    new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches(overlaySelector)) {
            this.makeInline(node);
            return;
          }
          const overlay = node.closest(overlaySelector) as HTMLElement | null;
          if (!overlay) return;
          if (this.containsOrMatches(node, ".en__hubPledge__list--list")) {
            this.onListShown(overlay);
          }
          // After saving, EN re-renders the panels inside the same state
          // ("Your recurring gift has been updated"), which removes the
          // back button, so also look for the state around the node
          const state =
            this.findOrMatch(node, ".en__hubPledge__state") ??
            (node.closest(".en__hubPledge__state") as HTMLElement | null);
          if (state) this.addBackButton(state);
        });
        record.removedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          // Moving the overlay also fires a removal; skip it while it's
          // still in the document
          if (node.matches(overlaySelector) && !node.isConnected) {
            this.logger.log("Overlay closed, opening it again");
            this.reopen();
          }
        });
      });
    }).observe(form, { childList: true, subtree: true });
  }

  private makeInline(overlay: HTMLElement) {
    const gadget = this.gadget as HTMLElement;
    overlay.classList.add(this.inlineClass);
    gadget.classList.add(this.hiddenGadgetClass);
    if (overlay.previousElementSibling !== gadget) {
      this.logger.log("Moving overlay inline");
      gadget.insertAdjacentElement("afterend", overlay);
    }
    this.removeModalBehavior(overlay);

    if (overlay.querySelector(".en__hubPledge__list--list")) {
      this.onListShown(overlay);
    }
    const state = overlay.querySelector(
      ".en__hubPledge__state"
    ) as HTMLElement | null;
    if (state) this.addBackButton(state);
  }

  // Undo what ENgrid's SupporterHub does to treat the overlay as a modal
  private removeModalBehavior(overlay: HTMLElement) {
    const popup = overlay.querySelector(".en__hubOverlay__popup");
    if (popup) {
      if (popup.getAttribute("role") !== "region") {
        popup.setAttribute("role", "region");
      }
      if (popup.hasAttribute("aria-modal")) {
        popup.removeAttribute("aria-modal");
      }
    }
    if (document.querySelector("[data-engrid-inert]")) {
      A11y.inertPage(false);
    }
  }

  // ENgrid re-applies the modal attributes on a timer each time the overlay
  // or its edit view renders, so we keep removing them while inline
  private watchModalAttributes() {
    new MutationObserver(() => {
      const overlay = this.getOverlay();
      if (!overlay || !overlay.classList.contains(this.inlineClass)) return;
      this.removeModalBehavior(overlay);
    }).observe(document.body, {
      attributes: true,
      attributeFilter: ["inert", "aria-modal", "role"],
      subtree: true,
    });
  }

  // ENgrid closes the overlay on Escape. Inline, Escape shouldn't remove the
  // widget from the page.
  private blockEscape() {
    window.addEventListener(
      "keydown",
      (event) => {
        if (event.key !== "Escape") return;
        if (!this.getOverlay()?.classList.contains(this.inlineClass)) return;
        event.stopImmediatePropagation();
      },
      true
    );
  }

  private onListShown(overlay: HTMLElement) {
    this.hasShownList = true;
    if (!this.isReturningToList) return;
    this.isReturningToList = false;

    const heading = overlay.querySelector(
      ".en__hubPledge__list__header h3"
    ) as HTMLElement | null;
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
    if (overlay.getBoundingClientRect().top < 0) {
      overlay.scrollIntoView({ block: "start" });
    }
  }

  // EN's edit view has no way back to the list of gifts other than closing
  // the overlay, which is hidden inline
  private addBackButton(state: HTMLElement) {
    if (!this.hasShownList) return;
    if (state.querySelector(`.${this.backButtonClass}`)) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = this.backButtonClass;
    button.textContent = "Back to my gifts";
    button.addEventListener("click", () => this.returnToList());
    // The state is a flex row (icon + panels), so the button goes on top of
    // the panels column
    const panels = state.querySelector(".en__hubPledge__panels") ?? state;
    panels.insertAdjacentElement("afterbegin", button);
  }

  // Clearing the hash makes EN close the overlay; watchOverlay() then opens
  // it again, which starts on the list of gifts
  private returnToList() {
    this.logger.log("Returning to the list of gifts");
    this.isReturningToList = true;
    window.location.replace("#");
  }

  private containsOrMatches(node: HTMLElement, selector: string): boolean {
    return node.matches(selector) || !!node.querySelector(selector);
  }

  private findOrMatch(node: HTMLElement, selector: string): HTMLElement | null {
    if (node.matches(selector)) return node;
    return node.querySelector(selector) as HTMLElement | null;
  }
}
