// Sends a GA4 "purchase" event to the dataLayer when a supporter changes the
// amount of a recurring gift in the Upgrade Hub (increase or decrease).
//
// Runs on the same pages as SupporterHubAutoOpen (window.EngridSupporterHubAutoOpen
// set in a Code Block on a Supporter Hub page).
//
// How it works:
// - EN saves a recurring gift with a PUT to
//   /page/{pageId}/hubgadget/{gadgetId}/pledge/recurring/{recurringId}, with
//   the new amount in the JSON body ({ recurring: { amount } }), only when the
//   amount changed. We watch those requests and push the event once EN gets
//   a successful response.
// - The body doesn't have the previous amount, so we load the donor's gifts
//   when the page loads (same request EN makes for the gadget) and keep each
//   gift's current amount, updated after every save.
// - Increases and decreases are sent (amount_increase is negative for a
//   decrease). The same amount, or a save that only changes the card or the
//   payment day, sends nothing.
import { ENGrid, EngridLogger } from "@4site/engrid-scripts";

declare global {
  interface Window {
    dataLayer: any[];
  }
}

export class SupporterHubUpgradeTracking {
  private logger: EngridLogger = new EngridLogger(
    "SupporterHubUpgradeTracking",
    "black",
    "pink",
    "📈"
  );
  private updateUrlPattern = /\/hubgadget\/\d+\/pledge\/recurring\/(\d+)/;
  // Current amount of each recurring gift, by recurring id
  private giftAmounts: Record<string, number> = {};

  constructor() {
    if (!this.shouldRun()) return;
    this.loadGiftAmounts();
    this.watchGiftUpdates();
  }

  private shouldRun(): boolean {
    const setting = window.EngridSupporterHubAutoOpen;
    return (
      ENGrid.getPageType() === "SUPPORTERHUB" &&
      typeof setting === "string" &&
      setting.trim().toUpperCase() === "PLEDGE" &&
      !!this.getGadgetId()
    );
  }

  private getGadgetId(): string | undefined {
    const gadget = document.querySelector<HTMLElement>(
      '.en__component--hubgadget[data-componenttype="PLEDGE"]'
    );
    return gadget?.dataset.componentid;
  }

  private async loadGiftAmounts() {
    const pageId = window.location.pathname.match(/\/page\/(\d+)/)?.[1];
    if (!pageId) return;
    try {
      const response = await fetch(
        `/page/${pageId}/hubgadget/${this.getGadgetId()}/pledge`,
        { credentials: "same-origin" }
      );
      const json = await response.json();
      (json?.data?.recurringTxns ?? []).forEach((gift: any) => {
        const amount = parseFloat(gift.amount);
        if (!isNaN(amount)) this.giftAmounts[String(gift.id)] = amount;
      });
      this.logger.log(`Loaded ${Object.keys(this.giftAmounts).length} gifts`);
    } catch (error) {
      this.logger.log("Couldn't load the gifts, upgrades won't be tracked");
    }
  }

  // EN sends the update with XMLHttpRequest. We tag the PUT requests to the
  // recurring gift endpoint in open() and listen for their response in send()
  private watchGiftUpdates() {
    const tracking = this;
    const open = XMLHttpRequest.prototype.open;
    const send = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (
      this: XMLHttpRequest & { engridRecurringId?: string },
      method: string,
      url: string | URL,
      ...rest: any[]
    ) {
      this.engridRecurringId =
        method.toUpperCase() === "PUT"
          ? String(url).match(tracking.updateUrlPattern)?.[1]
          : undefined;
      return (open as any).call(this, method, url, ...rest);
    } as typeof XMLHttpRequest.prototype.open;

    XMLHttpRequest.prototype.send = function (
      this: XMLHttpRequest & { engridRecurringId?: string },
      body?: any
    ) {
      const recurringId = this.engridRecurringId;
      if (recurringId) {
        this.addEventListener("load", () => {
          if (this.status >= 200 && this.status < 300) {
            tracking.onGiftUpdated(recurringId, body);
          }
        });
      }
      return send.call(this, body);
    };
  }

  private onGiftUpdated(recurringId: string, body: unknown) {
    let newAmount = NaN;
    try {
      newAmount = parseFloat(JSON.parse(String(body))?.recurring?.amount);
    } catch (error) {
      return;
    }
    // No amount in the body: only the card or payment day changed
    if (isNaN(newAmount)) return;

    const previousAmount = this.giftAmounts[recurringId];
    this.giftAmounts[recurringId] = newAmount;
    if (previousAmount === undefined) {
      this.logger.log(`Gift ${recurringId} updated, but its previous amount is unknown`);
      return;
    }
    if (newAmount === previousAmount) return;
    this.pushPurchase(recurringId, previousAmount, newAmount);
  }

  private pushPurchase(
    recurringId: string,
    previousAmount: number,
    newAmount: number
  ) {
    const event = {
      event: "purchase",
      ecommerce: {
        transaction_id: `upg_${recurringId}_${this.timestamp()}`,
        value: newAmount,
        currency: "USD",
        previous_amount: previousAmount,
        amount_increase: this.round(newAmount - previousAmount),
        items: [
          {
            item_name: "recurring-upsell",
            price: newAmount,
            quantity: 1,
          },
        ],
      },
    };
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(event);
    this.logger.log(`Pushed purchase event ${event.ecommerce.transaction_id}`);
  }

  // yyyymmddhhmm in UTC, so the id doesn't depend on the donor's time zone
  private timestamp(): string {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, "0");
    return (
      `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
      `${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}`
    );
  }

  // Avoids results like 5.000000000000001
  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
