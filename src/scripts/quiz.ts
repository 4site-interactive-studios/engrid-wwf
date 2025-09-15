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
    this.handleQuizResults();
    this.setBgImage();
    this.addEventListeners();
  }

  shouldRun() {
    return ENGrid.getBodyData("subtheme") === "quiz";
  }

  private setBgImage() {
    const imageUrl = document
      .querySelector<HTMLElement>(
        ".body-banner .en__component--imageblock  img"
      )
      ?.getAttribute("src");
    const mobileImageUrl = document
      .querySelector<HTMLElement>(
        ".body-banner .en__component--imageblock:last-child img"
      )
      ?.getAttribute("src");
    if (imageUrl) {
      document.body.style.setProperty("--quiz-bg-image", `url(${imageUrl})`);
      document.body.style.setProperty(
        "--quiz-mobile-bg-image",
        `url(${mobileImageUrl})`
      );
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
    const correctAnswer = document.querySelector<HTMLInputElement>(
      '.en__component--svblock input[value="1"]'
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

    const isCorrect = selectedAnswer === correctAnswer;
    ENGrid.setBodyData("quiz-answer", isCorrect ? "correct" : "incorrect");
    const results = JSON.parse(
      sessionStorage.getItem(this.sessionItemKey) || "{}"
    );
    results[ENGrid.getPageNumber()] = isCorrect ? 1 : 0;
    sessionStorage.setItem(this.sessionItemKey, JSON.stringify(results));

    correctAnswer
      ?.closest(".en__field__item")
      ?.classList.add("quiz-correct-answer");
    if (!isCorrect) {
      selectedAnswer
        .closest(".en__field__item")
        ?.classList.add("quiz-incorrect-answer");
    }

    this.scrollToFeedback();
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

  private handleQuizResults() {
    const isResultsPage = document.querySelector(".quiz-results");
    if (!isResultsPage) return;
    const results = JSON.parse(
      sessionStorage.getItem(this.sessionItemKey) || "{}"
    );
    const totalQuestions = Object.keys(results).length;
    const score =
      (Object.values(results).reduce(
        (a, b) => Number(a) + Number(b),
        0
      ) as number) || 0;
    const scorePercent = totalQuestions
      ? Math.round((score / totalQuestions) * 100)
      : 0;
    let scoreRange;
    if (scorePercent >= 75) {
      scoreRange = "75-100";
    } else if (scorePercent >= 50) {
      scoreRange = "50-75";
    } else if (scorePercent >= 25) {
      scoreRange = "25-50";
    } else {
      scoreRange = "0-25";
    }
    if ((window as any).quizResultsPage) {
      try {
        const resultsUrl = new URL((window as any).quizResultsPage);
        resultsUrl.searchParams.set("hasQuizResults", "true");
        resultsUrl.searchParams.set("quizTime", String(Date.now()));
        resultsUrl.searchParams.set("totalQuestions", String(totalQuestions));
        resultsUrl.searchParams.set("totalCorrect", String(score));
        window.location.href = resultsUrl.toString();
        return;
      } catch (e) {
        this.logger.log("Error parsing quizResultsPage URL", e);
      }
    }
    ENGrid.setBodyData("quiz-score", scoreRange);
    const enBlocks = document.querySelectorAll<HTMLElement>(
      ".en__component--copyblock, .en__component--codeblock"
    );
    enBlocks.forEach((block) => {
      block.innerHTML = block.innerHTML
        .replace("{{score}}", String(score))
        .replace("{{total}}", String(totalQuestions));
    });
  }

  private scrollToFeedback() {
    const submitBtn = document.querySelector<HTMLElement>(".en__submit");
    if (!submitBtn) return;
    const submitRect = submitBtn.getBoundingClientRect();
    if (submitRect.top >= 0 && submitRect.bottom <= window.innerHeight) {
      return;
    }
    const svBlockNext = document.querySelector<HTMLElement>(
      ".en__component--svblock"
    );

    // scroll to midway between the bottom of the svBlock and the top of the submit button
    const svBlockRect = svBlockNext?.getBoundingClientRect();
    if (!svBlockRect) return;
    const scrollTo =
      svBlockRect.bottom +
      (submitRect.top - svBlockRect.bottom) / 3 -
      window.innerHeight / 2;
    window.scrollTo({
      top: scrollTo,
      behavior: "smooth",
    });
  }
}
