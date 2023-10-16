import crumbs from "./crumbs";
export class PaymentTracker {
  constructor(App) {
    this.app = App;
    this.paymentChanges = crumbs.ls.get("ENgrid-PT", true) || [];
    this.prefix = "paymenttypeswitch";
    this.dataLayer = window.dataLayer || [];
    this.paymentType = document.getElementById(
      "en__field_transaction_paymenttype"
    );
    this.form = document.querySelector("form.en__component");
    this.currentPaymentType = this.app.getPaymentType();

    if (this.paymentType) {
      // When the payment type gets changed, track it and save it into local storage
      this.paymentType.addEventListener(
        "change",
        this.trackPaymentType.bind(this)
      );
      // We're doing this because sometimes the payment type gets changed
      // programatically and it doesn't trigger the change event
      document.querySelectorAll("input[type='radio']").forEach((e) => {
        e.addEventListener("change", () =>
          window.setTimeout(this.trackPaymentType.bind(this), 500)
        );
      });
    }

    // If we are on a Thank You page, dump the local storage contents into the dataLayer
    if (this.app.getPageNumber() === this.app.getPageCount()) {
      this.prefix = this.prefix + "_success";
      this.clearLocalStorage();
    }
  }

  trackPaymentType() {
    const payment =
      this.app.getPaymentType() ||
      this.paymentType.options[this.paymentType.selectedIndex].value ||
      "card";
    // If the payment type is the same as the last one, don't do anything
    if (this.currentPaymentType === payment) return;
    const lastPayment = this.getLastPaymentType();
    let paymentData = this.getErrorPrefix();
    paymentData += this.currentPaymentType + "_to_" + payment;
    if (this.currentPaymentType === "") {
      paymentData = lastPayment
        ? this.getErrorPrefix() + lastPayment + "_to_" + payment
        : payment;
    }
    if (this.app.debug) console.log("ENgrid-PT Payment Data", paymentData);
    // Save the payment type into local storage
    this.paymentChanges.push(paymentData);
    crumbs.ls.set("ENgrid-PT", this.paymentChanges);
    this.currentPaymentType = payment;
    // Push the payment type into the dataLayer
    this.dataLayer.push({
      event: this.prefix + "_" + paymentData,
    });
  }

  getLastPaymentType() {
    // Return the last piece of payment type from local storage, exploded by "_"
    const lastPayment = this.paymentChanges[this.paymentChanges.length - 1];
    if (!lastPayment) return "";
    const payment = lastPayment.split("_");
    return payment[payment.length - 1];
  }

  getErrorPrefix() {
    const hasError = document.querySelector(".en__errorList li");
    // Check if the URL has a query string parameter of "val", which means the form has been submitted
    const hasVal = window.location.search.includes("?val");
    return hasError || hasVal ? "error_" : "";
  }
  clearLocalStorage() {
    this.paymentChanges.forEach((v) => {
      const paymentData = v.includes("error_")
        ? this.prefix + "-from-" + v
        : this.prefix + "_" + v;
      this.dataLayer.push({
        event: paymentData,
      });
      if (this.app.debug) console.log("ENgrid-PT DataLayer", paymentData);
    });
    crumbs.ls.delete("ENgrid-PT");
    this.paymentChanges = [];
  }
}
