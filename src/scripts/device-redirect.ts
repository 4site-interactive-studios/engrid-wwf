/**
 * The `DeviceRedirect` class handles the redirection of users to a specified URL
 * based on the device they are using. It checks for the presence of global
 * `MobileRedirect` or `DesktopRedirect` variables and uses them as the redirection URL.
 *
 * @example
 *
 * ```html
 * <script>
 *      // If the user is on a mobile device, redirect them to a different URL
 *      window.MobileRedirect = "https://m.example.com";
 *      // If the user is on a desktop device, redirect them to a different URL
 *      window.DesktopRedirect = "https://www.example.com";
 * </script>
 * ```
 *
 * @remarks
 * This class determines if the user is on a mobile or desktop device based on the screen width.
 * If the screen width is less than 768 pixels, it is considered a mobile device.
 * If the screen width is 768 pixels or greater, it is considered a desktop device.
 * You are not supposed to use both `MobileRedirect` and `DesktopRedirect` variables at the same time.
 */
import { EngridLogger } from "@4site/engrid-scripts";

export class DeviceRedirect {
  private redirectUrl: string | null = null;
  private logger: EngridLogger;

  constructor() {
    this.logger = new EngridLogger(
      "DeviceRedirect",
      "purple",
      "aliceblue",
      "🔀"
    );
    this.initializeRedirect();
  }

  private initializeRedirect() {
    if (typeof (window as any).MobileRedirect !== "undefined") {
      this.logger.log("MobileRedirect variable found");
      this.redirectUrl = (window as any).MobileRedirect;
      this.checkAndRedirect("mobile");
    } else if (typeof (window as any).DesktopRedirect !== "undefined") {
      this.logger.log("DesktopRedirect variable found");
      this.redirectUrl = (window as any).DesktopRedirect;
      this.checkAndRedirect("desktop");
    }
  }

  private checkAndRedirect(type: "mobile" | "desktop") {
    const typeMatch =
      type === "mobile" ? this.isMobileDevice() : !this.isMobileDevice();
    if (typeMatch && this.redirectUrl) {
      this.logger.log(`Redirecting to ${this.redirectUrl}`);
      const url = new URL(this.redirectUrl);
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.forEach((value, key) => {
        url.searchParams.set(key, value);
      });
      window.location.href = url.toString();
    } else {
      this.logger.log(
        "Device type not detected. No redirection will be performed."
      );
    }
  }

  private isMobileDevice(): boolean {
    return window.innerWidth <= 768;
  }
}
