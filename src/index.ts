// import {
//   Options,
//   App,
//   DonationFrequency,
//   DonationAmount,
// } from "@4site/engrid-common"; // Uses ENGrid via NPM
import {
  Options,
  App,
  DonationFrequency,
  DonationAmount,
} from "../../engrid-scripts/packages/common"; // Uses ENGrid via Visual Studio Workspace

import "./sass/main.scss";
import { customScript } from "./scripts/main";
import { pageHeaderFooter } from "./scripts/page-header-footer";
import DonationLightboxForm from "./scripts/donation-lightbox-form";

const options: Options = {
  applePay: false,
  CapitalizeFields: true,
  ClickToExpand: true,
  CurrencySymbol: "$",
  DecimalSeparator: ".",
  ThousandsSeparator: ",",
  MediaAttribution: true,
  MinAmount: 5,
  MinAmountMessage: "Minimum donation amount is $5",
  MaxAmount: 65000,
  MaxAmountMessage: "Maximum donation amount is $65,000",
  SkipToMainContentLink: true,
  SrcDefer: true,
  ProgressBar: true,
  FreshAddress: {
    // dateField: "supporter.NOT_TAGGED_XXX",
    // statusField: "supporter.NOT_TAGGED_YYY",
    // messageField: "supporter.NOT_TAGGED_ZZZ",
    dateFieldFormat: "YYYY-MM-DD",
  },
  CountryDisable: [
    "Belarus",
    "Cuba",
    "Iran",
    "North Korea",
    "Russia",
    "Syria",
    "Ukraine",
  ],
  Plaid: true,
  PageLayouts: [
    "centerleft1col",
    "centercenter1col",
    "centercenter2col",
    "centerright1col",
  ],
  Debug: App.getUrlParameter("debug") == "true" ? true : false,
  MobileCTA: {
    label: "Add Your Name",
    pages: ["ADVOCACY", "EMAILTOTARGET", "TWEETPAGE"],
  },
  onLoad: () => {
    (<any>window).DonationLightboxForm = DonationLightboxForm;
    new DonationLightboxForm(DonationAmount, DonationFrequency);
    customScript(App, DonationFrequency);
    pageHeaderFooter(App); // Added this line to trigger pageHeaderFooter
  },
  onResize: () => console.log("Starter Theme Window Resized"),

  onSubmit: () => {
    if (
      "pageJson" in (window as any) &&
      "pageType" in (window as any).pageJson &&
      (window as any).pageJson.pageType === "premiumgift" &&
      App.getUrlParameter("premium") !== "international"
    ) {
      const country = App.getField("supporter.country") as HTMLSelectElement;
      if (country && country.value !== "US") {
        const maxRadio = document.querySelector(
          "input[type='radio'][name='en__pg'][value='0']"
        ) as HTMLInputElement;
        if (maxRadio) {
          maxRadio.checked = true;
          maxRadio.click();
          App.setFieldValue("transaction.selprodvariantid", "");
        }
      }
      if (country && country.value === "US") {
        const maxTheirGift = (window as any).maxTheirGift ?? 0;
        const prodVariantValue = App.getFieldValue(
          "transaction.selprodvariantid"
        );
        if (maxTheirGift && prodVariantValue === "") {
          App.log(`Setting maxTheirGift to ${maxTheirGift}`);
          App.setFieldValue("transaction.selprodvariantid", maxTheirGift);
        }
      }
    }
  },
  onValidate: () => {
    // Check if there's a transaction.selprodvariantid field and a donationHasPremium field
    const transactionSelprodvariantid = App.getField(
      "transaction.selprodvariantid"
    ) as HTMLInputElement;
    const donationHasPremium = App.getField(
      "supporter.NOT_TAGGED_45"
    ) as HTMLInputElement;
    const maxTheirGift = (window as any).maxTheirGift ?? 0;
    if (transactionSelprodvariantid && donationHasPremium) {
      // If there is, sync the values
      donationHasPremium.value =
        transactionSelprodvariantid.value &&
        transactionSelprodvariantid.value != maxTheirGift
          ? "Y"
          : "N";
      //
    }
  },
};
(window as any).EngridTranslate = {
  US: [
    { field: "supporter.postcode", translation: "ZIP Code" },
    { field: "transaction.shippostcode", translation: "Shipping ZIP Code" },
    { field: "transaction.infpostcd", translation: "Recipient ZIP Code" },
  ],
};
new App(options);
