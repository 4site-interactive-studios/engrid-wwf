# Country Notice Screen Reader Announcement

**Date:** 2026-06-26  
**File:** `src/scripts/main.js`  
**Scope:** `addCountryNotice` and `removeCountryNotice` functions (lines 319–330)

## Problem

When a donor selects a non-US country, `addCountryNotice` injects a visible `<div class="en__field__notice">` into the DOM. When they switch back to US, `removeCountryNotice` removes it. Neither operation triggers any ARIA announcement, so screen reader users receive no feedback about this important policy message (no premium gifts mailed outside the US).

Additionally, the notice text contains a typo: "Mazimize" should be "Maximize".

## Approach

Use the persistent `sr-only` live region pattern already established in this file for the email subscription nudge (lines 784–809). A live region that enters the DOM already populated with text is unreliable in VoiceOver — as documented in the code comment at line 755. The solution is a live region that is always present in the DOM, with text pushed into it on a short delay.

## Changes

### 1. Fix typo
`"Mazimize my gift"` → `"Maximize my gift"` in the notice text.

### 2. Extract notice text to a constant
```js
const countryNoticeMessage =
  'Note: We are unable to mail thank-you gifts to donors outside the United States and its territories and have selected the "Maximize my gift" option for you.';
```
Single source of truth used by both the visible div and the live region.

### 3. Lazy live region helper
```js
let countryAnnouncer = null;
const getCountryAnnouncer = () => {
  if (!countryAnnouncer) {
    countryAnnouncer = document.createElement("div");
    countryAnnouncer.className = "sr-only";
    countryAnnouncer.setAttribute("role", "status");
    countryAnnouncer.setAttribute("aria-live", "polite");
    countryAnnouncer.setAttribute("aria-atomic", "true");
    document.body.appendChild(countryAnnouncer);
  }
  return countryAnnouncer;
};
```
Created once on first use, reused across multiple country-change cycles.

### 4. `addCountryNotice` — push message into live region
After injecting the visible div, announce using the clear → 150ms → set pattern:
```js
const announcer = getCountryAnnouncer();
announcer.textContent = "";
window.setTimeout(() => {
  announcer.textContent = countryNoticeMessage;
}, 150);
```

### 5. `removeCountryNotice` — clear live region
```js
App.removeHtml(".en__field--country .en__field__notice");
getCountryAnnouncer().textContent = "";
```

## Why polite, not assertive
`aria-live="polite"` waits for the user to finish their current interaction before announcing. `role="alert"` / `aria-live="assertive"` would interrupt immediately. The notice is informational — it doesn't require immediate interruption — so polite is the right choice.

## No other changes
No CSS, no other functions, no other files.
