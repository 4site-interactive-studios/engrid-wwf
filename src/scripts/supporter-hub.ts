declare const dynamicMonthlyAskString: string | undefined;

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

// The amount selected in the donation amount field: the "Other" input when
// it is the active one (EN puts the donor's current amount there when it is
// not in the default list), otherwise the checked radio
const getSelectedAmount = (field: Element): number | null => {
  const otherInput = field.querySelector<HTMLInputElement>(
    "input.en__field__input--other"
  );
  const checked = field.querySelector<HTMLInputElement>(
    "input[type='radio']:checked"
  );
  const otherAmount = otherInput
    ? parseFloat(otherInput.value.replace(/[^\d.]/g, ""))
    : NaN;
  if (
    (field.classList.contains("en__field--withOther--active") ||
      checked?.value === "other") &&
    !isNaN(otherAmount)
  ) {
    return otherAmount;
  }
  const checkedAmount = checked ? parseFloat(checked.value) : NaN;
  return isNaN(checkedAmount) ? null : checkedAmount;
};

// Replace the fixed amount buttons with the donor's Sustainer Upgrade Ask String,
// defined by the page's code block (const dynamicMonthlyAskString = "{user_data~Sustainer Upgrade Ask String}")
const applyDynamicMonthlyAskString = (overlay: Element) => {
  if (typeof dynamicMonthlyAskString !== "string") return;
  const amounts = dynamicMonthlyAskString
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
  const field = container.closest<HTMLElement>(".en__field--donationAmt");
  const otherInput = container.querySelector<HTMLInputElement>(
    "input.en__field__input--other"
  );
  const currentAmount = field ? getSelectedAmount(field) : null;
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

// Log an event when a recurring gift amount is changed. The amounts are kept
// on EN's edit view (.en__hubPledge__state), which stays on the page when
// the gift is saved: EN re-renders it with the "Your recurring gift has been
// updated" copy and no fields. A failed save adds
// en__hubPledge__state--failed and keeps the fields.
// Only sent from hubs that open the gadget inline, with
// window.EngridSupporterHubAutoOpen (see supporter-hub-auto-open.ts)
const isAutoOpenHub = () =>
  typeof window.EngridSupporterHubAutoOpen === "string" &&
  window.EngridSupporterHubAutoOpen.trim() !== "";

const trackRecurringUpgrade = (overlay: Element) => {
  const state = overlay.querySelector<HTMLElement>(
    ".en__hubPledge__state--activeRecurring"
  );
  if (!state) return;
  const field = state.querySelector(".en__field--donationAmt");
  if (field) {
    // EN prefills the field with the gift's current amount when it renders
    // the edit view, before the donor changes it
    if (state.dataset.engridPreviousAmount === undefined) {
      const amount = getSelectedAmount(field);
      if (amount !== null) state.dataset.engridPreviousAmount = String(amount);
    }
    return;
  }
  if (state.classList.contains("en__hubPledge__state--failed")) return;
  const previousAmount = parseFloat(state.dataset.engridPreviousAmount ?? "");
  const newAmount = parseFloat(state.dataset.engridNewAmount ?? "");
  delete state.dataset.engridPreviousAmount;
  delete state.dataset.engridNewAmount;
  if (isNaN(previousAmount) || isNaN(newAmount)) return;
  if (newAmount === previousAmount) return;
  console.log({
    event: "en_recurring_donation_upgraded",
    previous_amount: previousAmount,
    new_amount: newAmount,
    amount_increase: newAmount - previousAmount,
  });
};

// The fields are gone once EN shows the result, so the new amount is read
// when "Update and save" is clicked (capture phase, before EN's handler)
const storeNewAmountOnSubmit = (event: Event) => {
  const button = (event.target as Element | null)?.closest?.(
    ".en__hubPledge__state--activeRecurring .en__submit button"
  );
  const state = button?.closest<HTMLElement>(".en__hubPledge__state");
  const field = state?.querySelector(".en__field--donationAmt");
  if (!state || !field) return;
  const amount = getSelectedAmount(field);
  if (amount === null) {
    delete state.dataset.engridNewAmount;
  } else {
    state.dataset.engridNewAmount = String(amount);
  }
};

// EN's recurring gift data has no frequency, but the giving history does
// (recurringFrequency on each transaction). When every active recurring
// gift has the same frequency, "recurring gift" becomes "monthly gift"
// (or quarterly, semi-annual, annual) in the gadget label, the list header
// and the edit screen heading. Mixed frequencies, or a gift we can't find
// in the history, keep "recurring" there. The edit screen is for a single
// gift, so its heading uses that gift's own frequency even when they're
// mixed
const giftFrequencyLabels: Record<string, string> = {
  MONTHLY: "monthly",
  QUARTERLY: "quarterly",
  SEMI_ANNUAL: "semi-annual",
  ANNUAL: "annual",
};

// Months between two payments, to tell apart gifts charged on the same day
const giftFrequencyMonths: Record<string, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  SEMI_ANNUAL: 6,
  ANNUAL: 12,
};

