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

  // Legacy Gated Content Donwload Links
  if (pageJson.pageNumber === 2) {
    document.body.setAttribute("ty-asset-download-links", "true");
  }

  // Get the labels of the first and second opt-in radio selects, so we can replace the first with the second
  var firstOptInLabel = document.querySelector(
    ".en__component--formblock.opt-in-label-swap .en__field--question:nth-child(1) .en__field__label"
  );
  var secondOptInLabel = document.querySelector(
    ".en__component--formblock.opt-in-label-swap .en__field--question:nth-child(2) .en__field__label"
  );

  // Check if both labels exist
  if (firstOptInLabel && secondOptInLabel) {
    // Replace the text content of the first opt-in label with the text content of the second opt-in label
    firstOptInLabel.textContent = secondOptInLabel.textContent;
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
    // Get selected payment method
    const selectedPaymentMethod = document.querySelector(
      "[name='transaction.giveBySelect']:checked"
    );
    // Get selected payment method value
    const selectedPaymentMethodValue = selectedPaymentMethod
      ? selectedPaymentMethod.value
      : null;
    const paypalOneTouch = document.querySelector(
      "[name='transaction.giveBySelect'][value='paypaltouch'] + label"
    );
    const paypal = document.querySelector(
      "[name='transaction.giveBySelect'][value='paypal'] + label"
    );
    if (App.isVisible(paypalOneTouch) && App.isVisible(paypal)) {
      if (selectedPaymentMethodValue === "paypaltouch" && s === "monthly") {
        paypal.click();
      }
      if (selectedPaymentMethodValue === "paypal" && s === "onetime") {
        paypalOneTouch.click();
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
    const getProdVarId = (id) => {
      let prodVarId = id;
      if (window.EngagingNetworks.premiumGifts.products) {
        window.EngagingNetworks.premiumGifts.products.forEach((product) => {
          if (product.id == id && "variants" in product) {
            prodVarId = product.variants[0].id;
          }
        });
      }
      return prodVarId;
    };

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
    const hideMaxTheirGift = () => {
      const maxTitle = document.querySelectorAll("h2.en__pg__name");
      if (maxTitle) {
        maxTitle.forEach((title) => {
          if (title.textContent.includes("Maximized Their Gift")) {
            const maxElement = title.closest(".en__pg");
            if (maxElement) {
              maxElement.classList.add("hide");
              const maxRadio = maxElement.querySelector(
                "input[type='radio'][name='en__pg']"
              );
              if (maxRadio) {
                window.maxTheirGift = getProdVarId(maxRadio.value);
              }
            }
          }
        });
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
      hideMaxTheirGift();
    }
    if (App.getUrlParameter("premium") !== "international" && country) {
      if (country.value !== "US") {
        maxMyGift();
        hidePremiumBlock();
        addCountryNotice();
        hideMaxTheirGift();
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
    // Check if the field Donation Has Premiums is present, if not, add it
    let donationHasPremiums = App.getField("supporter.NOT_TAGGED_45");
    if (!donationHasPremiums) {
      App.createHiddenInput("supporter.NOT_TAGGED_45");
    }
    const premiumBlock = document.querySelector(
      ".en__component--premiumgiftblock"
    );
    if (premiumBlock) {
      // Mutation observer to check if the "Maximized Their Gift" radio button is present. If it is, hide it.
      const observer = new MutationObserver((mutationsList) => {
        // Loop through the mutations that have occurred
        for (const mutation of mutationsList) {
          // Check if a node has been added to the form
          if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
            // Loop through the added nodes
            mutation.addedNodes.forEach((node) => {
              if (typeof node.querySelector === "function") {
                if (
                  node.querySelector("h2") &&
                  node.querySelector("h2").innerText === "Maximized Their Gift"
                ) {
                  const maxElement = node.closest(".en__pg");
                  if (maxElement) {
                    maxElement.classList.add("hide");
                    const maxRadio = maxElement.querySelector(
                      "input[type='radio'][name='en__pg']"
                    );
                    if (maxRadio) {
                      window.maxTheirGift = getProdVarId(maxRadio.value);
                    }
                  }
                }
                if (node.querySelector('input[type="radio"][value="0"]')) {
                  setTimeout(maxMyGift, 100);
                }
              }
            });
          }
        }
      });
      // Start observing the target node for configured mutations
      observer.observe(premiumBlock, {
        attributes: true,
        childList: true,
        subtree: true,
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

  // On eCard pages, change the label of the "Add contact" button
  const ecardAddRecipeintButton = document.querySelector(
    ".en__ecarditems__addrecipient"
  );

  if (ecardAddRecipeintButton) {
    ecardAddRecipeintButton.textContent = "Add this contact";
  }

  // On eCard pages, add a label to the recipients list
  const ecardRecipientList = document.querySelector(
    ".en__ecardrecipients__list"
  );

  if (ecardRecipientList) {
    const label = document.createElement("h2");
    label.textContent = "Recipients list";
    label.id = "recipients-list-label";
    label.setAttribute("for", "en__ecardrecipients__list");
    ecardRecipientList.setAttribute("aria-labelledby", "recipients-list-label");

    ecardRecipientList.parentNode.insertBefore(label, ecardRecipientList);
  }

  //On eCard pages, move the "Add recipients" button out of its current wrapper and add supporting button classes
  const addRecipientButton = document.querySelector(
    ".en__ecarditems__addrecipient"
  );
  const emailDiv = document.querySelector(".en__ecardrecipients__email");

  if (addRecipientButton && emailDiv) {
    addRecipientButton.classList.add("button");
    const wrapperDiv = document.createElement("div");
    wrapperDiv.classList.add("en__ecardrecipients__button");

    // Remove the button from its current position
    addRecipientButton.parentNode.removeChild(addRecipientButton);

    // Wrap the button with the new div
    wrapperDiv.appendChild(addRecipientButton);

    // Insert the wrapped button after the email div
    emailDiv.parentNode.insertBefore(wrapperDiv, emailDiv.nextSibling);
  }

  // On eCard pages, when the "Add recipients" button is clicked, remove any values in the Add Recipient Name and Email field
  // Hide the recipients list header and list until there are recipients added
  // On eCard pages, simulate full field errors on the eCard Recipient name field and email field

  const addRecipientButton2 = document.querySelector(
    ".en__ecarditems__addrecipient"
  );
  const nameInput = document.querySelector(".en__ecardrecipients__name input");
  const emailInput = document.querySelector(
    ".en__ecardrecipients__email input"
  );
  const recipientsList = document.querySelector(".en__ecardrecipients__list");
  const recipientsListLabel = document.querySelector("#recipients-list-label");
  const emailParent = document.querySelector(".en__ecardrecipients__email");
  const nameParent = document.querySelector(".en__ecardrecipients__name");

  if (
    addRecipientButton2 &&
    nameInput &&
    emailInput &&
    recipientsList &&
    recipientsListLabel &&
    emailParent &&
    nameParent
  ) {
    const clearInputs = () => {
      if (nameInput.value && emailInput.value) {
        nameInput.value = "";
        emailInput.value = "";
      }
    };

    addRecipientButton2.addEventListener("click", clearInputs);
    addRecipientButton2.addEventListener("touchend", clearInputs);
    addRecipientButton2.addEventListener("keydown", clearInputs);

    const toggleElementsVisibility = () => {
      const displayValue = recipientsList.innerHTML.trim() ? "block" : "none";
      recipientsListLabel.style.display = displayValue;
      recipientsList.style.display = displayValue;
    };

    // Initially set the visibility of the label and the recipients list
    toggleElementsVisibility();

    // Create a MutationObserver instance to monitor changes in the content of the recipients list
    const listObserver = new MutationObserver(toggleElementsVisibility);

    // Start observing the recipients list for changes in its content
    listObserver.observe(recipientsList, { childList: true, subtree: true });

    const toggleValidationClass = (element, parent) => (mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class"
        ) {
          if (element.classList.contains("invalid")) {
            parent.classList.add("en__field--validationFailed");
          } else {
            parent.classList.remove("en__field--validationFailed");
          }
        }
      }
    };

    // Create MutationObserver instances to monitor changes in the input's attributes
    const inputObserver1 = new MutationObserver(
      toggleValidationClass(emailInput, emailParent)
    );
    const inputObserver2 = new MutationObserver(
      toggleValidationClass(nameInput, nameParent)
    );

    // Start observing the inputs for changes in their attributes
    inputObserver1.observe(emailInput, { attributes: true });
    inputObserver2.observe(nameInput, { attributes: true });
  }

  // Inserts a privacy policy message after the element with the 'universal-opt-in' class
  // ToDo
  const universalOptIn = document.querySelector(".universal-opt-in");

  if (universalOptIn) {
    const privacyPolicyMarkup = `
    <div class="en__component en__component--copyblock grey-box email-subscription-nudge engrid__supporterquestions608540-N">
      <p>Are you sure? Email updates are the best way to keep up with WWF. You can unsubscribe at any time.</p>
    </div>
  `;

    universalOptIn.insertAdjacentHTML("afterend", privacyPolicyMarkup);
  }
};
