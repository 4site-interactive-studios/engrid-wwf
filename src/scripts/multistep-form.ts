import { ENGrid, EngridLogger } from "@4site/engrid-common";
import "./confetti";

declare global {
  interface Window {
    EngagingNetworks: any;
    confetti: any;
  }
}

interface ENValidator {
  isVisible: () => boolean;
  test: () => boolean;
  hideMessage: () => void;
  showMessage: () => void;
  field: number;
  type: string;
  format: string;
  message: string;
}

export default class MultistepForm {
  private logger: EngridLogger = new EngridLogger(
    "MultistepForm",
    "white",
    "blue"
  );
  private validators: Array<ENValidator> = [];

  constructor() {
    if (this.shouldRun()) {
      this.logger.log("MultistepForm running");
      if (
        ENGrid.checkNested(
          window.EngagingNetworks,
          "require",
          "_defined",
          "enValidation",
          "validation",
          "validators"
        )
      ) {
        this.validators =
          window.EngagingNetworks.require._defined.enValidation.validation.validators;
      }

      this.run();
      this.handleServerSideError();
    }

    // Thank you page confetti
    if (
      ENGrid.getPageType() === "DONATION" &&
      ENGrid.getBodyData("multistep") === "" &&
      ENGrid.getGiftProcess()
    ) {
      this.startConfetti();
    }
  }

  private shouldRun() {
    return (
      ENGrid.getPageType() === "DONATION" &&
      ENGrid.getBodyData("multistep") === "" &&
      ENGrid.getPageNumber() === 1
    );
  }

  private run() {
    ENGrid.setBodyData("multistep-active-step", "1");
    this.addStepDataAttributes();
    this.addBackButtonToFinalStep();
    this.addEventListeners();
  }

  private addStepDataAttributes() {
    document
      .querySelector(".body-title")
      ?.setAttribute("data-multistep-step", "1");
    document
      .querySelector(".body-top")
      ?.setAttribute("data-multistep-step", "1");
    document
      .querySelector(".body-bottom")
      ?.setAttribute("data-multistep-step", "3");

    const stepperCodeBlocks = [
      ...document.querySelectorAll(".multistep-stepper"),
    ].map((el) => el.closest(".en__component--codeblock"));

    stepperCodeBlocks.forEach((step: any, index: number) => {
      step.setAttribute("data-multistep-step", `${index + 1}`);
      // if this is the first step, we start from the first element in ".body-main"
      // (since the first stepper could be outside of ".body-main")
      const start =
        index === 0 ? document.querySelector(".body-main")?.firstChild : step;
      const nextStep = stepperCodeBlocks[index + 1];
      const elements = this.getElementsBetween(start, nextStep);
      elements.forEach((element) => {
        element.setAttribute("data-multistep-step", `${index + 1}`);
      });
    });
  }

  private getElementsBetween(step: any, nextStep: any) {
    const elements = [];
    let currentElement = step.nextElementSibling;
    while (currentElement && currentElement !== nextStep) {
      elements.push(currentElement);
      currentElement = currentElement.nextElementSibling;
    }
    return elements;
  }

  private addEventListeners() {
    //Elements for changing step
    const buttons = document.querySelectorAll(
      "[data-multistep-change-step]"
    ) as NodeListOf<HTMLElement>;
    buttons.forEach((button) => {
      button.addEventListener("click", (e) => {
        this.activateStep(button.dataset.multistepChangeStep ?? "");
      });
    });
  }

  private activateStep(targetStep: string, bypassValidation: boolean = false) {
    if (!targetStep) return;
    const activeStep = ENGrid.getBodyData("multistep-active-step") ?? "1";

    //If no validation or we're going backwards, activate the step
    if (bypassValidation || targetStep < activeStep) {
      this.logger.log(
        `Bypassing validation or going backwards. Activating step ${targetStep}`
      );
      ENGrid.setBodyData("multistep-active-step", targetStep);
      this.scrollViewport();
      return;
    }

    // If we're going forwards, validate the steps between the current and target step
    // if validation fields, find first error on the page, activate that step and scroll to it
    if (
      !this.validateStepsBetweenCurrentAndTargetStep(activeStep, targetStep)
    ) {
      const field: HTMLElement | null = document.querySelector(
        ".en__field--validationFailed"
      );
      const invalidStep =
        field
          ?.closest(".en__component--formblock")
          ?.getAttribute("data-multistep-step") ?? "1";
      ENGrid.setBodyData("multistep-active-step", invalidStep);
      window.scrollTo(0, 0);
      if (field) {
        field.scrollIntoView({ behavior: "smooth" });
      }
      this.logger.log(
        `Found error on step ${invalidStep}. Going to that step.`
      );
      return;
    }

    // If validation passes, activate the step
    this.logger.log(`Validation passed. Activating step ${targetStep}`);
    ENGrid.setBodyData("multistep-active-step", targetStep);
    this.scrollViewport();
  }

