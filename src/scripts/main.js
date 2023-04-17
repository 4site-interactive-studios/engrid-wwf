export const customScript = function (App, DonationFrequency) {
  console.log("ENGrid client scripts are executing");
  // Add your client scripts here
  if (
    "pageJson" in window &&
    "pageType" in window.pageJson &&
    window.pageJson.pageType === "premiumgift"
  ) {
    const freq = DonationFrequency.getInstance();
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
          'select[name="supporter.country"]',
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
};
