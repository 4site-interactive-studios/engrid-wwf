declare const sustainerUpgradeAsk: string | undefined;

// The heading is rendered as "Manage your $5 USD recurring gift". Drop
// the currency code right before "recurring" (e.g. "USD", "EUR")
const stripGiftCurrency = (overlay: Element) => {
  const heading = overlay.querySelector<HTMLElement>(
    ".en__hubPledge__panel--copy h2"
  );
  if (!heading || !heading.textContent) return;
  const text = heading.textContent;
  // Keep the amount ("$5"), drop only the currency code ("USD") that
  // sits right before "recurring"
  const match = text.match(/^(.*\byour\s+\S+)\s+\S+(\s+recurring\b.*)$/i);
  if (!match) return;
  const updated = `${match[1]}${match[2]}`;
  if (updated !== text) heading.textContent = updated;
};

// Prefix a "$" on the "Other" amount field. A separate element is used
// so the input value stays numeric
const addOtherCurrencySymbol = (overlay: Element) => {
  const otherItem = overlay.querySelector<HTMLElement>(
    ".en__field--donationAmt .en__field__item--other"
  );
  const input = otherItem?.querySelector<HTMLElement>("input");
  if (!otherItem || !input) return;
  let symbol = otherItem.querySelector<HTMLElement>(
    ".engrid-hub-currency-symbol"
  );
  if (!symbol) {
    symbol = document.createElement("span");
    symbol.className = "engrid-hub-currency-symbol";
    symbol.setAttribute("aria-hidden", "true");
    symbol.textContent = "$";
    otherItem.insertBefore(symbol, otherItem.firstChild);
  }
  const top = `${input.offsetTop}px`;
  const height = `${input.offsetHeight}px`;
  if (symbol.style.top !== top) symbol.style.top = top;
  if (symbol.style.height !== height) symbol.style.height = height;
};

// Replace the fixed amount buttons with the donor's Sustainer Upgrade Ask String,
// defined by the page's code block (const sustainerUpgradeAsk = "{user_data~Sustainer Upgrade Ask String}")
const applySustainerUpgradeAsk = (overlay: Element) => {
  if (typeof sustainerUpgradeAsk !== "string") return;
  const amounts = sustainerUpgradeAsk
    .split(",")
    .map((amount) => parseFloat(amount.trim()))
    .filter((amount) => !isNaN(amount) && amount > 0);
  if (!amounts.length) return;
  const container = overlay.querySelector<HTMLElement>(
    ".en__field--donationAmt .en__field__element--radio"
  );
  if (!container || container.hasAttribute("data-engrid-ask-applied")) return;
  const items = Array.from(
    container.querySelectorAll<HTMLElement>(
      ".en__field__item:not(.en__field__item--other)"
    )
  );
  if (!items.length) return;
  container.setAttribute("data-engrid-ask-applied", "true");
  // The donor's current amount: the "Other" input when it is the active
  // one (EN puts it there when the amount is not in the default list),
  // otherwise the checked radio
  const field = container.closest<HTMLElement>(".en__field--donationAmt");
  const otherInput = container.querySelector<HTMLInputElement>(
    "input.en__field__input--other"
  );
  const checked = container.querySelector<HTMLInputElement>(
    "input[type='radio']:checked"
  );
  const otherAmount = otherInput
    ? parseFloat(otherInput.value.replace(/[^\d.]/g, ""))
    : NaN;
  const currentAmount =
    field?.classList.contains("en__field--withOther--active") &&
    !isNaN(otherAmount)
      ? otherAmount
      : checked
      ? parseFloat(checked.value)
      : null;
  const symbol =
    (items[0].querySelector("label")?.textContent || "").replace(
      /[\d.,\s]/g,
      ""
    ) || "$";
  const template = items[0];
  // Reuse the existing items, cloning the first one if more are needed
  // and removing the extra ones
  amounts.forEach((amount, index) => {
    let item = items[index];
    if (!item) {
      item = template.cloneNode(true) as HTMLElement;
      items[items.length - 1].after(item);
      items.push(item);
    }
    const input = item.querySelector<HTMLInputElement>("input");
    const label = item.querySelector<HTMLLabelElement>("label");
    if (!input || !label) return;
    const id = `en__hubPledge__field--donationAmt--${amount}`;
    input.value = String(amount);
    input.id = id;
    input.checked = amount === currentAmount;
    label.htmlFor = id;
    label.textContent = `${symbol}${amount.toLocaleString("en-US")}`;
  });
  items.slice(amounts.length).forEach((item) => item.remove());
  // EN and ENgrid expect the item right before the "Other" text input
  // to be a (hidden) "Other" radio. Without it, the last real amount
  // gets treated as "Other" (and hidden/activating the input)
  const otherRadio = items[amounts.length - 1].cloneNode(true) as HTMLElement;
  const otherRadioInput = otherRadio.querySelector<HTMLInputElement>("input");
  const otherRadioLabel = otherRadio.querySelector<HTMLLabelElement>("label");
  if (otherRadioInput && otherRadioLabel) {
    otherRadioInput.value = "other";
    otherRadioInput.id = "en__hubPledge__field--donationAmt--other";
    otherRadioInput.checked = false;
    otherRadioLabel.htmlFor = otherRadioInput.id;
    otherRadioLabel.textContent = "Other";
    items[amounts.length - 1].after(otherRadio);
  }
  // The current amount is in the new list: it must be a selected button,
  // not the "Other" input
  const selected = container.querySelector<HTMLInputElement>(
    "input[type='radio']:checked"
  );
  if (selected && selected.value !== "other" && otherInput) {
    otherInput.value = "";
    field?.classList.remove("en__field--withOther--active");
    selected.dispatchEvent(new Event("change", { bubbles: true }));
  } else if (
    otherInput &&
    currentAmount !== null &&
    currentAmount > 0 &&
    amounts.indexOf(currentAmount) === -1
  ) {
    // The current amount was a default button but is not in the new list, so
    // it has no button anymore: show it in the "Other" input, as EN does for
    // amounts that are not in the default list
    otherInput.value = Number.isInteger(currentAmount)
      ? String(currentAmount)
      : currentAmount.toFixed(2);
    field?.classList.add("en__field--withOther--active");
  }
};

// The pencil icon that reveals the card fields becomes a text link. The
// element and its class are kept, since EN binds the click to it
const setUpdateCardLink = (overlay: Element) => {
  const toggle = overlay.querySelector<HTMLElement>(".en__hubUpdateCC__toggle");
  if (!toggle) return;
  const text = "Update your credit card information";
  if (toggle.textContent !== text) toggle.textContent = text;
  if (toggle.hasAttribute("data-engrid-link")) return;
  toggle.setAttribute("data-engrid-link", "true");
  toggle.setAttribute("role", "button");
  toggle.setAttribute("tabindex", "0");
  toggle.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle.click();
    }
  });
};

const updateOverlay = () => {
  const overlay = document.querySelector("#huboverlay-manage-my-recurring-gift");
  if (!overlay) return;
  stripGiftCurrency(overlay);
  applySustainerUpgradeAsk(overlay);
  addOtherCurrencySymbol(overlay);
  setUpdateCardLink(overlay);
};

export const supporterHubImprovements = () => {
  // The overlay is injected/re-rendered by EN after load, so watch for it
  new MutationObserver(updateOverlay).observe(document.body, {
    childList: true,
    subtree: true,
  });
  updateOverlay();
};