  private scrollViewport() {
    /*
      If a .section-header is present and outside the viewport, we should scroll to the section header
      If a .section-header is present and in the viewport, then we should not scroll
      If no .section-header is present we should scroll to the top of the page
     */
    const sectionHeaders: NodeListOf<HTMLElement> =
      document.querySelectorAll(".section-header");
    const sectionHeader: HTMLElement | undefined = [...sectionHeaders].find(
      (el) => {
        const headerStep = el
          .closest("[data-multistep-step]")
          ?.getAttribute("data-multistep-step");
        return headerStep === ENGrid.getBodyData("multistep-active-step");
      }
    );

    if (!sectionHeader || sectionHeader.offsetHeight === 0) {
      this.logger.log(`No section header found. Scrolling to top of page.`);
      window.scrollTo(0, 0);
      return;
    }

    if (ENGrid.isInViewport(sectionHeader)) {
      this.logger.log(`Section header is in viewport. Not scrolling.`);
      return;
    }

    this.logger.log(`Scrolling to section header.`);
    sectionHeader.scrollIntoView({ behavior: "smooth" });
  }

  private addBackButtonToFinalStep() {
    const submitButtonContainer = document.querySelector(
      ".multistep-submit .en__submit"
    );
    if (!submitButtonContainer) return;
    submitButtonContainer.insertAdjacentHTML(
      "beforebegin",
      `<button class="btn-back" data-multistep-change-step="2" type="button">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 16 16">
          <path fill="currentColor" d="M7.214.786c.434-.434 1.138-.434 1.572 0 .433.434.433 1.137 0 1.571L4.57 6.572h10.172c.694 0 1.257.563 1.257 1.257s-.563 1.257-1.257 1.257H4.229l4.557 4.557c.433.434.433 1.137 0 1.571-.434.434-1.138.434-1.572 0L0 8 7.214.786z"></path>
         </svg>
       </button>`
    );
  }

  private validateStepsBetweenCurrentAndTargetStep(
    currentStep: string,
    targetStep: string
  ) {
    const stepsBetween = this.getStepsBetween(currentStep, targetStep);
    return stepsBetween.every((step) => this.validateStep(step));
  }

  private validateStep(step: string) {
    if (this.validators.length === 0) return true;

    const validators = this.validators.filter((validator) => {
      return (
        document
          .querySelector(`.en__field--${validator.field}`)
          ?.closest(".en__component--formblock")
          ?.getAttribute("data-multistep-step") === step
      );
    });

    const validationResults = validators.map((validator) => {
      validator.hideMessage();
      return !validator.isVisible() || validator.test();
    });

    return validationResults.every((result) => result);
  }

  private getStepsBetween(currentStep: string, targetStep: string) {
    const start = parseInt(currentStep);
    const end = parseInt(targetStep);
    let stepsBetween = [];

    for (let i = start; i < end; i++) {
      stepsBetween.push(i.toString());
    }

    return stepsBetween;
  }

  private startConfetti() {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = {
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      zIndex: 100000,
      useWorker: false,
    };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval: any = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      // since particles fall down, start a bit higher than random
      window.confetti(
        Object.assign({}, defaults, {
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        })
      );
      window.confetti(
        Object.assign({}, defaults, {
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        })
      );
    }, 250);
  }

  private handleServerSideError() {
    if (
      ENGrid.checkNested(
        window.EngagingNetworks,
        "require",
        "_defined",
        "enjs",
        "checkSubmissionFailed"
      ) &&
      window.EngagingNetworks.require._defined.enjs.checkSubmissionFailed()
    ) {
      this.logger.log("Server side error detected");
      this.activateStep("3", true);
    }
  }
}
