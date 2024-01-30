import { Modal } from "@4site/engrid-common";

export class OnLoadModal extends Modal {
  constructor() {
    super({
      onClickOutside: "close",
      addCloseButton: false,
      closeButtonLabel: "Close",
    });

    if (this.getModalContent().length > 0) {
      this.open();
    }
  }

  public getModalContent() {
    return document.querySelectorAll(".modal--content");
  }
}