// Frequency shared by all active gifts (null when mixed or unknown)
let giftFrequency: string | null = null;
// Frequency of each gift we could identify, by gift id
let giftFrequencies: Record<string, string> = {};
// Gift ids the frequencies above were computed for, and the last list of
// ids we refreshed for (see refreshGiftFrequency)
let loadedGiftIds = "";
let refreshedGiftIds = "";
let isLoadingGiftFrequency = false;
// Gift opened in the edit screen (data-recurringtxnid of the clicked item)
let selectedGiftId: string | null = null;

const replaceRecurringGift = (
  element: Element | null,
  label: string | null = giftFrequency
) => {
  if (!element || !label) return;
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node.nodeValue || "";
    if (text.includes("recurring gift")) {
      node.nodeValue = text.replace(/recurring gift/g, `${label} gift`);
    }
  }
};

// EN copies the gadget label into the overlay title when it opens, so the
// title changes too (and ENgrid's overlay id, built from it)
const applyGiftFrequency = () => {
  replaceRecurringGift(
    document.querySelector(
      '.en__component--hubgadget[data-componenttype="PLEDGE"] span'
    )
  );
  // The overlay may already be open when the frequency arrives
  updateOverlay();
};

const fetchJson = async (url: string) => {
  const response = await fetch(url, { credentials: "same-origin" });
  return response.json();
};

// The donor's active recurring gifts, the same request EN makes when the
// "Manage my recurring gift" gadget opens
const fetchActiveGifts = async (baseUrl: string) => {
  const json = await fetchJson(`${baseUrl}/pledge`);
  const gifts: any[] = json?.data?.recurringTxns ?? [];
  return gifts.filter((gift) => gift.status === "ACTIVE");
};

// The donor's giving history, the same request EN makes for the "My giving
// summary" gadget. It only returns 10 rows per request (larger pages don't
// return the usual response), so after the first one we fetch the rest at
// once, up to 100 transactions
const fetchTransactions = async (baseUrl: string) => {
  const pageUrl = (start: number) =>
    `${baseUrl}/txngiving/transaction?rows=10&start=${start}&inmem=true&nd=true&ev=true&p2p=true`;
  const first = await fetchJson(pageUrl(0));
  const total = Math.min(first?.pagination?.total ?? 0, 100);
  const starts: number[] = [];
  for (let start = 10; start < total; start += 10) starts.push(start);
  const rest = await Promise.all(starts.map((start) => fetchJson(pageUrl(start))));
  return [first, ...rest].flatMap((json) => json?.data ?? []) as any[];
};

// Months since year 0, to compare dates by month (UTC, like EN's dates)
const monthIndex = (time: number) => {
  const date = new Date(time);
  return date.getUTCFullYear() * 12 + date.getUTCMonth();
};

// The frequencies charged on the gift's day of the month. When there's more
// than one (e.g. a monthly and an annual gift both charged on the 3rd), keep
// the one whose last payment plus its interval falls in the month of the
// gift's next payment
const findGiftFrequencies = (gift: any, transactions: any[]) => {
  const sameDay = transactions.filter(
    (txn) =>
      txn.recurringPayment === "Y" &&
      txn.recurringStatus === "ACTIVE" &&
      Number(txn.recurringDay) === Number(gift.frequencyDay) &&
      txn.recurringFrequency
  );
  const frequencies = new Set<string>(
    sameDay.map((txn) => txn.recurringFrequency)
  );
  if (frequencies.size <= 1 || !gift.nextPaymentDate) return frequencies;
  const nextMonth = monthIndex(gift.nextPaymentDate);
  return new Set<string>(
    [...frequencies].filter((frequency) =>
      sameDay.some(
        (txn) =>
          txn.recurringFrequency === frequency &&
          monthIndex(txn.createdOn) + (giftFrequencyMonths[frequency] ?? 0) ===
            nextMonth
      )
    )
  );
};

const loadGiftFrequency = async () => {
  isLoadingGiftFrequency = true;
  try {
    await computeGiftFrequency();
  } finally {
    isLoadingGiftFrequency = false;
  }
};

