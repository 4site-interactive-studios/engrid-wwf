// The class below is minified and inlined in the ENgrid: DesktopRedirect & ENgrid: MobileRedirect Code Blocks
class DeviceRedirect {
  constructor() {
    this.redirectUrl = null;
    this.initializeRedirect();
  }

  initializeRedirect() {
    const mobileRedirect = window.MobileRedirect;
    const desktopRedirect = window.DesktopRedirect;

    if (mobileRedirect) {
      this.redirectUrl = mobileRedirect;
      this.checkAndRedirect(this.isMobileDevice());
    } else if (desktopRedirect) {
      this.redirectUrl = desktopRedirect;
      this.checkAndRedirect(!this.isMobileDevice());
    }
  }

  checkAndRedirect(shouldRedirect) {
    if (shouldRedirect && this.redirectUrl) {
      const url = new URL(this.redirectUrl);
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.forEach((value, key) => {
        url.searchParams.set(key, value);
      });
      window.location.href = url.toString();
    }
  }

  isMobileDevice() {
    return window.innerWidth <= 768;
  }
}

// Self-initiate the class
new DeviceRedirect();
