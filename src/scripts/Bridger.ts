declare global {
  interface Window {
    userData: Record<string, string>;
    pageJson: {
      giftProcess: boolean;
      amount: number;
      currency: string;
    };
  }
}

export class Bridger {
  private endpoint: string =
    "https://dev-wwf-bridger-api.azurewebsites.net/api/createsearch";
  private key: string =
    "u-Woy4e-BXWlcLBDlH20CR-y-iKknrltLZJtXV9yg-SuAzFu72hDaw==";

  constructor() {
    if (!this.shouldRun()) return;
    this.createBridgerSearchRecord();
  }

  private shouldRun(): boolean {
    return (
      window.pageJson.giftProcess &&
      window.pageJson.amount >= 10000 &&
      window.pageJson.currency === "USD"
    );
  }

  private createBridgerSearchRecord() {
    this.sendApiRequest().then((data) => {
      //console.log(data);
    });
  }

  private async sendApiRequest() {
    let data = null;

    try {
      const body = JSON.stringify({
        firstName: this.getUserData("firstName"),
        lastName: this.getUserData("lastName"),
        address1: `${this.getUserData("address1")} ${this.getUserData(
          "address2"
        )}`,
        city: this.getUserData("city"),
        country: this.getUserData("country"),
        postalCode: this.getUserData("zipCode"),
      });

      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-functions-key": this.key,
        },
        body: body,
      });

      if (response.ok) {
        data = await response.json();
      } else {
        console.log("API request failed");
      }
    } catch (error) {
      console.log("API request failed");
    }

    return data;
  }

  private getUserData(property: string) {
    if (
      !window.userData ||
      !window.userData[property] ||
      window.userData[property].startsWith("{")
    ) {
      return "";
    }

    return window.userData[property];
  }
}