const computeGiftFrequency = async () => {
  const gadget = document.querySelector<HTMLElement>(
    '.en__component--hubgadget[data-componenttype="PLEDGE"]'
  );
  const componentId = gadget?.dataset.componentid;
  const pageId = window.location.pathname.match(/\/page\/(\d+)/)?.[1];
  if (!componentId || !pageId) return;
  const baseUrl = `/page/${pageId}/hubgadget/${componentId}`;

  let gifts: any[];
  let transactions: any[];
  try {
    [gifts, transactions] = await Promise.all([
      fetchActiveGifts(baseUrl),
      fetchTransactions(baseUrl),
    ]);
  } catch (error) {
    return;
  }
  if (!gifts.length) return;

  giftFrequency = null;
  giftFrequencies = {};
  loadedGiftIds = gifts
    .map((gift) => String(gift.id))
    .sort()
    .join(",");

  // Gifts and transactions share no ID, so each gift is matched to the
  // active recurring transactions charged on the same day of the month
  const labels = new Set<string>();
  let hasUnknownGift = false;
  for (const gift of gifts) {
    const frequencies = findGiftFrequencies(gift, transactions);
    // Not in the history yet (new gift, or set up outside EN), or same-day
    // gifts we couldn't tell apart: unknown
    const label =
      frequencies.size === 1 ? giftFrequencyLabels[[...frequencies][0]] : null;
    if (!label) {
      hasUnknownGift = true;
      continue;
    }
    giftFrequencies[String(gift.id)] = label;
    labels.add(label);
  }

  if (!hasUnknownGift && labels.size === 1) giftFrequency = [...labels][0];
  applyGiftFrequency();
};

// The frequencies are computed when the page loads. If the list of gifts
// changes after that (e.g. the donor cancels one), compute them again, so
// "recurring" can become "monthly" once the annual gift is gone. Each new
// list is refreshed only once, so a mismatch can't cause a request loop
const refreshGiftFrequency = (overlay: Element) => {
  const listedGiftIds = Array.from(
    overlay.querySelectorAll<HTMLElement>(
      ".en__hubPledge__list__item[data-recurringtxnid]"
    )
  )
    .map((item) => item.dataset.recurringtxnid as string)
    .sort()
    .join(",");
  if (
    !listedGiftIds ||
    !loadedGiftIds ||
    isLoadingGiftFrequency ||
    listedGiftIds === loadedGiftIds ||
    listedGiftIds === refreshedGiftIds
  ) {
    return;
  }
  refreshedGiftIds = listedGiftIds;
  loadGiftFrequency();
};

const updateOverlay = () => {
  // Not the "#huboverlay-manage-my-recurring-gift" id: ENgrid builds it from
  // the title, which changes to "monthly" (see applyGiftFrequency)
  const overlay = document.querySelector(
    ".en__hubOverlay--pledge .en__hubOverlay__popup"
  );
  if (!overlay) return;
  if (isAutoOpenHub()) trackRecurringUpgrade(overlay);
  stripGiftCurrency(overlay);
  applyDynamicMonthlyAskString(overlay);
  addOtherCurrencySymbol(overlay);
  setUpdateCardLink(overlay);
  refreshGiftFrequency(overlay);
  replaceRecurringGift(overlay.querySelector(".en__hubPledge__list__header"));
  // "Manage your $50 recurring gift", for the gift being edited. Runs after
  // stripGiftCurrency, which looks for "recurring" to find the currency code
  replaceRecurringGift(
    overlay.querySelector(".en__hubPledge__panel--copy h2"),
    (selectedGiftId && giftFrequencies[selectedGiftId]) || giftFrequency
  );
};

export const supporterHubImprovements = () => {
  if (isAutoOpenHub()) {
    document.addEventListener("click", storeNewAmountOnSubmit, true);
  }
  // Remember which gift opens in the edit screen. Capture phase, so it runs
  // before EN swaps the list for the edit screen
  document.addEventListener(
    "click",
    (event) => {
      const item = (event.target as Element | null)?.closest<HTMLElement>(
        ".en__hubPledge__list__item"
      );
      if (item?.dataset.recurringtxnid) {
        selectedGiftId = item.dataset.recurringtxnid;
      }
    },
    true
  );
  // The overlay is injected/re-rendered by EN after load, so watch for it
  new MutationObserver(updateOverlay).observe(document.body, {
    childList: true,
    subtree: true,
  });
  updateOverlay();
  loadGiftFrequency();
};
