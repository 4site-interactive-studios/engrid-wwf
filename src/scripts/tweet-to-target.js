import { App, EnForm } from "@4site/engrid-common";

export default class TweetToTarget {
  constructor() {
    if (this.shouldRun()) {
      this.tweetToTargetData =
        JSON.parse(window.localStorage.getItem("engrid-ttt-data")) || {};
      this._form = EnForm.getInstance();
      this.init();
    }
  }

  shouldRun() {
    return App.getPageType() === "TWEETPAGE";
  }

  init() {
    if (document.querySelector(".en__component--tweetcontactblock")) {
      this.setupTweetPage();
    } else if ("redirectBack" in this.tweetToTargetData) {
      if (this.tweetToTargetData.redirectBack) {
        window.location.href = this.tweetToTargetData.url;
      } else {
        window.localStorage.removeItem("engrid-ttt-data");
      }
    }
  }

  /**
   * Configures the customisations to the Tweet Page with Tweet Contact Block
   */
  setupTweetPage() {
    if (this.tweetToTargetData.positionY) {
      window.scrollTo(0, this.tweetToTargetData.positionY);
    }

    if (this.tweetToTargetData.tweetedTo) {
      this.tweetToTargetData.tweetedTo.forEach((contactTweeted) => {
        document
          .querySelector(`[data-contact="${contactTweeted}"]`)
          .setAttribute("disabled", "");
        document.querySelector(
          `[data-contact="${contactTweeted}"] .en__tweetButton__send a`
        ).textContent = "Tweet Sent!";
      });
    }

    document.querySelector(".en__submit")?.classList.add("hide");

    const sendTweetButtons = document.querySelectorAll(
      ".en__tweetButton__send > a"
    );

    sendTweetButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        //setTimeout to push this to end of call stack, so that tweet windows opens first.
        setTimeout(() => {
          const contactId =
            e.target.closest(".en__tweetContact").dataset.contact ?? null;
          this.storeTweetData(contactId);
          this._form.submitForm();
        }, 0);
      });
    });
  }

  /**
   * Stores tweet to target data in localStorage
   * @param contactId When null, we're using a single tweet to multiple targets page
   */
  storeTweetData(contactId) {
    const newTweetToTargetData = {
      url: window.location.href,
      positionY: window.scrollY,
    };

    if (contactId === null) {
      newTweetToTargetData.tweetedTo = [];
      newTweetToTargetData.singleTweet = true;
    } else {
      newTweetToTargetData.tweetedTo = this.tweetToTargetData.tweetedTo
        ? [...this.tweetToTargetData.tweetedTo, contactId]
        : [contactId];
      newTweetToTargetData.singleTweet = false;
    }

    newTweetToTargetData.redirectBack =
      this.shouldRedirectBack(newTweetToTargetData);

    this.tweetToTargetData = newTweetToTargetData;

    window.localStorage.setItem(
      "engrid-ttt-data",
      JSON.stringify(this.tweetToTargetData)
    );
  }

  /**
   * Determines if we should redirect back to the tweet page
   * @returns {boolean}
   */
  shouldRedirectBack(newTweetToTargetData) {
    return (
      newTweetToTargetData.tweetedTo.length <
        document.querySelectorAll(".en__tweetContact").length &&
      !newTweetToTargetData.singleTweet
    );
  }
}
