// This script hides the premium gift options for the annual frequency until the amount is
// greater than the minimum amount for the one-time frequency.
import {
  DonationAmount,
  DonationFrequency,
  ENGrid,
  EngridLogger,
} from "@4site/engrid-scripts";

export class AnnualLimit {
  private logger: EngridLogger = new EngridLogger(
    "AnnualLimit",
    "yellow",
    "darkblue",
    "📅"
  );
  public _amount: DonationAmount = DonationAmount.getInstance();
  private _frequency: DonationFrequency = DonationFrequency.getInstance();
  private singleLimit = 0;
  constructor() {
    if (!this.shouldRun()) return;
    this.loadSingleLimit();
    this._frequency.onFrequencyChange.subscribe(() => {
      window.setTimeout(() => this.checkAnnualLimit(), 100);
    });
    this._amount.onAmountChange.subscribe(() => {
      window.setTimeout(() => this.checkAnnualLimit(), 100);
    });
    this.checkAnnualLimit();
  }
  checkAnnualLimit() {
    if (this.singleLimit === 0) return;
    const frequency = this._frequency.frequency;
    const amount = this._amount.amount;
    if (this._frequency.frequency === "annual") {
      if (amount < this.singleLimit) {
        this.hidePremium();
      } else {
        this.showPremium();
      }
    }
  }
  showPremium() {
    const premiumGiftContainer = document.querySelector(
      ".en__component--premiumgiftblock"
    ) as HTMLElement;
    if (premiumGiftContainer) {
      premiumGiftContainer.style.display = "block";
      this.logger.log("Premium Gift Container Show");
    }
  }
  hidePremium() {
    const premiumGiftContainer = document.querySelector(
      ".en__component--premiumgiftblock"
    ) as HTMLElement;
    if (premiumGiftContainer) {
      premiumGiftContainer.style.display = "none";
      this.logger.log("Premium Gift Container Hide");
    }
  }
  shouldRun() {
    const isPremiumGift = (window as any).pageJson.pageType === "premiumgift";
    const hasAnnualFrequency = document.querySelector(
      "[name='transaction.recurrfreq'][value='annual' i]"
    ) as HTMLInputElement;
    const hasPremiumGiftRules = ENGrid.checkNested(
      (window as any).EngagingNetworks,
      "premiumGifts",
      "rules",
      "single",
      "ranges"
    );
    const hasMonthlyFrequency = document.querySelector(
      "[name='transaction.recurrfreq'][value='monthly' i]"
    ) as HTMLInputElement;
    return (
      isPremiumGift &&
      hasAnnualFrequency &&
      hasMonthlyFrequency &&
      hasPremiumGiftRules
    );
  }
  loadSingleLimit() {
    const premiumGiftRules = (window as any).EngagingNetworks.premiumGifts
      .rules;
    let singleLimit = 0;
    for (let range in premiumGiftRules.single.ranges) {
      if (
        "productIds" in premiumGiftRules.single.ranges[range] &&
        premiumGiftRules.single.ranges[range].productIds.length === 0
      ) {
        singleLimit = +premiumGiftRules.single.ranges[range].limit;
      }
    }
    this.singleLimit = singleLimit;
    this.logger.log("Single Limit", this.singleLimit);
  }
}
