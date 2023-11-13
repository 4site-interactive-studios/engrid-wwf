import { ENGrid } from "@4site/engrid-common";
import { mockGiftHistory } from "./mock-gift-history";

export default class GiftHistory {
  private remoteGiftHistory: any;

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

  private run() {
    this.remoteGiftHistory = this.fetchRemoteGiftHistory(
      "michaelt@4sitestudios.com",
      2
    );
    //get the EN gift history from the page
    //merge the two gift histories
    //render the gift history, with pagination
  }

  //TODO: implement this once we have the API
  private fetchRemoteGiftHistory(email: string, supporterId: number) {
    return mockGiftHistory;
  }
}
