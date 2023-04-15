// import { Options, App, DonationFrequency, DonationAmount } from "@4site/engrid-common"; // Uses ENGrid via NPM
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
  Debug: App.getUrlParameter("debug") == "true" ? true : false,
  onLoad: () => {
    (<any>window).DonationLightboxForm = DonationLightboxForm;
    new DonationLightboxForm(DonationAmount, DonationFrequency);
    customScript(App, DonationFrequency);
    pageHeaderFooter(App); // Added this line to trigger pageHeaderFooter
  },
  onResize: () => console.log("Starter Theme Window Resized"),
  onValidate: () => {
    const plaidLink = document.querySelector(
      "#plaid-link-button"
    ) as HTMLLinkElement;
    if (plaidLink) {
      // Click the Plaid Link button
      plaidLink.click();
      return false;
    }
  },

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
    }
  },
};
new App(options);
