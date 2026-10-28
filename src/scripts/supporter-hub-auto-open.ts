// Opens a Supporter Hub gadget (e.g. "Manage my recurring gift") as soon as
// the hub loads, so supporters coming from an email land on the open widget.
//
// Opt-in per page with a Code Block on the Supporter Hub page:
//
//   <script>
//     window.EngridSupporterHubAutoOpen = "PLEDGE";
//   </script>
//
// The value is the gadget's data-componenttype ("PLEDGE" for "Manage my
// recurring gift").
//
// Engaging Networks routes hub gadgets through the URL hash
// (#gadget/{componentId}/{type}): setting the hash opens the gadget, and
// closing it clears the hash. We reuse that router instead of faking a click.
import { ENGrid, EngridLogger } from "@4site/engrid-scripts";

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

  constructor() {
    if (!this.shouldRun()) return;
    this.open();
  }

  private shouldRun(): boolean {
    if (ENGrid.getPageType() !== "SUPPORTERHUB") return false;
    if (!this.getGadgetType()) return false;
    // A gadget is already being opened from the URL, let EN handle it
    if (window.location.hash.startsWith("#gadget/")) {
      this.logger.log("Gadget hash already present, skipping");
      return false;
    }
    return true;
  }

  private getGadgetType(): string | null {
    const setting = window.EngridSupporterHubAutoOpen;
    if (typeof setting === "string" && setting.trim() !== "") {
      return setting.trim().toUpperCase();
    }
    return null;
  }

  private open() {
    const gadgetType = this.getGadgetType() as string;
    const gadget = document.querySelector(
      `.en__component--hubgadget[data-componenttype="${gadgetType}"]:not(.en__component--hubgadget--inactive)`
    ) as HTMLElement | null;
    const componentId = gadget?.dataset.componentid;

    if (!gadget || !componentId) {
      this.logger.log(`No active ${gadgetType} gadget found on this page`);
      return;
    }

    this.logger.log(`Opening ${gadgetType} gadget ${componentId}`);
    window.location.hash = `gadget/${componentId}/${gadgetType.toLowerCase()}`;

    // Safety net: if EN's router didn't pick up the hash, open it with a click
    window.setTimeout(() => {
      if (document.querySelector(".en__hubOverlay")) return;
      this.logger.log("Overlay not found after setting the hash, clicking gadget");
      gadget.click();
    }, this.fallbackDelay);
  }
}
