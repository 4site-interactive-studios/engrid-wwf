export const customScript = function (App, DonationFrequency) {
  console.log("ENGrid client scripts are executing");

  let inlineMonthlyUpsell = document.querySelectorAll(
    ".move-after-transaction-recurrfreq"
  )[0];
  let recurrFrequencyField = document.querySelectorAll(
    ".en__field--recurrfreq"
  )[0];
  if (inlineMonthlyUpsell && recurrFrequencyField) {
    recurrFrequencyField.insertAdjacentElement(
      "beforeend",
      inlineMonthlyUpsell
    );
    // inlineMonthlyUpsell.style.visibility='visible';
  }

  let inlineDonationAmountHeader = document.querySelectorAll(
    ".move-before-transaction-donationamt"
  )[0];
  let donationAmtField = document.querySelectorAll(
    ".en__field--donationAmt"
  )[0];
  if (inlineDonationAmountHeader && donationAmtField) {
    donationAmtField.insertAdjacentElement(
      "afterbegin",
      inlineDonationAmountHeader
    );
    // inlineGiftAmountHeader.style.visibility='visible';
  }

  // Add your client scripts here
  const freq = DonationFrequency.getInstance();
  freq.onFrequencyChange.subscribe((s) => {
    console.log("frequency changed", s);
    const otherAmount = document.querySelector(
      "[name='transaction.donationAmt.other']"
    );
    if (otherAmount) {
      switch (s) {
        case "monthly":
          otherAmount.placeholder = "Other /mo";
          break;
        case "annual":
          otherAmount.placeholder = "Other /yr";
          break;
        default:
          otherAmount.placeholder = "Other";
      }
    }
  });

  const addMobilePhoneNotice = () => {
    if (
      !document.querySelector(".en__field--phoneNumber2 .en__field__element")
    ) {
      App.addHtml(
        '<div class="en__field__notice">By providing your mobile number, you agree to receive recurring text messages from WWF. Text STOP to quit, HELP for info. Message and data rates may apply.</div>',
        '[name="supporter.phoneNumber2"]',
        "after"
      );
    }
  };
  addMobilePhoneNotice();

  if (
    "pageJson" in window &&
    "pageType" in window.pageJson &&
    window.pageJson.pageType === "premiumgift"
  ) {
    const country = App.getField("supporter.country");
    const maxMyGift = () => {
      const maxRadio = document.querySelector(
        ".en__pg:last-child input[type='radio'][name='en__pg'][value='0']"
      );
      if (maxRadio) {
        maxRadio.checked = true;
        maxRadio.click();
        App.setFieldValue("transaction.selprodvariantid", "");
      }
    };

    const hidePremiumBlock = () => {
      const premiumBlock = document.querySelectorAll(
        ".en__component--premiumgiftblock > div"
      );
      const premiumTitle = document.querySelector(".engrid_premium_title");
      if (premiumBlock) {
        premiumBlock.forEach((block) => {
          block.setAttribute("data-non-us-donor", "");
        });
      }
      if (premiumTitle) {
        premiumTitle.setAttribute("data-non-us-donor", "");
      }
    };
    const showPremiumBlock = () => {
      const premiumBlock = document.querySelectorAll(
        ".en__component--premiumgiftblock > div"
      );
      const premiumTitle = document.querySelector(".engrid_premium_title");
      if (premiumBlock) {
        premiumBlock.forEach((block) => {
          block.removeAttribute("data-non-us-donor");
        });
      }
      if (premiumTitle) {
        premiumTitle.removeAttribute("data-non-us-donor");
      }
    };
    const addCountryNotice = () => {
      if (!document.querySelector(".en__field--country .en__field__notice")) {
        App.addHtml(
          '<div class="en__field__notice">Note: We are unable to mail thank-you gifts to donors outside the United States and its territories and have selected the "Mazimize my gift" option for you.</div>',
          ".en__field--country .en__field__element",
          "after"
        );
      }
    };
    const removeCountryNotice = () => {
      App.removeHtml(".en__field--country .en__field__notice");
    };
    if (
      !window.EngagingNetworks.require._defined.enjs.checkSubmissionFailed()
    ) {
      maxMyGift();
    }
    if (App.getUrlParameter("premium") !== "international" && country) {
      if (country.value !== "US") {
        maxMyGift();
        hidePremiumBlock();
        addCountryNotice();
      }
      country.addEventListener("change", () => {
        if (country.value !== "US") {
          maxMyGift();
          hidePremiumBlock();
          addCountryNotice();
        } else {
          showPremiumBlock();
          removeCountryNotice();
        }
      });
      freq.onFrequencyChange.subscribe((s) => {
        if (country.value !== "US") {
          maxMyGift();
          hidePremiumBlock();
        } else {
          showPremiumBlock();
        }
      });
    }
  }

  // let enFieldPhoneNumber = document.querySelectorAll(
  //   ".en__field--phoneNumber2.en__mandatory input#en__field_supporter_phoneNumber2"
  // )[0];
  // if (enFieldPhoneNumber) {
  //   enFieldPhoneNumber.placeholder = "000-000-0000 (Optional)";
  // }
  // App.setBodydata("client-js-loading", "finished");

  const ccvvLabel = document.querySelector(".en__field--ccvv > label");
  const titleLabel = document.querySelector(
    ".en__field--title.en__mandatory > label"
  );
  if (ccvvLabel || titleLabel) {
    App.loadJS("https://unpkg.com/@popperjs/core@2", () => {
      App.loadJS("https://unpkg.com/tippy.js@6", () => {
        // Add "what's this" markup to the CVV field
        if (ccvvLabel) {
          let el = document.createElement("span");
          let childEl = document.createElement("a");
          childEl.href = "#";
          childEl.id = "ccv-tooltip";
          childEl.className = "label-tooltip";
          childEl.tabIndex = "-1";
          childEl.innerText = "What's this?";
          childEl.addEventListener("click", (e) => e.preventDefault());
          el.appendChild(childEl);
          ccvvLabel.appendChild(el);
          tippy("#ccv-tooltip", {
            theme: "light",
            content:
              "The three or four digit security code on your debit or credit card to verify transactions when your card is not present.",
          });
        }
        // Add "Why is this required?" markup to the Title field
        // Only show it if the Title field is marked as required
        if (titleLabel) {
          let el = document.createElement("span");
          let childEl = document.createElement("a");
          childEl.href = "#";
          childEl.id = "title-tooltip";
          childEl.className = "label-tooltip";
          childEl.tabIndex = "-1";
          childEl.innerText = "Why is this required?";
          childEl.addEventListener("click", (e) => e.preventDefault());
          el.appendChild(childEl);
          titleLabel.appendChild(el);
          tippy("#title-tooltip", {
            theme: "light",
            content:
              "The U.S. Senate is now requiring that all letters include a title. Please select one in order to ensure that your action lands in the inbox of your Senator.",
          });
        }
      });
    });
  }
  const fillCount = document.querySelector(".enWidget__fill__count")
    ? document.querySelector(".enWidget__fill__count").innerText
    : 0;
  const supportersBar = document.querySelector(
    ".progress-bar_supporters strong"
  );
  if (supportersBar) {
    supportersBar.innerText = fillCount;
  }

  function LauncherWidthWatcher() {
    // Select the #launcher and .engrid-mobile-cta-container elements
    this.launcher = document.querySelector("#launcher");
    this.engridMobileCTAContainer = document.querySelector(
      ".engrid-mobile-cta-container"
    );

    // If both elements are present, set the custom property and add event listeners
    if (this.launcher && this.engridMobileCTAContainer) {
      this.setCustomProperty();
      this.addEventListeners();
    }
  }

  // Set the CSS custom property on .engrid-mobile-cta-container based on the width of #launcher
  LauncherWidthWatcher.prototype.setCustomProperty = function () {
    if (!this.launcher || !this.engridMobileCTAContainer) return;

    var launcherWidth = this.launcher.clientWidth;
    this.engridMobileCTAContainer.style.setProperty(
      "--launcher-width",
      launcherWidth + "px"
    );
  };

  // Add event listeners to update the custom property when the width of #launcher changes
  LauncherWidthWatcher.prototype.addEventListeners = function () {
    if (!this.launcher) return;

    // Create a ResizeObserver to listen for changes in the width of #launcher
    var resizeObserver = new ResizeObserver(
      function () {
        // Update the custom property when the width of #launcher changes
        this.setCustomProperty();
      }.bind(this)
    );

    // Observe the #launcher element for changes in its size
    resizeObserver.observe(this.launcher);
  };

  // Function to initialize the LauncherWidthWatcher when the #launcher element is present
  function initLauncherWidthWatcher() {
    if (document.querySelector("#launcher")) {
      var launcherWidthWatcher = new LauncherWidthWatcher();
    } else {
      setTimeout(initLauncherWidthWatcher, 100);
    }
  }

  // Use a MutationObserver to watch for changes in the DOM
  var observer = new MutationObserver(initLauncherWidthWatcher);
  observer.observe(document.body, { childList: true, subtree: true });
};
