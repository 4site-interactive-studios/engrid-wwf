import {
  Options,
  App,
  DonationFrequency,
  DonationAmount,
  EnForm,
} from "@4site/engrid-common"; // Uses ENGrid via NPM
// import {
//   Options,
//   App,
//   DonationFrequency,
//   DonationAmount,
//   EnForm,
// } from "../../engrid-scripts/packages/common"; // Uses ENGrid via Visual Studio Workspace

import "./sass/main.scss";
import { customScript } from "./scripts/main";
import { pageHeaderFooter } from "./scripts/page-header-footer";
import DonationLightboxForm from "./scripts/donation-lightbox-form";
import TweetToTarget from "./scripts/tweet-to-target";
import { AnnualLimit } from "./scripts/annual-limit";

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
  RegionLongFormat: "supporter.NOT_TAGGED_97",
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
  RememberMe: {
    checked: true,
    remoteUrl:
      "https://www.ran.org/wp-content/themes/ran-2020/data-remember.html",
    fieldOptInSelectorTarget:
      "div.en__field--postcode, div.en__field--telephone, div.en__field--email, div.en__field--lastName",
    fieldOptInSelectorTargetLocation: "after",
    fieldClearSelectorTarget:
      "div.en__field--firstName div, div.en__field--email div",
    fieldClearSelectorTargetLocation: "after",
    fieldNames: [
      "supporter.firstName",
      "supporter.lastName",
      "supporter.address1",
      "supporter.address2",
      "supporter.city",
      "supporter.country",
      "supporter.region",
      "supporter.postcode",
      "supporter.emailAddress",
    ],
  },
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
    new AnnualLimit();
    (<any>window).DonationLightboxForm = DonationLightboxForm;
    new DonationLightboxForm(DonationAmount, DonationFrequency);
    customScript(App, DonationFrequency);
    pageHeaderFooter(App); // Added this line to trigger pageHeaderFooter
    new TweetToTarget(App, EnForm);
    // Expand all contact sections on EMAILTOTARGET pages
    if (App.getPageType() === "EMAILTOTARGET") {
      const closedContactSections = document.querySelectorAll(
        ".en__contact--closed"
      );
      closedContactSections.forEach((section) => {
        section.classList.remove("en__contact--closed");
        section.classList.add("en__contact--open");
      });
    }
    // Add Plaid Tooltip to Submit Button
    const submitButton = document.querySelector(
      ".en__submit button"
    ) as HTMLButtonElement;
    if (submitButton) {
      submitButton.setAttribute(
        "data-balloon",
        `When you click the button below, a new window will appear.
        Follow the steps to securely donate from your bank account to WWF
        (through Engaging Networks and Plaid).`
      );
      submitButton.setAttribute("data-balloon-pos", "up");
    }
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
        const pgItems = document.querySelectorAll(
          ".en__pgList .en__pg"
        ) as NodeListOf<HTMLInputElement>;
        if (maxTheirGift && prodVariantValue === "" && pgItems.length > 0) {
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
// Trying to fix the issue of EN not running the onSubmit & onValidate functions
// when you use digital wallets
const paymentButtons = document.querySelectorAll(
  'input[name="transaction.giveBySelect"]'
);
if (paymentButtons.length > 0) {
  paymentButtons.forEach((button) => {
    // If the changed radio value is stripedigitalwallet, run the options functions
    button.addEventListener("change", (e) => {
      if ((e.target as HTMLInputElement).value === "stripedigitalwallet") {
        App.log("Stripe Digital Wallet Selected");
        if (options.onValidate) options.onValidate();
        if (options.onSubmit) options.onSubmit();
      }
    });
  });
}

new App(options);

// Adding a new listener to the onSubmit event after the App has been instantiated so that
// it runs last and can modify the value of the RegionLongFormat field for the District of Columbia
const enForm = EnForm.getInstance();
enForm.onSubmit.subscribe(() => {
  const expandedRegionField = App.getField(
    App.getOption("RegionLongFormat") as string
  ) as HTMLInputElement;
  if (
    expandedRegionField &&
    expandedRegionField.value === "District of Columbia"
  ) {
    expandedRegionField.value = `the District of Columbia`;
  }
});
