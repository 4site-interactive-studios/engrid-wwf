import { Options, App } from "@4site/engrid-common"; // Uses ENGrid via NPM
// import { Options, App } from "../../engrid-scripts/packages/common"; // Uses ENGrid via Visual Studio Workspace

import "./sass/main.scss";
import { customScript } from "./scripts/main";
import { pageHeaderFooter } from "./scripts/page-header-footer";

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
  // FreshAddress: {
  //   url: "https://rt.freshaddress.biz/v7.2?service=react&company=1423&contract=5109&token=3e092f6ce98a5288c9967e041c8de96efbe49101fdc377b86ff7efe3e60981e3c0acefc91578da9ba73e8d0fce5e0f3a",
  //   dateField: "supporter.NOT_TAGGED_116",
  //   statusField: "supporter.NOT_TAGGED_59",
  //   dateFieldFormat: "YYYY-MM-DD",
  // },
  Debug: App.getUrlParameter("debug") == "true" ? true : false,
  onLoad: () => {
    customScript(App);
    pageHeaderFooter(App); // Added this line to trigger pageHeaderFooter
  },
  onResize: () => console.log("Starter Theme Window Resized"),
};
new App(options);
