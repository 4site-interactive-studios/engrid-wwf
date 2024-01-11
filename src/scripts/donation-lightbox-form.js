const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
if (isSafari) {
  window.__forceSmoothScrollPolyfill__ = true;
}
import smoothscroll from "smoothscroll-polyfill";
smoothscroll.polyfill();
export default class DonationLightboxForm {
  constructor(DonationAmount, DonationFrequency, App) {
    if (
      !this.isIframe() ||
      document.querySelector("body").dataset.engridSubtheme !== "multistep"
    )
      return;
    this.amount = DonationAmount;
    this.frequency = DonationFrequency;
    this.ipCountry = "";
    this.isDonation = ["donation", "premiumgift"].includes(
      window.pageJson.pageType
    );
    console.log("DonationLightboxForm: constructor");
    // Each EN Row is a Section
    this.sections = document.querySelectorAll(
      "form.en__component > .en__component"
    );
    this.currentSectionId = 0;
    // Check if we're on the Thank You page
    if (pageJson.pageNumber === pageJson.pageCount) {
      this.sendMessage("status", "loaded");
      if (this.isDonation) this.sendMessage("status", "celebrate");
      this.sendMessage("class", "thank-you");
      document.querySelector("body").dataset.thankYou = "true";
      // Get Query Strings
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("name")) {
        let engrid = document.querySelector("#engrid");
        if (engrid) {
          let engridContent = engrid.innerHTML;
          engridContent = engridContent.replace(
            "{user_data~First Name}",
            urlParams.get("name")
          );
          engridContent = engridContent.replace(
            "{receipt_data~recurringFrequency}",
            urlParams.get("frequency")
          );
          engridContent = engridContent.replace(
            "{receipt_data~amount}",
            "$" + urlParams.get("amount")
          );
          engrid.innerHTML = engridContent;
          this.sendMessage("firstname", urlParams.get("name"));
        }
      } else {
        // Try to get the first name
        const thisClass = this;
        const pageDataUrl =
          location.protocol +
          "//" +
          location.host +
          location.pathname +
          "/pagedata";
        fetch(pageDataUrl)
          .then(function (response) {
            return response.json();
          })
          .then(function (json) {
            if (json.hasOwnProperty("firstName") && json.firstName !== null) {
              thisClass.sendMessage("firstname", json.firstName);
            } else {
              thisClass.sendMessage("firstname", "Friend");
            }
          })
          .catch((error) => {
            console.error("PageData Error:", error);
          });
      }
      return false;
    }
    if (!this.sections.length) {
      // No section or no Donation Page was found
      this.sendMessage("error", "No sections found");
      return false;
    }
    console.log(this.sections);
    if (this.isIframe()) {
      // If iFrame
      this.buildSectionNavigation();
      // If Form Submission Failed
      if (
        this.checkNested(
          EngagingNetworks,
          "require",
          "_defined",
          "enjs",
          "checkSubmissionFailed"
        ) &&
        EngagingNetworks.require._defined.enjs.checkSubmissionFailed()
      ) {
        console.log("DonationLightboxForm: Submission Failed");
        // If the en__field_transaction_ccexpire is not empty, show the credit card section
        const creditCardSection = document.querySelector(
          ".en__field--ccexpire"
        );
        const creditCardExpire = creditCardSection
          ? creditCardSection.querySelector("#en__field_transaction_ccexpire")
          : null;
        if (creditCardExpire && creditCardExpire.value != "") {
          const paymentType = document.querySelector(
            "#en__field_transaction_paymenttype"
          );
          const ccnumberBlock = document.querySelector(".en__field--ccnumber");
          if (paymentType && ccnumberBlock) {
            paymentType.value = "visa";
            this.showHideCCSection("card");
            ccnumberBlock.classList.add("has-error");
            const errorMessage = document.querySelector(".en__error");
            const errorMessageText =
              errorMessage &&
              errorMessage.textContent.split(". ").length > 1 &&
              errorMessage.textContent.split(". ")[1] !== ""
                ? errorMessage.textContent.split(". ")[1]
                : errorMessage.textContent;
            this.sendMessage("error", errorMessageText);
            this.scrollToElement(creditCardSection);
          }
        } else if (this.validateForm()) {
          // Front-End Validation Passed, get first Error Message
          const error = document.querySelector("li.en__error");
          if (error) {
            // Check if error contains "problem processing" to send a smaller message
            if (
              error.innerHTML.toLowerCase().indexOf("problem processing") > -1
            ) {
              this.sendMessage(
                "error",
                "Sorry! There's a problem processing your donation."
              );
              this.scrollToElement(
                document.querySelector(".en__field--ccnumber")
              );
            } else {
              this.sendMessage("error", error.textContent);
            }
            // Check if error contains "payment" or "account" and scroll to the right section
            if (
              error.innerHTML.toLowerCase().indexOf("payment") > -1 ||
              error.innerHTML.toLowerCase().indexOf("account") > -1
            ) {
              this.scrollToElement(
                document.querySelector(".en__field--ccnumber")
              );
            }
          }
        }
      } else {
        App.watchForError(() => {
          const errorMessage = document.querySelector(".en__error");
          const errorMessageText =
            errorMessage && errorMessage.textContent.split(". ").length > 1
              ? errorMessage.textContent.split(". ")[1]
              : errorMessage.textContent;
          if (errorMessageText) {
            this.sendMessage("error", errorMessageText);
          }
        });
      }
      document
        .querySelectorAll("form.en__component input.en__field__input")
        .forEach((e) => {
          e.addEventListener("focus", (event) => {
            // Run after 50ms - We need this or else some browsers will disregard the scroll due to the focus event
            const nextSectionId = Number(this.getSectionId(e));
            const currentSectionId = Number(this.currentSectionId);

            setTimeout(() => {
              const focusIsOnNextSection =
                nextSectionId === currentSectionId + 1;

              if (focusIsOnNextSection && this.validateForm(currentSectionId)) {
                // Only scroll if the current section doesn't have radio elements
                const radioElement =
                  this.sections[currentSectionId].querySelector(
                    ".en__field--radio"
                  );
                if (!radioElement) this.scrollToElement(e);
              }
            }, 50);
            // If the field is the credit card number, remove the error class from the parent
            if ("id" in e && e.id === "en__field_transaction_ccnumber") {
              const parent = e.closest(".en__field");
              if (parent) {
                parent.classList.remove("has-error");
              }
            }
          });
        });
      // Map the enter key to the next button
      document
        .querySelectorAll("form.en__component input.en__field__input")
        .forEach((e) => {
          e.addEventListener("keydown", (event) => {
            if (event.keyCode === 13) {
              event.preventDefault();
              const sectionId = Number(this.getSectionId(e));
              if (this.validateForm(sectionId)) {
                this.scrollToSection(sectionId + 1, sectionId);
              }
            }
          });
        });
    }
    let paymentOpts = document.querySelector(".payment-options");
    if (paymentOpts) {
      this.clickPaymentOptions(paymentOpts);
    }

