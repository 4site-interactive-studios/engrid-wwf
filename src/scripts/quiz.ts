import { ENGrid, EngridLogger } from "@4site/engrid-scripts";

export class Quiz {
  private logger: EngridLogger = new EngridLogger(
    "Quiz",
    "#FFFFFF",
    "#4d9068",
    "🛠️"
  );
  private sessionItemKey = `quiz-results-${ENGrid.getPageID()}`;

  constructor() {
    if (!this.shouldRun()) return;
    this.checkForFormSkip();
    this.setBgImage();
    this.addEventListeners();
  }

  shouldRun() {
    return ENGrid.getBodyData("subtheme") === "quiz";
  }

  private setBgImage() {
    const imageUrl = document
      .querySelector<HTMLElement>(".body-banner img")
      ?.getAttribute("src");
    if (imageUrl) {
      document.querySelector<HTMLElement>(
        ".body-banner"
      )!.style.backgroundImage = `url(${imageUrl})`;
    }
  }

  private addEventListeners() {
    // Handle check my answer button click
    const checkAnswerBtn = document.querySelector<HTMLElement>(
      ".button-quiz-answer"
    );
    checkAnswerBtn?.addEventListener("click", () => this.checkAnswer());

    // Clicking any answer hides the error message
    [
      ...document.querySelectorAll(
        ".en__component--svblock .en__field__input--radio, .en__component--svblock .en__field__input--imageSelectField"
      ),
    ].forEach((el) => {
      el.addEventListener("change", () => {
        this.toggleError(false);
        // If the button exists, we only check the answer on button click
        if (checkAnswerBtn) return;
        this.checkAnswer();
      });
    });

    // Skip button
    const skipBtn = document.querySelector<HTMLElement>(".button-next-page");
    skipBtn?.addEventListener("click", () => this.redirectToNextPage());
  }

  private checkAnswer() {
    const selectedAnswer = document.querySelector<HTMLInputElement>(
      ".en__component--svblock input:checked"
    );

    if (!selectedAnswer) {
      this.toggleError(true);
      return;
    }

    // Disable inputs after selection
    document
      .querySelectorAll(
        ".en__component--svblock .en__field__input--radio, .en__component--svblock .en__field__input--imageSelectField"
      )
      .forEach((el) => {
        el.setAttribute("disabled", "true");
      });

    const isCorrect = selectedAnswer.value === "1";
    ENGrid.setBodyData("quiz-answer", isCorrect ? "correct" : "incorrect");
    const results = JSON.parse(
      sessionStorage.getItem(this.sessionItemKey) || "{}"
    );
    results[ENGrid.getPageNumber()] = isCorrect ? 1 : 0;
    sessionStorage.setItem(this.sessionItemKey, JSON.stringify(results));
  }

  private toggleError(show: boolean) {
    const errorMessage = document.querySelector<HTMLElement>(".quiz-error");
    if (errorMessage) {
      errorMessage.style.display = show ? "block" : "none";
    }
  }

  private checkForFormSkip() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("skip_form") === "true") {
      sessionStorage.setItem("quiz-skip-form", "true");
    }
    const isFormPage = document.querySelector(".quiz-signup-form");
    if (!isFormPage) return;
    if (
      sessionStorage.getItem("quiz-skip-form") === "true" ||
      (window as any).pageJson.supporterId !== undefined
    ) {
      sessionStorage.removeItem("quiz-skip-form");
      this.redirectToNextPage();
    }
  }

  private redirectToNextPage() {
    const nextPage = `/${ENGrid.getPageNumber() + 1}`;
    window.location.href = window.location.href
      .split("?")[0]
      .replace(/\/\d\/?$/, nextPage);
  }
}
