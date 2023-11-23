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
        //When this happens, we merge in the remote gift history
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

    this.addGiftHistoryToDOM(giftHistoryToRender);

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
        createdOn: Date.parse(matchResult[2]),
        rawDate: matchResult[2],
        source: "EngagingNetworks",
      };
    } else {
      this.logger.log(
        `Gift string did not match expected format: ${headerString}}`
      );
      return null;
    }
  }

  private mergeRemoteGiftHistoryEntries(enGiftHistory: any[]) {
    const onFirstPage = document
      .querySelector(".en__pagination__prev")
      ?.hasAttribute("disabled");
    const onLastPage = document
      .querySelector(".en__pagination__next")
      ?.hasAttribute("disabled");

    const mostRecentENGift = enGiftHistory[0].createdOn;
    const oldestENGift = enGiftHistory[enGiftHistory.length - 1].createdOn;

    const remoteGiftHistoryToMerge = this.remoteGiftHistory.data.filter(
      (remoteGift: any) => {
        //If we're on the first page, merge in gifts that are newer than the oldest gift on the page
        //If we're on the last page, merge in gifts that are older than the most recent gift on the page
        //Otherwise, we want to merge in all gifts between the oldest and most recent gifts on the page
        if (onFirstPage) {
          return remoteGift.createdOn >= oldestENGift;
        } else if (onLastPage) {
          return remoteGift.createdOn <= mostRecentENGift;
        }
        return (
          remoteGift.createdOn >= oldestENGift &&
          remoteGift.createdOn <= mostRecentENGift
        );
      }
    );

    return [...enGiftHistory, ...remoteGiftHistoryToMerge].sort(
      (a, b) => b.createdOn - a.createdOn
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

  private addGiftHistoryToDOM(giftHistoryToRender: any[]) {
    const transactionsList = document.querySelector(
      ".en__hubTxnGiving__transactions__list > ol"
    );

    if (transactionsList) {
      giftHistoryToRender.forEach((gift, index) => {
        if (!gift.source || gift.source !== "EngagingNetworks") {
          transactionsList.insertBefore(
            this.createGiftElement(gift),
            transactionsList.children[index]
          );
        }
      });
    }
  }

  private createGiftElement(gift: any) {
    //TODO: adjust this based on final API response structure
    const giftEl = document.createElement("li");
    giftEl.classList.add("en__hubTxnGiving__transaction");
    giftEl.classList.add("en__hubTxnGiving__transaction--remote");

    if (gift.recurringPayment === "Y") {
      giftEl.classList.add("en__hubTxnGiving__transaction--recurring");
    } else {
      giftEl.classList.add("en__hubTxnGiving__transaction--single");
    }

    let paymentMethod = "";
    if (gift.transactionType.startsWith("CREDIT")) {
      paymentMethod = "card";
      giftEl.classList.add("en__hubTxnGiving__transaction--card");
    } else if (gift.transactionType.startsWith("BANK")) {
      paymentMethod = "bank";
      giftEl.classList.add("en__hubTxnGiving__transaction--bank");
    }

    const giftDate = new Date(gift.createdOn);
    const giftString =
      giftDate.getMonth() +
      1 +
      "/" +
      giftDate.getDate() +
      "/" +
      giftDate.getFullYear();

    const paymentString =
      paymentMethod === "bank"
        ? "Bank payment"
        : `Made with card ending ${gift.ccLastFour}, expiring ${gift.expiry}`;

    giftEl.innerHTML = `
      <div class="en__hubTxnGiving__transaction__header">
        <p>$${gift.amount} on ${giftString} to ${gift.pageTitle}</p>
      </div>
      <div class="en__hubTxnGiving__transaction__payment"><p>${paymentString}</p></div>
    `;

    return giftEl;
  }

  //TODO: implement this once we have the remote API
  private async fetchRemoteGiftHistory() {
    return mockGiftHistory;
  }
}
