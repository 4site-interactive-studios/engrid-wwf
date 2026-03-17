import { ENGrid, EngridLogger } from "@4site/engrid-scripts";
import { mockRemoteGiftHistory } from "./mock-gift-history";

export type RemoteGift = {
  ref: string; // CRM Constituent Lookup ID,
  amount: number; // Transaction amount,
  date: string; // Transaction date yyyy-MM-dd
  type: string; // Transaction payment type,
  method: string; // General payment method,
  source: string; // Transaction origin source
};

export type GiftDateAndSource = {
  date: string;
  source: string;
};

declare global {
  interface Window {
    constituentId?: string;
  }
}

export default class GiftHistory {
  private remoteGiftHistory: RemoteGift[] = [];
  private logger = new EngridLogger("Gift History");

  constructor() {
    if (!this.shouldRun()) {
      return;
    }
    this.run().then(() => {});
  }

  private shouldRun() {
    return (
      ENGrid.getPageType() === "SUPPORTERHUB" && ENGrid.getPageNumber() === 2
    );
  }

  private async run() {
    this.remoteGiftHistory = await this.fetchRemoteGiftHistory();

    if (!this.remoteGiftHistory || this.remoteGiftHistory.length === 0) {
      this.logger.log("No remote gift history found, skipping merge");
      return;
    }

    const targetElement = document.querySelector(".en__component--page");

    if (!targetElement) {
      this.logger.log(
        "Target element for gift history not found, cannot merge remote gift history"
      );
      return;
    }

    //This mutation observer is used to detect when new transactions are added to the DOM
    //When this happens, we merge in the remote gift history
    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === "childList") {
          const newTransactionsAdded = [...mutation.addedNodes].some((node) =>
            this.isElementWithClass(
              node,
              "en__hubTxnGiving__transactions__list"
            )
          );
          if (newTransactionsAdded) {
            this.logger.log("New EN transactions added to DOM");
            this.updateTotalAmountDonated();
            this.renderMergedGiftHistory();
          }
        }
      }
    });

    observer.observe(targetElement, { childList: true, subtree: true });

    document.head.insertAdjacentHTML(
      "beforeend",
      `<style>.en__hubTxnGiving__transactions__list:not([data-engrid-transactions-loaded]) { display: none }</style>`
    );
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

  private getENGiftHistoryOnPage(): GiftDateAndSource[] {
    const giftHeaders = document.querySelectorAll(
      ".en__hubTxnGiving__transaction .en__hubTxnGiving__transaction__header"
    );

    const enGifts = [...giftHeaders]
      .map((giftHeader) => {
        return giftHeader.textContent
          ? this.getGiftDateFromGiftHeaderString(giftHeader.textContent.trim())
          : null;
      })
      .filter((gift) => gift !== null);

    return enGifts as GiftDateAndSource[];
  }

  private getGiftDateFromGiftHeaderString(
    headerString: string
  ): GiftDateAndSource | null {
    const date = headerString.match(/^.*?(\d{1,2}\/\d{1,2}\/\d{4}).*?$/);
    if (date) {
      return {
        //createdOn: Date.parse(date[1]),
        date: date[1],
        source: "EngagingNetworks",
      };
    } else {
      this.logger.log(
        `Gift string did not match expected format: ${headerString}}`
      );
      return null;
    }
  }

  private mergeRemoteGiftHistoryEntries(
    enGiftHistory: GiftDateAndSource[]
  ): (RemoteGift | GiftDateAndSource)[] {
    const onFirstPage = document
      .querySelector(".en__pagination__prev")
      ?.hasAttribute("disabled");
    const onLastPage = document
      .querySelector(".en__pagination__next")
      ?.hasAttribute("disabled");
    const transactionsDate = (
      document.getElementById(
        "en__hubTxnGiving__transactions__date__select"
      ) as HTMLSelectElement
    )?.value;

    let remoteGiftHistoryToMerge;

    if (enGiftHistory.length > 0) {
      //if the page has gifts, we want to merge in remote gifts based on the date range of the gifts on the page
      const mostRecentENGift = Date.parse(enGiftHistory[0].date);
      const oldestENGift = Date.parse(
        enGiftHistory[enGiftHistory.length - 1].date
      );

      remoteGiftHistoryToMerge = this.remoteGiftHistory.filter(
        (remoteGift: RemoteGift) => {
          //If we're on the first page, merge in gifts that are newer than the oldest gift on the page
          //If we're on the last page, merge in gifts that are older than the most recent gift on the page
          //Otherwise, we want to merge in all gifts between the oldest and most recent gifts on the page
          //Also, make sure the year is the same as the year filter (or "all time");
          const giftYearMatchesOrAllTime =
            transactionsDate === "0" ||
            transactionsDate ===
              new Date(remoteGift.date).getFullYear().toString();

          const remoteGiftDate = Date.parse(remoteGift.date);

          if (onFirstPage) {
            return remoteGiftDate >= oldestENGift && giftYearMatchesOrAllTime;
          } else if (onLastPage) {
            return (
              remoteGiftDate <= mostRecentENGift && giftYearMatchesOrAllTime
            );
          }
          return (
            remoteGiftDate >= oldestENGift &&
            remoteGiftDate <= mostRecentENGift &&
            giftYearMatchesOrAllTime
          );
        }
      );
    } else {
      // If we don't have any gifts on the page, we want to merge in remote gifts based on the date filter
      remoteGiftHistoryToMerge = this.remoteGiftHistory.filter(
        (remoteGift: RemoteGift) => {
          // If the date filter is set to "All time", merge in all gifts
          if (transactionsDate === "0") {
            return true;
          }
          // Otherwise, merge in gifts that match the year of the date filter
          return (
            new Date(remoteGift.date).getFullYear() ===
            parseInt(transactionsDate)
          );
        }
      );
    }

    return [...enGiftHistory, ...remoteGiftHistoryToMerge].sort(
      (a, b) => Date.parse(b.date) - Date.parse(a.date)
    );
  }

  private updateTotalAmountDonated() {
    const el = document.querySelector(
      ".en__hubTxnGiving__transactions__total > span"
    );
    const enTotal = el?.textContent?.trim().replace("$", "").replace(",", "");

    const transactionsDate = (
      document.getElementById(
        "en__hubTxnGiving__transactions__date__select"
      ) as HTMLSelectElement
    )?.value;

    let remoteTotal: number;

    //All time donations
    if (transactionsDate === "0") {
      remoteTotal = this.remoteGiftHistory.reduce(
        (total: number, gift: RemoteGift) => {
          return total + gift.amount;
        },
        0
      );
    } else {
      // The value of the year select is a year like "2023".
      // Filter the remote gift history to only include gifts from that year and then sum the USD values
      remoteTotal = this.remoteGiftHistory
        .filter((gift: RemoteGift) => {
          const giftDate = new Date(gift.date);
          return giftDate.getFullYear() === parseInt(transactionsDate);
        })
        .reduce((total: number, gift: any) => {
          return total + parseFloat(gift.amount);
        }, 0);
    }

    if (enTotal && remoteTotal) {
      const total = parseFloat(enTotal) + remoteTotal;
      el!.textContent = `$${total.toFixed(2)}`;
    }
  }

  private addGiftHistoryToDOM(
    giftHistoryToRender: (RemoteGift | GiftDateAndSource)[]
  ) {
    const transactionsList = document.querySelector(
      ".en__hubTxnGiving__transactions__list > ol"
    );

    if (transactionsList) {
      giftHistoryToRender.forEach((gift, index) => {
        if (!gift.source || gift.source !== "EngagingNetworks") {
          transactionsList.insertBefore(
            this.createGiftElement(gift as RemoteGift),
            transactionsList.children[index]
          );
        }
      });
    } else {
      // If this "ol" doesn't exist, it means there are no EN transactions on the page
      // So we make a list element and add the remote gifts to it
      const transactionsList = document
        .querySelector(".en__hubTxnGiving__transactions__list")
        ?.appendChild(document.createElement("ol"));

      if (transactionsList) {
        giftHistoryToRender.forEach((gift) => {
          if (!gift.source || gift.source !== "EngagingNetworks") {
            transactionsList.appendChild(
              this.createGiftElement(gift as RemoteGift)
            );
          }
        });
      }
    }

    if (giftHistoryToRender.length > 0) {
      document
        .querySelector(".en__hubTxnGiving__transactions__empty")
        ?.remove();
    }
  }

  private createGiftElement(gift: RemoteGift): HTMLLIElement {
    const giftEl = document.createElement("li");
    giftEl.classList.add("en__hubTxnGiving__transaction");
    giftEl.classList.add("en__hubTxnGiving__transaction--remote");

    if (gift.type.toLowerCase().includes("recurring")) {
      giftEl.classList.add("en__hubTxnGiving__transaction--recurring");
    } else {
      giftEl.classList.add("en__hubTxnGiving__transaction--single");
    }

    let paymentString = "";

    switch (gift.method.toLowerCase()) {
      case "credit card":
        giftEl.classList.add("en__hubTxnGiving__transaction--card");
        paymentString = `Credit Card Payment`;
        break;
      case "check":
        paymentString = `Check Payment`;
        break;
      case "bank":
        giftEl.classList.add("en__hubTxnGiving__transaction--bank");
        paymentString = `Bank Payment`;
        break;
      default:
        paymentString = `${gift.method} Payment`;
        break;
    }

    const date = new Date(gift.date);
    const formattedDate = `${
      date.getMonth() + 1
    }/${date.getDate()}/${date.getFullYear()}`;

    const formattedAmount = parseFloat(gift.amount.toString()).toFixed(2);

    giftEl.innerHTML = `
      <div class="en__hubTxnGiving__transaction__header">
        <p>$${formattedAmount} on ${formattedDate} to "${gift.source}". Reference: "${gift.ref}"</p>
      </div>
      <div class="en__hubTxnGiving__transaction__payment"><p>${paymentString}</p></div>
    `;

    return giftEl;
  }

  private async fetchRemoteGiftHistory(): Promise<RemoteGift[]> {
    const constituentId = window.constituentId || null;
    if (!constituentId) {
      this.logger.log(
        "No constituent ID found, cannot fetch remote gift history"
      );
      return [];
    }
    const req = await fetch(
      `https://encrmgifthistapi.wwfus.org/api/supporter/${constituentId}?code=4ZoWptvxmdnaZEKLAS65bFH7ErI17TY0YeE305o2HDLnAzFugcpdAw==`
    );
    return await req.json();
  }
}
