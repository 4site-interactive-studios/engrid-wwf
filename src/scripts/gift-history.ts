import { ENGrid, EngridLogger } from "@4site/engrid-common";
import { mockGiftHistory } from "./mock-gift-history";

export default class GiftHistory {
  private remoteGiftHistory: any;
  private logger = new EngridLogger("Gift History");

  constructor() {
    if (this.shouldRun()) {
      this.run();
    }
  }

  private shouldRun() {
    return (
      ENGrid.getPageType() === "SUPPORTERHUB" && ENGrid.getPageNumber() === 2
    );
  }

  private async run() {
    this.remoteGiftHistory = await this.fetchRemoteGiftHistory();

    if (this.remoteGiftHistory) {
      const targetElement = document.querySelector(".en__component--page");

      if (targetElement) {
        //This mutation observer is used to detect when new transactions are added to the DOM
        //When this happens, we merge
        const observer = new MutationObserver((mutationsList) => {
          for (const mutation of mutationsList) {
            if (mutation.type === "childList") {
              const newTransactionsAdded = [...mutation.addedNodes].some(
                (node) =>
                  this.isElementWithClass(
                    node,
                    "en__hubTxnGiving__transactions__list"
                  )
              );
              if (newTransactionsAdded) {
                this.logger.log("New EN transactions added to DOM");
                this.updateTotalAllTime();
                this.renderMergedGiftHistory();
              }
            }
          }
        });

        observer.observe(targetElement, { childList: true, subtree: true });
      }

      document.head.insertAdjacentHTML(
        "beforeend",
        `<style>.en__hubTxnGiving__transactions__list:not([data-engrid-transactions-loaded]) { display: none }</style>`
      );
    }
  }

  //TODO: implement this once we have the remote API
  private async fetchRemoteGiftHistory() {
    return mockGiftHistory;
  }

  private isElementWithClass(node: Node, className: string) {
    return (
      node.nodeType === Node.ELEMENT_NODE &&
      (node as Element).classList.contains(className)
    );
  }

  private renderMergedGiftHistory() {
    const transactionsList = document.querySelector(
      ".en__hubTxnGiving__transactions__list"
    );
    transactionsList?.removeAttribute("data-engrid-transactions-loaded");

    const enGiftHistory = this.getENGiftHistoryOnPage();

    const giftHistoryToRender =
      this.mergeRemoteGiftHistoryEntries(enGiftHistory);

    //TODO: render the gift history to the DOM
    //since there are possibly event listeners on the items, we should intelligently merge in our new entries instead of replacing anything.

    console.log(giftHistoryToRender);

    transactionsList?.setAttribute("data-engrid-transactions-loaded", "");
  }

  private getENGiftHistoryOnPage() {
    const giftHeaders = document.querySelectorAll(
      ".en__hubTxnGiving__transaction .en__hubTxnGiving__transaction__header"
    );

    return [...giftHeaders]
      .map((giftHeader) => {
        return giftHeader.textContent
          ? this.getGiftDataFromGiftHeaderString(giftHeader.textContent.trim())
          : null;
      })
      .filter((gift) => gift !== null);
  }

  private getGiftDataFromGiftHeaderString(headerString: string) {
    const matchResult = headerString.match(
      /^(\$?\d+\.\d{2}) on (\d{1,2}\/\d{1,2}\/\d{4}) to (.+)$/
    );
    if (matchResult) {
      return {
        date: Date.parse(matchResult[2]),
        rawDate: matchResult[2],
      };
    } else {
      this.logger.log(
        `Gift string did not match expected format: ${headerString}}`
      );
      return null;
    }
  }

  private mergeRemoteGiftHistoryEntries(enGiftHistory: any[]) {
    const mostRecentENGift = enGiftHistory[0].date;
    const oldestENGift = enGiftHistory[enGiftHistory.length - 1].date;

    const remoteGiftHistoryToMerge = this.remoteGiftHistory.data.filter(
      (remoteGift: any) =>
        remoteGift.createdOn >= oldestENGift &&
        remoteGift.createdOn <= mostRecentENGift
    );

    return [...enGiftHistory, ...remoteGiftHistoryToMerge].sort(
      (a, b) => b.date - a.date
    );
  }

  private updateTotalAllTime() {
    const el = document.querySelector(
      ".en__hubTxnGiving__transactions__total > span"
    );

    const enTotal = el?.textContent?.trim().replace("$", "").replace(",", "");
    const remoteTotal = this.remoteGiftHistory.summary.USD.replace(
      "$",
      ""
    ).replace(",", "");

    if (enTotal && remoteTotal) {
      const total = parseFloat(enTotal) + parseFloat(remoteTotal);
      el!.textContent = `$${total.toFixed(2)}`;
    }
  }
}
