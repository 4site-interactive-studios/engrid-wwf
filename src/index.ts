// import {
//   Options,
//   App,
//   DonationFrequency,
//   DonationAmount,
//   EnForm,
// } from "@4site/engrid-scripts"; // Uses ENGrid via NPM
import {
  Options,
  App,
  DonationFrequency,
  DonationAmount,
  EnForm,
} from "../../engrid/packages/scripts"; // Uses ENGrid via Visual Studio Workspace

import "./sass/main.scss";
import { customScript } from "./scripts/main";
import { pageHeaderFooter } from "./scripts/page-header-footer";
import DonationLightboxForm from "./scripts/donation-lightbox-form";
import TweetToTarget from "./scripts/tweet-to-target";
import { AnnualLimit } from "./scripts/annual-limit";
import { OnLoadModal } from "./scripts/on-load-modal";
import MultistepForm from "./scripts/multistep-form";
import { AddDAF } from "./scripts/add-daf";

const options: Options = {
  AutoYear: true,
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
  Plaid: true,
  PageLayouts: [
    "centerleft1col",
    "centercenter1col",
    "centercenter2col",
    "centerright1col",
  ],
  Debug: App.getUrlParameter("debug") == "true" ? true : false,
  MobileCTA: [
    { pageType: "ADVOCACY", label: "Add Your Name" },
    { pageType: "EMAILTOTARGET", label: "Add Your Name" },
    { pageType: "TWEETPAGE", label: "Add Your Name" },
  ],
  PostalCodeValidator: true,
  WelcomeBack: {
    welcomeBackMessage: {
      display: true,
      title: "Welcome back, {firstName}!",
      editText: "Not you?",
      anchor: ".fast-personal-details",
      placement: "beforebegin",
    },
    personalDetailsSummary: {
      display: true,
      title: "Your Information",
      editText: "Change my info",
      anchor: ".fast-personal-details",
      placement: "beforebegin",
    },
  },
  onLoad: () => {
    // If we're on a Thank You page, let's try to add pageJson.other3 as data-engrid-payment-type body attribute
    if (
      App.getPageNumber() === App.getPageCount() &&
      "pageJson" in window &&
      "other3" in (window as any).pageJson
    ) {
      document.body.setAttribute(
        "data-engrid-payment-type",
        (window as any).pageJson.other3
      );
    }
    new AnnualLimit();
    (<any>window).DonationLightboxForm = DonationLightboxForm;
    new DonationLightboxForm(DonationAmount, DonationFrequency, App);
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
    // If the page has a State field, and it is not required, make a mutation observer
    // to watch for changes to the field and hide/show it
    const regionContainer = document.querySelector(
      ".en__field--region:not(.en__mandatory)"
    ) as HTMLDivElement;
    const tributeRecipientRegionContainer = document.querySelector(
      ".en__field--infreg:not(.en__mandatory)"
    ) as HTMLDivElement;
    if (regionContainer || tributeRecipientRegionContainer) {
      // Observe changes to the region container
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          // If it's adding a state TEXT field, empty it and hide the container
          if (
            mutation.addedNodes &&
            mutation.addedNodes.length > 0 &&
            mutation.addedNodes[0].nodeName === "INPUT" &&
            (mutation.addedNodes[0] as HTMLInputElement).getAttribute(
              "type"
            ) === "text"
          ) {
            const stateField = mutation.addedNodes[0] as HTMLInputElement;
            stateField.value = "";
            const fieldContainer = stateField.closest(".en__field--select");
            if (fieldContainer) {
              fieldContainer.classList.add("hide");
            }
          }
          // If it's adding a state SELECT field, show the container
          if (
            mutation.addedNodes &&
            mutation.addedNodes.length > 0 &&
            mutation.addedNodes[0].nodeName === "SELECT"
          ) {
            const stateField = mutation.addedNodes[0] as HTMLSelectElement;
            const fieldContainer = stateField.closest(".en__field--select");
            if (fieldContainer) {
              fieldContainer.classList.remove("hide");
            }
          }
          // console.log(mutation);
        });
      });
      const stateField = document.querySelector("#en__field_supporter_region");
      if (stateField && stateField.nodeName === "INPUT") {
        regionContainer.classList.add("hide");
      }
      const tributeRecipientStateField = document.querySelector(
        "#en__field_transaction_infreg"
      );
      if (
        tributeRecipientStateField &&
        tributeRecipientStateField.nodeName === "INPUT"
      ) {
        tributeRecipientRegionContainer.classList.add("hide");
      }
      // Start observing the region container
      if (regionContainer) {
        observer.observe(regionContainer, { childList: true, subtree: true });
      }
      if (tributeRecipientRegionContainer) {
        observer.observe(tributeRecipientRegionContainer, {
          childList: true,
          subtree: true,
        });
      }
    }
    new OnLoadModal();
    new MultistepForm();
    new AddDAF();
    // Unsubscribe All Logic
    const unsubscribeAllButton = document.querySelector(
      "#unsubscribe-all"
    ) as HTMLInputElement;
    const unsubscribeAllRadio = App.getField(
      "supporter.questions.888498"
    ) as HTMLInputElement;
    if (unsubscribeAllButton && unsubscribeAllRadio) {
      unsubscribeAllButton.addEventListener("click", () => {
        unsubscribeAllRadio.click();
      });
      // Hide the unsubscribe all radio button
      unsubscribeAllRadio.closest(".en__field")?.classList.add("hide");
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
    [
      "District of Columbia",
      "American Samoa",
      "Northern Mariana Islands",
      "US Minor Outlying Islands",
      "Virgin Islands",
    ].includes(expandedRegionField.value)
  ) {
    // Add "the" to the beginning of the region name
    expandedRegionField.value = `the ${expandedRegionField.value}`;
  }
});
