export const customScript = function (App, DonationFrequency) {
  console.log("ENGrid client scripts are executing");

  const isSpanish =
    document.querySelector("label[for='en__field_supporter_emailAddress']") &&
    document.querySelector("label[for='en__field_supporter_emailAddress']")
      .textContent === "Correo electrónico";

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
        setTimeout(() => {
          App.setFieldValue("transaction.selprodvariantid", "");
        }, 150);
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

  let enFieldPhoneNumber = document.querySelector(
    ".en__field--phoneNumber2 input#en__field_supporter_phoneNumber2"
  );
  if (enFieldPhoneNumber) {
    enFieldPhoneNumber.placeholder = "000-000-0000";
  }
  // App.setBodydata("client-js-loading", "finished");

  const ccvvLabel = document.querySelector(".en__field--ccvv > label");
  const titleLabel = document.querySelector(
    "[data-engrid-page-type='emailtotarget'] .en__field--title.en__mandatory > label"
  );
  if (ccvvLabel || titleLabel) {
    App.loadJS("https://unpkg.com/@popperjs/core@2", () => {
      App.loadJS("https://unpkg.com/tippy.js@6", () => {
        if (ccvvLabel) {
          let link = document.createElement("a");
          link.href = "#";
          link.id = "ccv-tooltip";
          link.className = "label-tooltip";
          link.tabIndex = "-1";
          link.innerText = "What's this?";
          link.addEventListener("click", (e) => e.preventDefault());
          ccvvLabel.insertAdjacentElement("afterend", link);

          let wrapper = document.createElement("span");
          wrapper.className = "label-wrapper";
          ccvvLabel.parentNode.insertBefore(wrapper, ccvvLabel);
          wrapper.appendChild(ccvvLabel);
          wrapper.appendChild(link);

          tippy("#ccv-tooltip", {
            theme: "light",
            content:
              "The three or four digit security code on your debit or credit card to verify transactions when your card is not present.",
          });
        }

        if (titleLabel) {
          let link = document.createElement("a");
          link.href = "#";
          link.id = "title-tooltip";
          link.className = "label-tooltip";
          link.tabIndex = "-1";
          link.innerText = "Why is this required?";
          link.addEventListener("click", (e) => e.preventDefault());
          titleLabel.insertAdjacentElement("afterend", link);

          let wrapper = document.createElement("span");
          wrapper.className = "label-wrapper";
          titleLabel.parentNode.insertBefore(wrapper, titleLabel);
          wrapper.appendChild(titleLabel);
          wrapper.appendChild(link);

          tippy("#title-tooltip", {
            theme: "light",
            content:
              "The US Senate requires all messages sent to Senators include a title. We understand that not all gender identities are represented, but title options vary by office. To ensure that your message reaches your Senator(s), we've listed only the options accepted by a majority of offices.",
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
    ecardAddRecipeintButton.textContent = isSpanish
      ? "Agrega destinatario"
      : "Add recipient";
  }

  // On eCard pages, add a label to the recipients list
  const ecardRecipientList = document.querySelector(
    ".en__ecardrecipients__list"
  );

  if (ecardRecipientList) {
    const label = document.createElement("h2");
    label.textContent = isSpanish ? "Lista de contactos" : "Recipients list";
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
    let previousRecipientCount = document.querySelectorAll(
      ".en__ecardrecipients__recipient .ecardrecipient__email"
    ).length;

    const clearInputs = () => {
      let currentRecipientCount = document.querySelectorAll(
        ".en__ecardrecipients__recipient .ecardrecipient__email"
      ).length;

      if (currentRecipientCount > previousRecipientCount) {
        nameInput.value = "";
        emailInput.value = "";
      }

      previousRecipientCount = currentRecipientCount;
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

  // Inserts a email subscription nudge after the element with the 'universal-opt-in' class
  const universalOptInFieldClasses = document.querySelector(
    ".universal-opt-in > .en__field"
  )?.classList;
  if (universalOptInFieldClasses) {
    const optInClass = [...universalOptInFieldClasses].find((className) => {
      return (
        className.startsWith("en__field--") &&
        !isNaN(Number(className.replace("en__field--", "")))
      );
    });

    if (optInClass) {
      const showHideClassName = `engrid__supporterquestions${optInClass.replace(
        "en__field--",
        ""
      )}-N`;

      App.addHtml(
        `<div style="display: none;" class="en__component en__component--copyblock grey-box email-subscription-nudge ${showHideClassName}"><p></p></div>`,
        ".universal-opt-in",
        "after"
      );
    }
  }

  function hideOptInDependentElements() {
    // If the SMS opt-in does not appear on the page hide the Mobile Phone Number field and its disclosure
    let smsOptIn = document.querySelector(".en__field--600302");
    let phoneNumberField = document.querySelector(".en__field--phoneNumber2");
    let smsDisclosure = document.querySelector(".sms-disclosure");

    if (!smsOptIn && phoneNumberField && smsDisclosure) {
      phoneNumberField.classList.add("hide");
      smsDisclosure.classList.add("hide");
    }

    // If the SMS opt-in and the EMail opt-in do not appear on the page hide the "be a part of our community" copy block
    let emailOptIn = document.querySelector(".en__field--608540");
    let communityBlock = document.querySelector(".be-a-part-of-our-community");

    if (!smsOptIn && !emailOptIn && communityBlock) {
      communityBlock.classList.add("hide");
    }
  }

  // Call the function
  hideOptInDependentElements();

  // GTM / GA / GCLID Retrieval and Population
  // Get GCLID from Local Storage
  const getGclidFromLocalStorage = () => {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes("gclid")) {
        return localStorage.getItem(key);
      }
    }
    return null;
  };

  // Get GCLID from GAC cookie
  const getGclidFromCookie = () => {
    const match = document.cookie.match("(^|;)\\s*_glc_aw\\s*=\\s*([^;]+)");
    return match ? match.pop() : null;
  };

  // Get GCLID from URL
  const getGclidFromUrl = () => {
    const url = window.location.href;
    let gclid = null;
    if (url.includes("gclid")) {
      const urlParts = url.split("gclid=");
      if (urlParts[1]) {
        gclid = urlParts[1].split("&")[0];
      }
    }
    return gclid;
  };

  const handleGclid = () => {
    try {
      // Check if .en__submit exists on the page
      if (!document.querySelector(".en__submit")) {
        return;
      }

      const gclid =
        getGclidFromLocalStorage() || getGclidFromCookie() || getGclidFromUrl();
      if (gclid) {
        const transactionField = document.querySelector(
          'input[name="transaction.othamt4"]'
        );
        if (transactionField) {
          transactionField.value = gclid;
        } else {
          const transactionHTML = `
                    <div class="en__field en__field--text en__field--othamt4 hide">
                        <label for="en__field_transaction_othamt4" class="en__field__label" style="">GCLID (Other 4)</label>
                        <div class="en__field__element en__field__element--text">
                            <input id="en__field_transaction_othamt4" type="text" class="en__field__input en__field__input--text" name="transaction.othamt4" value="${gclid}">
                        </div>
                    </div>
                `;
          const submitButton = document.querySelector(".en__submit");
          if (submitButton) {
            submitButton.insertAdjacentHTML("afterend", transactionHTML);
          } else {
            throw new Error(".en__submit element not found");
          }
        }
      } else {
        console.log("No GCLID found");
      }
    } catch (error) {
      console.error("Error handling GCLID:", error);
    }
  };

  // Add a listener for when GA4 is loaded
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: "gtm.js",
    "gtm.start": new Date().getTime(),
    "gtm.uniqueEventId": 0,
  });

  window.dataLayer.push({
    event: "GA4_loaded",
    callback: handleGclid,
  });

  // Fallback to check for GCLID once the page has finished loading
  window.addEventListener("load", handleGclid);

  // Perform an immediate check for the GCLID
  handleGclid();

  /**
   * Function to rearrange eCard related elements on the page.
   * Moves .en__ecarditems__action to come after .en__ecardmessage and
   * moves .en__ecardrecipients__futureDelivery to come after .en__ecardrecipients.
   */
  function rearrangeEcardElements() {
    // Get the elements
    const ecardItemsAction = document.querySelector(".en__ecarditems__action");
    const ecardMessage = document.querySelector(".en__ecardmessage");
    const ecardRecipientsFutureDelivery = document.querySelector(
      ".en__ecardrecipients__futureDelivery"
    );
    const ecardRecipients = document.querySelector(".en__ecardrecipients");

    // Move .en__ecarditems__action so it comes after .en__ecardmessage
    if (ecardItemsAction && ecardMessage) {
      ecardMessage.insertAdjacentElement("afterend", ecardItemsAction);
    }

    // Move .en__ecardrecipients__futureDelivery so it comes after .en__ecardrecipients
    if (ecardRecipientsFutureDelivery && ecardRecipients) {
      ecardRecipients.insertAdjacentElement(
        "afterend",
        ecardRecipientsFutureDelivery
      );
    }
  }

  // Call the function
  rearrangeEcardElements();

  // Prevents the Credit Card field value from incrementing/decrementing when scrolling up/down if it's of type="number"
  // REF: https://stackoverflow.com/questions/9712295/disable-scrolling-on-input-type-number
  // 4Site Note: We suggest the CC field by type="tel" which would remove the need for this and provide other benefits
  let ccNumberField = document.querySelector(
    'input[name="transaction.ccnumber"]'
  );

  if (ccNumberField) {
    ccNumberField.addEventListener(
      "wheel",
      () => {
        ccNumberField.blur();
      },
      { passive: true }
    );
  }

  if (
    pageJson &&
    (pageJson.pageType === "premiumgift" || pageJson.pageType === "donation") &&
    pageJson.pageNumber === 1
  ) {
    window.zE ||
      (function (e, t, s) {
        var n =
            (window.zE =
            window.zEmbed =
              function () {
                n._.push(arguments);
              }),
          a = (n.s = e.createElement(t)),
          r = e.getElementsByTagName(t)[0];
        (n.set = function (e) {
          n.set._.push(e);
        }),
          (n._ = []),
          (n.set._ = []),
          (a.async = true),
          a.setAttribute("charset", "utf-8"),
          (a.src =
            "https://static.zdassets.com/ekr/asset_composer.js?key=" + s),
          (n.t = +new Date()),
          (a.type = "text/javascript"),
          r.parentNode.insertBefore(a, r);
      })(document, "script", "7f237240-f3c5-4922-aa1f-b4c70aa52d65");
  }

  // Check if '.en__ecarditems__preview' exists in the page
  const eCardPreview = document.querySelector(".en__ecarditems__preview");

  if (eCardPreview) {
    // Add 'data-ecard-preview' attribute to the body
    document.body.setAttribute("data-ecard-preview", "");

    // Function to set 'data-ecard-preview' value based on '.preview--show' class
    const setEcardPreviewAttribute = () => {
      if (eCardPreview.classList.contains("preview--show")) {
        document.body.setAttribute("data-ecard-preview", "visible");
      } else {
        document.body.setAttribute("data-ecard-preview", "hidden");
      }
    };

    // Initial setting of 'data-ecard-preview' value
    setEcardPreviewAttribute();

    // Create a MutationObserver instance to monitor changes in '.en__ecarditems__preview' class
    const observer = new MutationObserver(setEcardPreviewAttribute);

    // Start observing '.en__ecarditems__preview' for changes in its class
    observer.observe(eCardPreview, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }
  // Create the Other 3 field if the payment type exists and the Other 3 field does not
  const createOther3Field = () => {
    const paymentType = document.querySelector(
      "#en__field_transaction_paymenttype"
    );
    const other3Field = document.querySelector(
      'input[name="transaction.othamt3"]'
    );
    if (paymentType && !other3Field) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(
        navigator.userAgent
      );
      const formBlock = document.createElement("div");
      formBlock.classList.add(
        "en__component",
        "en__component--formblock",
        "hide"
      );

      const textField = document.createElement("div");
      textField.classList.add("en__field", "en__field--text");

      const textElement = document.createElement("div");
      textElement.classList.add(
        "en__field__element",
        "en__field__element--text"
      );

      const inputField = document.createElement("input");
      inputField.setAttribute("type", "text");
      inputField.classList.add(
        "en__field__input",
        "en__field__input--text",
        "foursite-engrid-added-input"
      );
      inputField.setAttribute("name", "transaction.othamt3");
      inputField.setAttribute("value", "");
      if (App.debug) {
        inputField.style.width = "100%";
        inputField.setAttribute(
          "placeholder",
          "Payment Type Details (Other 3)"
        );
      }

      textElement.appendChild(inputField);
      textField.appendChild(textElement);
      formBlock.appendChild(textField);
      const paymentElement = paymentType.closest(".en__component");
      if (paymentElement) {
        // Insert the new field after the submit button
        paymentElement.parentNode?.insertBefore(
          formBlock,
          paymentElement.nextSibling
        );
      } else {
        const form = document.querySelector("form");
        if (form) {
          form.appendChild(formBlock);
        }
      }
      // Set the value of the Other 3 field to the value of the Payment Type field
      // When the Payment Type field changes, update the Other 3 field
      paymentType.addEventListener("change", () => {
        const other3Field = document.querySelector(
          'input[name="transaction.othamt3"]'
        );
        if (!other3Field) {
          return;
        }
        if (paymentType.value === "stripedigitalwallet") {
          // Set applepay if using IOS or Safari, otherwise set googlepay
          other3Field.value = isIOS || isSafari ? "applepay" : "googlepay";
        } else {
          other3Field.value = paymentType.value;
        }
      });
    }
  };
  // Call the function
  createOther3Field();

  const amountNudge = document.querySelector(".amount-nudge:not(.arrow-up)");
  if (amountNudge && recurrFrequencyField) {
    recurrFrequencyField.insertAdjacentElement("beforeend", amountNudge);
  }
};
