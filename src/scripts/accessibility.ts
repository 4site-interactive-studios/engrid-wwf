import { DonationAmount, DonationFrequency, EnForm, ENGrid, EngridLogger } from "@4site/engrid-scripts"

export default class Accessibility {
  private logger = new EngridLogger(
    'WWF Accessibility',
    'black',
    'pink',
    '👁️‍🗨️'
  );
  private _form = EnForm.getInstance();
  private _frequency = DonationFrequency.getInstance();

  constructor() {
    this.otherAmountTabSelect()
    this.otherAmountFieldLabel()
    this.premiumGifts()
    this.generalOptIns();
  }

  private otherAmountTabSelect() {
    const otherAmountField = ENGrid.getField('transaction.donationAmt.other') as HTMLElement | null;
    const donationAmount = DonationAmount.getInstance();
    if (otherAmountField) {
      this.logger.log('Adding tab button for other amount field')
      // Behavior: Prevent the "Other Amount" field from being focused when tabbing beyond the "transaction.donationAmt" radio group
      // The next tab past the radio group should be a button that when triggered, focuses the "transaction.donationAmt.other" field, and when tabbed, skips that input
      const tabButton = document.createElement("button")
      tabButton.setAttribute("type", "button")
      tabButton.setAttribute("aria-label", "Enter other amount")
      tabButton.textContent = "Other Amount"
      tabButton.addEventListener("click", () => {
        (otherAmountField as HTMLElement).focus()
      })
      tabButton.classList.add("other-amount-tab-button")
      tabButton.style.width = `${otherAmountField.offsetWidth}px`
      tabButton.style.height = `${otherAmountField.offsetHeight}px`
      otherAmountField.parentNode?.insertBefore(tabButton, otherAmountField)
      otherAmountField.setAttribute('tabindex', '-1')
      donationAmount.onAmountChange.subscribe(() => {
        if ((otherAmountField as HTMLInputElement).value) {
          otherAmountField.removeAttribute('tabindex')
          tabButton.setAttribute('tabindex', '-1')
        } else {
          otherAmountField.setAttribute('tabindex', '-1')
          tabButton.removeAttribute('tabindex')
        }
      })
    }
  }
  private otherAmountFieldLabel() {
    const otherAmountField = ENGrid.getField('transaction.donationAmt.other')
    if (otherAmountField) {
      this.logger.log('Adding screen reader label for other amount field')
      const label = document.createElement('label')
      label.setAttribute('id', 'other-amount-label')
      label.textContent = 'Other Amount'
      label.classList.add('sr-only')
      otherAmountField.parentNode?.insertBefore(label, otherAmountField)
      otherAmountField.setAttribute('aria-labelledby', label.id)
      otherAmountField.removeAttribute('aria-label')
      this._frequency.onFrequencyChange.subscribe((e: any) => {
        const frequencyText = (this._frequency.frequency == 'onetime' ? 'one-time' : this._frequency.frequency);
        label.textContent = `Other Amount (${frequencyText})`
        this.logger.log(`Updated other amount label to: ${label.textContent}`)
      })
    }
  }
  private premiumGifts() {
    const premiumGiftBlock = document.querySelector('.en__component--premiumgiftblock');
    if (premiumGiftBlock) {
      const radioFields = premiumGiftBlock.querySelectorAll(".en__pg:not(.hide) .en__pg__body .en__pg__select input");
      radioFields.forEach((field) => {
        field.setAttribute("role", "group");
        // Add random ID to the label
        const label = field.querySelector("label") as HTMLLabelElement;
        if (label) {
          label.setAttribute(
            "id",
            `en__field__label--${Math.random().toString(36).slice(2, 7)}`
          );
          field.setAttribute("aria-labelledby", label.id);
        }
      });
    }
  }
  private generalOptIns() {
    const generalOptInBlock = document.querySelector('.general-opt-in-copy') as HTMLElement;
    const generalOptInInput = document.querySelector('.en__field--opt-conservation-updates') as HTMLElement;
    if (generalOptInBlock && generalOptInInput) {
      const label = generalOptInBlock.querySelector('.label') as HTMLElement;
      if (label) {
        label.setAttribute('id', `en__field__label--${Math.random().toString(36).slice(2, 7)}`)
        generalOptInInput?.setAttribute('aria-labelledby', label.id)
        this.logger.log('Added aria-labelledby to general opt-in checkbox with label id: ' + label.id)
      }
    }
  }
}