    this.addTabIndexToLabels();
    this.putArrowUpSVG();
    this.bounceArrow(this.frequency.getInstance().frequency);

    this.addEvents();
    this.changeSubmitButton();
    this.sendMessage("status", "loaded");
    // Check if theres a color value in the url
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("color")) {
      document.body.style.setProperty(
        "--color_primary",
        urlParams.get("color")
      );
    }
    window.addEventListener("message", this.receiveMessage.bind(this), false);
    this.sendMessage("isMobile");
    this.showHideCCSection(false);
  }
  // Send iframe message to parent
  sendMessage(key, value) {
    const message = { key: key, value: value };
    window.parent.postMessage(message, "*");
  }
  // Receive iframe message from parent
  receiveMessage(event) {
    if (event.data.key === "isMobile" && event.data.value === true) {
      document.body.classList.add("is-mobile");
    }
    if (event.data.key === "isMobile" && event.data.value === false) {
      document.body.classList.remove("is-mobile");
    }
  }

  // Check if is iFrame
  isIframe() {
    return window.self !== window.top;
  }
  // Build Section Navigation
  buildSectionNavigation() {
    console.log("DonationLightboxForm: buildSectionNavigation");
    this.sections.forEach((section, key) => {
      section.dataset.sectionId = key;
      const sectionNavigation = document.createElement("div");
      sectionNavigation.classList.add("section-navigation");
      const sectionCount = document.createElement("div");
      sectionCount.classList.add("section-count");
      const sectionTotal = this.sections.length;
      if (sectionTotal > 1) {
        if (key == 0) {
          sectionNavigation.innerHTML = `
        <button class="section-navigation__next" data-section-id="${key}">
          <span>Donate Today</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 14 14">
              <path fill="currentColor" d="M7.687 13.313c-.38.38-.995.38-1.374 0-.38-.38-.38-.996 0-1.375L10 8.25H1.1c-.608 0-1.1-.493-1.1-1.1 0-.608.492-1.1 1.1-1.1h9.2L6.313 2.062c-.38-.38-.38-.995 0-1.375s.995-.38 1.374 0L14 7l-6.313 6.313z"/>
          </svg>
        </button>
      `;
        } else if (key == this.sections.length - 1) {
          // Add Last Section Data Attribute
          section.dataset.lastSection = true;
          sectionNavigation.innerHTML = `
        <button class="section-navigation__previous" aria-label="Back" data-section-id="${key}">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 16 16">
              <path fill="currentColor" d="M7.214.786c.434-.434 1.138-.434 1.572 0 .433.434.433 1.137 0 1.571L4.57 6.572h10.172c.694 0 1.257.563 1.257 1.257s-.563 1.257-1.257 1.257H4.229l4.557 4.557c.433.434.433 1.137 0 1.571-.434.434-1.138.434-1.572 0L0 8 7.214.786z"/>
          </svg>
        </button>
        <button class="section-navigation__submit" data-section-id="${key}" type="submit" data-label="Give $AMOUNT$FREQUENCY">
          <span>Give Now</span>
        </button>
      `;
        } else {
          sectionNavigation.innerHTML = `
        <button class="section-navigation__previous" aria-label="Back" data-section-id="${key}">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 16 16">
              <path fill="currentColor" d="M7.214.786c.434-.434 1.138-.434 1.572 0 .433.434.433 1.137 0 1.571L4.57 6.572h10.172c.694 0 1.257.563 1.257 1.257s-.563 1.257-1.257 1.257H4.229l4.557 4.557c.433.434.433 1.137 0 1.571-.434.434-1.138.434-1.572 0L0 8 7.214.786z"/>
          </svg>
        </button>
        <button class="section-navigation__next" data-section-id="${key}">
          <span>Continue</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 14 14">
              <path fill="currentColor" d="M7.687 13.313c-.38.38-.995.38-1.374 0-.38-.38-.38-.996 0-1.375L10 8.25H1.1c-.608 0-1.1-.493-1.1-1.1 0-.608.492-1.1 1.1-1.1h9.2L6.313 2.062c-.38-.38-.38-.995 0-1.375s.995-.38 1.374 0L14 7l-6.313 6.313z"/>
          </svg>
        </button>
      `;
        }
        sectionCount.innerHTML = `
        <span class="section-count__current">${key + 1}</span> of
        <span class="section-count__total">${sectionTotal}</span>
      `;
      } else {
        // Single Section Pages
        const submitButtonLabel =
          document.querySelector(".en__submit button")?.innerText || "Submit";
        sectionNavigation.innerHTML = `
        <button class="section-navigation__submit" data-section-id="${key}" type="submit" data-label="${submitButtonLabel}">
          <span>${submitButtonLabel}</span>
        </button>
      `;
      }

      sectionNavigation
        .querySelector(".section-navigation__previous")
        ?.addEventListener("click", (e) => {
          e.preventDefault();
          this.scrollToSection(key - 1, key);
        });

      sectionNavigation
        .querySelector(".section-navigation__next")
        ?.addEventListener("click", (e) => {
          e.preventDefault();
          if (this.validateForm(key)) {
            this.scrollToSection(key + 1, key);
          }
        });

      sectionNavigation
        .querySelector(".section-navigation__submit")
        ?.addEventListener("click", (e) => {
          e.preventDefault();
          // Validate the entire form again
          if (this.validateForm()) {
            if (this.isDonation) {
              // Send Basic User Data to Parent
              this.sendMessage(
                "donationinfo",
                JSON.stringify({
                  name: document.querySelector("#en__field_supporter_firstName")
                    .value,
                  amount:
                    EngagingNetworks.require._defined.enjs.getDonationTotal(),
                  frequency: this.frequency.getInstance().frequency,
                })
              );
              // Only shows cortain if payment is not paypal
              const paymentType = document.querySelector(
                "#en__field_transaction_paymenttype"
              ).value;
              if (paymentType != "paypal") {
                this.sendMessage("status", "loading");
              } else {
                // If Paypal, submit the form on a new tab
                const thisClass = this;
                document.addEventListener("visibilitychange", function () {
                  if (document.visibilityState === "visible") {
                    thisClass.sendMessage("status", "submitted");
                  } else {
                    thisClass.sendMessage("status", "loading");
                  }
                });
                document.querySelector("form.en__component").target = "_blank";
              }
              document.querySelector("form.en__component").submit();
            } else {
              this.sendMessage("status", "loading");
              document.querySelector("form.en__component").submit();
            }
          }
        });
      section.querySelector(".en__component").append(sectionNavigation);
      section.querySelector(".en__component").append(sectionCount);
    });
    const digitalWallets = document.querySelector(".digital-wallets-wrapper");
    if (digitalWallets) {
      // Create a back link for digital wallets
      const backLink = document.createElement("a");
      backLink.classList.add("back-link");
      backLink.innerHTML = `back`;
      backLink.href = "#";
      backLink.addEventListener("click", (e) => {
        e.preventDefault();
        this.scrollToSection(this.getSectionId(digitalWallets) - 1, 0);
      });
      digitalWallets.prepend(backLink);
    }
  }
  // Scroll to a section
  scrollToSection(sectionId, fromSectionId) {
    console.log("DonationLightboxForm: scrollToSection", sectionId);
    const section = document.querySelector(`[data-section-id="${sectionId}"]`);
    // Check if we're scrolling to an invisible section
    if (section && !this.isVisible(section)) {
      console.log(
        "DonationLightboxForm: scrollToSection: Section is not visible"
      );
      // If we're scrolling to a section that's not visible, check fromSectionId to see if we're scrolling left or right
      if (fromSectionId > sectionId) {
        // If we're scrolling left, scroll to the previous section
        this.scrollToSection(sectionId - 1, sectionId);
      } else {
        // If we're scrolling right, scroll to the next section
        this.scrollToSection(sectionId + 1, sectionId);
      }
      return;
    }

    if (this.sections[sectionId]) {
      console.log(section);
      this.currentSectionId = sectionId;
      console.log("Changed current section ID to", sectionId);
      this.sections[sectionId].scrollIntoView({
        behavior: "smooth",
        // block: "start",
        // inline: "center",
      });
    }
  }
  // Scroll to an element's section
  scrollToElement(element) {
    if (element) {
      const sectionId = this.getSectionId(element);
      if (sectionId) {
        const oldSectionId = this.currentSectionId;
        this.currentSectionId = sectionId;
        console.log("Changed current section ID to", sectionId);
        this.scrollToSection(sectionId, oldSectionId);
      }
    }
  }
  // Get Element's section id
  getSectionId(element) {
    if (element) {
      return element.closest("[data-section-id]").dataset.sectionId;
    }
    return false;
  }

  // Validate the form
  validateForm(sectionId = false) {
    const form = document.querySelector("form.en__component");

    // Validate Frequency
    const frequency = form.querySelector(
      "[name='transaction.recurrfreq']:checked"
    );
    const frequencyBlock = form.querySelector(".en__field--recurrfreq");
    const frequencySection = this.getSectionId(frequencyBlock);
    if (this.isDonation) {
      if (sectionId === false || sectionId == frequencySection) {
        if (!frequency || !frequency.value) {
          this.scrollToElement(
            form.querySelector("[name='transaction.recurrfreq']:checked")
          );
          this.sendMessage("error", "Please select a frequency");
          if (frequencyBlock) {
            frequencyBlock.classList.add("has-error");
          }
          return false;
        } else {
          if (frequencyBlock) {
            frequencyBlock.classList.remove("has-error");
          }
        }
      }
      // Validate Amount
      const amount = EngagingNetworks.require._defined.enjs.getDonationTotal();
      const amountBlock = form.querySelector(".en__field--donationAmt");
      const amountSection = this.getSectionId(amountBlock);
      if (sectionId === false || sectionId == amountSection) {
        if (!amount || amount <= 0) {
          this.scrollToElement(amountBlock);
          this.sendMessage("error", "Please enter a valid amount");
          if (amountBlock) {
            amountBlock.classList.add("has-error");
          }
          return false;
        } else {
          if (amount < 5) {
            this.sendMessage(
              "error",
              "Amount must be at least $5 - Contact us for assistance"
            );
            if (amountBlock) {
              amountBlock.classList.add("has-error");
            }
            return false;
          }
          if (amount > 30000) {
            this.sendMessage(
              "error",
              "Amount must be less than $30,000 - Contact us for assistance"
            );
            if (amountBlock) {
              amountBlock.classList.add("has-error");
            }
            return false;
          }
          if (amountBlock) {
            amountBlock.classList.remove("has-error");
          }
        }
      }
      // Validate Payment Method
      const paymentType = form.querySelector(
        "#en__field_transaction_paymenttype"
      );
      const ccnumber = form.querySelector("#en__field_transaction_ccnumber");
      const ccnumberBlock = form.querySelector(".en__field--ccnumber");
      const ccnumberSection = this.getSectionId(ccnumberBlock);
      console.log(
        "DonationLightboxForm: validateForm",
        ccnumberBlock,
        ccnumberSection
      );
      if (paymentType && paymentType.value === "") {
        // Set payment type to visa if it's empty
        paymentType.value = "visa";
        this.showHideCCSection("card");
      }
      if (sectionId === false || sectionId == ccnumberSection) {
        if (!paymentType || !paymentType.value) {
          this.scrollToElement(paymentType);
          this.sendMessage("error", "Please add your credit card information");
          if (ccnumberBlock) {
            ccnumberBlock.classList.add("has-error");
          }
          return false;
        }
        // If payment type is not paypal, check credit card expiration and cvv
        if (
          paymentType.value !== "paypal" &&
          paymentType.value !== "paypaltouch"
        ) {
          if (!ccnumber || !ccnumber.value) {
            this.scrollToElement(ccnumber);
            this.sendMessage(
              "error",
              "Please add your credit card information"
            );
            if (ccnumberBlock) {
              ccnumberBlock.classList.add("has-error");
            }
            return false;
          } else {
            if (ccnumberBlock) {
              ccnumberBlock.classList.remove("has-error");
            }
          }
          if (/^[0-9\s]+$/.test(ccnumber.value) === false) {
            this.scrollToElement(ccnumber);
            this.sendMessage(
              "error",
              "Only numbers are allowed on credit card"
            );
            if (ccnumberBlock) {
              ccnumberBlock.classList.add("has-error");
            }
            return false;
          } else {
            if (ccnumberBlock) {
              ccnumberBlock.classList.remove("has-error");
            }
          }
          const ccexpire = form.querySelectorAll(
            "[name='transaction.ccexpire']"
          );
          const ccexpireBlock = form.querySelector(".en__field--ccexpire");
          let ccexpireValid = true;
          ccexpire.forEach((e) => {
            if (!e.value) {
              this.scrollToElement(ccexpireBlock);
              this.sendMessage("error", "Please enter a valid expiration date");
              if (ccexpireBlock) {
                ccexpireBlock.classList.add("has-error");
              }
              ccexpireValid = false;
              return false;
            }
          });
          if (!ccexpireValid && ccexpireBlock) {
            return false;
          } else {
            if (ccexpireBlock) {
              ccexpireBlock.classList.remove("has-error");
            }
          }

          const cvv = form.querySelector("#en__field_transaction_ccvv");
          const cvvBlock = form.querySelector(".en__field--ccvv");
          if (!cvv || !cvv.value) {
            this.scrollToElement(cvv);
            this.sendMessage("error", "Please enter a valid CVV");
            if (cvvBlock) {
              cvvBlock.classList.add("has-error");
            }
            return false;
          } else {
            if (cvvBlock) {
              cvvBlock.classList.remove("has-error");
            }
          }
        }
      }
    }

    // Validate Everything else
    const mandatoryFields = form.querySelectorAll(".en__mandatory");
    let hasError = false;
    mandatoryFields.forEach((field) => {
      if (hasError) {
        return;
      }
      const fieldElement = field.querySelector(".en__field__input");
      const fieldLabel = field.querySelector(".en__field__label");
      const fieldSection = this.getSectionId(fieldElement);
      if (sectionId === false || sectionId == fieldSection) {
        if (!fieldElement.value) {
          this.scrollToElement(fieldElement);
          this.sendMessage("error", "Please enter " + fieldLabel.textContent);
          field.classList.add("has-error");
          hasError = true;
          return false;
        } else {
          field.classList.remove("has-error");
        }
        // If it's the e-mail field, check if it's a valid email
        if (
          fieldElement.name === "supporter.emailAddress" &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fieldElement.value) === false
        ) {
          this.scrollToElement(fieldElement);
          this.sendMessage("error", "Please enter a valid email address");
          field.classList.add("has-error");
          hasError = true;
          return false;
        }
      }
    });
    if (hasError) {
      return false;
    }
    // Validate City Characters Limit
    const city = form.querySelector("#en__field_supporter_city");
    const cityBlock = form.querySelector(".en__field--city");
    if (!this.checkCharsLimit("#en__field_supporter_city", 100)) {
      this.scrollToElement(city);
      this.sendMessage("error", "This field only allows up to 100 characters");
      if (cityBlock) {
        cityBlock.classList.add("has-error");
      }
      return false;
    } else {
      if (cityBlock) {
        cityBlock.classList.remove("has-error");
      }
    }
    // Validate Street Address line 1 Characters Limit
    const streetAddress1 = form.querySelector("#en__field_supporter_address1");
    const streetAddress1Block = form.querySelector(".en__field--address1");
    if (!this.checkCharsLimit("#en__field_supporter_address1", 35)) {
      this.scrollToElement(streetAddress1);
      this.sendMessage(
        "error",
        "This field only allows up to 35 characters. Longer street addresses can be broken up between Lines 1 and 2."
      );
      if (streetAddress1Block) {
        streetAddress1Block.classList.add("has-error");
      }
      return false;
    } else {
      if (streetAddress1Block) {
        streetAddress1Block.classList.remove("has-error");
      }
    }
    // Validate Street Address line 2 Characters Limit
    const streetAddress2 = form.querySelector("#en__field_supporter_address2");
    const streetAddress2Block = form.querySelector(".en__field--address2");
    if (!this.checkCharsLimit("#en__field_supporter_address2", 35)) {
      this.scrollToElement(streetAddress2);
      this.sendMessage(
        "error",
        "This field only allows up to 35 characters. Longer street addresses can be broken up between Lines 1 and 2."
      );
      if (streetAddress2Block) {
        streetAddress2Block.classList.add("has-error");
      }
      return false;
    } else {
      if (streetAddress2Block) {
        streetAddress2Block.classList.remove("has-error");
      }
    }
    // Validate Zip Code Characters Limit
    const zipCode = form.querySelector("#en__field_supporter_postcode");
    const zipCodeBlock = form.querySelector(".en__field--postcode");
    if (!this.checkCharsLimit("#en__field_supporter_postcode", 20)) {
      this.scrollToElement(zipCode);
      this.sendMessage("error", "This field only allows up to 20 characters");
      if (zipCodeBlock) {
        zipCodeBlock.classList.add("has-error");
      }
      return false;
    } else {
      if (zipCodeBlock) {
        zipCodeBlock.classList.remove("has-error");
      }
    }

    // Validate First Name Characters Limit
    const firstName = form.querySelector("#en__field_supporter_firstName");
    const firstNameBlock = form.querySelector(".en__field--firstName");
    if (!this.checkCharsLimit("#en__field_supporter_firstName", 100)) {
      this.scrollToElement(firstName);
      this.sendMessage("error", "This field only allows up to 100 characters");
      if (firstNameBlock) {
        firstNameBlock.classList.add("has-error");
      }
      return false;
    } else {
      if (firstNameBlock) {
        firstNameBlock.classList.remove("has-error");
      }
    }
    // Validate Last Name Characters Limit
    const lastName = form.querySelector("#en__field_supporter_lastName");
    const lastNameBlock = form.querySelector(".en__field--lastName");
    if (!this.checkCharsLimit("#en__field_supporter_lastName", 100)) {
      this.scrollToElement(lastName);
      this.sendMessage("error", "This field only allows up to 100 characters");
      if (lastNameBlock) {
        lastNameBlock.classList.add("has-error");
      }
      return false;
    } else {
      if (lastNameBlock) {
        lastNameBlock.classList.remove("has-error");
      }
    }
    console.log("DonationLightboxForm: validateForm PASSED");
    return true;
  }
  checkCharsLimit(field, max) {
    const fieldElement = document.querySelector(field);
    if (fieldElement && fieldElement.value.length > max) {
      return false;
    }
    return true;
  }

  // Bounce Arrow Up and Down
  bounceArrow(freq) {
    const arrow = document.querySelector(".monthly-upsell-message");
    if (!arrow) return;
    if (arrow && freq === "onetime") {
      arrow.classList.add("bounce");
      // setTimeout(() => {
      //   arrow.classList.remove("bounce");
      // }, 1000);
    } else {
      arrow.classList.remove("bounce");
    }
  }
  changeSubmitButton() {
    const submit = document.querySelector(".section-navigation__submit");
    const amount = this.checkNested(
      window.EngagingNetworks,
      "require",
      "_defined",
      "enjs",
      "getDonationTotal"
    )
      ? "$" + window.EngagingNetworks.require._defined.enjs.getDonationTotal()
      : null;
    let frequency = this.frequency.getInstance().frequency;
    let label = submit ? submit.dataset.label : "";
    frequency = frequency === "onetime" ? "" : "<small>/mo</small>";

    if (amount) {
      label = label.replace("$AMOUNT", amount);
      label = label.replace("$FREQUENCY", frequency);
    } else {
      label = label.replace("$AMOUNT", "");
      label = label.replace("$FREQUENCY", "");
    }

    if (submit && label) {
      submit.innerHTML = `<span>${label}</span>`;
    }
  }
  clickPaymentOptions(opts) {
    opts.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const paymentType = document.querySelector(
          "#en__field_transaction_paymenttype"
        );
        if (paymentType) {
          paymentType.value = btn.className.substr(15);
          // Go to the next section
          this.scrollToSection(
            parseInt(btn.closest("[data-section-id]").dataset.sectionId) + 1,
            this.currentSectionId
          );
        }
      });
    });
  }
  // Append arrow SVG to the monthly upsell message
  putArrowUpSVG() {
    const arrow = document.querySelector(".monthly-upsell-message");
    if (arrow) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.classList.add(this.setArrowPosition());
      svg.classList.add("monthly-upsell-message__arrow");
      svg.setAttribute("viewBox", "0 0 55 40");
      svg.setAttribute("fill", "none");
      svg.innerHTML = `<path d="M.804 32.388c4.913-1.273 9.461-3.912 14.556-4.458 1-.09 1.183 1.183.728 1.73-.637.727-1.456 1.819-2.365 2.728 2.547.182 4.913 1.092 7.46 1.638 2.366.546 4.73.182 6.914-.637-.546-.546-1-1.183-1.546-1.82-3.64-5.185-5.914-22.198 3.548-23.38 5.368-.729 10.28 6.095 10.553 10.917.364 6.368-3.457 11.736-8.643 14.92 2.184 1.456 4.822 2.184 7.642 2.365 5.914.273 10.1-3.639 12.1-8.915 3.64-9.644.546-22.836-9.825-26.566-.455-.182-.455-.91.09-.91 13.01.182 14.83 19.56 11.555 28.567-3.73 10.28-16.012 12.464-23.745 6.46-.637.273-1.365.636-2.093.819-5.003 1.728-9.461-.728-14.283-1.274.637 1.183 1.273 2.456 2.183 3.548.637.819.091 2.184-1.091 1.82C9.628 38.483 4.624 37.392.44 34.39c-.637-.546-.637-1.82.364-2.002zm29.295 0c1.091-.636 2.183-1.364 3.093-2.183 6.277-5.277 7.187-15.103-.637-19.47-3.64-2.001-5.731 2.457-6.46 5.277-1.091 4.094-.454 8.825 1.274 12.646a19.738 19.738 0 0 0 2.73 3.73zm-19.652 1.183c-.09 0-.182-.182-.182-.273.273-1 1.092-1.82 2.002-2.638-2.911.819-5.64 2.092-8.552 3.002 2.73 1.456 5.732 2.365 8.825 3.275-.546-1-1-2.001-1.82-2.82-.182-.182-.273-.364-.273-.546z" fill="currentColor"/>`;
      arrow.appendChild(svg);
    }
  }
  // Return the arrow position
  setArrowPosition() {
    const frequencyWrapper = document.querySelector(
      ".en__field--recurrfreq .en__field__element--radio"
    );
    if (frequencyWrapper) {
      const left = frequencyWrapper.querySelector(
        '.en__field__item:first-child input[value="MONTHLY"]'
      );
      const right = frequencyWrapper.querySelector(
        '.en__field__item:last-child input[value="MONTHLY"]'
      );
      if (left) {
        return "left";
      }
      if (right) {
        return "right";
      }
    }
    return null;
  }
  checkNested(obj, level, ...rest) {
    if (obj === undefined) return false;
    if (rest.length == 0 && obj.hasOwnProperty(level)) return true;
    return this.checkNested(obj[level], ...rest);
  }
  // Add Tabindex to Labels
  addTabIndexToLabels() {
    const labels = document.querySelectorAll(
      ".en__field__label.en__field__label--item"
    );
    labels.forEach((label) => {
      label.tabIndex = 0;
    });
  }
  isVisible(element) {
    return !!(
      element.offsetWidth ||
      element.offsetHeight ||
      element.getClientRects().length
    );
  }
  addEvents() {
    this.frequency
      .getInstance()
      .onFrequencyChange.subscribe((s) => this.bounceArrow(s));
    this.frequency
      .getInstance()
      .onFrequencyChange.subscribe(() => this.changeSubmitButton());
    this.amount
      .getInstance()
      .onAmountChange.subscribe(() => this.changeSubmitButton());
    // Payment Type Radio Change
    const paymentType = document.querySelectorAll(
      "input[name='transaction.giveBySelect']"
    );
    if (paymentType.length) {
      paymentType.forEach((item) => {
        item.addEventListener("change", () => {
          this.showHideCCSection(item.value);
          if (item.value === "card") {
            const paymentType = document.querySelector(
              "#en__field_transaction_paymenttype"
            );
            if (paymentType) {
              paymentType.value = "visa";
            }
          }
        });
      });
    }
  }
  showHideCCSection(paymentType) {
    let ptValue = paymentType;
    if (!paymentType) {
      const payment = document.querySelector(
        "#en__field_transaction_paymenttype"
      );
      if (
        payment &&
        ["visa", "mastercard", "amex", "discover", "diners", "jcb"].includes(
          payment.value
        )
      ) {
        ptValue = "card";
        // Check Card transaction.giveBySelect
        const card = document.querySelector(
          "[name='transaction.giveBySelect'][value='card']"
        );
        if (card) {
          card.checked = true;
          const event = new Event("change");
          card.dispatchEvent(event);
        }
      }
    }
    const ccnumberBlock = document.querySelector(
      "#en__field_transaction_ccnumber"
    );
    console.log(ccnumberBlock);
    const ccnumberSection = this.getSectionId(ccnumberBlock);
    if (ptValue === "card") {
      this.sections[ccnumberSection].style.display = "block";
    } else {
      this.sections[ccnumberSection].style.display = "none";
    }
  }
}
