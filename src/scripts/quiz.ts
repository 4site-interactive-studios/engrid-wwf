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
    this.altsAndArias();
  }

  shouldRun() {
    return ENGrid.getBodyData("subtheme") === "quiz";
  }

  private altsAndArias() {
    // Expose a default (valid) state on the survey group for assistive tech
    // and inject a static hint that is shown once keyboard navigation is used.
    const group = document.querySelector<HTMLElement>(
      ".en__component--svblock .en__field--survey[role='group']"
    );
    if (!group) return;
    group.setAttribute("aria-invalid", "false");

    if (!document.getElementById("quiz-confirm-hint")) {
      const hint = document.createElement("span");
      hint.id = "quiz-confirm-hint";
      hint.className = "quiz-confirm-hint";
      hint.textContent = "Press Enter to confirm your choice.";
      group.appendChild(hint);
    }

    // Promote result headings (span style="font-size:26px;") to h2 semantics.
    this.labelResultHeadings();

    // Live region for announcing the revealed answer feedback text.
    if (!document.getElementById("quiz-feedback-live")) {
      const live = document.createElement("div");
      live.id = "quiz-feedback-live";
      live.className = "sr-only";
      live.setAttribute("aria-live", "polite");
      live.setAttribute("aria-atomic", "true");
      document.body.appendChild(live);
    }

    // Live region for announcing the keyboard confirmation instruction.
    if (!document.getElementById("quiz-instruction-live")) {
      const live = document.createElement("div");
      live.id = "quiz-instruction-live";
      live.className = "sr-only";
      live.setAttribute("aria-live", "polite");
      live.setAttribute("aria-atomic", "true");
      document.body.appendChild(live);
    }
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

    // Option selection: click or Enter checks the answer; arrow keys only move
    // selection, so we don't auto-check from change events.
    const optionSelector =
      ".en__component--svblock .en__field__input--radio, .en__component--svblock .en__field__input--imageSelectField";

    let keyboardJustUsed = false;
    let instructionAnnounced = false;
    const group = document.querySelector<HTMLElement>(
      ".en__component--svblock .en__field--survey[role='group']"
    );

    const maybeAnnounceInstruction = () => {
      if (instructionAnnounced) return;
      if (ENGrid.getBodyData("quiz-answer")) return;
      this.announceInstruction();
      instructionAnnounced = true;
    };

    document.addEventListener(
      "keydown",
      () => {
        keyboardJustUsed = true;
      },
      { capture: true }
    );
    document.addEventListener(
      "mousedown",
      () => {
        keyboardJustUsed = false;
      },
      { capture: true }
    );

    document.querySelectorAll(optionSelector).forEach((el) => {
      const input = el as HTMLInputElement;

      // If the user reached this option by keyboard, show the hint.
      input.addEventListener("focus", () => {
        if (!keyboardJustUsed) return;
        group?.classList.add("keyboard-nav");
        keyboardJustUsed = false;
        maybeAnnounceInstruction();
      });
      // Change events (including arrow-key navigation) clear the error but
      // do not submit the answer.
      input.addEventListener("change", () => {
        if (input.classList.contains("quiz-input-disabled")) return;
        this.toggleError(false);
      });

      // Arrow keys move selection natively; Enter confirms.
      input.addEventListener("keydown", (event) => {
        const e = event as KeyboardEvent;

        // Show the confirmation hint once the user starts navigating by keyboard.
        group?.classList.add("keyboard-nav");
        maybeAnnounceInstruction();

        if (e.key !== "Enter") return;
        if (input.classList.contains("quiz-input-disabled")) return;
        e.preventDefault();
        input.checked = true;
        this.toggleError(false);
        if (checkAnswerBtn) {
          checkAnswerBtn.click();
        } else {
          this.checkAnswer();
        }
      });

      // Real pointer clicks confirm; keyboard-generated clicks (Space, etc.) do not.
      input.addEventListener("click", (event) => {
        if (input.classList.contains("quiz-input-disabled")) return;
        if ((event as MouseEvent).detail === 0) return;
        this.toggleError(false);
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
        el.classList.add("quiz-input-disabled");
        el.setAttribute("aria-disabled", "true");
        (el as HTMLInputElement).tabIndex = -1;
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

    this.setAnswerAriaLabels();

    this.scrollToFeedback();
    this.focusAfterAnswer();
    this.announceFeedback();

    // Hide the keyboard confirmation hint now that the answer is locked in.
    const group = document.querySelector<HTMLElement>(
      ".en__component--svblock .en__field--survey[role='group']"
    );
    group?.classList.remove("keyboard-nav");
    const hint = document.getElementById("quiz-confirm-hint");
    if (hint) hint.textContent = "";
    const instructionLive = document.getElementById("quiz-instruction-live");
    if (instructionLive) instructionLive.textContent = "";
  }

  private toggleError(show: boolean) {
    const errorMessage = document.querySelector<HTMLElement>(".quiz-error");
    if (errorMessage) {
      errorMessage.style.display = show ? "block" : "none";
    }
    const group = document.querySelector<HTMLElement>(
      ".en__component--svblock .en__field--survey[role='group']"
    );
    group?.setAttribute("aria-invalid", String(show));
  }

  private focusAfterAnswer() {
    const submitBtn = document.querySelector<HTMLElement>(".en__submit button");
    const isVisible = (el: HTMLElement | null): el is HTMLElement =>
      !!el && el.offsetParent !== null;

    if (isVisible(submitBtn)) {
      submitBtn.focus();
      return;
    }

    // Fallback: focus the quiz block itself without adding it to the tab order.
    const svBlock = document.querySelector<HTMLElement>(
      ".en__component--svblock"
    );
    if (!svBlock) return;
    svBlock.setAttribute("tabindex", "-1");
    svBlock.focus();
  }

  private getOptionLabelText(input: HTMLInputElement): string | undefined {
    if (input.hasAttribute("aria-label")) {
      return input.getAttribute("aria-label") || undefined;
    }
    return this.getOptionLabelElementText(input);
  }

  private getOptionLabelElementText(
    input: HTMLInputElement
  ): string | undefined {
    const label = input
      .closest(".en__field__item")
      ?.querySelector<HTMLElement>(
        ".en__field__label--item, .en__imageSelectField__label"
      );
    return label?.textContent?.trim() || undefined;
  }

  private setAnswerAriaLabels() {
    document
      .querySelectorAll<HTMLInputElement>(
        ".en__component--svblock .en__field__input--radio, .en__component--svblock .en__field__input--imageSelectField"
      )
      .forEach((input) => {
        const labelText = this.getOptionLabelText(input);
        if (!labelText) return;

        const isCorrect = input.value === "1";
        if (isCorrect && input.checked) {
          input.setAttribute(
            "aria-label",
            `${labelText}, your selection (correct)`
          );
        } else if (isCorrect && !input.checked) {
          input.setAttribute("aria-label", `${labelText} (correct)`);
        } else if (!isCorrect && input.checked) {
          input.setAttribute(
            "aria-label",
            `${labelText}, your selection (incorrect)`
          );
        }
      });
  }

  private announceFeedback() {
    const live = document.getElementById("quiz-feedback-live");
    if (!live) return;

    const selectedAnswer = document.querySelector<HTMLInputElement>(
      ".en__component--svblock input:checked"
    );
    const correctAnswer = document.querySelector<HTMLInputElement>(
      '.en__component--svblock input[value="1"]'
    );
    const selectedLabel = selectedAnswer
      ? this.getOptionLabelElementText(selectedAnswer)
      : undefined;
    const correctLabel = correctAnswer
      ? this.getOptionLabelElementText(correctAnswer)
      : undefined;

    let summary = "";
    if (selectedAnswer && correctAnswer && selectedLabel && correctLabel) {
      if (selectedAnswer === correctAnswer) {
        summary = `${correctLabel} was the correct answer.`;
      } else {
        summary = `${selectedLabel} was incorrect, ${correctLabel} is the correct answer.`;
      }
    }

    const feedbackBlocks = document.querySelectorAll<HTMLElement>(
      ".showif-correct, .showif-incorrect, .showif-answered"
    );
    const visibleText = Array.from(feedbackBlocks)
      .filter((block) => window.getComputedStyle(block).display !== "none")
      .map((block) => block.textContent?.trim())
      .filter((text): text is string => !!text)
      .join(" ");

    live.textContent = summary ? `${summary} ${visibleText}` : visibleText;
  }

  private announceInstruction() {
    if (ENGrid.getBodyData("quiz-answer")) return;
    const live = document.getElementById("quiz-instruction-live");
    if (!live) return;
    // Clear then set so screen readers reliably detect the change.
    live.textContent = "";
    window.setTimeout(() => {
      if (ENGrid.getBodyData("quiz-answer")) return;
      live.textContent = "Press Enter to confirm your choice.";
    }, 100);
  }

  private labelResultHeadings() {
    document
      .querySelectorAll<HTMLElement>(
        ".showif-correct span, .showif-incorrect span"
      )
      .forEach((span) => {
        if (span.style.fontSize !== "26px") return;
        span.setAttribute("role", "heading");
        span.setAttribute("aria-level", "2");
      });
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
    } else {
      ENGrid.setBodyData("show-form", "true");
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
