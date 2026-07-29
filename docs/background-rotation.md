# BackgroundRotation

Located at `src/scripts/background-rotation.ts`, styles at `src/sass/background-rotation.scss`.

Within the `.page-backgroundImage` block, if there is a parent element with a class of `background-rotation`, the background image will rotate on a cross-fade transition, with the next image selected from the child elements with a class of `background-image-item`.

Example markup:

```html
<div class="background-rotation">
  <img class="background-image-item" src="image-1.jpg" alt="Elephants" theme="light" data-attribution-source="© Jane Doe">
  <img class="background-image-item" src="image-2.jpg" alt="Bears" data-attribution-source="© John Doe">
  <img class="background-image-item" src="image-3.jpg" alt="Tigers">
</div>
```

## Setting Options

Options are set via the default options, overridden by options passed to the constructor, and overridden again by a window-level variable called `BackgroundRotationOptions` if it exists (each level overrides the previous):

```js
// Constructor
new BackgroundRotation({ controls: true, interval: 8000 });

// Window-level
window.BackgroundRotationOptions = { controls: true };
```

## Configuration Options

| Option | Default | Values | What it does |
|---|---|---|---|
| `enabled` | `true` | boolean | Master switch. `false` = the class bails out entirely, no rotation, no controls. |
| `interval` | `5000` | milliseconds | Time between automatic image rotations. |
| `transitionDuration` | `500` | milliseconds | Length of the cross-fade. Also sets `--background-rotation-transition-duration` (used by the layer fade and the h1 color transition). |
| `transitionClass` | `'background-rotation-transition'` | CSS class name | Class added to the `.background-rotation` container only while a cross-fade is in progress, removed when it ends. Styling hook. |
| `eachImageSelector` | `'.background-image-item'` | CSS selector | Selects each image item inside the container. Item is usually the `<img>` itself, but can be a wrapper element. |
| `backgroundImageSelector` | `'.background-rotation'` | CSS selector | Selects the rotation container, looked for inside `.page-backgroundImage`. No match = feature doesn't run. |
| `slideOrder` | `'random'` | `'random'` \| `'sequential'` \| `'true-random'` | `'random'` = shuffled "random bag" — every image shows once before any repeat, never the same image twice in a row. `'sequential'` = 1,2,3… looping. `'true-random'` = pure random (still avoids immediate repeats). |
| `randomStart` | `true` | boolean | `true` = first image (and the static mobile/reduced-motion image) is picked randomly; `false` = always start on the first item. |
| `reducedMotion` | `true` | boolean | `true` = if the user's OS has "reduce motion" on, show one static image instead of rotating (reacts live if the setting changes). `false` = ignore that preference. |
| `rotateOnMobile` | `false` | boolean | `false` = below 1024px show one static image, no rotation. `true` = rotate on mobile too. Watched live on viewport resize. |
| `controls` | `false` | boolean | `true` = render back / pause / forward buttons (fixed top-right, >1200px only) with hover/focus auto-pause, live-region announcements, and keyboard focus styles. |

## Per-Image Attributes

Set in the page markup on each `.background-image-item`:

| Attribute | Values | What it does |
|---|---|---|
| `theme` | `"light"` \| `"dark"` (default `dark`) | Switches the `.body-title h1` text color to white over that image so it stays visible, >1200px layout only. Transitions over `transitionDuration`. |
| `data-attribution-source` | string | Standard [MediaAttribution](https://engrid.4sitestudios.com/docs/v2/media-attribution) attribute; the attribution overlay cross-fades in sync with its image. Also supports `data-attribution-source-link` and `data-attribution-source-tooltip`. |

## Behavior Notes

- **Random bag**: the default `random` slide order shows every image once before any repeat, and never the same image twice in a row.
- **Static mode**: a single image (random if `randomStart`) is shown with no rotation when there's only one item, on mobile (unless `rotateOnMobile`), or with reduced-motion preference (unless `reducedMotion: false`). Mode switches live on viewport resize / preference change.
- **Body data attributes**: `data-engrid-background-rotation` is set to `"active"` or `"static"`, and `data-engrid-background-rotation-theme` to `"light"` or `"dark"` as images change. CSS hooks.
- **CSS variables**: `--background-rotation-image` (current image URL) and `--background-rotation-transition-duration` are set on the body.
- **≤1200px**: rotation layers are hidden (matching the WWF theme's background behavior); **≤499px** the active image displays in-flow in the body-banner grid spot via the core "replace banner with background" styles.
- **Controls** (when enabled): back button retraces actual shown history (capped at 2× item count), manual navigation resets the rotation timer, auto-rotation pauses on hover/focus of the controls, and image changes are announced to screen readers via an `aria-live` region (manual navigation only).
