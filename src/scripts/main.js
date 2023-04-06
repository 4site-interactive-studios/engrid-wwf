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
        "input[type='radio'][name='en__pg'][value='0']"
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
          block.style.display = "none";
        });
      }
      if (premiumTitle) {
        premiumTitle.style.display = "none";
      }
    };
    const showPremiumBlock = () => {
      const premiumBlock = document.querySelectorAll(
        ".en__component--premiumgiftblock > div"
      );
      const premiumTitle = document.querySelector(".engrid_premium_title");
      if (premiumBlock) {
        premiumBlock.forEach((block) => {
          block.style.display = "block";
        });
      }
      if (premiumTitle) {
        premiumTitle.style.display = "block";
      }
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
      }
      country.addEventListener("change", () => {
        if (country.value !== "US") {
          maxMyGift();
          hidePremiumBlock();
        } else {
          showPremiumBlock();
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
  // App.setBodydata("client-js-loading", "finished");
};
