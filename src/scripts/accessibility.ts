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
    this.universalOptIns();
    this.multistepStepper();
    this.TEMPnewColors();
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
  private universalOptIns() {
    const universalOptInBlock = document.querySelector('.universal-opt-in-copy, .general-opt-in-copy, .be-a-part-of-our-community') as HTMLElement;
    const universalOptInInput = document.querySelector('.universal-opt-in .en__field') as HTMLElement;
    if (universalOptInBlock && universalOptInInput) {
      const label = universalOptInBlock.querySelector('.label p, .label') as HTMLElement;
      if (label) {
        label.setAttribute('id', `en__field__label--${Math.random().toString(36).slice(2, 7)}`)
        universalOptInInput.setAttribute('aria-labelledby', label.id)
        this.logger.log('Added aria-labelledby to universal opt-in checkbox with label id: ' + label.id)
      }
    }
  }
  private multistepStepper() {
    // for every multistep-stepper element, run through the children and add aria-labels to each step
    const multistepSteppers = document.querySelectorAll('.multistep-stepper');
    this.logger.log(`Found ${multistepSteppers.length} multistep-stepper elements`)
    multistepSteppers.forEach((stepper, index) => {
      stepper.setAttribute('role', 'tablist')
      stepper.setAttribute('aria-label', 'Form Steps')
      const steps = stepper.querySelectorAll('.multistep-stepper__step') as NodeListOf<HTMLElement>;
      steps.forEach((step, stepIndex) => {
        const isActive = step.classList.contains('multistep-stepper__step--active');
        step.setAttribute('role', 'tab')
        step.setAttribute('aria-selected', isActive ? 'true' : 'false')
        // Roving tabindex: only the active tab is in the tab order
        step.setAttribute('tabindex', isActive ? '0' : '-1')
        const label = step.querySelector('.multistep-stepper__label');
        if (label) {
          label.setAttribute('id', `multistep-step-label-${index}-${stepIndex}`)
          step.setAttribute('aria-labelledby', label.id)
        }
        step.addEventListener('keydown', (e: KeyboardEvent) => {
          let nextIndex: number | null = null;
          switch (e.key) {
            case 'ArrowRight':
              nextIndex = (stepIndex + 1) % steps.length;
              break;
            case 'ArrowLeft':
              nextIndex = (stepIndex - 1 + steps.length) % steps.length;
              break;
            case 'Home':
              nextIndex = 0;
              break;
            case 'End':
              nextIndex = steps.length - 1;
              break;
            case 'Enter':
            case ' ':
              e.preventDefault();
              step.click();
              return;
            default:
              return;
          }
          e.preventDefault();
          steps[nextIndex].focus();
        })
      })
    })
  }
  /**
   * Temporary - Replace some content with higher-contrast versions until CMS is updated with new assets. This is a temporary solution to allow for review of the new assets before they are published to the CMS.
   * TODO: Remove this function once the CMS is updated with new assets.
   */
  private TEMPnewColors() {
    const securePadlock = document.querySelector('.padlock-icon div img[src*="donation-icon_secure-payment"]') as HTMLElement;
    if (securePadlock) {
      securePadlock.setAttribute('src', 'https://acb0a5d73b67fccd4bbe-c2d8138f0ea10a18dd4c43ec3aa4240a.ssl.cf5.rackcdn.com/10114/donation-icon_secure-payment.webp?v=1782489751000');
      this.logger.log('Updated secure padlock image to new asset for higher contrast')
    }
  }
}
